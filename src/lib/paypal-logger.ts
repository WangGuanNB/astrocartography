/**
 * @fileoverview PayPal & Creem 支付结构化日志
 * @description 统一日志格式，便于在 Cloudflare Dashboard 中排查支付问题
 *
 * Cloudflare Dashboard → Workers & Pages → 你的 Worker → Logs 中搜索：
 *   用户邮箱        → 找到该用户所有支付事件
 *   order=<订单号>  → 追踪某笔订单全流程
 *   CREDITS_ISSUED  → 确认积分是否发放
 *   [ERROR]         → 查看所有支付失败
 *   [PAYPAL]        → 仅看 PayPal 流程
 *   [CREEM]         → 仅看 Creem 流程
 */

/**
 * PayPal 支付日志事件类型
 */
export enum PayPalLogEvent {
  // 支付发起阶段
  PAYMENT_INITIATED = "paypal_payment_initiated",
  ORDER_CREATED = "paypal_order_created",
  
  // PayPal API 调用阶段
  API_ORDER_CREATE = "paypal_api_order_create",
  API_ORDER_CAPTURE = "paypal_api_order_capture",
  API_ORDER_GET = "paypal_api_order_get",
  
  // 支付成功页面
  SUCCESS_PAGE_ACCESSED = "paypal_success_page_accessed",
  ORDER_CAPTURE_ATTEMPTED = "paypal_order_capture_attempted",
  
  // Webhook 阶段
  WEBHOOK_RECEIVED = "paypal_webhook_received",
  WEBHOOK_VERIFIED = "paypal_webhook_verified",
  WEBHOOK_PROCESSED = "paypal_webhook_processed",
  
  // 订单处理阶段
  ORDER_STATUS_UPDATED = "paypal_order_status_updated",
  CREDITS_ISSUED = "paypal_credits_issued",
  EMAIL_SENT = "paypal_email_sent",
  
  // 错误情况
  ERROR = "paypal_error",
  WARNING = "paypal_warning",
}

/**
 * 日志级别
 */
export enum PayPalLogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * PayPal 支付日志数据结构
 */
interface PayPalLogData {
  event: PayPalLogEvent;
  level: PayPalLogLevel;
  timestamp: string;
  order_no?: string;
  paypal_order_id?: string;
  user_uuid?: string;
  user_email?: string;
  amount?: number;
  currency?: string;
  credits?: number;
  status?: string;
  order_status?: string;
  error?: string;
  error_message?: string;
  error_stack?: string;
  success_url?: string;
  approval_url?: string;
  product_id?: string;
  locale?: string;
  capture_status?: string;
  capture_id?: string;
  event_type?: string;
  webhook_data?: any;
  body_length?: number;
  has_webhook_id?: boolean;
  old_status?: string;
  new_status?: string;
  paid_at?: string;
  paid_email?: string;
  email?: string;
  message?: string;
  skipped?: boolean;
  reason?: string;
  api_status?: number;
  api_response?: any;
  timeout_ms?: number;
  metadata?: Record<string, any>;
}

/**
 * 构建可搜索的单行日志
 * 格式：🔵 [PAYPAL][CREDITS_ISSUED][INFO] order=xxx | email=xxx | credits=100 | ts=xxx
 * 方便在 Cloudflare Dashboard Logs 中用关键字（邮箱/订单号）定位问题
 */
