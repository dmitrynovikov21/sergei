import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
    Verification: {
        title: "Ссылка недействительна",
        description: "Ссылка для входа устарела или уже была использована. Запросите новую ссылку."
    },
    OAuthCallbackError: {
        title: "Ошибка авторизации",
        description: "Не удалось войти через внешний сервис. Проверьте разрешения приложения или попробуйте другой способ входа."
    },
    OAuthAccountNotLinked: {
        title: "Аккаунт не привязан",
        description: "Этот email уже используется с другим способом входа. Войдите через тот метод, который использовали при регистрации."
    },
    AccessDenied: {
        title: "Доступ запрещён",
        description: "Вы отказали в доступе к аккаунту. Попробуйте снова и разрешите доступ."
    },
    Default: {
        title: "Ошибка входа",
        description: "Что-то пошло не так. Попробуйте снова или используйте другой способ входа."
    }
};

export default function AuthErrorPage({
    searchParams,
}: {
    searchParams: { error?: string };
}) {
    const errorType = searchParams?.error || "Default";
    const errorInfo = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.Default;

    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <Link
                href="/login"
                className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "absolute left-4 top-4 md:left-8 md:top-8 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                )}
            >
                <Icons.chevronLeft className="mr-2 size-4" />
                На главную
            </Link>

            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                <div className="flex flex-col space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-8 shadow-sm text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                        <Icons.warning className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>

                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {errorInfo.title}
                    </h1>

                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {errorInfo.description}
                    </p>

                    <Link
                        href="/login"
                        className={cn(buttonVariants({ variant: "default" }), "w-full")}
                    >
                        Попробовать еще раз
                    </Link>
                </div>
            </div>
        </div>
    );
}
