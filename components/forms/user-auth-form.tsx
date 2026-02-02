"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { userAuthSchema } from "@/lib/validations/auth";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: string;
}

type FormData = z.infer<typeof userAuthSchema>;

export function UserAuthForm({ className, type, ...props }: UserAuthFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userAuthSchema),
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);
  const searchParams = useSearchParams();

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      if (type === "register") {
        if (!data.name) {
          toast.error("Не заполнено поле", {
            description: "Пожалуйста, введите ваше имя."
          });
          return;
        }

        const { registerUser } = await import("@/actions/register");
        const res = await registerUser({
          email: data.email,
          name: data.name,
          password: data.password
        });

        if ((res as any).exists) {
          toast.error("Аккаунт уже существует", {
            description: "Пользователь с этим email уже зарегистрирован. Используйте страницу входа.",
            action: {
              label: "Войти",
              onClick: () => window.location.href = "/login"
            }
          });
          return;
        }

        if ((res as any).verificationRequired) {
          toast.success("Подтвердите ваш email", {
            description: "Мы отправили вам письмо. Перейдите по ссылке в письме для завершения регистрации."
          });
          // Fall through to auto-login
        }

        if (res.error) {
          toast.error("Ошибка регистрации", {
            description: res.error
          });
          return;
        }

        toast.success("Аккаунт создан!", {
          description: "Мы отправили письмо для подтверждения почты, но вы уже можете войти."
        });

        // Fall through to auto-login
      } else {
        // Login flow
        const { checkUserExists } = await import("@/actions/register");
        const userExists = await checkUserExists(data.email);

        if (!userExists) {
          toast.error("Аккаунт не найден", {
            description: "Пользователя с этим email не существует. Зарегистрируйтесь.",
            action: {
              label: "Регистрация",
              onClick: () => window.location.href = "/register"
            }
          });
          return;
        }
      }

      const signInResult = await signIn("credentials", {
        email: data.email.toLowerCase(),
        password: data.password,
        redirect: false,
        callbackUrl: searchParams?.get("from") || "/dashboard",
      });

      if (signInResult?.error) {
        if (signInResult.error === "EMAIL_NOT_VERIFIED") {
          toast.error("Email не подтвержден", {
            description: "Пожалуйста, проверьте вашу почту и перейдите по ссылке подтверждения."
          })
          return
        }

        // Generic error
        toast.error("Ошибка входа", {
          description: "Неверный email или пароль."
        })
        return
      }

      if (!signInResult?.ok) {
        toast.error("Что-то пошло не так.", {
          description: "Пожалуйста, попробуйте снова."
        });
        return;
      }

      // Success - NextAuth will redirect automatically if redirect: true, 
      // but we used redirect: false to handle errors. 
      // So we might need to manually redirect or refresh. 
      // Actually for credentials provider with redirect: false, we just get result.
      // We should redirect manually.
      window.location.href = searchParams?.get("from") || "/dashboard";
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Произошла ошибка", {
        description: "Пожалуйста, попробуйте позже."
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          {type === "register" && (
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="name">
                Имя
              </Label>
              <Input
                id="name"
                placeholder="Иван Иванов"
                type="text"
                autoCapitalize="words"
                autoComplete="name"
                autoCorrect="off"
                disabled={isLoading || isGoogleLoading}
                {...register("name")}
              />
              {errors?.name && (
                <p className="px-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
          )}
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading || isGoogleLoading}
              {...register("email")}
            />
            {errors?.email && (
              <p className="px-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Пароль
            </Label>
            <Input
              id="password"
              placeholder="Пароль (минимум 8 символов)"
              type="password"
              autoCapitalize="none"
              autoComplete="current-password"
              disabled={isLoading || isGoogleLoading}
              {...register("password")}
            />
            {errors?.password && (
              <p className="px-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
            <div className="flex items-center justify-end">
              <Link href="/forgot-password" tabIndex={-1} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Забыли пароль?
              </Link>
            </div>
          </div>
          <button className={cn(buttonVariants())} disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            )}
            {type === "register" ? "Зарегистрироваться" : "Войти"}
          </button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Или войдите через
          </span>
        </div>
      </div>
      <div className="grid gap-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => {
            setIsGoogleLoading(true);
            signIn("google");
          }}
          disabled={isLoading || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Icons.spinner className="mr-2 size-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 size-4" />
          )}{" "}
          Google
        </button>

        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "dark:bg-zinc-900 dark:text-white border-border/50 opacity-60 cursor-not-allowed relative"
          )}
          onClick={() => {
            toast.info("Скоро", {
              description: "Авторизация через Яндекс временно недоступна. Используйте Google или email."
            });
          }}
          disabled={false}
        >
          <span className="mr-2 font-bold font-serif text-[#fc3f1d]">Ya</span>
          Yandex ID
          <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
            Скоро
          </span>
        </button>
      </div>


    </div>
  );
}
