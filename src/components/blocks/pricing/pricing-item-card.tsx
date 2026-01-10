"use client";

import { useEffect, useRef } from "react";
import { PricingItem } from "@/types/blocks/pricing";
import { paymentEvents } from "@/lib/analytics";

/**
 * 价格项卡片组件（带埋点）
 * 用于在价格项渲染时自动记录查看事件
 */
export function usePricingItemTracking(item: PricingItem) {
  const viewedRef = useRef(false);
  
  useEffect(() => {
    // 只在付费方案且未记录过时记录
    if (!viewedRef.current && item.amount > 0) {
      viewedRef.current = true;
      paymentEvents.planViewed(
        item.title || 'Unknown Plan',
        item.amount / 100
      );
    }
  }, [item.title, item.amount]);
}
































