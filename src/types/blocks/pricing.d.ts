import { Button } from "@/types/blocks/base/button";

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  headline?: string;
  highlights?: string[];
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;
  price?: string;
  original_price?: string;
  currency?: string;
  unit?: string;
  features_title?: string;
  features?: string[];
  eyebrow?: string;
  billing_note?: string;
  button?: Button;
  tip?: string;
  /** Secondary price line shown under the main price. */
  price_summary?: string;
  /** Switch pricing tab (e.g. standard → subscription) */
  switch_group?: string;
  switch_group_label?: string;
  is_featured?: boolean;
  interval: "month" | "year" | "one-time";
  product_id: string;
  product_name?: string;
  amount: number;
  cn_amount?: number;
  currency: string;
  credits?: number;
  valid_months?: number;
  group?: string;
  creem_product_id?: string; // Creem 产品 ID（可选）
}

export interface Pricing {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  disclaimer?: string;
  items?: PricingItem[];
  groups?: PricingGroup[];
}
