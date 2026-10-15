import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ResetPasswordForm from "./reset-password-form";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations();
  const { token } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("sign_modal.reset_password")}</CardTitle>
          <CardDescription>{t("sign_modal.reset_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token || ""} />
        </CardContent>
      </Card>
    </div>
  );
}
