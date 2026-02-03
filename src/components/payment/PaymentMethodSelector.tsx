/**
 * @fileoverview 支付方式选择对话框组件
 * @description 让用户在支付前选择支付方式（Stripe、PayPal、Creem）
 * @author AstroCartography Team
 *
 * @features
 * - 根据环境变量动态显示可用的支付方式
 * - 支持 Stripe、PayPal、Creem 三种支付方式
 * - 美观的卡片式选择界面
 * - 响应式设计
 */

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CreditCard, Wallet } from 'lucide-react';

/**
 * 支付方式类型
 */
export type PaymentMethod = 'stripe' | 'paypal' | 'creem';

/**
 * 支付方式配置接口
 */
interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

/**
 * 组件属性接口
 */
interface PaymentMethodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (method: PaymentMethod) => void;
}

/**
 * 获取可用的支付方式列表
 * @returns {PaymentMethodConfig[]} 支付方式配置列表
 */
const getAvailablePaymentMethods = (): PaymentMethodConfig[] => {
  const methods: PaymentMethodConfig[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Credit Card / Debit Card',
      icon: <CreditCard className="w-8 h-8" />,
      enabled: process.env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED === 'true',
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'PayPal Account',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 0 1-.794.68H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502zm-2.96-5.09c.762.868.983 2.06.617 3.68-.763 3.386-2.95 5.73-6.566 5.73H8.985c-.43 0-.793.334-.84.762L7.17 21.29a.556.556 0 0 1-.55.477H3.734a.483.483 0 0 1-.477-.558L5.31 5.125A1.11 1.11 0 0 1 6.406 4.15h5.784c1.695 0 3.063.297 4.017 1.238z"/>
        </svg>
      ),
      enabled: process.env.NEXT_PUBLIC_PAYMENT_PAYPAL_ENABLED === 'true',
    },
    {
      id: 'creem',
      name: 'Creem',
      description: 'Creem Payment',
      icon: <Wallet className="w-8 h-8" />,
      enabled: process.env.NEXT_PUBLIC_PAYMENT_CREEM_ENABLED === 'true',
    },
  ];

  // 只返回已启用的支付方式
  return methods.filter(method => method.enabled);
};

/**
 * 支付方式选择对话框组件
 */
export function PaymentMethodSelector({
  open,
  onOpenChange,
  onSelect,
}: PaymentMethodSelectorProps) {
  const availableMethods = getAvailablePaymentMethods();

  // 如果没有可用的支付方式，不显示对话框
  if (availableMethods.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Choose Payment Method
          </DialogTitle>
          <DialogDescription>
            Select your preferred payment method to continue
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {availableMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                onSelect(method.id);
                onOpenChange(false);
              }}
              className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:border-primary hover:bg-accent/50 transition-all duration-200 group"
            >
              <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                {method.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-base">{method.name}</div>
                <div className="text-sm text-muted-foreground">
                  {method.description}
                </div>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
