"use client";

import { Check, Loader } from "lucide-react";
import { PricingItem, Pricing as PricingType } from "@/types/blocks/pricing";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState, useRef, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { Label } from "@/components/ui/label";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";
import { useLocale } from "next-intl";
import { usePayment } from "@/hooks/usePayment";
import { paymentEvents } from "@/lib/analytics";
import { usePricingItemTracking } from "./pricing-item-card";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";

export default function Pricing({ pricing, isInModal = false }: { pricing: PricingType; isInModal?: boolean }) {
  if (pricing.disabled) {
    return null;
  }

  const locale = useLocale();

  const { user, setShowSignModal } = useAppContext();

  // 使用统一的支付 Hook
  const {
    handleCheckout: handlePaymentCheckout,
    handlePaymentMethodSelect,
    isLoading,
    productId,
    showPaymentSelector,
    setShowPaymentSelector,
  } = usePayment();

  const [group, setGroup] = useState(pricing.groups?.[0]?.name);

  const handleCheckout = async (item: PricingItem, cn_pay: boolean = false) => {
    try {
      // 检查用户登录状态
      if (!user) {
        setShowSignModal(true);
        return;
      }

      // 使用统一的支付处理函数（会自动显示支付方式选择器或直接支付）
      const result = await handlePaymentCheckout(item, cn_pay);

      if (result?.needAuth) {
        setShowSignModal(true);
        return;
      }

      if (result?.showingSelector) {
        // 正在显示支付方式选择器，等待用户选择
        return;
      }

      if (result && !result.success) {
        // 错误信息已经在 hook 中通过 toast 显示
        return;
      }
    } catch (e) {
      console.log("checkout failed: ", e);
      toast.error("checkout failed");
    }
  };

  useEffect(() => {
    if (pricing.items) {
      setGroup(pricing.items[0].group);
    }
  }, [pricing.items]);

  // 🔥 优化：对价格项进行排序，付费方案（amount > 0）排在前面，免费方案（amount === 0）排在后面
  const sortedItems = useMemo(() => {
    if (!pricing.items) return [];
    return [...pricing.items].sort((a, b) => {
      // 付费方案排在前面
      if (a.amount > 0 && b.amount === 0) return -1;
      if (a.amount === 0 && b.amount > 0) return 1;
      // 如果都是付费或都是免费，保持原有顺序
      return 0;
    });
  }, [pricing.items]);
  
  return (
    <section id={pricing.name} className={isInModal ? "py-0" : "py-6 md:py-8"}>
      <div className={isInModal ? "w-full" : "container"}>
        {/* 🔥 在弹窗中不显示标题和描述（已在 DialogHeader 中显示） */}
        {!isInModal && (
          <div className="mx-auto mb-4 md:mb-6 text-center">
            <h2 className="mb-2 md:mb-3 text-2xl md:text-4xl font-semibold lg:text-5xl">
              {pricing.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground lg:text-lg">
              {pricing.description}
            </p>
            {/* 免责声明 */}
            {pricing.disclaimer && (
              <p className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: pricing.disclaimer }} />
            )}
          </div>
        )}
        <div className="w-full flex flex-col items-center gap-2">
          {pricing.groups && pricing.groups.length > 0 && (
            <div className="flex h-10 md:h-12 mb-4 md:mb-6 items-center rounded-md bg-muted p-1 text-base md:text-lg">
              <RadioGroup
                value={group}
                className={`h-full grid-cols-${pricing.groups.length}`}
                onValueChange={(value) => {
                  setGroup(value);
                }}
              >
                {pricing.groups.map((item, i) => {
                  return (
                    <div
                      key={i}
                      className='h-full rounded-md transition-all has-[button[data-state="checked"]]:bg-white'
                    >
                      <RadioGroupItem
                        value={item.name || ""}
                        id={item.name}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={item.name}
                        className="flex h-full cursor-pointer items-center justify-center px-4 md:px-7 font-semibold text-muted-foreground peer-data-[state=checked]:text-primary text-sm md:text-base"
                      >
                        {item.title}
                        {item.label && (
                          <Badge
                            variant="outline"
                            className="border-primary bg-primary px-1 md:px-1.5 ml-1 text-primary-foreground text-xs"
                          >
                            {item.label}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
          <div
            className={`w-full mt-0 grid gap-3 md:gap-4 md:grid-cols-${
              sortedItems.filter(
                (item) => !item.group || item.group === group
              )?.length
            }`}
          >
            {sortedItems.map((item, index) => {
              if (item.group && item.group !== group) {
                return null;
              }

              // 📊 埋点：查看价格方案
              usePricingItemTracking(item);

              return (
                <div
                  key={index}
                  className={`rounded-lg p-4 md:p-5 ${
                    item.is_featured
                      ? "border-primary border-2 bg-card text-card-foreground"
                      : "border-muted border"
                  }`}
                >
                  <div className="flex h-full flex-col justify-between gap-3 md:gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 md:mb-3">
                        {item.title && (
                          <h3 className="text-lg md:text-xl font-semibold">
                            {item.title}
                          </h3>
                        )}
                        <div className="flex-1"></div>
                        {item.label && (
                          <Badge
                            variant="outline"
                            className="border-primary bg-primary px-1 md:px-1.5 text-primary-foreground text-xs"
                          >
                            {item.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-end gap-2 mb-2 md:mb-3">
                        {item.original_price && (
                          <span className="text-lg md:text-xl text-muted-foreground font-semibold line-through">
                            {item.original_price}
                          </span>
                        )}
                        {item.price && (
                          <span className="text-3xl md:text-5xl font-semibold">
                            {item.price}
                          </span>
                        )}
                        {item.unit && (
                          <span className="block text-sm md:text-base font-semibold">
                            {item.unit}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm md:text-base text-muted-foreground mb-2 md:mb-0">
                          {item.description}
                        </p>
                      )}
                      {item.features_title && (
                        <p className="mb-2 md:mb-2 mt-3 md:mt-4 font-semibold text-sm md:text-base">
                          {item.features_title}
                        </p>
                      )}
                      {item.features && (
                        <ul className="flex flex-col gap-2 md:gap-2">
                          {item.features.map((feature, fi) => {
                            return (
                              <li className="flex gap-2 text-sm md:text-base" key={`feature-${fi}`}>
                                <Check className="mt-0.5 md:mt-1 size-3 md:size-4 shrink-0" />
                                {feature}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* 🔥 修复：Free 计划不显示按钮 */}
                      {item.button && item.amount > 0 && (
                        <Button
                          className="w-full flex items-center justify-center gap-2 font-semibold text-sm md:text-base h-9 md:h-10"
                          disabled={isLoading}
                          onClick={() => {
                            if (isLoading) {
                              return;
                            }
                            // 📊 埋点：点击购买按钮
                            paymentEvents.buyButtonClicked(
                              item.title || 'Unknown Plan',
                              item.amount / 100, // 转换为美元（假设 amount 是美分）
                              item.product_id
                            );
                            // 📊 埋点：开始支付流程
                            paymentEvents.paymentInitiated(
                              item.title || 'Unknown Plan',
                              item.amount / 100,
                              item.product_id
                            );
                            handleCheckout(item);
                          }}
                        >
                          {(!isLoading ||
                            (isLoading && productId !== item.product_id)) && (
                            <p>{item.button.title}</p>
                          )}

                          {isLoading && productId === item.product_id && (
                            <p>{item.button.title}</p>
                          )}
                          {isLoading && productId === item.product_id && (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {item.button.icon && (
                            <Icon name={item.button.icon} className="size-4" />
                          )}
                        </Button>
                      )}
                      {item.tip && (
                        <p className="text-muted-foreground text-xs md:text-sm mt-1 md:mt-2">
                          {item.tip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 支付方式选择对话框 */}
      <PaymentMethodSelector
        open={showPaymentSelector}
        onOpenChange={setShowPaymentSelector}
        onSelect={handlePaymentMethodSelect}
      />
    </section>
  );
}
