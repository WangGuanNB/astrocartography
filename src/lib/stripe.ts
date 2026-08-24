import Stripe from "stripe";

/** Stripe client for Node + Cloudflare Workers (fetch-based HTTP). */
export function getStripeClient(secretKey?: string) {
  const key = secretKey || process.env.STRIPE_PRIVATE_KEY || "";
  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
