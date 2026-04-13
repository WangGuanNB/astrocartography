/**
 * @fileoverview PayPal 支付服务
 * @description 使用 fetch 直接调用 PayPal REST API，兼容 Cloudflare Workers（避免 SDK 的 https.request 超时）
 */

const PAYPAL_API_TIMEOUT_MS = 25000; // 25s，留余量避免 Workers 超时

/**
 * PayPal 支付订单创建参数
 */
export interface PayPalOrderParams {
  amount: number; // 金额（分）
  currency: string;
  order_no: string;
  product_name: string;
  user_email?: string;
  success_url: string;
  cancel_url: string;
  metadata?: {
    order_no: string;
    user_email?: string;
    user_uuid?: string;
    credits?: number;
    product_id?: string;
  };
}

/**
 * PayPal 支付订单响应
 */
export interface PayPalOrderResponse {
  order_id: string;
  approval_url: string;
}

function getPayPalBaseUrl(): string {
  const env = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const baseUrl = getPayPalBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PAYPAL_API_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || "Failed to get PayPal access token");
    }
    return data.access_token;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 创建 PayPal 支付订单（使用 fetch，兼容 Cloudflare Workers）
 */
export async function createPayPalOrder(
  params: PayPalOrderParams
): Promise<PayPalOrderResponse> {
  try {
    const token = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();
    const amountValue = (params.amount / 100).toFixed(2);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYPAL_API_TIMEOUT_MS);

    try {
      const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: params.order_no,
              invoice_id: params.order_no,
              custom_id: params.order_no,
              description: params.product_name,
              amount: {
                currency_code: params.currency.toUpperCase(),
                value: amountValue,
              },
            },
          ],
          application_context: {
            brand_name: process.env.NEXT_PUBLIC_PROJECT_NAME || "AstroCartography",
            landing_page: "BILLING",
            user_action: "PAY_NOW",
            return_url: params.success_url,
            cancel_url: params.cancel_url,
          },
        }),
        signal: controller.signal,
      });

      const orderResult = await res.json();
      if (!res.ok) {
        // 🔔 记录 PayPal API 创建订单失败日志
        const { logPayPalError, PayPalLogEvent } = await import("@/lib/paypal-logger");
        logPayPalError(PayPalLogEvent.API_ORDER_CREATE, new Error(orderResult.message || orderResult.details?.[0]?.description || "Failed to create PayPal order"), {
          order_no: params.order_no,
          amount: params.amount,
          currency: params.currency,
          api_status: res.status,
          api_response: orderResult,
        });
        throw new Error(orderResult.message || orderResult.details?.[0]?.description || "Failed to create PayPal order");
      }

      const approvalUrl = orderResult.links?.find((l: { rel?: string }) => l.rel === "approve")?.href;
      if (!orderResult.id || !approvalUrl) {
        // 🔔 记录 PayPal API 响应格式错误日志
        const { logPayPalError, PayPalLogEvent } = await import("@/lib/paypal-logger");
        logPayPalError(PayPalLogEvent.API_ORDER_CREATE, new Error("Failed to get PayPal approval URL"), {
          order_no: params.order_no,
          api_response: orderResult,
        });
        throw new Error("Failed to get PayPal approval URL");
      }

      return { order_id: orderResult.id, approval_url: approvalUrl };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      // 🔔 记录 PayPal API 超时日志
      const { logPayPalError, PayPalLogEvent } = await import("@/lib/paypal-logger");
      logPayPalError(PayPalLogEvent.API_ORDER_CREATE, new Error("PayPal API request timed out"), {
        order_no: params.order_no,
        timeout_ms: PAYPAL_API_TIMEOUT_MS,
      });
      throw new Error("PayPal API request timed out. Please try again.");
    }
    // 🔔 记录 PayPal API 创建订单异常日志（如果上面没有记录）
    if (!error.message.includes("PayPal API request timed out") && !error.message.includes("Failed to get PayPal approval URL") && !error.message.includes("Failed to create PayPal order")) {
      const { logPayPalError, PayPalLogEvent } = await import("@/lib/paypal-logger");
      logPayPalError(PayPalLogEvent.API_ORDER_CREATE, error, {
        order_no: params.order_no,
        amount: params.amount,
        currency: params.currency,
      });
    }
    console.error("Failed to create PayPal order:", error);
    throw error;
  }
}

/**
 * 捕获 PayPal 订单（支付成功后）
 */
