import { getOrdersByUserUuid, OrderStatus } from "@/models/order";
import type { UserEntitlements } from "@/types/user";

/** Paid SKUs that unlock chart download and current-session chat export (not full history). */
export const PAID_TIER_PRODUCT_IDS = new Set([
  "standard",
  "professional",
  "premium-2weeks",
]);

function orderGrantsPaidTier(productId: string | null): boolean {
  if (!productId || productId === "free") return false;
  return PAID_TIER_PRODUCT_IDS.has(productId);
}

function orderGrantsProfessional(productId: string | null): boolean {
  return productId === "professional";
}

/**
 * Entitlements from paid orders (product_id), not from remaining credits.
 * Use this for gating exports, downloads, and history — do not use left_credits > 0.
 */
export async function getUserEntitlements(
  user_uuid: string
): Promise<UserEntitlements> {
  const orders = await getOrdersByUserUuid(user_uuid);
  const paid =
    orders?.filter((o) => o.status === OrderStatus.Paid) ?? [];

  let canExportCurrentChat = false;
  let canDownloadChart = false;
  let canViewChatHistory = false;

  for (const o of paid) {
    const pid = o.product_id;
    if (orderGrantsPaidTier(pid)) {
      canExportCurrentChat = true;
      canDownloadChart = true;
    }
    if (orderGrantsProfessional(pid)) {
      canViewChatHistory = true;
    }
  }

  return {
    canExportCurrentChat,
    canDownloadChart,
    canViewChatHistory,
  };
}

export async function userHasProfessional(user_uuid: string): Promise<boolean> {
  const e = await getUserEntitlements(user_uuid);
  return e.canViewChatHistory;
}
