import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { constructMetadata } from "@/lib/utils";
import { DeleteAccountSection } from "@/components/dashboard/delete-account";
import { DashboardHeader } from "@/components/dashboard/header";
import { UserNameForm } from "@/components/forms/user-name-form";
import { UserRoleForm } from "@/components/forms/user-role-form";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsTabs } from "@/components/dashboard/settings/settings-tabs";

export const metadata = constructMetadata({
  title: "Настройки — Content Zavod",
  description: "Управление аккаунтом и настройками.",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  // Get user accounts (OAuth providers) and password status
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      password: true,
      accounts: {
        select: {
          provider: true,
        }
      }
    }
  });

  const hasPassword = !!dbUser?.password;
  const connectedProviders = dbUser?.accounts.map(a => a.provider) || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <DashboardHeader
        heading="Настройки"
        text="Управление аккаунтом и настройками."
        className="mb-8"
      />

      <SettingsTabs
        user={{ id: user.id, name: user.name || "", role: user.role }}
        hasPassword={hasPassword}
        connectedProviders={connectedProviders}
      />
    </div>
  );
}
