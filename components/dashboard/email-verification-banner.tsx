"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import { AlertTriangle } from "lucide-react";

export function EmailVerificationBanner() {
    const { data: session } = useSession();
    const [isResending, setIsResending] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Don't show if email is verified or dismissed
    if (!session?.user || session.user.emailVerified || dismissed) {
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
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mx-4 mt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-full">
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Подтвердите ваш email
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        Проверьте почту {session.user.email} и перейдите по ссылке
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-xs text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-50"
                >
                    {isResending ? (
                        <Icons.spinner className="size-3 animate-spin" />
                    ) : (
                        "Отправить снова"
                    )}
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
                >
                    <Icons.close className="size-4" />
                </button>
            </div>
        </div>
    );
}
