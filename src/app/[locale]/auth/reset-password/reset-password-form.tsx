"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_CODES = ["password_too_short", "invalid_token", "rate_limited", "generic"] as const;

export default function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/email-auth/reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json();
      if (payload?.code !== 0) {
        const code = ERROR_CODES.includes(payload?.message) ? payload.message : "generic";
        setError(t(`sign_modal.errors.${code}`));
        return;
      }
      setDone(true);
    } catch {
      setError(t("sign_modal.errors.generic"));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">{t("sign_modal.notices.reset_success")}</p>
        <Button asChild className="w-full">
          <Link href="/auth/signin">{t("sign_modal.back_to_sign_in")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="new-password">{t("sign_modal.new_password")}</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
        <p className="text-xs text-muted-foreground">{t("sign_modal.password_hint")}</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending || !token}>
        {t("sign_modal.reset_password")}
      </Button>
    </form>
  );
}
