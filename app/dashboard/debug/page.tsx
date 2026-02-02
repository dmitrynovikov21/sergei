import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DebugClient } from "./client"; // We'll put the client logic here

export default async function DebugPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // We pass simple props to client component to avoid serialization issues if any
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">System Debug & Verification</h1>
                <p className="text-muted-foreground">
                    Verify Auth, Background Workers, and Tokenomics Integration.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-6 rounded-xl border bg-card text-card-foreground shadow">
                    <h3 className="font-semibold leading-none tracking-tight mb-2">Auth Status</h3>
                    <div className="text-sm text-green-600 font-mono bg-green-50 p-2 rounded">
                        Verified: {session.user.email}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Role: {session.user.role || 'USER'}</p>
                </div>
            </div>

            <DebugClient user={session.user} />
        </div>
    );
}
