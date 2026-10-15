import { createHash, randomBytes } from "crypto";

import { CreditsTransType, increaseCredits } from "@/services/credit";
import { EmailSignInError } from "@/auth/email-error";
import { defaultLocale, locales } from "@/i18n/locale";
import { findUsersByEmail, insertUser } from "@/models/user";
import { getClientIp } from "@/lib/ip";
import { getNewUserCredits } from "@/services/config";
import { getOneYearLaterTimestr } from "@/lib/time";
import { getUuid } from "@/lib/hash";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendEmail } from "@/services/email";
import {
  countAuthAttempts,
  deleteExpiredEmailAuthTokens,
  findEmailAccount,
  findEmailAuthToken,
  insertEmailAuthToken,
  invalidateEmailAuthTokens,
  markEmailAuthTokenUsed,
  recordAuthAttempt,
  setEmailPassword,
} from "@/models/email-auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const LIMITS = {
  register: { email: 5, ip: 20, windowMs: 60 * 60 * 1000 },
  login: { email: 10, ip: 30, windowMs: 15 * 60 * 1000 },
  forgot: { email: 3, ip: 10, windowMs: 60 * 60 * 1000 },
  reset: { email: 10, ip: 20, windowMs: 60 * 60 * 1000 },
} as const;

const ENFORCE_IP_LIMIT = true;

type AuthAction = keyof typeof LIMITS;

export type EmailAuthResult =
  | { ok: true; status: "check_email" | "verify_success" | "reset_success" }
  | { ok: false; error: string };

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeLocale(value: unknown): string {
  const locale = String(value || "");
  return locales.includes(locale as (typeof locales)[number]) ? locale : defaultLocale;
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return "password_too_short";
  }
  return null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_WEB_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  return "https://astrocarto.org";
}

function localePath(locale: string, path: string): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${siteOrigin()}${prefix}${path}`;
}

function oauthError(provider: string | null | undefined): "use_google" | "use_github" | null {
  if (provider === "github") return "use_github";
  if (provider === "google" || provider === "google-one-tap") return "use_google";
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MAIL_COPY: Record<string, { verifySubject: string; verifyIntro: string; resetSubject: string; resetIntro: string; action: string; ignore: string }> = {
  en: {
    verifySubject: "Confirm your Astrocarto email",
    verifyIntro: "Confirm this email to finish creating your account.",
    resetSubject: "Reset your Astrocarto password",
    resetIntro: "Use this link to choose a new password.",
    action: "Open link",
    ignore: "If you did not ask for this, you can ignore this email.",
  },
  zh: {
    verifySubject: "确认你的 Astrocarto 邮箱",
    verifyIntro: "确认这个邮箱后，账户就会创建完成。",
    resetSubject: "重置你的 Astrocarto 密码",
    resetIntro: "用这个链接设置一个新密码。",
    action: "打开链接",
    ignore: "如果这不是你本人的操作，忽略这封邮件即可。",
  },
  es: {
    verifySubject: "Confirma tu correo de Astrocarto",
    verifyIntro: "Confirma este correo para terminar de crear tu cuenta.",
    resetSubject: "Restablece tu contraseña de Astrocarto",
    resetIntro: "Usa este enlace para elegir una contraseña nueva.",
    action: "Abrir enlace",
    ignore: "Si no lo pediste, puedes ignorar este correo.",
  },
  de: {
    verifySubject: "Bestätige deine Astrocarto-E-Mail",
    verifyIntro: "Bestätige diese E-Mail, um dein Konto fertigzustellen.",
    resetSubject: "Setze dein Astrocarto-Passwort zurück",
    resetIntro: "Wähle über diesen Link ein neues Passwort.",
    action: "Link öffnen",
    ignore: "Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.",
  },
  it: {
    verifySubject: "Conferma la tua email Astrocarto",
    verifyIntro: "Conferma questa email per finire di creare l'account.",
    resetSubject: "Reimposta la password Astrocarto",
    resetIntro: "Usa questo link per scegliere una nuova password.",
    action: "Apri il link",
    ignore: "Se non sei stato tu, ignora questa email.",
  },
  pt: {
    verifySubject: "Confirme seu e-mail da Astrocarto",
    verifyIntro: "Confirme este e-mail para concluir a criação da conta.",
    resetSubject: "Redefina sua senha da Astrocarto",
    resetIntro: "Use este link para escolher uma nova senha.",
    action: "Abrir link",
    ignore: "Se você não pediu isso, ignore este e-mail.",
  },
};

function mailCopy(locale: string) {
  return MAIL_COPY[locale] || MAIL_COPY.en;
}

function mailHtml(intro: string, href: string, action: string, ignore: string): string {
  const safeHref = escapeHtml(href);
  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${escapeHtml(intro)}</p>
  <p><a href="${safeHref}" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">${escapeHtml(action)}</a></p>
  <p style="word-break: break-all;"><a href="${safeHref}">${safeHref}</a></p>
  <p style="color: #666; font-size: 13px;">${escapeHtml(ignore)}</p>
</body>
</html>`;
}

