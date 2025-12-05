import {
  CreditsTransType,
  increaseCredits,
  updateCreditForOrder,
} from "./credit";
import {
  findOrderByOrderNo,
  OrderStatus,
  updateOrderStatus,
} from "@/models/order";
import { getIsoTimestr } from "@/lib/time";

import Stripe from "stripe";
import { updateAffiliateForOrder } from "./affiliate";
import { Order } from "@/types/order";
import { sendOrderConfirmationEmail } from "./email";

/**
 * Creem 支付数据接口
 */
interface CreemPaymentData {
  order_no?: string;
  order_id?: string;
  metadata?: {
    order_no?: string;
    user_email?: string;
    user_uuid?: string;
    credits?: string;
  };
  customer_email?: string;
  email?: string;
  status?: string;
  payment_status?: string;
  amount?: number;
  currency?: string;
  [key: string]: any;
}

export async function handleOrderSession(session: Stripe.Checkout.Session) {
  try {
    if (
      !session ||
      !session.metadata ||
      !session.metadata.order_no ||
      session.payment_status !== "paid"
    ) {
      throw new Error("invalid session");
    }

    const order_no = session.metadata.order_no;
    const paid_email =
      session.customer_details?.email || session.customer_email || "";
    const paid_detail = JSON.stringify(session);

    const order = await findOrderByOrderNo(order_no);
    if (!order || order.status !== OrderStatus.Created) {
      throw new Error("invalid order");
    }

    const paid_at = getIsoTimestr();
    await updateOrderStatus(
      order_no,
      OrderStatus.Paid,
      paid_at,
      paid_email,
      paid_detail
    );

    if (order.user_uuid) {
      if (order.credits > 0) {
        // increase credits for paied order
        await updateCreditForOrder(order as unknown as Order);
      }

      // update affiliate for paied order
      await updateAffiliateForOrder(order as unknown as Order);
    }

    // send order confirmation email
    if (paid_email) {
      try {
        await sendOrderConfirmationEmail({
          order: order as unknown as Order,
          customerEmail: paid_email,
        });
      } catch (e) {
        console.log("send order confirmation email failed: ", e);
        // Don't throw error, just log it
      }
    }

    console.log(
      "handle order session successed: ",
      order_no,
      paid_at,
      paid_email,
      paid_detail
    );
  } catch (e) {
    console.log("handle order session failed: ", e);
    throw e;
  }
}

/**
 * 处理 Creem 支付成功回调
 */
export async function handleCreemOrder(data: CreemPaymentData) {
  try {
    // 从多个可能的位置获取订单号
    const order_no =
      data.order_no ||
      data.order_id ||
      data.metadata?.order_no ||
      data.metadata?.order_id ||
      "";

    if (!order_no) {
      throw new Error("order_no not found in Creem payment data");
    }

    // 检查支付状态
    const paymentStatus = data.status || data.payment_status || "";
    if (paymentStatus !== "paid" && paymentStatus !== "succeeded" && paymentStatus !== "completed") {
      console.log("Payment status is not paid:", paymentStatus);
      return; // 不是成功状态，不处理
    }

    // 获取支付邮箱
    const paid_email =
      data.customer_email ||
      data.email ||
      data.metadata?.user_email ||
      "";

    const paid_detail = JSON.stringify(data);

    // 查找订单
    const order = await findOrderByOrderNo(order_no);
    if (!order) {
      console.error("Order not found:", order_no);
      throw new Error("invalid order: order not found");
    }

    // 检查订单状态（防止重复处理）
    if (order.status !== OrderStatus.Created) {
      console.log("Order already processed:", order_no, order.status);
      return; // 订单已处理，直接返回
    }

    // 更新订单状态
    const paid_at = getIsoTimestr();
    await updateOrderStatus(
      order_no,
      OrderStatus.Paid,
      paid_at,
      paid_email,
      paid_detail
    );

    // 发放积分
    if (order.user_uuid) {
      if (order.credits > 0) {
        await updateCreditForOrder(order as unknown as Order);
      }

      // 更新推荐人收益
      await updateAffiliateForOrder(order as unknown as Order);
    }

    // 发送订单确认邮件
    if (paid_email) {
      try {
        await sendOrderConfirmationEmail({
          order: order as unknown as Order,
          customerEmail: paid_email,
        });
      } catch (e) {
        console.log("send order confirmation email failed: ", e);
        // 邮件发送失败不影响订单处理
      }
    }

    console.log(
      "handle creem order successed: ",
      order_no,
      paid_at,
      paid_email
    );
  } catch (e: any) {
    console.error("handle creem order failed: ", e);
    throw e;
  }
}