export async function capturePayPalOrder(orderId: string) {
  try {
    // 🔔 记录 PayPal 订单捕获开始日志
    const { logPayPalEvent, logPayPalError, PayPalLogEvent } = await import("@/lib/paypal-logger");
    logPayPalEvent(PayPalLogEvent.API_ORDER_CAPTURE, undefined, {
      paypal_order_id: orderId,
    });

    const token = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYPAL_API_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        // 🔔 记录 PayPal API 捕获订单失败日志
        logPayPalError(PayPalLogEvent.API_ORDER_CAPTURE, new Error(data.message || data.details?.[0]?.description || "Capture failed"), {
          paypal_order_id: orderId,
          api_status: res.status,
          api_response: data,
        });
        throw new Error(data.message || data.details?.[0]?.description || "Capture failed");
      }
      
      // 🔔 记录 PayPal 订单捕获成功日志
      logPayPalEvent(PayPalLogEvent.API_ORDER_CAPTURE, undefined, {
        paypal_order_id: orderId,
        capture_status: data.status,
        capture_id: data.id,
      });
      
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      // 🔔 记录 PayPal API 捕获超时日志
      const { logPayPalError, PayPalLogEvent } = await import("@/lib/paypal-logger");
      logPayPalError(PayPalLogEvent.API_ORDER_CAPTURE, new Error("PayPal capture timed out"), {
        paypal_order_id: orderId,
        timeout_ms: PAYPAL_API_TIMEOUT_MS,
      });
      throw new Error("PayPal capture timed out");
    }
    // 🔔 记录 PayPal API 捕获订单异常日志（如果上面没有记录）
    if (!error.message.includes("PayPal capture timed out") && !error.message.includes("Capture failed")) {
      const { logPayPalError, PayPalLogEvent } = await import("@/lib/paypal-logger");
      logPayPalError(PayPalLogEvent.API_ORDER_CAPTURE, error, {
        paypal_order_id: orderId,
      });
    }
    console.error("Failed to capture PayPal order:", error);
    throw error;
  }
}

/**
 * 获取 PayPal 订单详情
 */
export async function getPayPalOrder(orderId: string) {
  try {
    const token = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYPAL_API_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Get order failed");
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    if (error.name === "AbortError") throw new Error("PayPal get order timed out");
    console.error("Failed to get PayPal order:", error);
    throw error;
  }
}

/**
 * 验证 PayPal Webhook 签名
 * 调用 PayPal 官方 /v1/notifications/verify-webhook-signature API 进行真实验证
 * @param body 请求体（原始字符串）
 * @param headers 请求头
 * @param webhookId Webhook ID（从环境变量获取）
 * @returns 是否验证通过
 */
export async function verifyPayPalWebhookSignature(
  body: string,
  headers: Headers,
  webhookId?: string
): Promise<boolean> {
  try {
    const authAlgo = headers.get("PAYPAL-AUTH-ALGO");
    const certUrl = headers.get("PAYPAL-CERT-URL");
    const transmissionId = headers.get("PAYPAL-TRANSMISSION-ID");
    const transmissionSig = headers.get("PAYPAL-TRANSMISSION-SIG");
    const transmissionTime = headers.get("PAYPAL-TRANSMISSION-TIME");

    if (
      !authAlgo ||
      !certUrl ||
      !transmissionId ||
      !transmissionSig ||
      !transmissionTime
    ) {
      console.error("❌ [PayPal Sig] 缺少必要的 Webhook 请求头", {
        authAlgo: !!authAlgo,
        certUrl: !!certUrl,
        transmissionId: !!transmissionId,
        transmissionSig: !!transmissionSig,
        transmissionTime: !!transmissionTime,
      });
      return false;
    }

    const configuredWebhookId = webhookId || process.env.PAYPAL_WEBHOOK_ID;
    if (!configuredWebhookId) {
      // 未配置 Webhook ID：无法验证，返回 false（调用方决定是否继续）
      console.warn("⚠️ [PayPal Sig] 未配置 PAYPAL_WEBHOOK_ID，无法验证签名");
      return false;
    }

    // 解析请求体（verify-webhook-signature API 需要传入事件对象）
    let webhookEvent: any;
    try {
      webhookEvent = JSON.parse(body);
    } catch (e) {
      console.error("❌ [PayPal Sig] 请求体 JSON 解析失败");
      return false;
    }

    // 调用 PayPal 官方签名验证 API
    // 参考：https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
    const token = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYPAL_API_TIMEOUT_MS);

    try {
      const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: configuredWebhookId,
          webhook_event: webhookEvent,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ [PayPal Sig] 签名验证 API 响应错误:", res.status, data);
        return false;
      }

      const isValid = data.verification_status === "SUCCESS";
      if (isValid) {
        console.log("✅ [PayPal Sig] 签名验证通过");
      } else {
        console.error("❌ [PayPal Sig] 签名验证失败，verification_status:", data.verification_status);
      }
      return isValid;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("❌ [PayPal Sig] 签名验证异常:", error);
    return false;
  }
}

/**
 * 解析 PayPal Webhook 事件
 * @param eventData 事件数据（已解析的 JSON 对象）
 * @returns 事件类型和数据
 */
export function parsePayPalWebhookEvent(eventData: any): {
  type: string;
  data: any;
} {
  // PayPal webhook 事件结构：
  // { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {...} }
  let eventType = "";
  let eventData_obj = eventData;

  if (eventData.event_type) {
    eventType = eventData.event_type;
    eventData_obj = eventData.resource || eventData;
  } else if (eventData.type) {
    eventType = eventData.type;
    eventData_obj = eventData.data || eventData;
  } else {
    // 默认假设是支付完成事件
    eventType = "PAYMENT.CAPTURE.COMPLETED";
    eventData_obj = eventData;
  }

  return {
    type: eventType,
    data: eventData_obj,
  };
}

/**
 * 判断是否为 PayPal 测试模式
 * @returns 是否为测试模式
 */
export function isPayPalTestMode(): boolean {
  return process.env.PAYPAL_ENVIRONMENT === "sandbox";
}
