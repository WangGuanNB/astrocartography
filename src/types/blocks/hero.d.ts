import { Button, Image, Announcement } from "@/types/blocks/base";

export interface Announcement {
  title?: string;
  description?: string;
  label?: string;
  url?: string;
  target?: string;
}

export interface HappyUsers {
  rating?: number;
  count?: string;
  label?: string;
  avatars?: string[];
}

export interface Hero {
  name?: string;
  disabled?: boolean;
  announcement?: Announcement;
  title?: string;
  highlight_text?: string;
  description?: string;
  buttons?: Button[];
  image?: Image;
  tip?: string;
  show_happy_users?: boolean;
  happy_users?: HappyUsers;
  show_badge?: boolean;
}
