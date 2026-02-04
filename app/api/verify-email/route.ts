import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";

// Use env for proper redirect URL (request.url returns localhost on server)
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://contentzavod.biz";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    console.log("[Verification API] Starting verification for token:", token?.substring(0, 8) + "...");

    if (!token) {
        console.log("[Verification API] No token provided");
        return NextResponse.redirect(`${BASE_URL}/login?error=NoToken`);
    }

    try {
        const existingToken = await db.verificationToken.findFirst({
            where: { token },
        });

        if (!existingToken) {
            console.log("[Verification API] Token not found in DB");
            return NextResponse.redirect(`${BASE_URL}/login?error=InvalidToken`);
        }

        console.log("[Verification API] Token found for:", existingToken.identifier);

        const hasExpired = new Date(existingToken.expires) < new Date();

        if (hasExpired) {
            console.log("[Verification API] Token expired at:", existingToken.expires);
            return NextResponse.redirect(`${BASE_URL}/login?error=ExpiredToken`);
        }

        const existingUser = await db.user.findUnique({
            where: { email: existingToken.identifier },
        });

        if (!existingUser) {
            console.log("[Verification API] User not found for email:", existingToken.identifier);
            return NextResponse.redirect(`${BASE_URL}/login?error=UserNotFound`);
        }

        console.log("[Verification API] User found:", existingUser.id, existingUser.email);

        // Update user emailVerified
        const updatedUser = await db.user.update({
            where: { id: existingUser.id },
            data: {
                emailVerified: new Date(),
                email: existingToken.identifier,
            }
        });
        console.log("[Verification API] User updated, emailVerified:", updatedUser.emailVerified);

        // Delete the token
        try {
            await db.verificationToken.delete({
                where: { token: existingToken.token }
            });
            console.log("[Verification API] Token deleted successfully");
        } catch (err) {
            console.error("[Verification API] Error deleting token:", err);
            // Don't fail - user is already verified
        }

        // Redirect to dashboard with success message
        return NextResponse.redirect(`${BASE_URL}/dashboard?verified=true`);

    } catch (error) {
        console.error("[Verification API] Error:", error);
        return NextResponse.redirect(`${BASE_URL}/login?error=VerificationFailed`);
    }
}
