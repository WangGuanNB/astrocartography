import { and, eq, gte, isNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { emailAuthAttempts, emailAuthTokens, users } from "@/db/schema";

export async function findEmailAccount(email: string) {
  const [user] = await db()
    .select({
      uuid: users.uuid,
      email: users.email,
      nickname: users.nickname,
      avatar_url: users.avatar_url,
      signin_provider: users.signin_provider,
      password_hash: users.password_hash,
      email_verified_at: users.email_verified_at,
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.signin_provider, "email")))
    .limit(1);

  return user;
}

export async function setEmailPassword(uuid: string, passwordHash: string) {
  await db()
    .update(users)
    .set({ password_hash: passwordHash, updated_at: new Date() })
    .where(eq(users.uuid, uuid));
}

export async function insertEmailAuthToken(data: typeof emailAuthTokens.$inferInsert) {
  await db().insert(emailAuthTokens).values(data);
}

export async function findEmailAuthToken(tokenHash: string) {
  const [token] = await db()
    .select()
    .from(emailAuthTokens)
    .where(eq(emailAuthTokens.token_hash, tokenHash))
    .limit(1);

  return token;
}

export async function markEmailAuthTokenUsed(id: number) {
  await db()
    .update(emailAuthTokens)
    .set({ used_at: new Date() })
    .where(eq(emailAuthTokens.id, id));
}

export async function invalidateEmailAuthTokens(email: string, purpose: string) {
  await db()
    .update(emailAuthTokens)
    .set({ used_at: new Date() })
    .where(
      and(
        eq(emailAuthTokens.email, email),
        eq(emailAuthTokens.purpose, purpose),
        isNull(emailAuthTokens.used_at)
      )
    );
}

export async function deleteExpiredEmailAuthTokens() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db().delete(emailAuthTokens).where(lt(emailAuthTokens.expires_at, cutoff));
}

export async function recordAuthAttempt(action: string, attemptKey: string) {
  const now = new Date();
  await db().insert(emailAuthAttempts).values({
    action,
    attempt_key: attemptKey,
    created_at: now,
  });
  await db()
    .delete(emailAuthAttempts)
    .where(lt(emailAuthAttempts.created_at, new Date(now.getTime() - 24 * 60 * 60 * 1000)));
}

export async function countAuthAttempts(attemptKey: string, since: Date) {
  const rows = await db()
    .select({ id: emailAuthAttempts.id })
    .from(emailAuthAttempts)
    .where(and(eq(emailAuthAttempts.attempt_key, attemptKey), gte(emailAuthAttempts.created_at, since)));

  return rows.length;
}