async function deliverEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skip auth email");
    return false;
  }

  try {
    await sendEmail({ to, subject, html });
    return true;
  } catch (error) {
    console.log("auth email failed", error);
    return false;
  }
}

async function clientIp(): Promise<string> {
  try {
    return (await getClientIp()) || "unknown";
  } catch {
    return "unknown";
  }
}

async function enforceRateLimit(
  action: AuthAction,
  email: string
): Promise<{ ok: false; error: "rate_limited" } | null> {
  const rule = LIMITS[action];
  const keys: { key: string; limit: number }[] = [
    { key: `${action}:email:${email || "none"}`, limit: rule.email },
  ];
  if (ENFORCE_IP_LIMIT) {
    const ip = await clientIp();
    keys.push({ key: `${action}:ip:${ip}`, limit: rule.ip });
  }

  for (const item of keys) {
    await recordAuthAttempt(action, item.key);
    const count = await countAuthAttempts(item.key, new Date(Date.now() - rule.windowMs));
    if (count > item.limit) {
      return { ok: false, error: "rate_limited" };
    }
  }

  return null;
}

async function issueToken(params: {
  email: string;
  purpose: "verify" | "reset";
  passwordHash?: string;
  locale: string;
}): Promise<EmailAuthResult> {
  const token = randomBytes(32).toString("hex");
  const purposePath = params.purpose === "verify" ? "/auth/verify-email" : "/auth/reset-password";
  const href = `${localePath(params.locale, purposePath)}?token=${token}`;
  const copy = mailCopy(params.locale);
  const subject = params.purpose === "verify" ? copy.verifySubject : copy.resetSubject;
  const intro = params.purpose === "verify" ? copy.verifyIntro : copy.resetIntro;

  await deleteExpiredEmailAuthTokens().catch((error) => {
    console.log("cleanup auth tokens failed", error);
  });
  await invalidateEmailAuthTokens(params.email, params.purpose);
  await insertEmailAuthToken({
    email: params.email,
    token_hash: hashToken(token),
    purpose: params.purpose,
    password_hash: params.passwordHash || null,
    expires_at: new Date(Date.now() + (params.purpose === "verify" ? VERIFY_TTL_MS : RESET_TTL_MS)),
    created_at: new Date(),
  });

  const sent = await deliverEmail(params.email, subject, mailHtml(intro, href, copy.action, copy.ignore));
  if (!sent) {
    await invalidateEmailAuthTokens(params.email, params.purpose);
    return { ok: false, error: "email_send_failed" };
  }

  return { ok: true, status: "check_email" };
}

export async function registerWithEmail(input: {
  email: unknown;
  password: unknown;
  locale: unknown;
}): Promise<EmailAuthResult> {
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const locale = normalizeLocale(input.locale);

  if (!isValidEmail(email)) {
    return { ok: false, error: "invalid_email" };
  }
  const invalidPassword = passwordError(password);
  if (invalidPassword) {
    return { ok: false, error: invalidPassword };
  }

  const limited = await enforceRateLimit("register", email);
  if (limited) return limited;

  const existing = await findUsersByEmail(email);
  for (const user of existing) {
    const blocked = oauthError(user.signin_provider);
    if (blocked) return { ok: false, error: blocked };
  }
  if (existing.length > 0) {
    return { ok: false, error: "already_registered" };
  }

  const passwordHash = await hashPassword(password);
  return issueToken({ email, purpose: "verify", passwordHash, locale });
}

