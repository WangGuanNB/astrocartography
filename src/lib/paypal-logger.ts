/**
 * @fileoverview PayPal 支付日志工具
 * @description 提供结构化的 PayPal 支付日志记录，便于追踪和排查问题
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
 * 记录 PayPal 支付日志
 * @param event 事件类型
 * @param level 日志级别
 * @param data 日志数据
 */
export function logPayPalEvent(
  event: PayPalLogEvent,
  level: PayPalLogLevel = PayPalLogLevel.INFO,
  data: Partial<PayPalLogData> = {}
): void {
  const logData: PayPalLogData = {
    event,
    level,
    timestamp: new Date().toISOString(),
    ...data,
  };

  // 格式化日志输出
  const logMessage = `[PayPal Log] ${logData.timestamp} [${level.toUpperCase()}] ${event}`;
  const logDetails = {
    order_no: logData.order_no,
    paypal_order_id: logData.paypal_order_id,
    user_uuid: logData.user_uuid,
    user_email: logData.user_email,
    amount: logData.amount,
    currency: logData.currency,
    credits: logData.credits,
    status: logData.status,
    error: logData.error,
    ...logData.metadata,
  };

  // 根据日志级别输出
  switch (level) {
    case PayPalLogLevel.ERROR:
      console.error(logMessage, logDetails);
      break;
    case PayPalLogLevel.WARN:
      console.warn(logMessage, logDetails);
      break;
    default:
      console.log(logMessage, logDetails);
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
  logPayPalEvent(event, PayPalLogLevel.ERROR, {
    ...data,
    error: errorMessage,
  });
}

/**
 * 记录 PayPal 支付警告
 */
export function logPayPalWarning(
  event: PayPalLogEvent,
  message: string,
  data: Partial<PayPalLogData> = {}
): void {
  logPayPalEvent(event, PayPalLogLevel.WARN, {
    ...data,
    error: message,
  });
}
