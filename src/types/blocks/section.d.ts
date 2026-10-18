import { Image, Button } from "@/types/blocks/base";

export interface SectionItem {
  title?: string;
  description?: string;
  label?: string;
  icon?: string;
  image?: Image;
  buttons?: Button[];
  url?: string;
  target?: string;
  children?: SectionItem[];
  list?: string[];  // 支持列表项（用于功能点列表）
}

export interface Section {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  icon?: string;
  image?: Image;
  /** Optional caption under section.image (e.g. demo disclaimer) */
  imageCaption?: string;
  buttons?: Button[];
  items?: SectionItem[];
  cta?: {
    title?: string;
    description?: string;
    button?: Button;
  };
}