export async function requestPasswordReset(input: {
  email: unknown;
  locale: unknown;
}): Promise<EmailAuthResult> {
  const email = normalizeEmail(input.email);
  const locale = normalizeLocale(input.locale);

  if (!isValidEmail(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const limited = await enforceRateLimit("forgot", email);
  if (limited) return limited;

  const existing = await findUsersByEmail(email);
  for (const user of existing) {
    const blocked = oauthError(user.signin_provider);
    if (blocked) return { ok: false, error: blocked };
  }

  const account = existing.find((user) => user.signin_provider === "email");
  if (!account) {
    return { ok: true, status: "check_email" };
  }

  return issueToken({ email, purpose: "reset", locale });
}

async function createEmailUser(email: string, passwordHash: string) {
  const existing = await findUsersByEmail(email);
  for (const user of existing) {
    const blocked = oauthError(user.signin_provider);
    if (blocked) {
      throw new Error(blocked);
    }
  }
  if (existing.some((user) => user.signin_provider === "email")) {
    return;
  }

  const uuid = getUuid();
  await insertUser({
    uuid,
    email,
    nickname: email.split("@")[0]?.slice(0, 40) || "User",
    avatar_url: "",
    signin_type: "credentials",
    signin_provider: "email",
    signin_openid: email,
    created_at: new Date(),
    signin_ip: await clientIp(),
    password_hash: passwordHash,
    email_verified_at: new Date(),
  });

  await increaseCredits({
    user_uuid: uuid,
    trans_type: CreditsTransType.NewUser,
    credits: getNewUserCredits(),
    expired_at: getOneYearLaterTimestr(),
  });
}

export async function verifyEmailSignup(token: unknown): Promise<EmailAuthResult> {
  const raw = String(token || "");
  if (!/^[a-f0-9]{64}$/.test(raw)) {
    return { ok: false, error: "invalid_token" };
  }

  const row = await findEmailAuthToken(hashToken(raw));
  if (!row || row.purpose !== "verify" || !row.password_hash) {
    return { ok: false, error: "invalid_token" };
  }

  if (row.used_at) {
    const existing = await findUsersByEmail(row.email);
    if (existing.some((user) => user.signin_provider === "email")) {
      return { ok: true, status: "verify_success" };
    }
    return { ok: false, error: "invalid_token" };
  }

  if (row.expires_at.getTime() < Date.now()) {
    return { ok: false, error: "invalid_token" };
  }

  try {
    await createEmailUser(row.email, row.password_hash);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "use_google" || message === "use_github") {
      await markEmailAuthTokenUsed(row.id);
      return { ok: false, error: message };
    }
    throw error;
  }

  await markEmailAuthTokenUsed(row.id);
  return { ok: true, status: "verify_success" };
}

export async function resetEmailPassword(input: {
  token: unknown;
  password: unknown;
}): Promise<EmailAuthResult> {
  const raw = String(input.token || "");
  const password = String(input.password || "");
  if (!/^[a-f0-9]{64}$/.test(raw)) {
    return { ok: false, error: "invalid_token" };
  }
  const invalidPassword = passwordError(password);
  if (invalidPassword) {
    return { ok: false, error: invalidPassword };
  }

  const limited = await enforceRateLimit("reset", hashToken(raw).slice(0, 32));
  if (limited) return limited;

  const row = await findEmailAuthToken(hashToken(raw));
  if (!row || row.purpose !== "reset" || row.used_at || row.expires_at.getTime() < Date.now()) {
    return { ok: false, error: "invalid_token" };
  }

  const account = await findEmailAccount(row.email);
  if (!account) {
    return { ok: false, error: "invalid_token" };
  }

  await setEmailPassword(account.uuid, await hashPassword(password));
  await markEmailAuthTokenUsed(row.id);
  return { ok: true, status: "reset_success" };
}

let dummyPasswordHash: string | null = null;

export async function authenticateEmailPassword(emailInput: unknown, passwordInput: unknown) {
  const email = normalizeEmail(emailInput);
  const password = String(passwordInput || "");

  const limited = await enforceRateLimit("login", email || "none");
  if (limited) {
    throw new EmailSignInError(limited.error);
  }

  if (!isValidEmail(email) || passwordError(password)) {
    throw new EmailSignInError("invalid_credentials");
  }

  const account = await findEmailAccount(email);
  const hash = account?.password_hash || dummyPasswordHash || (dummyPasswordHash = await hashPassword("not-a-real-password"));
  const matches = await verifyPassword(password, hash);

  if (!account?.password_hash || !matches) {
    const existing = await findUsersByEmail(email);
    for (const user of existing) {
      const blocked = oauthError(user.signin_provider);
      if (blocked) throw new EmailSignInError(blocked);
    }
    throw new EmailSignInError("invalid_credentials");
  }

  if (!account.email_verified_at) {
    throw new EmailSignInError("email_not_verified");
  }

  return {
    id: account.uuid,
    email: account.email,
    name: account.nickname || "",
    image: account.avatar_url || "",
  };
}
