"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PaymentSuccessProps {
  orderNo: string;
  productName?: string;
  amount?: number;
  currency?: string;
  credits?: number;
  locale?: string;
}

/**
 * 支付成功提示组件
 * 显示支付成功信息，并提供跳转到用户中心的按钮
 */
export default function PaymentSuccess({
  orderNo,
  productName,
  amount,
  currency = "USD",
  credits,
  locale = "en",
}: PaymentSuccessProps) {
  const t = useTranslations();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  // 自动跳转倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 倒计时结束，自动跳转
      router.push(`/${locale}/my-orders`);
    }
  }, [countdown, router, locale]);

  const handleGoToOrders = () => {
    router.push(`/${locale}/my-orders`);
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency.toUpperCase() === "CNY" ? "¥" : "$";
    return `${symbol} ${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("payment.success.title") || "Payment Successful!"}
          </CardTitle>
          <CardDescription className="text-base">
            {t("payment.success.description") || "Your payment has been processed successfully"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 订单信息 */}
          <div className="space-y-3 bg-muted/50 rounded-lg p-4">
            {orderNo && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("my_orders.table.order_no") || "Order No"}:
                </span>
                <span className="text-sm font-mono font-medium">{orderNo}</span>
              </div>
            )}
            {productName && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("my_orders.table.product_name") || "Product Name"}:
                </span>
                <span className="text-sm font-medium">{productName}</span>
              </div>
            )}
            {amount && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("my_orders.table.amount") || "Amount"}:
                </span>
                <span className="text-sm font-medium">{formatAmount(amount, currency)}</span>
              </div>
            )}
            {credits && credits > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("my_credits.title") || "Credits"}:
                </span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  +{credits}
                </span>
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 text-center">
              {t("payment.success.credits_added") || "Credits have been added to your account"}
            </p>
          </div>

          {/* 兜底联系入口 */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Credits not arrived after 5 minutes?{" "}
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@astrocarto.org"}?subject=Payment%20Issue%20-%20Order%20${orderNo}&body=Hi%2C%20I%20completed%20payment%20but%20my%20credits%20have%20not%20arrived.%20Order%20No%3A%20${orderNo}`}
                className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                Contact support
              </a>
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Button
              onClick={handleGoToOrders}
              className="w-full"
              size="lg"
            >
              {t("payment.success.view_orders") || "View My Orders"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            {/* 自动跳转提示 */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {t("payment.success.auto_redirect", { seconds: countdown }) ||
                  `Redirecting to User Center in ${countdown} seconds...`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

