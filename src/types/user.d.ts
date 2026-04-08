export interface User {
  id?: number;
  uuid?: string;
  email: string;
  created_at?: string | Date;
  nickname: string;
  avatar_url: string;
  locale?: string;
  signin_type?: string;
  signin_ip?: string;
  signin_provider?: string;
  signin_openid?: string;
  credits?: UserCredits;
  invite_code?: string;
  invited_by?: string;
  is_affiliate?: boolean;
}

/** Feature flags from paid orders (product_id). Not the same as is_pro (credits balance). */
export interface UserEntitlements {
  canExportCurrentChat: boolean;
  /** Map/chart PNG download; true when user has a paid tier order (product_id). */
  canDownloadChart: boolean;
  canViewChatHistory: boolean;
}

export interface UserCredits {
  one_time_credits?: number;
  monthly_credits?: number;
  total_credits?: number;
  used_credits?: number;
  left_credits: number;
  free_credits?: number;
  is_recharged?: boolean;
  /** True when left_credits > 0; legacy name — do not use for tier-gated features. */
  is_pro?: boolean;
  entitlements?: UserEntitlements;
}
