/**
 * @fileoverview Creem 支付服务
 * @description 提供 Creem 支付相关的工具函数，包括创建支付会话、验证 webhook 签名等
 */

import crypto from "crypto";

/**
 * Creem 支付会话创建参数
 */
export interface CreemCheckoutSessionParams {
  product_id: string;
  product_name: string;
  amount: number; // 金额（分）
  currency: string;
  order_no: string;
  user_email: string;
  user_uuid: string;
  credits: number;
  locale: string;
  success_url: string;
  cancel_url: string;
  is_subscription?: boolean;
  interval?: "month" | "year";
}

/**
 * Creem 支付会话响应
 */
export interface CreemCheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

/**
 * 创建 Creem 支付会话
 * @param params 支付会话参数
 * @returns 支付会话信息
 */
export async function createCreemCheckoutSession(
  params: CreemCheckoutSessionParams
): Promise<CreemCheckoutSessionResponse> {
  try {
    const creemApiKey = process.env.CREEM_API_KEY;
    const creemApiUrl = process.env.CREEM_API_URL || "https://api.creem.io/v1";

    // 如果未配置 API Key，使用产品 ID 直接生成支付链接（方案 1）
    if (!creemApiKey) {
      console.log("CREEM_API_KEY not configured, using product ID direct link");
      const isTestMode =
        process.env.CREEM_TEST_MODE === "true" ||
        process.env.NODE_ENV !== "production";
      const baseUrl = isTestMode
        ? "https://www.creem.io/test/payment"
        : "https://www.creem.io/payment";

      const checkoutUrl = `${baseUrl}/${params.product_id}?order_no=${encodeURIComponent(
        params.order_no
      )}&email=${encodeURIComponent(params.user_email)}`;

      return {
        checkout_url: checkoutUrl,
        session_id: params.product_id,
      };
    }

    // 使用 Creem API 创建支付会话（方案 2）
    const requestBody = {
      product_id: params.product_id,
      product_name: params.product_name,
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      order_no: params.order_no,
      customer_email: params.user_email,
      metadata: {
        user_uuid: params.user_uuid,
        credits: params.credits.toString(),
        locale: params.locale,
      },
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      ...(params.is_subscription && {
        subscription: {
          interval: params.interval || "month",
        },
      }),
    };

    const response = await fetch(`${creemApiUrl}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creemApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Creem API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    return {
      checkout_url: data.checkout_url || data.url || data.payment_url,
      session_id: data.session_id || data.id || params.order_no,
    };
  } catch (error: any) {
    console.error("Failed to create Creem checkout session:", error);
    throw error;
  }
}

/**
 * 验证 Creem Webhook 签名
 * @param body 请求体（原始字符串）
 * @param signature 签名（从请求头获取）
 * @param secret Webhook 密钥
 * @returns 是否验证通过
 */
export function verifyCreemWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      return false;
    }

    // Creem 可能使用 HMAC-SHA256 签名
    // 格式可能是: sha256=xxx 或直接是签名值
    let expectedSignature = signature.trim();

    // 如果签名包含算法前缀，提取签名值
    if (expectedSignature.includes("=")) {
      expectedSignature = expectedSignature.split("=")[1].trim();
    }

    // 计算 HMAC-SHA256
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const calculatedSignature = hmac.digest("hex");

    // 转换为 Buffer 进行比较
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const calculatedBuffer = Buffer.from(calculatedSignature, "hex");

    // 长度必须相同才能使用 timingSafeEqual
    if (expectedBuffer.length !== calculatedBuffer.length) {
      return false;
    }

    // 使用时间安全比较防止时序攻击
    return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
  } catch (error) {
    console.error("Failed to verify Creem webhook signature:", error);
    return false;
  }
}

/**
 * 解析 Creem Webhook 事件
 * @param eventData 事件数据（已解析的 JSON 对象）
 * @returns 事件类型和数据
 */
export function parseCreemWebhookEvent(eventData: any): {
  type: string;
  data: any;
} {
  // Creem webhook 事件可能的结构：
  // 1. { type: "payment.succeeded", data: {...} }
  // 2. { event: "payment.succeeded", ... }
  // 3. { status: "paid", order_no: "...", ... }

  let eventType = "";
  let eventData_obj = eventData;

  // 尝试从不同可能的字段获取事件类型
  if (eventData.type) {
    eventType = eventData.type;
    eventData_obj = eventData.data || eventData;
  } else if (eventData.event) {
    eventType = eventData.event;
    eventData_obj = eventData;
  } else if (eventData.status) {
    // 如果只有 status，根据 status 推断事件类型
    const status = eventData.status.toLowerCase();
    if (status === "paid" || status === "succeeded" || status === "completed") {
      eventType = "payment.succeeded";
    } else if (status === "failed" || status === "failed") {
      eventType = "payment.failed";
    } else {
      eventType = "payment.unknown";
    }
    eventData_obj = eventData;
  } else {
    // 默认假设是支付成功事件
    eventType = "payment.succeeded";
    eventData_obj = eventData;
  }

  return {
    type: eventType,
    data: eventData_obj,
  };
}

