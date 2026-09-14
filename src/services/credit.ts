import { findCreditByOrderNo, getUserValidCredits, insertCredit, insertCreditIfAbsent } from "@/models/credit";
import { credits as creditsTable } from "@/db/schema";
import { getIsoTimestr } from "@/lib/time";
import { getSnowId } from "@/lib/hash";
import { Order } from "@/types/order";
import { UserCredits } from "@/types/user";
import { getFirstPaidOrderByUserUuid } from "@/models/order";
import { getAIChatCreditCost as getAIChatCreditCostFromConfig } from "./config";
import { getUserEntitlements } from "./entitlements";
import { getActivePlusSubscriptionSummary } from "./subscription";
import { ensureAnnualSubscriptionCreditsForUser } from "./annual-subscription-credits";

export enum CreditsTransType {
  NewUser = "new_user", // initial credits for new user
  OrderPay = "order_pay", // user pay for credits
  SystemAdd = "system_add", // system add credits
  Ping = "ping", // cost for ping api (deprecated, ping API no longer deducts credits)
  AIChat = "ai_chat", // cost for AI chat
}

/**
 * 获取 AI 聊天消耗的积分数量（从配置服务读取）
 * @deprecated 请使用 getAIChatCreditCostFromConfig，此函数保留用于向后兼容
 */
export function getAIChatCreditCost(): number {
  return getAIChatCreditCostFromConfig();
}

export async function getUserCredits(user_uuid: string): Promise<UserCredits> {
  let user_credits: UserCredits = {
    left_credits: 0,
  };

  try {
    // Annual Stripe billing has a monthly non-rollover allowance. Grant the
    // current tranche on first use instead of incorrectly granting once/year.
    try {
      await ensureAnnualSubscriptionCreditsForUser(user_uuid);
    } catch (error) {
      console.warn("annual subscription credit check skipped", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const first_paid_order = await getFirstPaidOrderByUserUuid(user_uuid);
    if (first_paid_order) {
      user_credits.is_recharged = true;
    }

    const credits = await getUserValidCredits(user_uuid);
    if (credits) {
      credits.forEach((v) => {
        user_credits.left_credits += v.credits || 0;
      });
    }

    if (user_credits.left_credits < 0) {
      user_credits.left_credits = 0;
    }

    if (user_credits.left_credits > 0) {
      user_credits.is_pro = true;
    }

    user_credits.entitlements = await getUserEntitlements(user_uuid);
    user_credits.subscription =
      await getActivePlusSubscriptionSummary(user_uuid);

    return user_credits;
  } catch (e) {
    console.log("get user credits failed: ", e);
    return {
      ...user_credits,
      entitlements: {
        canExportCurrentChat: false,
        canDownloadChart: false,
        canViewChatHistory: false,
      },
    };
  }
}

export async function decreaseCredits({
  user_uuid,
  trans_type,
  credits,
}: {
  user_uuid: string;
  trans_type: CreditsTransType;
  credits: number;
}) {
  try {
    let order_no = "";
    let expired_at = "";
    let left_credits = 0;

    const userCredits = await getUserValidCredits(user_uuid);
    if (userCredits) {
      for (let i = 0, l = userCredits.length; i < l; i++) {
        const credit = userCredits[i];
        left_credits += credit.credits;

        // credit enough for cost
        if (left_credits >= credits) {
          order_no = credit.order_no || "";
          expired_at = credit.expired_at?.toISOString() || "";
          break;
        }

        // look for next credit
      }
    }

    const new_credit: typeof creditsTable.$inferInsert = {
      trans_no: getSnowId(),
      created_at: new Date(getIsoTimestr()),
      expired_at: new Date(expired_at),
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: 0 - credits,
      order_no: order_no,
    };
    await insertCredit(new_credit);
  } catch (e) {
    console.log("decrease credits failed: ", e);
    throw e;
  }
}

export async function increaseCredits({
  user_uuid,
  trans_type,
  credits,
  expired_at,
  order_no,
}: {
  user_uuid: string;
  trans_type: string;
  credits: number;
  expired_at?: string;
  order_no?: string;
}) {
  try {
    const new_credit: typeof creditsTable.$inferInsert = {
      trans_no: getSnowId(),
      created_at: new Date(getIsoTimestr()),
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: credits,
      order_no: order_no || "",
      expired_at: expired_at ? new Date(expired_at) : null,
    };
    await insertCredit(new_credit);
  } catch (e) {
    console.log("increase credits failed: ", e);
    throw e;
  }
}

export async function updateCreditForOrder(order: Order) {
  try {
    const credit = await findCreditByOrderNo(order.order_no);
    if (credit) {
      // order already increased credit
      return;
    }

    await increaseCredits({
      user_uuid: order.user_uuid,
      trans_type: CreditsTransType.OrderPay,
      credits: order.credits,
      expired_at: order.expired_at,
      order_no: order.order_no,
    });
  } catch (e) {
    console.log("update credit for order failed: ", e);
    throw e;
  }
}

/** Idempotent monthly/renewal credit grant for Plus subscriptions. */
export async function grantSubscriptionPeriodCredits({
  user_uuid,
  credits,
  order_no,
  expired_at,
  idempotency_key,
}: {
  user_uuid: string;
  credits: number;
  order_no: string;
  expired_at: string;
  idempotency_key: string;
}): Promise<boolean> {
  return await insertCreditIfAbsent({
    trans_no: idempotency_key,
    created_at: new Date(getIsoTimestr()),
    expired_at: new Date(expired_at),
    user_uuid,
    trans_type: CreditsTransType.OrderPay,
    credits,
    order_no,
  });
}
