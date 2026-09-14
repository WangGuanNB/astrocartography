import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { credits, orders } from "../src/db/schema";
import { handleOrderSession } from "../src/services/order";

if (process.env.CLOUDFLARE_D1_TOKEN) {
  throw new Error("Refusing to run one-time payment regression against remote D1");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
const orderNo = `test_stripe_one_time_${suffix}`;
const userUuid = `test_stripe_one_time_user_${suffix}`;

async function main() {
  try {
    await db().insert(orders).values({
      order_no: orderNo,
      created_at: new Date(),
      user_uuid: userUuid,
      user_email: "",
      amount: 990,
      interval: "one-time",
      expired_at: new Date("2099-12-31T23:59:59.999Z"),
      status: "created",
      credits: 1000,
      currency: "USD",
      product_id: "standard",
      product_name: "Standard Plan - Valid Forever",
      valid_months: 0,
      pay_type: "stripe",
    });

    const session = {
      id: `cs_test_${suffix}`,
      mode: "payment",
      payment_status: "paid",
      customer_email: null,
      customer_details: null,
      metadata: { order_no: orderNo },
    } as unknown as Stripe.Checkout.Session;

    await handleOrderSession(session);
    await handleOrderSession(session);

    const [savedOrder] = await db()
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.order_no, orderNo));
    const savedCredits = await db()
      .select({ amount: credits.credits })
      .from(credits)
      .where(eq(credits.order_no, orderNo));

    assert(savedOrder?.status === "paid", "one-time order must become paid");
    assert(savedCredits.length === 1, "duplicate callbacks must grant credits once");
    assert(savedCredits[0]?.amount === 1000, "one-time plan must grant 1000 credits");
    console.log("Stripe one-time payment lifecycle: OK");
  } finally {
    await db().delete(credits).where(eq(credits.order_no, orderNo));
    await db().delete(orders).where(eq(orders.order_no, orderNo));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
