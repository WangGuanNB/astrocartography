import { findOrderByOrderNo, OrderStatus } from "@/models/order";
import { capturePayPalOrder } from "@/services/paypal";
import { handlePayPalOrder } from "@/services/order";
import PaymentSuccess from "@/components/payment/payment-success";
import { logPayPalEvent, logPayPalError, logPayPalWarning, PayPalLogEvent } from "@/lib/paypal-logger";

/**
 * PayPal 支付成功页面
 * PayPal 支付成功后会重定向到这里，并带有查询参数：
 * - order_no: 我们的订单号
 * - token: PayPal 返回的 token（可选）
 * - PayerID: PayPal 返回的 PayerID（可选）
 *
 * 注意：PayPal 的订单处理主要通过 Webhook 完成，这个页面主要用于：
 * 1. 捕获订单（如果还没有被捕获）
 * 2. 显示支付成功页面
 */
export default async function ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    order_no?: string;
    token?: string;
    PayerID?: string;
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

    // 从查询参数获取订单号
    const order_no = urlSearchParams.order_no;

    // 🔔 记录支付成功页面访问日志
    logPayPalEvent(PayPalLogEvent.SUCCESS_PAGE_ACCESSED, undefined, {
      order_no: order_no || undefined,
      metadata: {
        token: urlSearchParams.token,
        payer_id: urlSearchParams.PayerID,
        locale: redirectLocale,
      },
    });

    if (!order_no) {
      logPayPalError(PayPalLogEvent.SUCCESS_PAGE_ACCESSED, new Error("无法获取订单号"), {
        metadata: { all_search_params: urlSearchParams },
      });
      console.error("❌ [PayPal Pay Success] 无法获取订单号", {
        order_no: urlSearchParams.order_no,
        all_search_params: urlSearchParams,
      });
      // 即使没有订单号，也显示成功页面
      return (
        <PaymentSuccess
          orderNo=""
          locale={redirectLocale}
        />
      );
    }

    console.log("🔔 [PayPal Pay Success] 获取到订单号:", {
      order_no,
      token: urlSearchParams.token,
      PayerID: urlSearchParams.PayerID,
      all_params: urlSearchParams,
    });

    // 查询订单
    const order = await findOrderByOrderNo(order_no);
    if (!order) {
      logPayPalError(PayPalLogEvent.SUCCESS_PAGE_ACCESSED, new Error("Order not found"), {
        order_no: order_no,
      });
      console.error("❌ [PayPal Pay Success] Order not found:", order_no);
      // 即使找不到订单，也显示成功页面
      return (
        <PaymentSuccess
          orderNo={order_no}
          locale={redirectLocale}
        />
      );
    }

    // 🔔 记录订单查询成功日志
    logPayPalEvent(PayPalLogEvent.SUCCESS_PAGE_ACCESSED, undefined, {
      order_no: order.order_no,
      status: order.status ?? undefined,
      paypal_order_id: order.stripe_session_id ?? undefined,
      user_uuid: order.user_uuid ?? undefined,
      user_email: order.user_email ?? undefined,
      amount: order.amount ?? undefined,
      currency: order.currency ?? undefined,
      credits: order.credits ?? undefined,
    });

    // 检查订单状态
    if (order.status === OrderStatus.Paid) {
      logPayPalEvent(PayPalLogEvent.SUCCESS_PAGE_ACCESSED, undefined, {
        order_no: order.order_no,
        status: order.status ?? undefined,
        metadata: { message: "订单已处理（Paid）" },
      });
      console.log("✅ [PayPal Pay Success] 订单已处理（Paid）:", order_no);
      // 订单已处理，显示成功页面
    } else if (order.status === OrderStatus.Created) {
      logPayPalEvent(PayPalLogEvent.ORDER_CAPTURE_ATTEMPTED, undefined, {
        order_no: order.order_no,
        paypal_order_id: order.stripe_session_id ?? undefined,
        status: order.status ?? undefined,
        metadata: { message: "订单状态为 Created，尝试捕获支付" },
      });
      console.log("🔔 [PayPal Pay Success] 订单状态为 Created，尝试捕获支付");

      // 🔥 关键步骤：捕获 PayPal 订单
      // PayPal 的 order ID 存储在 stripe_session_id 字段中
      const paypalOrderId = order.stripe_session_id;

      if (paypalOrderId) {
        try {
          console.log("🔔 [PayPal Pay Success] 开始捕获订单:", paypalOrderId);
          const captureResult = await capturePayPalOrder(paypalOrderId);
          logPayPalEvent(PayPalLogEvent.ORDER_CAPTURE_ATTEMPTED, undefined, {
            order_no: order.order_no,
            paypal_order_id: paypalOrderId,
            metadata: { capture_result: captureResult, message: "订单捕获成功" },
          });
          console.log("✅ [PayPal Pay Success] 订单捕获成功:", captureResult);

          // 🔥 关键兜底：capture 成功后，直接激活订单
          // 不能只依赖 webhook，因为 webhook 可能延迟或失败
          // handlePayPalOrder 内部会检查订单状态，如果已 Paid 则跳过（幂等安全）
          if (captureResult?.status === "COMPLETED") {
            try {
              const captureId = captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id || "";
              await handlePayPalOrder(
                {
                  // 构造与 webhook 相同结构，让 handlePayPalOrder 能通过 paypalOrderId 找到订单
                  supplementary_data: { related_ids: { order_id: paypalOrderId } },
                  payer: captureResult.payer || {},
                  id: captureId,
                  status: "COMPLETED",
                },
                "PAYMENT.CAPTURE.COMPLETED"
              );
              console.log("✅ [PayPal Pay Success] 订单直接激活成功（兜底机制）");
            } catch (activateError: any) {
              // 可能是 webhook 已经先处理了（订单已 Paid），不视为错误
              console.warn("⚠️ [PayPal Pay Success] 直接激活完成（若报错可能已由webhook激活）:", activateError.message);
            }
          }
        } catch (captureError: any) {
          logPayPalError(PayPalLogEvent.ORDER_CAPTURE_ATTEMPTED, captureError, {
            order_no: order.order_no,
            paypal_order_id: paypalOrderId,
            metadata: { message: "订单捕获失败" },
          });
          console.error("❌ [PayPal Pay Success] 订单捕获失败:", captureError.message);
          // 即使捕获失败，也继续显示成功页面
          // 可能是订单已经被捕获了，或者网络问题
        }
      } else {
        logPayPalWarning(PayPalLogEvent.ORDER_CAPTURE_ATTEMPTED, "未找到 PayPal Order ID", {
          order_no: order.order_no,
        });
        console.warn("⚠️ [PayPal Pay Success] 未找到 PayPal Order ID");
      }
    } else {
      logPayPalWarning(PayPalLogEvent.SUCCESS_PAGE_ACCESSED, `订单状态异常: ${order.status}`, {
        order_no: order.order_no,
        status: order.status ?? undefined,
      });
      console.log("⚠️ [PayPal Pay Success] 订单状态异常:", order_no, order.status);
    }

    // 🔥 显示支付成功页面（与 Creem 一致）
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
    console.error("❌ [PayPal Pay Success] 处理失败:", e);
    // 即使处理失败，也显示成功页面
    try {
      const { locale: catchLocale } = await params;
      const catchSearchParams = await searchParams;
      const catchOrderNo = catchSearchParams.order_no || "";
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
