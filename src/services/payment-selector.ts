/**
 * @fileoverview 支付方式选择器
 * @description 根据环境变量自动选择可用的支付方式
 */

/**
 * 自动选择支付方式
 * 优先级：Stripe > PayPal > Creem
 * @returns 支付方式名称或 null
 */
export function selectPaymentMethod(): string | null {
  const stripeOn = process.env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED !== "false";
  const paypalOn = process.env.NEXT_PUBLIC_PAYMENT_PAYPAL_ENABLED !== "false";
  const creemOn = process.env.NEXT_PUBLIC_PAYMENT_CREEM_ENABLED === "true";

  if (stripeOn && process.env.STRIPE_PRIVATE_KEY) {
    return "stripe";
  }

  if (paypalOn && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    return "paypal";
  }

  if (creemOn && (process.env.CREEM_API_KEY || process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID)) {
    return "creem";
  }

  return null;
}

/**
 * 检查指定支付方式是否可用
 */
export function isPaymentMethodAvailable(method: string): boolean {
  switch (method) {
    case "stripe":
      return (
        process.env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED !== "false" &&
        !!process.env.STRIPE_PRIVATE_KEY
      );
    case "paypal":
      return (
        process.env.NEXT_PUBLIC_PAYMENT_PAYPAL_ENABLED !== "false" &&
        !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
      );
    case "creem":
      return (
        process.env.NEXT_PUBLIC_PAYMENT_CREEM_ENABLED === "true" &&
        !!(process.env.CREEM_API_KEY || process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID)
      );
    default:
      return false;
  }
}
