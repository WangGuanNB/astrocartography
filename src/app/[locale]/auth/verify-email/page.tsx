import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyEmailSignup } from "@/services/email-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations();
  const { token } = await searchParams;

  let message = t("sign_modal.errors.invalid_token");
  try {
    const result = await verifyEmailSignup(token);
    if (result.ok) {
      message = t("sign_modal.notices.verify_success");
    } else if (result.error === "use_google" || result.error === "use_github") {
      message = t(`sign_modal.errors.${result.error}`);
    }
  } catch (error) {
    console.log("verify email failed", error);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("sign_modal.sign_up_title")}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/signin">{t("sign_modal.back_to_sign_in")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
