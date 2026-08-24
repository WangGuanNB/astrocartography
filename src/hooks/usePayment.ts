/**
 * @fileoverview 支付处理逻辑 Hook
 * @description 提供统一的支付处理逻辑，包括订单创建、Stripe/PayPal/Creem支付跳转等功能
 * @author Miniatur AI Team
 * @created 2025-01-26
 *
 * @features
 * - 支付参数验证和处理
 * - Stripe/PayPal/Creem支付会话创建
 * - 用户认证状态检查
 * - 支付加载状态管理
 * - 错误处理和用户提示
 * - 支付方式选择支持
 *
 * @usage
 * ```tsx
 * const { handleCheckout, isLoading, productId, showPaymentSelector, setShowPaymentSelector, handlePaymentMethodSelect } = usePayment();
 *
 * const onPayment = async () => {
 *   const result = await handleCheckout(pricingItem, false);
 *   if (result.success) {
 *     // 支付成功处理
 *   }
 * };
 * ```
 */

"use client";

import { useState } from 'react';
import { useAppContext } from '@/contexts/app';
import { useLocale } from 'next-intl';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { PricingItem } from '@/types/blocks/pricing';
import { PaymentMethod } from '@/components/payment/PaymentMethodSelector';
import { paymentEvents } from '@/lib/analytics';

export function usePayment() {
  const { user, setShowSignModal } = useAppContext();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    item: PricingItem;
    cn_pay: boolean;
  } | null>(null);

  const hasMultiplePaymentMethods = () => {
    const enabledMethods = [
      process.env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED === 'true',
      process.env.NEXT_PUBLIC_PAYMENT_PAYPAL_ENABLED === 'true',
      process.env.NEXT_PUBLIC_PAYMENT_CREEM_ENABLED === 'true',
    ].filter(Boolean).length;

    return enabledMethods > 1;
  };

  const getDefaultPaymentMethod = (): PaymentMethod => {
    if (process.env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED === 'true') return 'stripe';
    if (process.env.NEXT_PUBLIC_PAYMENT_PAYPAL_ENABLED === 'true') return 'paypal';
    if (process.env.NEXT_PUBLIC_PAYMENT_CREEM_ENABLED === 'true') return 'creem';
    return 'stripe';
  };

  const handleCheckout = async (
    item: PricingItem,
    cn_pay: boolean = false
  ): Promise<{ needAuth?: boolean; showingSelector?: boolean; success?: boolean; message?: string }> => {
    if (!user) {
      setShowSignModal(true);
      return { needAuth: true };
    }

    const isSubscriptionItem =
      item.interval === "month" || item.interval === "year";

    if (isSubscriptionItem) {
      toast.error("Plus subscription is temporarily unavailable. Please choose a one-time plan.");
      return { success: false, message: "subscription_temporarily_unavailable" };
    }

    if (hasMultiplePaymentMethods()) {
      setPendingPayment({ item, cn_pay });
      setShowPaymentSelector(true);
      return { showingSelector: true };
    }

    const defaultMethod = getDefaultPaymentMethod();
    return await processPayment(item, cn_pay, defaultMethod);
  };

  const handlePaymentMethodSelect = async (paymentMethod: PaymentMethod): Promise<{ success?: boolean; message?: string; needAuth?: boolean } | undefined> => {
    if (!pendingPayment) return;

    const { item, cn_pay } = pendingPayment;
    return await processPayment(item, cn_pay, paymentMethod);
  };

  const processPayment = async (
    item: PricingItem,
    cn_pay: boolean,
    paymentMethod: PaymentMethod
  ): Promise<{ success?: boolean; message?: string; needAuth?: boolean }> => {
    const isSubscriptionItem =
      item.interval === "month" || item.interval === "year";

    if (isSubscriptionItem) {
      toast.error("Plus subscription is temporarily unavailable. Please choose a one-time plan.");
      return { success: false, message: "subscription_temporarily_unavailable" };
    }

    if (paymentMethod === "creem") {
      toast.error("This payment method is temporarily unavailable. Please use card or PayPal.");
      return { success: false, message: "creem_temporarily_unavailable" };
    }

    try {
      const params: {
        product_id: string;
        product_name?: string;
        credits?: number;
        interval: "month" | "year" | "one-time";
        amount?: number;
        currency?: string;
        valid_months?: number;
        locale: string;
        payment_method: PaymentMethod;
      } = {
        product_id: item.product_id,
        product_name: item.product_name,
        credits: item.credits,
        interval: item.interval,
        amount: cn_pay ? item.cn_amount : item.amount,
        currency: cn_pay ? "cny" : item.currency,
        valid_months: item.valid_months,
        locale: locale || "en",
        payment_method: paymentMethod,
      };

      setIsLoading(true);
      setProductId(item.product_id);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);
        setShowSignModal(true);
        return { needAuth: true };
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        toast.error(message);
        return { success: false, message };
      }

      if (paymentMethod === "paypal" || data.payment_method === "paypal") {
        const { approval_url } = data;
        if (approval_url) {
          paymentEvents.paymentInitiated(
            item.product_name || item.title || item.product_id,
            (item.amount || 0) / 100,
            item.product_id
          );
          window.location.href = approval_url;
          return { success: true };
        }
        toast.error("Failed to get PayPal approval URL");
        return { success: false, message: "Failed to get PayPal approval URL" };
      }

      const { public_key, session_id } = data;
      if (!public_key || !session_id) {
        toast.error("Invalid payment response");
        return { success: false, message: "Invalid payment response" };
      }

      const stripe = await loadStripe(public_key);

      if (!stripe) {
        toast.error("checkout failed");
        return { success: false };
      }

      paymentEvents.paymentInitiated(
        item.product_name || item.title || item.product_id,
        (item.amount || 0) / 100,
        item.product_id
      );

      const result = await stripe.redirectToCheckout({
        sessionId: session_id,
      });

      if (result.error) {
        toast.error(result.error.message);
        return { success: false, message: result.error.message };
      }

      return { success: true };
    } catch (e) {
      console.log("checkout failed: ", e);
      toast.error("checkout failed");
      return { success: false };
    } finally {
      setIsLoading(false);
      setProductId(null);
      setPendingPayment(null);
    }
  };

  return {
    handleCheckout,
    handlePaymentMethodSelect,
    isLoading,
    productId,
    showPaymentSelector,
    setShowPaymentSelector,
  };
}
