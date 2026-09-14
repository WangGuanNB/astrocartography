import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionEvents, subscriptions } from "@/db/schema";

export type SubscriptionInsert = typeof subscriptions.$inferInsert;
export type SubscriptionRow = typeof subscriptions.$inferSelect;

export async function upsertSubscription(data: SubscriptionInsert) {
  const [row] = await db()
    .insert(subscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: [subscriptions.provider, subscriptions.provider_subscription_id],
      set: {
        provider_customer_id: data.provider_customer_id,
        user_uuid: data.user_uuid,
        order_no: data.order_no,
        product_id: data.product_id,
        interval: data.interval,
        status: data.status,
        cancel_at_period_end: data.cancel_at_period_end,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        last_paid_period_start: data.last_paid_period_start,
        last_paid_invoice_id: data.last_paid_invoice_id,
        last_paid_at: data.last_paid_at,
        canceled_at: data.canceled_at,
        ended_at: data.ended_at,
        updated_at: data.updated_at,
      },
    })
    .returning();
  return row;
}

export async function markSubscriptionPeriodPaid({
  provider,
  providerSubscriptionId,
  periodStart,
  invoiceId,
  paidAt,
}: {
  provider: string;
  providerSubscriptionId: string;
  periodStart: number;
  invoiceId: string;
  paidAt: number;
}) {
  const [row] = await db()
    .update(subscriptions)
    .set({
      last_paid_period_start: periodStart,
      last_paid_invoice_id: invoiceId,
      last_paid_at: paidAt,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(subscriptions.provider, provider),
        eq(subscriptions.provider_subscription_id, providerSubscriptionId)
      )
    )
    .returning();
  return row;
}

export async function findSubscriptionByProviderId(
  provider: string,
  providerSubscriptionId: string
): Promise<SubscriptionRow | undefined> {
  const [row] = await db()
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, provider),
        eq(subscriptions.provider_subscription_id, providerSubscriptionId)
      )
    )
    .limit(1);
  return row;
}

export async function findLatestStripeSubscriptionByUser(
  userUuid: string
): Promise<SubscriptionRow | undefined> {
  const [row] = await db()
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, "stripe"),
        eq(subscriptions.user_uuid, userUuid)
      )
    )
    .orderBy(desc(subscriptions.updated_at))
    .limit(1);
  return row;
}

export async function findActiveSubscriptionByUser(
  userUuid: string
): Promise<SubscriptionRow | undefined> {
  const [row] = await db()
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_uuid, userUuid),
        inArray(subscriptions.status, ["active", "trialing", "past_due"])
      )
    )
    .orderBy(desc(subscriptions.current_period_end))
    .limit(1);
  return row;
}

export async function beginSubscriptionEvent(data: {
  provider: string;
  provider_event_id: string;
  event_type: string;
  provider_subscription_id?: string | null;
  provider_invoice_id?: string | null;
  user_uuid?: string | null;
  order_no?: string | null;
  amount?: number | null;
  currency?: string | null;
}): Promise<"process" | "skip"> {
  const now = new Date();
  const inserted = await db()
    .insert(subscriptionEvents)
    .values({
      ...data,
      status: "received",
      created_at: now,
    })
    .onConflictDoNothing({
      target: [
        subscriptionEvents.provider,
        subscriptionEvents.provider_event_id,
      ],
    })
    .returning({ id: subscriptionEvents.id });
  if (inserted.length > 0) return "process";

  const [existing] = await db()
    .select({
      status: subscriptionEvents.status,
      created_at: subscriptionEvents.created_at,
    })
    .from(subscriptionEvents)
    .where(
      and(
        eq(subscriptionEvents.provider, data.provider),
        eq(subscriptionEvents.provider_event_id, data.provider_event_id)
      )
    )
    .limit(1);

  if (!existing || existing.status === "processed") return "skip";
  const isRecentInFlight =
    existing.status === "received" &&
    existing.created_at.getTime() > Date.now() - 5 * 60 * 1000;
  if (isRecentInFlight) return "skip";

  await db()
    .update(subscriptionEvents)
    .set({ status: "received", error: null, created_at: now })
    .where(
      and(
        eq(subscriptionEvents.provider, data.provider),
        eq(subscriptionEvents.provider_event_id, data.provider_event_id)
      )
    );
  return "process";
}

export async function finishSubscriptionEvent(
  provider: string,
  providerEventId: string
) {
  await db()
    .update(subscriptionEvents)
    .set({ status: "processed", error: null, processed_at: new Date() })
    .where(
      and(
        eq(subscriptionEvents.provider, provider),
        eq(subscriptionEvents.provider_event_id, providerEventId)
      )
    );
}

export async function failSubscriptionEvent(
  provider: string,
  providerEventId: string,
  error: string
) {
  await db()
    .update(subscriptionEvents)
    .set({ status: "failed", error: error.slice(0, 500) })
    .where(
      and(
        eq(subscriptionEvents.provider, provider),
        eq(subscriptionEvents.provider_event_id, providerEventId)
      )
    );
}
