/**
 * @fileoverview Creem Webhook 处理路由
 * @description 处理 Creem 支付成功的回调通知
 */

import { handleCreemOrder } from "@/services/order";
import { respOk, respErr } from "@/lib/resp";
import { verifyCreemWebhookSignature, parseCreemWebhookEvent } from "@/services/creem";

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("CREEM_WEBHOOK_SECRET is not configured");
      return respErr("webhook secret not configured");
    }

    // 获取请求签名
    const signature = req.headers.get("x-creem-signature") || 
                     req.headers.get("creem-signature") ||
                     req.headers.get("signature") || 
                     "";

    // 读取请求体
    const body = await req.text();

    if (!body) {
      return respErr("invalid request body");
    }

    // 验证签名（如果 Creem 提供签名验证）
    if (signature) {
      const isValid = verifyCreemWebhookSignature(
        body,
        signature,
        webhookSecret
      );

      if (!isValid) {
        console.error("Invalid Creem webhook signature");
        return Response.json({ error: "invalid signature" }, { status: 401 });
      }
    }

    // 解析事件
    let eventData: any;
    try {
      eventData = JSON.parse(body);
    } catch (e) {
      console.error("Failed to parse webhook body:", e);
      return respErr("invalid json body");
    }

    console.log("creem webhook event received:", eventData);

    // 解析事件类型和数据
    const { type, data } = parseCreemWebhookEvent(eventData);

    // 处理不同类型的事件
    switch (type) {
      case "payment.succeeded":
      case "payment.success":
      case "checkout.completed":
      case "charge.succeeded": {
        // 处理支付成功事件
        await handleCreemOrder(data);
        break;
      }

      case "payment.failed":
      case "charge.failed": {
        // 处理支付失败事件（可选）
        console.log("Payment failed:", data);
        break;
      }

      case "subscription.created":
      case "subscription.updated": {
        // 处理订阅事件（可选）
        console.log("Subscription event:", data);
        break;
      }

      default:
        console.log("Unhandled Creem webhook event type:", type);
    }

    return respOk();
  } catch (e: any) {
    console.error("creem webhook failed: ", e);
    return Response.json(
      { error: `handle creem webhook failed: ${e.message}` },
      { status: 500 }
    );
  }
}

// 支持 GET 请求用于验证（某些平台需要）
export async function GET(req: Request) {
  return Response.json({ message: "Creem Webhook endpoint is active" });
}




