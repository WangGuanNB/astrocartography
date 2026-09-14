import { respOk } from "@/lib/resp";
import { getStripeClient } from "@/lib/stripe";
import { handleStripeWebhookEvent } from "@/services/stripe-subscription";

export async function POST(req: Request) {
  try {
    const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripePrivateKey || !stripeWebhookSecret) {
      throw new Error("invalid stripe config");
    }

    const stripe = getStripeClient(stripePrivateKey);

    const sign = req.headers.get("stripe-signature") as string;
    const body = await req.text();
    if (!sign || !body) {
      throw new Error("invalid notify data");
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      sign,
      stripeWebhookSecret
    );

    console.log("stripe webhook received", { id: event.id, type: event.type });
    await handleStripeWebhookEvent(event);

    return respOk();
  } catch (e: any) {
    console.log("stripe webhook failed", { message: e?.message || String(e) });
    return Response.json(
      { error: `handle stripe notify failed: ${e.message}` },
      { status: 500 }
    );
  }
}
