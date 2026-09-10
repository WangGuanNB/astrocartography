import { Brand, Social, Nav, Agreement, Image } from "@/types/blocks/base";

export interface Badge {
  title: string;
  url: string;
  target?: string;
  /** Optional for backward compatibility; new partner badges are text-only. */
  image?: Image;
  type?: "codemarket_widget" | "link";
  widget_id?: string;
  /** When true, omit nofollow (noopener noreferrer only). Default: nofollow. */
  dofollow?: boolean;
  /** Legacy; ignored when deciding rel — use dofollow whitelist instead. */
  nofollow?: boolean;
}

export interface Footer {
  disabled?: boolean;
  name?: string;
  brand?: Brand;
  nav?: Nav;
  copyright?: string;
  social?: Social;
  agreement?: Agreement;
  badge?: Badge; // 保持向后兼容
  badges?: Badge[];
}
