"use client";

import { FormEvent, useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authEvents } from "@/lib/analytics";

type Mode = "sign-in" | "sign-up" | "forgot";

const ERROR_CODES = [
  "invalid_email",
  "password_too_short",
  "invalid_credentials",
  "email_not_verified",
  "use_google",
  "use_github",
  "already_registered",
  "email_send_failed",
  "rate_limited",
  "invalid_token",
  "generic",
] as const;

function isErrorCode(value: string | undefined): value is (typeof ERROR_CODES)[number] {
  return ERROR_CODES.includes(value as (typeof ERROR_CODES)[number]);
}

export default function EmailAuthForm({
  callbackUrl,
  onSignedIn,
  onModeChange,
}: {
  callbackUrl?: string;
  onSignedIn?: () => void;
  onModeChange?: (mode: Mode) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const emailId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<"sign-in" | "sign-up" | "forgot" | null>(null);

  function errorText(code: string | undefined) {
    if (isErrorCode(code)) {
      return t(`sign_modal.errors.${code}`);
    }
    return t("sign_modal.errors.generic");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    onModeChange?.(next);
  }

  function fieldError(action: "sign-in" | "sign-up" | "forgot") {
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
      return "invalid_email" as const;
    }
    if (action !== "forgot" && (password.length < 8 || password.length > 128)) {
      return "password_too_short" as const;
    }
    return null;
  }

  async function run(action: "sign-in" | "sign-up" | "forgot") {
    const invalid = fieldError(action);
    if (invalid) {
      setNotice("");
      setError(errorText(invalid));
      return;
    }

    setError("");
    setNotice("");
    setPending(action);

    try {
      if (action === "sign-in") {
        authEvents.signInStarted("email");
        const result = await signIn("email", {
          email,
          password,
          redirect: false,
          callbackUrl: callbackUrl || window.location.href,
        });

        if (result?.error) {
          setError(errorText(result.code));
          return;
        }

        if (onSignedIn) {
          onSignedIn();
          return;
        }

        window.location.assign(result?.url || callbackUrl || window.location.href);
        return;
      }

      const endpoint = action === "sign-up" ? "/api/email-auth/register/" : "/api/email-auth/forgot/";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, locale }),
      });
      const payload = await response.json();

      if (payload?.code !== 0) {
        setError(errorText(payload?.message));
        return;
      }

      setPassword("");
      setNotice(t("sign_modal.notices.check_email"));
    } catch {
      setError(t("sign_modal.errors.generic"));
    } finally {
      setPending(null);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(mode);
  }

  return (
    <form className="grid gap-4" noValidate data-vaul-no-drag onSubmit={onSubmit}>

      <div className="grid gap-2">
        <Label htmlFor={emailId}>{t("sign_modal.email_title")}</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          placeholder={t("sign_modal.email_placeholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      {mode !== "forgot" ? (
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor={passwordId}>{t("sign_modal.password_title")}</Label>
            {mode === "sign-in" ? (
              <button
                type="button"
                className="ml-auto text-sm underline-offset-4 hover:underline"
                onClick={() => switchMode("forgot")}
              >
                {t("sign_modal.forgot_password")}
              </button>
            ) : null}
          </div>
          <Input
            id={passwordId}
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            placeholder={t("sign_modal.password_placeholder")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={128}
          />
          <p className="text-xs text-muted-foreground">{t("sign_modal.password_hint")}</p>
        </div>
      ) : null}

      {mode === "forgot" ? (
        <Button type="submit" className="w-full" disabled={pending !== null} data-vaul-no-drag>
          {pending === "forgot" ? t("sign_modal.working") : t("sign_modal.send_reset")}
        </Button>
      ) : mode === "sign-up" ? (
        <Button type="submit" className="w-full" disabled={pending !== null} data-vaul-no-drag>
          {pending === "sign-up" ? t("sign_modal.working") : t("sign_modal.sign_up_submit")}
        </Button>
      ) : (
        <Button type="submit" className="w-full" disabled={pending !== null} data-vaul-no-drag>
          {pending === "sign-in" ? t("sign_modal.working") : t("sign_modal.sign_in_submit")}
        </Button>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      {mode === "sign-in" ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("sign_modal.no_account")}{" "}
          <button type="button" className="underline underline-offset-4" onClick={() => switchMode("sign-up")}>
            {t("sign_modal.sign_up_title")}
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          <button type="button" className="underline underline-offset-4" onClick={() => switchMode("sign-in")}>
            {mode === "forgot" ? t("sign_modal.back_to_sign_in") : t("sign_modal.have_account")}
          </button>
        </p>
      )}
    </form>
  );
}
