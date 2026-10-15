"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiGithub, SiGoogle } from "react-icons/si";

import { Button } from "@/components/ui/button";
import EmailAuthForm from "@/components/sign/email-form";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { authEvents } from "@/lib/analytics";

type AuthMode = "sign-in" | "sign-up" | "forgot";

export default function SignForm({
  className,
  callbackUrl,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { callbackUrl?: string }) {
  const t = useTranslations();
  const [providers, setProviders] = useState<Record<string, any> | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const title =
    authMode === "sign-up"
      ? t("sign_modal.sign_up_title")
      : authMode === "forgot"
        ? t("sign_modal.reset_password")
        : t("sign_modal.sign_in_title");
  const description =
    authMode === "sign-up"
      ? t("sign_modal.sign_up_description")
      : authMode === "forgot"
        ? t("sign_modal.forgot_description")
        : t("sign_modal.sign_in_description");

  // 动态获取可用的 providers
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data);
      })
      .catch((err) => {
        console.error("Failed to fetch providers:", err);
      });
  }, []);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {authMode !== "forgot" ? (
            <div className="flex flex-col gap-4">
              {providers?.google && (
                <Button
                  className="h-10 w-full bg-white text-neutral-950 hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => {
                    authEvents.signInStarted("google");
                    signIn("google");
                  }}
                >
                  <SiGoogle className="w-4 h-4" />
                  {t("sign_modal.google_sign_in")}
                </Button>
              )}
              {providers?.github && (
                <Button
                  variant="outline"
                  className="h-10 w-full"
                  onClick={() => {
                    authEvents.signInStarted("github");
                    signIn("github");
                  }}
                >
                  <SiGithub className="w-4 h-4" />
                  {t("sign_modal.github_sign_in")}
                </Button>
              )}
            </div>
            ) : null}
            {authMode !== "forgot" && (providers?.google || providers?.github) ? (
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-card px-2 text-muted-foreground">
                  {t("sign_modal.or")}
                </span>
              </div>
            ) : null}
            <EmailAuthForm callbackUrl={callbackUrl} onModeChange={setAuthMode} />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        By clicking continue, you agree to our{" "}
        <a href="/terms-of-service" target="_blank">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy-policy" target="_blank">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
