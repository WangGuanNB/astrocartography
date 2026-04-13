/**
 * @fileoverview PayPal Webhook 通知处理
 * @description 处理 PayPal 支付成功回调
 */

import { handlePayPalOrder } from "@/services/order";
import { respOk } from "@/lib/resp";
import {
  verifyPayPalWebhookSignature,
  parsePayPalWebhookEvent,
} from "@/services/paypal";
import { logPayPalEvent, logPayPalError, logPayPalWarning, PayPalLogEvent } from "@/lib/paypal-logger";

export async function POST(req: Request) {
  try {
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!paypalClientId || !paypalClientSecret) {
      logPayPalError(PayPalLogEvent.ERROR, new Error("invalid PayPal config"), {});
      throw new Error("invalid PayPal config");
    }

    const body = await req.text();
    if (!body) {
      logPayPalError(PayPalLogEvent.WEBHOOK_RECEIVED, new Error("invalid notify data"), {});
      throw new Error("invalid notify data");
    }

    // 🔔 记录 Webhook 接收日志
    logPayPalEvent(PayPalLogEvent.WEBHOOK_RECEIVED, undefined, {
      body_length: body.length,
      has_webhook_id: !!paypalWebhookId,
    });

    // 验证 Webhook 签名
    const headers = req.headers;
    const isValid = await verifyPayPalWebhookSignature(
      body,
      headers,
      paypalWebhookId
    );

    // 🔔 记录 Webhook 签名验证日志
    if (isValid) {
      logPayPalEvent(PayPalLogEvent.WEBHOOK_VERIFIED, undefined, {});
    } else if (paypalWebhookId) {
      // 生产环境：配置了 PAYPAL_WEBHOOK_ID 但验证失败 → 拒绝请求，防止伪造攻击
      logPayPalError(PayPalLogEvent.WEBHOOK_VERIFIED, new Error("Webhook 签名验证失败，拒绝请求"), {
        has_webhook_id: true,
      });
      console.error("❌ [PayPal Webhook] 签名验证失败，返回 401");
      return Response.json({ error: "invalid webhook signature" }, { status: 401 });
    } else {
      // 开发/沙盒：未配置 PAYPAL_WEBHOOK_ID → 跳过验证，仅记录警告
      logPayPalWarning(PayPalLogEvent.WEBHOOK_VERIFIED, "未配置 PAYPAL_WEBHOOK_ID，跳过签名验证（仅限开发/沙盒环境）", {});
      console.warn("⚠️ [PayPal Webhook] 未配置 PAYPAL_WEBHOOK_ID，跳过签名验证");
    }

    // 解析事件数据
    const eventData = JSON.parse(body);
    const { type, data } = parsePayPalWebhookEvent(eventData);

    // 🔔 记录 Webhook 事件解析日志
    logPayPalEvent(PayPalLogEvent.WEBHOOK_PROCESSED, undefined, {
      event_type: type,
      paypal_order_id: data.supplementary_data?.related_ids?.order_id || data.order_id || undefined,
      capture_id: data.id || undefined,
      capture_status: data.status || undefined,
    });

    console.log("🔔 [PayPal Webhook] 收到事件:", type);
    console.log("🔔 [PayPal Webhook] 事件数据:", JSON.stringify(data, null, 2));

    // 仅对「支付已捕获」类事件标记订单为已支付。
    // PAYMENT.CAPTURE.COMPLETED: 资金已入账，resource 为 Capture，含 supplementary_data.related_ids.order_id。
    // CHECKOUT.ORDER.APPROVED: 仅买家同意，未捕获，不标记已支付。
    // PAYMENT.SALE.COMPLETED: 旧版 API 的支付完成事件。
    switch (type) {
      case "PAYMENT.CAPTURE.COMPLETED":
      case "PAYMENT.SALE.COMPLETED": {
        await handlePayPalOrder(data, type);
        break;
      }
      case "CHECKOUT.ORDER.APPROVED":
        logPayPalEvent(PayPalLogEvent.WEBHOOK_PROCESSED, undefined, {
          event_type: type,
          skipped: true,
          reason: "仅买家同意，未捕获，不标记已支付",
        });
        console.log("⚠️ [PayPal Webhook] CHECKOUT.ORDER.APPROVED 已跳过（不标记已支付）");
        break;

      default:
        logPayPalWarning(PayPalLogEvent.WEBHOOK_PROCESSED, `未处理的事件类型: ${type}`, {
          event_type: type,
        });
        console.log("⚠️ [PayPal Webhook] 未处理的事件类型:", type);
    }

    return respOk();
  } catch (e: any) {
    logPayPalError(PayPalLogEvent.ERROR, e, {
      error_message: e.message,
      error_stack: e.stack,
    });
    console.log("paypal notify failed: ", e);
    return Response.json(
      { error: `handle paypal notify failed: ${e.message}` },
      { status: 500 }
    );
  }
}
