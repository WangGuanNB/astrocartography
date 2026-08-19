/**
 * @fileoverview Creem 支付 Checkout API
 * @description 创建 Creem 支付会话并返回支付链接
 */

import { getUserEmail, getUserUuid } from "@/services/user";
import { findOrderByOrderNo, insertOrder, updateOrderSession } from "@/models/order";
import { respData, respErr } from "@/lib/resp";

import { Order } from "@/types/order";
import { findUserByUuid } from "@/models/user";
import { getSnowId } from "@/lib/hash";
import { getPricingPage } from "@/services/page";
import { PricingItem } from "@/types/blocks/pricing";
import { orders } from "@/db/schema";
import { createCreemCheckoutSession } from "@/services/creem";
import {
  getGaClientIdFromRequest,
  reportCheckoutCreated,
} from "@/lib/ga4-server-events";

export async function POST(req: Request) {
  try {
    const ga_client_id = getGaClientIdFromRequest(req);
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
      existing_order_no,
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

    let order_no = typeof existing_order_no === "string" ? existing_order_no : "";

    if (order_no) {
      const existing = await findOrderByOrderNo(order_no);
      if (
        !existing ||
        existing.user_uuid !== user_uuid ||
        existing.status !== "created" ||
        existing.product_id !== product_id
      ) {
        return respErr("invalid existing order");
      }
    } else {
      // 创建订单
      order_no = getSnowId();
      const currentDate = new Date();
      const created_at = currentDate.toISOString();

      let expired_at = "";

      const timePeriod = new Date(currentDate);

      // 🔥 特殊处理：永久有效的套餐（valid_months === 0 且 one-time）
      if (valid_months === 0 && interval === "one-time") {
        // 永久有效：设置为 2099-12-31 23:59:59
        timePeriod.setFullYear(2099, 11, 31); // 11 = 12月（0-based）
        timePeriod.setHours(23, 59, 59, 999);
      } else if (product_id === "premium-2weeks" && valid_months === 0) {
        // 特殊处理 2 周通行证
        timePeriod.setDate(currentDate.getDate() + 14);
      } else {
        // 正常处理：按月计算
        timePeriod.setMonth(currentDate.getMonth() + valid_months);
      }

      const timePeriodMillis = timePeriod.getTime();
      // 订阅订单支付成功后立即开始计算有效期，不再延迟
      const newDate = new Date(timePeriodMillis);

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
        pay_type: "creem",
      };
      await insertOrder(order as typeof orders.$inferInsert);
    }

    // 构建成功和取消 URL
    // 🔥 根据 Creem 文档：支付成功后会重定向到 success_url，并带有查询参数
    // - 如果使用 API 创建 checkout：会带有 request_id（对应我们传递的 request_id）
    // - 如果使用产品 ID 直接链接：我们可以在 URL 中添加 order_no 参数
    // 为了兼容两种方式，我们使用查询参数方式，支持 request_id 和 order_no
    // 注意：Creem API 会自动添加 request_id 参数，所以我们不需要在 URL 中手动添加
    const success_url = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/pay-success/creem`;

    // 金额转换为分（Creem API 需要）
    const amountInCents = Math.round(amount);

    // 🔥 优先使用 Creem API 创建支付会话（如果配置了 CREEM_API_KEY）
    // 如果 API 失败，自动回退到产品 ID 直接链接方式
    let checkout_url: string | undefined;
    let session_id: string | undefined;

    const creemApiKey = process.env.CREEM_API_KEY;
    
    if (creemApiKey) {
      // 方案 1: 使用 Creem API 创建支付会话（推荐，可以传递 referenceId 和 metadata）
      try {
        console.log("🔔 [Creem Checkout] 尝试使用 API 方式创建支付会话");
        const checkoutSession = await createCreemCheckoutSession({
          product_id: creem_product_id || product_id,
          product_name: product_name,
          amount: amountInCents,
          currency: currency,
          order_no: order_no, // 作为 referenceId 传递
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
        console.log("✅ [Creem Checkout] API 支付会话创建成功:", { checkout_url, session_id });
      } catch (error: any) {
        console.error("❌ [Creem Checkout] API 创建支付会话失败:", error);
        console.warn("⚠️ [Creem Checkout] API 方式失败，回退到产品 ID 直接链接方式");
        // 继续执行，使用产品 ID 方式
      }
    }

    // 方案 2: 如果未配置 API Key 或 API 调用失败，使用产品 ID 直接链接方式
    if (!checkout_url) {
      if (!creem_product_id) {
        return respErr("Creem product ID is required when API Key is not configured");
      }

      console.log("🔔 [Creem Checkout] 使用产品 ID 直接链接方式");
      const { isCreemTestMode } = await import("@/services/config");
      const isTestMode = isCreemTestMode();
      const baseUrl = isTestMode 
        ? "https://www.creem.io/test/payment"
        : "https://www.creem.io/payment";
      
      // 🔥 关键：将 order_no 和 email 作为 URL 参数传递
      // 支付成功后，Creem 会重定向到 success_url，order_no 会在 URL 中
      checkout_url = `${baseUrl}/${creem_product_id}?order_no=${encodeURIComponent(order_no)}&email=${encodeURIComponent(user_email)}`;
      session_id = creem_product_id;
      console.log("✅ [Creem Checkout] 产品 ID 支付链接生成成功:", { checkout_url });
    }

    // 确保 checkout_url 和 session_id 都有值
    if (!checkout_url || !session_id) {
      return respErr("Failed to create checkout session");
    }

    // 保存会话信息
    // 🔥 关键：将 order_no 也保存到 order_detail，方便后续匹配
    const order_detail = JSON.stringify({
      checkout_url,
      session_id,
      creem_product_id: creem_product_id || product_id,
      order_no: order_no, // 保存订单号，方便 webhook 匹配
      user_email: user_email, // 保存邮箱，方便匹配
      amount: amountInCents, // 保存金额，方便匹配
      ga_client_id,
    });

    await updateOrderSession(order_no, session_id, order_detail);
    void reportCheckoutCreated({
      provider: "creem",
      transactionId: order_no,
      amount: amountInCents,
      currency,
      productId: product_id,
      productName: product_name,
      gaClientId: ga_client_id,
    });

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


