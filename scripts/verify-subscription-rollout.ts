import assert from "node:assert/strict";
import {
  applySubscriptionPricingFilter,
  getSubscriptionRolloutMode,
  isSubscriptionVisible,
} from "../src/services/subscription";
import type { Pricing } from "../src/types/blocks/pricing";

const originalEnabled = process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED;
const originalRollout = process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT;

const pricing: Pricing = {
  description: "Choose a one-time plan or Plus.",
  groups: [
    {
      name: "one-time",
      title: "One-Time",
      description: "Best for one decision.",
    },
    { name: "subscription", title: "Subscription" },
  ],
  items: [
    {
      product_id: "standard",
      interval: "one-time",
      amount: 990,
      currency: "USD",
      group: "one-time",
    },
    {
      product_id: "plus-monthly",
      interval: "month",
      amount: 690,
      currency: "USD",
      group: "subscription",
    },
  ],
};

function productIds(surface: "general" | "research") {
  return applySubscriptionPricingFilter(pricing, { surface })?.items?.map(
    (item) => item.product_id
  );
}

try {
  process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED = "false";
  process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT = "all";
  assert.equal(getSubscriptionRolloutMode(), "off");
  assert.equal(isSubscriptionVisible("research"), false);
  assert.deepEqual(productIds("research"), ["standard"]);
  assert.equal(
    applySubscriptionPricingFilter(pricing, { surface: "research" })
      ?.description,
    "Best for one decision."
  );

  process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED = "true";
  delete process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT;
  assert.equal(getSubscriptionRolloutMode(), "research");
  assert.equal(isSubscriptionVisible("general"), false);
  assert.equal(isSubscriptionVisible("research"), true);
  assert.deepEqual(productIds("general"), ["standard"]);
  assert.deepEqual(productIds("research"), ["standard", "plus-monthly"]);
  assert.equal(
    applySubscriptionPricingFilter(pricing, { surface: "research" })
      ?.description,
    "Choose a one-time plan or Plus."
  );

  process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT = "research";
  assert.equal(getSubscriptionRolloutMode(), "research");
  assert.deepEqual(productIds("general"), ["standard"]);
  assert.deepEqual(productIds("research"), ["standard", "plus-monthly"]);

  process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT = "all";
  assert.equal(getSubscriptionRolloutMode(), "all");
  assert.equal(isSubscriptionVisible("general"), true);
  assert.deepEqual(productIds("general"), ["standard", "plus-monthly"]);

  process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT = "unexpected";
  assert.equal(
    getSubscriptionRolloutMode(),
    "research",
    "Unknown values must fail closed to the research-only audience"
  );

  console.log("Subscription rollout checks passed.");
} finally {
  if (originalEnabled === undefined) {
    delete process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED = originalEnabled;
  }

  if (originalRollout === undefined) {
    delete process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT;
  } else {
    process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT = originalRollout;
  }
}
