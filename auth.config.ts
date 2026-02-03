import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Yandex from "next-auth/providers/yandex";
import Credentials from "next-auth/providers/credentials";

// TEMP: Use process.env directly to test if t3-env is the issue
// import { env } from "@/env.mjs";

// DEBUG: Log what NextAuth receives
console.log("[Auth Config] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...");
console.log("[Auth Config] GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "***SET***" : "***MISSING***");

export default {

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // TEMP: Disabled Yandex to isolate OAuth issue
    // Yandex({
    //   clientId: env.YANDEX_CLIENT_ID,
    //   clientSecret: env.YANDEX_CLIENT_SECRET,
    //   allowDangerousEmailAccountLinking: true,
    // }),
    // TEMP: Disabled Resend to isolate OAuth issue
    // Resend({
    //   apiKey: env.RESEND_API_KEY,
    //   from: env.EMAIL_FROM,
    // }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Import dynamically to avoid edge runtime issues
        const { prisma } = await import("@/lib/db");
        const { verifyPassword } = await import("@/lib/password");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.password) {
          console.log("Auth Debug: User not found or no password", user);
          return null;
        }

        // Plan A: Allow login without verification (Soft Login)
        // if (!user.emailVerified) {
        //   throw new Error("EMAIL_NOT_VERIFIED");
        // }

        const passwordMatch = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) {
          console.log("Auth Debug: Password mismatch for user", user.email);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAuth = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      if (isOnAuth) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

