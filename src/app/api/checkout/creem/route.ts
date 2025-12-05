/**
 * @fileoverview Creem 支付 Checkout API
 * @description 创建 Creem 支付会话并返回支付链接
 */

import { getUserEmail, getUserUuid } from "@/services/user";
import { insertOrder, updateOrderSession } from "@/models/order";
import { respData, respErr } from "@/lib/resp";

import { Order } from "@/types/order";
import { findUserByUuid } from "@/models/user";
import { getSnowId } from "@/lib/hash";
import { getPricingPage } from "@/services/page";
import { PricingItem } from "@/types/blocks/pricing";
import { orders } from "@/db/schema";
import { createCreemCheckoutSession } from "@/services/creem";

export async function POST(req: Request) {
  try {
    let {
      credits,
      currency,
      amount,
      interval,
      product_id,
      product_name,
      valid_months,
      cancel_url,
      locale,
      creem_product_id, // Creem 产品 ID（可选，如果提供则直接使用）
    } = await req.json();

    if (!cancel_url) {
      cancel_url = `${
        process.env.NEXT_PUBLIC_PAY_CANCEL_URL ||
        process.env.NEXT_PUBLIC_WEB_URL
      }`;

      if (cancel_url && cancel_url.startsWith("/")) {
        cancel_url = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}${cancel_url}`;
      }
    }

    if (!amount || !interval || !currency || !product_id) {
      return respErr("invalid params");
    }

    // 验证订单参数
    const page = await getPricingPage(locale);
    if (!page || !page.pricing || !page.pricing.items) {
      return respErr("invalid pricing table");
    }

    const item = page.pricing.items.find(
      (item: PricingItem) => item.product_id === product_id
    );

    let isPriceValid = false;

    if (currency === "cny") {
      isPriceValid = item?.cn_amount === amount;
    } else {
      isPriceValid = item?.amount === amount && item?.currency === currency;
    }

    // 验证 credits：如果前端发送的 credits 为 0，但配置中应该是 1000，使用配置中的值
    const expectedCredits = item?.credits ?? 0;
    const actualCredits = credits ?? 0;
    
    // 对于 premium-2weeks 和 premium-monthly，如果前端发送 0，使用配置中的值
    if (actualCredits === 0 && (expectedCredits === 1000 || expectedCredits > 0)) {
      credits = expectedCredits;
    }

    if (
      !item ||
      !item.amount ||
      !item.interval ||
      !item.currency ||
      item.interval !== interval ||
      item.credits !== credits ||
      item.valid_months !== valid_months ||
      !isPriceValid
    ) {
      console.error("Checkout params validation failed:", {
        product_id,
        expected_credits: item?.credits,
        received_credits: credits,
        expected_valid_months: item?.valid_months,
        received_valid_months: valid_months,
        expected_interval: item?.interval,
        received_interval: interval,
        isPriceValid,
      });
      return respErr("invalid checkout params");
    }

    if (!["year", "month", "one-time"].includes(interval)) {
      return respErr("invalid interval");
    }

    const is_subscription = interval === "month" || interval === "year";

    if (interval === "year" && valid_months !== 12) {
      return respErr("invalid valid_months");
    }

    if (interval === "month" && valid_months !== 1) {
      return respErr("invalid valid_months");
    }

    // 获取用户信息
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth, please sign-in");
    }

    let user_email = await getUserEmail();
    if (!user_email) {
      const user = await findUserByUuid(user_uuid);
      if (user) {
        user_email = user.email;
      }
    }
    if (!user_email) {
      return respErr("invalid user");
    }

    // 创建订单
    const order_no = getSnowId();
    const currentDate = new Date();
    const created_at = currentDate.toISOString();

    let expired_at = "";

    const timePeriod = new Date(currentDate);

    // 特殊处理 2 周通行证
    if (product_id === "premium-2weeks" && valid_months === 0) {
      timePeriod.setDate(currentDate.getDate() + 14);
    } else {
      timePeriod.setMonth(currentDate.getMonth() + valid_months);
    }

    const timePeriodMillis = timePeriod.getTime();
    let delayTimeMillis = 0;

    if (is_subscription) {
      delayTimeMillis = 24 * 60 * 60 * 1000; // 延迟 24 小时过期
    }

    const newTimeMillis = timePeriodMillis + delayTimeMillis;
    const newDate = new Date(newTimeMillis);

    expired_at = newDate.toISOString();

    const order = {
      order_no: order_no,
      created_at: new Date(created_at),
      user_uuid: user_uuid,
      user_email: user_email,
      amount: amount,
      interval: interval,
      expired_at: new Date(expired_at),
      status: "created",
      credits: credits,
      currency: currency,
      product_id: product_id,
      product_name: product_name,
      valid_months: valid_months,
    };
    await insertOrder(order as typeof orders.$inferInsert);

    // 构建成功和取消 URL
    const success_url = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/pay-success/creem/${order_no}`;

    // 金额转换为分（Creem API 需要）
    const amountInCents = Math.round(amount);

    // 如果提供了 Creem 产品 ID，直接使用产品 ID 生成支付链接
    // 否则使用 API 创建支付会话
    let checkout_url: string;
    let session_id: string;

    if (creem_product_id) {
      // 方案 1: 使用产品 ID 直接生成支付链接（更简单）
      const isTestMode = process.env.CREEM_TEST_MODE === "true" || 
                        process.env.NODE_ENV !== "production";
      const baseUrl = isTestMode 
        ? "https://www.creem.io/test/payment"
        : "https://www.creem.io/payment";
      
      checkout_url = `${baseUrl}/${creem_product_id}?order_no=${order_no}&email=${encodeURIComponent(user_email)}`;
      session_id = creem_product_id;
    } else {
      // 方案 2: 使用 Creem API 创建支付会话
      try {
        const checkoutSession = await createCreemCheckoutSession({
          product_id: creem_product_id || product_id,
          product_name: product_name,
          amount: amountInCents,
          currency: currency,
          order_no: order_no,
          user_email: user_email,
          user_uuid: user_uuid,
          credits: credits,
          locale: locale,
          success_url: success_url,
          cancel_url: cancel_url,
          is_subscription: is_subscription,
          interval: interval === "year" ? "year" : "month",
        });

        checkout_url = checkoutSession.checkout_url;
        session_id = checkoutSession.session_id;
      } catch (error: any) {
        console.error("Failed to create Creem checkout session:", error);
        return respErr(`Failed to create Creem checkout: ${error.message}`);
      }
    }

    // 保存会话信息
    const order_detail = JSON.stringify({
      checkout_url,
      session_id,
      creem_product_id: creem_product_id || product_id,
    });

    await updateOrderSession(order_no, session_id, order_detail);

    return respData({
      checkout_url: checkout_url,
      session_id: session_id,
      order_no: order_no,
    });
  } catch (e: any) {
    console.log("creem checkout failed: ", e);
    return respErr("creem checkout failed: " + e.message);
  }
}




