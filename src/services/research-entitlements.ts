import { getOrdersByUserUuid } from "@/models/order";
import type { ResearchProject } from "@/types/research-project";
import type { ResearchTimingReport } from "@/types/research-timing";
import {
  isResearchPassProductId,
  PAID_TIER_PRODUCT_IDS,
} from "@/services/entitlements";
import {
  getActivePlusSubscriptionSummary,
  isPlusProductId,
  isSubscriptionEnabled,
} from "@/services/subscription";

export type ResearchAccessTier =
  | "free"
  | "one_time"
  | "plus_active"
  | "plus_expired";

export type ResearchAccess = {
  tier: ResearchAccessTier;
  fallbackTier: "free" | "one_time";
  canSaveProject: true;
  canContinueProject: true;
  canExportProject: true;
  canViewFull30DayWindow: boolean;
  canUse90DayWindow: boolean;
  canViewSavedPlusSnapshots: boolean;
  canExportTiming: boolean;
  previewEventsPerCity: number | null;
  subscriptionEnabled: boolean;
};

export function resolveResearchAccess({
  hasOneTimePurchase,
  hasResearchPass,
  hasAnyPlusPurchase,
  hasActivePlus,
  subscriptionEnabled,
}: {
  hasOneTimePurchase: boolean;
  hasResearchPass?: boolean;
  hasAnyPlusPurchase: boolean;
  hasActivePlus: boolean;
  subscriptionEnabled: boolean;
}): ResearchAccess {
  const tier: ResearchAccessTier = hasActivePlus
    ? "plus_active"
    : hasAnyPlusPurchase
      ? "plus_expired"
      : hasOneTimePurchase
        ? "one_time"
        : "free";
  const fallbackTier = hasOneTimePurchase ? "one_time" : "free";
  // Research Pass keeps 90-day timing forever (unlike Plus, which is active-only).
  const canUse90DayWindow = hasActivePlus || Boolean(hasResearchPass);

  return {
    tier,
    fallbackTier,
    canSaveProject: true,
    canContinueProject: true,
    canExportProject: true,
    canViewFull30DayWindow: hasActivePlus || hasOneTimePurchase,
    canUse90DayWindow,
    canViewSavedPlusSnapshots: !hasActivePlus && hasAnyPlusPurchase,
    canExportTiming:
      hasActivePlus || hasOneTimePurchase || hasAnyPlusPurchase,
    previewEventsPerCity:
      hasActivePlus || hasOneTimePurchase ? null : 2,
    subscriptionEnabled,
  };
}

export async function getResearchAccess(
  userUuid: string
): Promise<ResearchAccess> {
  try {
    const [orders, subscription] = await Promise.all([
      getOrdersByUserUuid(userUuid),
      getActivePlusSubscriptionSummary(userUuid),
    ]);
    const paidOrders = orders ?? [];

    return resolveResearchAccess({
      hasOneTimePurchase: paidOrders.some((order) =>
        PAID_TIER_PRODUCT_IDS.has(order.product_id || "")
      ),
      hasResearchPass: paidOrders.some((order) =>
        isResearchPassProductId(order.product_id)
      ),
      hasAnyPlusPurchase: paidOrders.some((order) =>
        isPlusProductId(order.product_id)
      ),
      hasActivePlus: Boolean(subscription?.is_active),
      subscriptionEnabled: isSubscriptionEnabled(),
    });
  } catch (error) {
    console.warn("research entitlement lookup failed; using free access", {
      message: error instanceof Error ? error.message : String(error),
    });
    return resolveResearchAccess({
      hasOneTimePurchase: false,
      hasResearchPass: false,
      hasAnyPlusPurchase: false,
      hasActivePlus: false,
      subscriptionEnabled: isSubscriptionEnabled(),
    });
  }
}

export function applyResearchTimingAccess(
  report: ResearchTimingReport,
  access: ResearchAccess
): ResearchTimingReport {
  const previewEventsPerCity = access.previewEventsPerCity;
  if (previewEventsPerCity === null) return report;

  return {
    ...report,
    cities: report.cities.map((city) => ({
      ...city,
      events: city.events.slice(0, previewEventsPerCity),
    })),
  };
}

export function researchProjectFingerprint(project: ResearchProject): string {
  return JSON.stringify({
    birthProfile: project.birthProfile,
    goal: project.goal,
    currentCity: project.currentCity,
    candidateCities: project.candidateCities,
    planDate: project.planDate,
    constraints: project.constraints,
  });
}
