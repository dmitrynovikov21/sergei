"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { newVerification } from "@/actions/new-verification";
import Link from "next/link";
import { Icons } from "@/components/shared/icons";
import { useSession } from "next-auth/react";

export const NewVerificationForm = () => {
    const [error, setError] = useState<string | undefined>();
    const [success, setSuccess] = useState<string | undefined>();
    const [redirecting, setRedirecting] = useState(false);
    const { update } = useSession();

    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const onSubmit = useCallback(() => {
        if (success || error) return;

        if (!token) {
            setError("Токен не найден!");
            return;
        }

        newVerification(token)
            .then(async (data) => {
                setSuccess(data.success);
                setError(data.error);

                // On success, update the session to refresh JWT with new emailVerified
                // This keeps the user logged in while updating their session data
                if (data.success) {
                    setRedirecting(true);
                    // Force session update - this refreshes the JWT from the database
                    await update();
                    // Redirect to dashboard with the new session
                    setTimeout(() => {
                        window.location.href = "/dashboard";
                    }, 1500);
                }
            })
            .catch(() => {
                setError("Что-то пошло не так!");
            });
    }, [token, success, error, update]);

    useEffect(() => {
        onSubmit();
    }, [onSubmit]);

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Подтверждение Email
                </h1>
                <p className="text-sm text-muted-foreground">
                    {redirecting ? "Перенаправляем в личный кабинет..." : "Подождите, мы подтверждаем ваш email..."}
                </p>
            </div>

            <div className="flex items-center justify-center w-full">
                {!success && !error && (
                    <Icons.spinner className="h-8 w-8 animate-spin" />
                )}
                {success && (
                    <div className="bg-emerald-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-emerald-500">
                        <Icons.check className="h-4 w-4" />
                        <p>{success}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
                        <Icons.close className="h-4 w-4" />
                        <p>{error}</p>
                    </div>
                )}
            </div>

            {!redirecting && (
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        Вернуться на страницу входа
                    </Link>
                </div>
            )}
        </div>
    );
};
