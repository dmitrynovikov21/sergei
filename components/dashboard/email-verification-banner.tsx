"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import { AlertTriangle } from "lucide-react";
import { checkEmailVerified } from "@/actions/check-email-verified";

export function EmailVerificationBanner() {
    const { data: session } = useSession();
    const [isResending, setIsResending] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    // Check email verification status from database directly (not from cached session)
    useEffect(() => {
        if (!session?.user?.email) {
            setIsVerified(true); // No user = don't show banner
            return;
        }

        // Check DB for real status
        checkEmailVerified().then((verified) => {
            setIsVerified(verified);
        });
    }, [session?.user?.email]);

    // Don't show while loading or if verified or dismissed
    if (isVerified === null || isVerified || dismissed || !session?.user) {
        return null;
    }

    const handleResend = async () => {
        setIsResending(true);
        try {
            const { resendVerificationEmail } = await import("@/actions/verification");
            const result = await resendVerificationEmail(session.user.email!);

            if (result.success) {
                toast.success("Письмо отправлено", {
                    description: "Проверьте вашу почту для подтверждения."
                });
            } else {
                toast.error("Ошибка", {
                    description: result.error || "Не удалось отправить письмо."
                });
            }
        } catch {
            toast.error("Ошибка отправки");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 mx-4 mt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                    <AlertTriangle className="size-4 text-muted-foreground" />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">
                        Подтвердите ваш email
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Проверьте почту {session.user.email} и перейдите по ссылке
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                >
                    {isResending ? (
                        <Icons.spinner className="size-3 animate-spin" />
                    ) : (
                        "Отправить снова"
                    )}
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Icons.close className="size-4" />
                </button>
            </div>
        </div>
    );
}
