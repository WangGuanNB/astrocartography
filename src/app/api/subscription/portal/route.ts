import { respData, respErr } from "@/lib/resp";
import { getStripeClient } from "@/lib/stripe";
import { findLatestStripeSubscriptionByUser } from "@/models/subscription";
import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("Please sign in to manage your subscription.");
    }

    const subscription = await findLatestStripeSubscriptionByUser(userUuid);
    if (!subscription?.provider_customer_id) {
      return respErr("No Stripe subscription was found for this account.");
    }

    const body = await req.json().catch(() => ({}));
    const locale =
      typeof body.locale === "string" &&
      /^[a-z]{2}(?:-[A-Z]{2})?$/.test(body.locale)
        ? body.locale
        : "en";
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL;
    if (!webUrl) return respErr("Website URL is not configured.");

    const portal = await getStripeClient().billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      return_url: `${webUrl}/${locale}/my-credits`,
    });
    return respData({ url: portal.url });
  } catch (error) {
    console.error("create Stripe billing portal failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return respErr("Unable to open subscription management right now.");
  }
}
