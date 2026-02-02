"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { newVerification } from "@/actions/new-verification";
import Link from "next/link";
import { Icons } from "@/components/shared/icons";

export const NewVerificationForm = () => {
    const [error, setError] = useState<string | undefined>();
    const [success, setSuccess] = useState<string | undefined>();

    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const onSubmit = useCallback(() => {
        if (success || error) return;

        if (!token) {
            setError("Токен не найден!");
            return;
        }

        newVerification(token)
            .then((data) => {
                setSuccess(data.success);
                setError(data.error);
            })
            .catch(() => {
                setError("Что-то пошло не так!");
            });
    }, [token, success, error]);

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
                    Подождите, мы подтверждаем ваш email...
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
                        {/* Use basic warning icon if Icons.warning not available, or just error icon */}
                        <Icons.close className="h-4 w-4" />
                        <p>{error}</p>
                    </div>
                )}
            </div>

            <div className="pt-4">
                <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    Вернуться на страницу входа
                </Link>
            </div>
        </div>
    );
};
