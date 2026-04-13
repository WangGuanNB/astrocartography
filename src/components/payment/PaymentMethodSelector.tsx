/**
 * @fileoverview 支付方式选择对话框组件
 * @description 让用户在支付前选择支付方式（Stripe、PayPal、Creem）
 * 设计原则：优先展示用户更熟悉、更信任的支付品牌，降低付款疑虑
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
import { ChevronRight, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/** Visa SVG Logo */
const VisaLogo = () => (
  <svg viewBox="0 0 50 16" className="h-4 w-auto" aria-label="Visa">
    <rect width="50" height="16" rx="3" fill="#1A1F71"/>
    <text x="25" y="12" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">VISA</text>
  </svg>
);

/** Mastercard SVG Logo */
const MastercardLogo = () => (
  <svg viewBox="0 0 38 24" className="h-4 w-auto" aria-label="Mastercard">
    <circle cx="15" cy="12" r="10" fill="#EB001B"/>
    <circle cx="23" cy="12" r="10" fill="#F79E1B"/>
    <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00"/>
  </svg>
);

/** Apple Pay SVG Logo */
const ApplePayLogo = () => (
  <svg viewBox="0 0 60 24" className="h-4 w-auto" aria-label="Apple Pay">
    <rect width="60" height="24" rx="4" fill="#000"/>
    <text x="30" y="17" textAnchor="middle" fill="white" fontSize="10" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif" letterSpacing="0.2"> Pay</text>
    <text x="13" y="17" textAnchor="middle" fill="white" fontSize="13" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif"></text>
  </svg>
);

/** PayPal 官方双色 Logo */
const PayPalLogo = () => (
  <svg viewBox="0 0 100 32" className="h-6 w-auto" aria-label="PayPal">
    <text x="0" y="24" fontSize="24" fontWeight="bold" fontFamily="Arial,sans-serif">
      <tspan fill="#003087">Pay</tspan><tspan fill="#009cde">Pal</tspan>
    </text>
  </svg>
);

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
 * 获取可用的支付方式列表（优先级：Creem > PayPal > Stripe）
 * 现阶段 Creem 为生产主力，PayPal 为试水补充，待 PayPal 生产稳定后可调换顺序
 */
const getAvailablePaymentMethods = (): PaymentMethodConfig[] => {
  const methods: PaymentMethodConfig[] = [
    {
      id: 'creem',
      name: 'Credit / Debit Card',
      description: 'Visa · Mastercard · Apple Pay · Google Pay',
      icon: (
        <div className="flex items-center gap-1">
          <VisaLogo />
          <MastercardLogo />
          <ApplePayLogo />
        </div>
      ),
      enabled: process.env.NEXT_PUBLIC_PAYMENT_CREEM_ENABLED === 'true',
    },
    {
      id: 'stripe',
      name: 'Credit / Debit Card',
      description: 'Visa · Mastercard · Apple Pay · Google Pay',
      icon: (
        <div className="flex items-center gap-1">
          <VisaLogo />
          <MastercardLogo />
          <ApplePayLogo />
        </div>
      ),
      enabled: process.env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED === 'true',
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal balance or linked card',
      icon: <PayPalLogo />,
      enabled: process.env.NEXT_PUBLIC_PAYMENT_PAYPAL_ENABLED === 'true',
    },
  ];

  return methods.filter(method => method.enabled);
};

/**
 * 支付方式选择对话框组件
 * 第一个方式为主推（Recommended），其余为次选
 */
export function PaymentMethodSelector({
  open,
  onOpenChange,
  onSelect,
}: PaymentMethodSelectorProps) {
  const availableMethods = getAvailablePaymentMethods();

  if (availableMethods.length === 0) {
    return null;
  }

  // 只有一个支付方式时，直接触发，不显示弹窗
  if (availableMethods.length === 1) {
    if (open) {
      onSelect(availableMethods[0].id);
      onOpenChange(false);
    }
    return null;
  }

  const [primary, ...alternatives] = availableMethods;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-5">
        {/* 标题：小而精，不占太多空间 */}
        <DialogHeader className="pb-1">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <DialogTitle className="text-base font-semibold">
              Secure Checkout
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            256-bit SSL encrypted · Cancel anytime
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 pt-1">
          {/* 主推支付方式 */}
          <button
            onClick={() => {
              onSelect(primary.id);
              onOpenChange(false);
            }}
            className="flex flex-col gap-2 px-4 py-3.5 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all duration-200 group w-full text-left"
          >
            {/* 第一行：名称 + Badge + 箭头 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm leading-tight">{primary.name}</span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 leading-none">
                  Recommended
                </Badge>
              </div>
              <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
            {/* 第二行：品牌 Logo + 描述 */}
            <div className="flex items-center gap-2.5">
              <div className="flex-shrink-0">
                {primary.icon}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {primary.description}
              </div>
            </div>
          </button>

          {/* 分割线 */}
          {alternatives.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-border/40" />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">or continue with</span>
              <div className="flex-1 border-t border-border/40" />
            </div>
          )}

          {/* 次选支付方式 */}
          {alternatives.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                onSelect(method.id);
                onOpenChange(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/60 hover:border-border hover:bg-accent/30 transition-all duration-200 group w-full"
            >
              <div className="flex-shrink-0">
                {method.icon}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-sm leading-tight">{method.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  {method.description}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-colors" />
            </button>
          ))}

          {/* 底部轻松文案，降低用户压力 */}
          <p className="text-center text-[11px] text-muted-foreground/70 pt-0.5">
            Not ready? No worries — come back anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
