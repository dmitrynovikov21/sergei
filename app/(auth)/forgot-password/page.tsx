import { ResetForm } from "@/components/auth/reset-form";
import { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export const metadata: Metadata = {
    title: "Забыли пароль?",
    description: "Сброс пароля от аккаунта",
};

export default function ForgotPasswordPage() {
    return (
        <div className="container relative flex h-screen w-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <Link
                href="/login"
                className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "absolute left-4 top-4 md:left-8 md:top-8 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                )}
            >
                <Icons.chevronLeft className="mr-2 size-4" />
                Назад
            </Link>
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                <div className="flex flex-col space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-8 shadow-sm">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Сброс пароля
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Введите ваш email для получения ссылки
                        </p>
                    </div>
                    <ResetForm />
                </div>
            </div>
        </div>
    );
}
