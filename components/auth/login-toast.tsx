"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function LoginToast() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const passwordChanged = searchParams.get("passwordChanged");

        if (passwordChanged === "true") {
            toast.success("Пароль изменён!", {
                description: "Теперь вы можете войти с новым паролем.",
            });

            // Clean up URL
            window.history.replaceState({}, "", "/login");
        }
    }, [searchParams]);

    return null;
}
