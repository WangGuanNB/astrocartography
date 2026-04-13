import { findOrderByOrderNo, OrderStatus, updateOrderStatus } from "@/models/order";
import { updateCreditForOrder } from "@/services/credit";
import { updateAffiliateForOrder } from "@/services/affiliate";
import { sendOrderConfirmationEmail } from "@/services/email";
import { getIsoTimestr } from "@/lib/time";
import { Order } from "@/types/order";
import PaymentSuccess from "@/components/payment/payment-success";
import { logCreemEvent, logCreemError } from "@/lib/paypal-logger";

/**
 * Creem 支付成功页面（查询参数方式）
 * 当使用 Creem API 创建 checkout 时，支付成功后会重定向到这里，并带有查询参数：
 * - request_id: 创建 checkout 时传递的 request_id（对应我们的 order_no）
 * - checkout_id, order_id, customer_id 等
 * 
 * 当使用产品 ID 直接链接时，也会重定向到这里，并带有 order_no 查询参数
 */
export default async function ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ 
    request_id?: string; 
    order_no?: string;
    checkout_id?: string; 
    order_id?: string; 
    customer_id?: string;
    product_id?: string;
    [key: string]: string | undefined;
  }>;
}) {
  let redirectLocale = "en";

  try {
    const { locale } = await params;
    const urlSearchParams = await searchParams;
    
    if (locale) {
      redirectLocale = locale;
    }

    // 🔥 优先从查询参数 request_id 获取订单号（Creem API 方式）
    // 如果没有，则从 order_no 查询参数获取（产品 ID 直接链接方式）
    const order_no = urlSearchParams.request_id || urlSearchParams.order_no;

    if (!order_no) {
      console.error("❌ [Creem Pay Success] 无法获取订单号", {
        request_id: urlSearchParams.request_id,
        order_no: urlSearchParams.order_no,
        all_search_params: urlSearchParams,
      });
      // 即使没有订单号，也显示成功页面（但订单信息可能不完整）
      return (
        <PaymentSuccess
          orderNo=""
          locale={redirectLocale}
        />
      );
    }

    logCreemEvent("SUCCESS_PAGE_ACCESSED", { order_no });
    console.log("🔔 [Creem Pay Success] 获取到订单号:", {
      order_no,
      source: urlSearchParams.request_id ? "request_id (API方式)" : "order_no (产品ID方式)",
      all_params: urlSearchParams,
    });

    // 查询订单
    const order = await findOrderByOrderNo(order_no);
    if (!order) {
      console.error("❌ [Creem Pay Success] Order not found:", order_no);
      // 即使找不到订单，也显示成功页面
      return (
        <PaymentSuccess
          orderNo={order_no}
          locale={redirectLocale}
        />
      );
    }

    // 🔥 关键：检查订单状态，只有 Created 状态的订单才需要处理
    if (order.status === OrderStatus.Created) {
      console.log("🔔 [Creem Pay Success] 订单状态为 Created，开始处理订单:", order_no);
      
      try {
        // 🔥 直接更新订单状态，避免调用可能出错的 handleCreemOrder
        const paid_at = getIsoTimestr();
        const paid_email = order.user_email || urlSearchParams.customer_id || "";
        const paid_detail = JSON.stringify({
          request_id: order_no,
          checkout_id: urlSearchParams.checkout_id,
          order_id: urlSearchParams.order_id,
          customer_id: urlSearchParams.customer_id,
          product_id: urlSearchParams.product_id,
          signature: urlSearchParams.signature,
        });

        // 更新订单状态
        await updateOrderStatus(
          order_no,
          OrderStatus.Paid,
          paid_at,
          paid_email,
          paid_detail
        );
        console.log("✅ [Creem Pay Success] 订单状态已更新为 Paid:", order_no);

        // 发放积分
        if (order.user_uuid && order.credits > 0) {
          try {
            await updateCreditForOrder(order as unknown as Order);
            logCreemEvent("CREDITS_ISSUED_VIA_PAGE", { order_no, user_email: order.user_email ?? undefined, amount: order.amount ?? undefined, currency: order.currency ?? undefined, credits: order.credits ?? undefined });
            console.log("✅ [Creem Pay Success] 积分已发放:", order.credits);
          } catch (e: any) {
            console.error("❌ [Creem Pay Success] 发放积分失败:", e);
            // 积分发放失败不影响订单处理
          }
        }

        // 更新推荐人收益
        if (order.user_uuid) {
          try {
            await updateAffiliateForOrder(order as unknown as Order);
            console.log("✅ [Creem Pay Success] 推荐人收益已更新");
          } catch (e: any) {
            console.error("❌ [Creem Pay Success] 更新推荐人收益失败:", e);
            // 推荐人收益更新失败不影响订单处理
          }
        }

        // 发送订单确认邮件
        if (paid_email) {
          try {
            await sendOrderConfirmationEmail({
              order: order as unknown as Order,
              customerEmail: paid_email,
            });
            console.log("✅ [Creem Pay Success] 订单确认邮件已发送");
          } catch (e: any) {
            console.error("❌ [Creem Pay Success] 发送邮件失败:", e);
            // 邮件发送失败不影响订单处理
          }
        }

        console.log("✅ [Creem Pay Success] 订单处理完成:", order_no);
      } catch (e: any) {
        console.error("❌ [Creem Pay Success] 订单处理失败:", e);
        console.error("❌ [Creem Pay Success] 错误堆栈:", e.stack);
        // 即使处理失败，也跳转到订单页面
      }
    } else if (order.status === OrderStatus.Paid) {
      console.log("✅ [Creem Pay Success] 订单已处理（Paid）:", order_no);
    } else {
      console.log("⚠️ [Creem Pay Success] 订单状态异常:", order_no, order.status);
    }

    // 🔥 显示支付成功页面，而不是直接跳转
    return (
      <PaymentSuccess
        orderNo={order.order_no}
        productName={order.product_name || undefined}
        amount={order.amount || undefined}
        currency={order.currency || "USD"}
        credits={order.credits || undefined}
        locale={redirectLocale}
      />
    );
  } catch (e: any) {
    logCreemError("PAGE_ERROR", e, {});
    console.error("Handle Creem payment success failed:", e);
    // 即使处理失败，也显示成功页面（但可能订单信息不完整）
    // 重新获取参数，因为可能在 try 块外部
    try {
      const { locale: catchLocale } = await params;
      const catchSearchParams = await searchParams;
      const catchOrderNo = catchSearchParams.request_id || catchSearchParams.order_no || "";
      const catchRedirectLocale = catchLocale || redirectLocale;
      
      return (
        <PaymentSuccess
          orderNo={catchOrderNo}
          locale={catchRedirectLocale}
        />
      );
    } catch (innerE: any) {
      // 如果连参数都获取不到，显示默认成功页面
      return (
        <PaymentSuccess
          orderNo=""
          locale={redirectLocale}
        />
      );
    }
  }
}