function buildLogLine(
  tag: string,
  stage: string,
  level: string,
  data: Partial<PayPalLogData>
): string {
  const parts: string[] = [];
  if (data.order_no)        parts.push(`order=${data.order_no}`);
  if (data.user_email)      parts.push(`email=${data.user_email}`);
  if (data.paid_email && data.paid_email !== data.user_email)
                            parts.push(`paid_email=${data.paid_email}`);
  if (data.paypal_order_id) parts.push(`paypal_id=${data.paypal_order_id}`);
  if (data.amount !== undefined)
                            parts.push(`amount=${data.amount}${data.currency ? ` ${data.currency.toUpperCase()}` : ''}`);
  if (data.credits !== undefined) parts.push(`credits=${data.credits}`);
  if (data.status)          parts.push(`status=${data.status}`);
  if (data.capture_status)  parts.push(`capture=${data.capture_status}`);
  if (data.event_type)      parts.push(`type=${data.event_type}`);
  if (data.old_status && data.new_status)
                            parts.push(`${data.old_status}→${data.new_status}`);
  if (data.error)           parts.push(`error="${data.error}"`);
  if (data.message)         parts.push(`msg="${data.message}"`);
  if (data.reason)          parts.push(`reason="${data.reason}"`);
  if (data.metadata) {
    for (const [k, v] of Object.entries(data.metadata)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        parts.push(`${k}=${v}`);
      }
    }
  }
  const emoji = level === 'ERROR' ? '🔴' : level === 'WARN' ? '🟡' : tag === 'CREEM' ? '🟢' : '🔵';
  return `${emoji} [${tag}][${stage}][${level}]${parts.length ? ' ' + parts.join(' | ') : ''} | ts=${new Date().toISOString()}`;
}

export function logPayPalEvent(
  event: PayPalLogEvent,
  level: PayPalLogLevel = PayPalLogLevel.INFO,
  data: Partial<PayPalLogData> = {}
): void {
  const stage = (event as string).replace(/^paypal_/, '').toUpperCase();
  const line = buildLogLine('PAYPAL', stage, level.toUpperCase(), data);
  switch (level) {
    case PayPalLogLevel.ERROR: console.error(line); break;
    case PayPalLogLevel.WARN:  console.warn(line);  break;
    default:                   console.log(line);
  }
}

/**
 * 记录 PayPal 支付错误
 */
export function logPayPalError(
  event: PayPalLogEvent,
  error: Error | string,
  data: Partial<PayPalLogData> = {}
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  logPayPalEvent(event, PayPalLogLevel.ERROR, { ...data, error: errorMessage });
}

/**
 * 记录 PayPal 支付警告
 */
export function logPayPalWarning(
  event: PayPalLogEvent,
  message: string,
  data: Partial<PayPalLogData> = {}
): void {
  logPayPalEvent(event, PayPalLogLevel.WARN, { ...data, error: message });
}

// ─────────────────────────────────────────────────────────────────────────────
// Creem 结构化日志（格式与 PayPal 完全一致）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creem 日志数据结构
 */
export interface CreemLogData {
  order_no?: string;
  user_email?: string;
  paid_email?: string;
  amount?: number;
  currency?: string;
  credits?: number;
  status?: string;
  error?: string;
  message?: string;
}

/**
 * 记录 Creem 支付日志
 * @param stage  日志阶段，如 "CREDITS_ISSUED"、"ORDER_PAID"
 * @param data   关键字段（order_no / user_email / credits 等）
 * @param level  日志级别，默认 INFO
 */
export function logCreemEvent(
  stage: string,
  data: Partial<CreemLogData> = {},
  level: PayPalLogLevel = PayPalLogLevel.INFO
): void {
  const line = buildLogLine('CREEM', stage.toUpperCase(), level.toUpperCase(), data as any);
  switch (level) {
    case PayPalLogLevel.ERROR: console.error(line); break;
    case PayPalLogLevel.WARN:  console.warn(line);  break;
    default:                   console.log(line);
  }
}

/**
 * 记录 Creem 支付错误
 */
export function logCreemError(
  stage: string,
  error: Error | string,
  data: Partial<CreemLogData> = {}
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  logCreemEvent(stage, { ...data, error: errorMessage }, PayPalLogLevel.ERROR);
}

/**
 * 记录 Creem 支付警告
 */
export function logCreemWarning(
  stage: string,
  message: string,
  data: Partial<CreemLogData> = {}
): void {
  logCreemEvent(stage, { ...data, message }, PayPalLogLevel.WARN);
}
