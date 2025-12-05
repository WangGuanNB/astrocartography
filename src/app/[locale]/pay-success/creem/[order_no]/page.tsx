import { handleCreemOrder } from "@/services/order";
import { findOrderByOrderNo } from "@/models/order";
import { OrderStatus } from "@/models/order";
import { redirect } from "@/i18n/navigation";

/**
 * Creem 支付成功页面
 * 当用户从 Creem 支付成功后跳转回来时，作为 webhook 的兜底处理
 * 主要逻辑由 webhook 处理，此页面确保即使 webhook 延迟也能正确处理订单
 */
export default async function ({
  params,
}: {
  params: Promise<{ locale: string; order_no: string }>;
}) {
  let redirectLocale = "en";

  try {
    const { locale, order_no } = await params;
    if (locale) {
      redirectLocale = locale;
    }

    if (!order_no) {
      throw new Error("order_no is required");
    }

    // 查询订单
    const order = await findOrderByOrderNo(order_no);
    if (!order) {
      console.error("Order not found:", order_no);
      throw new Error("Order not found");
    }

    // 如果订单已经处理过，直接跳转（防止重复处理）
    if (order.status !== OrderStatus.Created) {
      console.log("Order already processed:", order_no, order.status);
      redirect({
        href: process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/",
        locale: redirectLocale,
      });
      return;
    }

    // 构造 Creem 支付数据（作为 webhook 的兜底处理）
    // 这里假设支付已成功（因为用户被重定向到成功页面）
    const creemPaymentData = {
      order_no: order_no,
      status: "paid",
      payment_status: "paid",
      customer_email: order.user_email || "",
      email: order.user_email || "",
      metadata: {
        order_no: order_no,
        user_email: order.user_email || "",
        user_uuid: order.user_uuid || "",
        credits: order.credits?.toString() || "0",
      },
      amount: order.amount,
      currency: order.currency,
    };

    // 调用处理函数（会检查订单状态，防止重复处理）
    await handleCreemOrder(creemPaymentData);
  } catch (e: any) {
    console.error("Handle Creem payment success failed:", e);
    // 即使处理失败，也跳转到失败页面，避免用户停留在错误页面
    redirect({
      href: process.env.NEXT_PUBLIC_PAY_FAIL_URL || "/",
      locale: redirectLocale,
    });
    return;
  }

  // 处理成功，跳转到成功页面
  redirect({
    href: process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/",
    locale: redirectLocale,
  });
}

