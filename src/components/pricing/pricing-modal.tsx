"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Pricing from "@/components/blocks/pricing";
import { Pricing as PricingType } from "@/types/blocks/pricing";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricing: PricingType;
  onSuccess?: () => void;
  preferredProductId?: string;
}

/**
 * 价格弹窗组件
 * 复用现有的 Pricing 组件，包装在 Dialog/Drawer 中
 */
export default function PricingModal({
  open,
  onOpenChange,
  pricing,
  onSuccess,
  preferredProductId,
}: PricingModalProps) {
  const t = useTranslations();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // 桌面端使用 Dialog
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-[2000] bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogContent className="fixed left-[50%] top-[50%] z-[2001] flex flex-col w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh]">
            <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0">
              <DialogTitle className="text-2xl font-bold">
                {pricing.title || t('payment.modal.title')}
              </DialogTitle>
              {pricing.description && (
                <DialogDescription className="text-base">
                  {pricing.description}
                </DialogDescription>
              )}
            </DialogHeader>
            {/* 🔥 修复：使用 flex-1 和 overflow-y-auto 让内容区域可滚动，避免双重滚动 */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
              <Pricing
                pricing={pricing}
                isInModal={true}
                preferredProductId={preferredProductId}
              />
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }

  // 移动端：全屏 Drawer，把高度留给套餐卡片
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="!mt-0 !h-[100dvh] !max-h-[100dvh] rounded-none border-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex flex-col"
      >
        <DrawerHeader className="relative shrink-0 text-left gap-1 px-4 pr-12 pt-1 pb-2">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-0 h-10 w-10 rounded-full"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
          <DrawerTitle className="text-lg font-bold leading-tight">
            {pricing.title || t('payment.modal.title')}
          </DrawerTitle>
          {pricing.description && (
            <DrawerDescription className="text-xs leading-snug line-clamp-2">
              {pricing.description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Pricing
            pricing={pricing}
            isInModal={true}
            preferredProductId={preferredProductId}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
