import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/forms/user-auth-form";
import { LoginToast } from "@/components/auth/login-toast";
import { Icons } from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <div className="container relative flex h-screen w-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Link
        href="/"
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
          <div className="flex flex-col space-y-2 text-center mb-4">
            <Icons.logo className="mx-auto size-10" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              С возвращением
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Введите email для входа в аккаунт
            </p>
          </div>
          <Suspense>
            <LoginToast />
            <UserAuthForm />
          </Suspense>
        </div>

        <p className="px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/register"
            className="hover:text-zinc-900 dark:hover:text-zinc-50 underline underline-offset-4"
          >
            Нет аккаунта? Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
