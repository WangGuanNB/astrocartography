/**
 * Google Analytics 4 (GA4) 事件跟踪工具
 * 
 * 使用 Next.js 的 @next/third-parties/google 包，通过 gtag 发送事件
 */

// 扩展 Window 接口，添加 gtag 类型
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set' | 'js',
      targetId: string | Date,
      config?: {
        [key: string]: any;
      }
    ) => void;
  }
}

/**
 * 等待 gtag 加载完成
 * @param maxRetries 最大重试次数
 * @param delay 每次重试的延迟（毫秒）
 */
function waitForGtag(maxRetries = 30, delay = 100): Promise<void> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    const checkGtag = () => {
      // 检查 gtag 是否已加载
      if (typeof window !== 'undefined' && window.gtag) {
        resolve();
        return;
      }
      
      retries++;
      if (retries >= maxRetries) {
        reject(new Error('gtag failed to load after maximum retries'));
        return;
      }
      
      setTimeout(checkGtag, delay);
    };
    
    checkGtag();
  });
}

/**
 * 发送 GA4 事件
 * @param eventName 事件名称
 * @param eventParams 事件参数
 */
export function trackEvent(
  eventName: string,
  eventParams?: {
    [key: string]: any;
  }
) {
  // 只在客户端执行
  if (typeof window === 'undefined') {
    return;
  }

  // 开发环境：打印日志并尝试发送（如果 gtag 可用）
  if (process.env.NODE_ENV !== 'production') {
    console.log('📊 [GA4 Event]', eventName, eventParams);
    // 开发环境也尝试发送（如果 gtag 可用），方便测试
    if (window.gtag) {
      try {
        window.gtag('event', eventName, {
          ...eventParams,
          timestamp: new Date().toISOString(),
        });
        console.log('✅ [GA4 Event Sent]', eventName, '→ GA4');
      } catch (error) {
        console.error('❌ [GA4 Event Failed]', eventName, error);
      }
    } else {
      console.warn('⚠️ [GA4 Event] gtag not loaded yet, event logged but not sent:', eventName);
    }
    return;
  }

  // 生产环境：等待 gtag 加载后发送
  waitForGtag()
    .then(() => {
      if (window.gtag) {
        try {
          window.gtag('event', eventName, {
            ...eventParams,
            // 添加时间戳
            timestamp: new Date().toISOString(),
          });
          // 生产环境也打印日志，方便调试
          console.log('📊 [GA4 Event Sent]', eventName, eventParams);
        } catch (error) {
          console.error('Failed to track GA4 event:', error);
        }
      } else {
        console.warn('📊 [GA4 Event Failed] gtag not available after wait:', eventName);
      }
    })
    .catch((error) => {
      console.warn('📊 [GA4 Event Failed] gtag not available after retries:', eventName, error);
    });
}

const AUTH_INTENT_STORAGE_KEY = "astro_auth_tracking_intent";
const AUTH_INTENT_MAX_AGE_MS = 10 * 60 * 1000;

type AuthProvider = "google" | "github" | "google_one_tap";

function getAuthIntent() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as { provider: AuthProvider; startedAt: number };
    if (!intent.provider || Date.now() - intent.startedAt > AUTH_INTENT_MAX_AGE_MS) {
      window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

/** Authentication events are only sent after an explicit auth action. */
export const authEvents = {
  gateShown: (surface: "ai_chat" | "city_tools" | "pricing") => {
    trackEvent("auth_gate_shown", {
      surface,
      event_category: "Authentication",
    });
  },

  signInStarted: (provider: AuthProvider) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          AUTH_INTENT_STORAGE_KEY,
          JSON.stringify({ provider, startedAt: Date.now() })
        );
      } catch {
        // Analytics must never block sign-in if storage is unavailable.
      }
    }
    trackEvent("login_started", {
      provider,
      event_category: "Authentication",
    });
  },

  completeFromIntent: (createdAt?: string | Date | null) => {
    const intent = getAuthIntent();
    if (!intent) return;

    try {
      window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
    } catch {
      // The event remains best-effort.
    }

    const createdAtMs = createdAt ? new Date(createdAt).getTime() : NaN;
    const isNewAccount =
      Number.isFinite(createdAtMs) && Math.abs(Date.now() - createdAtMs) < AUTH_INTENT_MAX_AGE_MS;

    trackEvent(isNewAccount ? "sign_up" : "login", {
      method: intent.provider,
      event_category: "Authentication",
    });
  },
};

/**
 * Ask AI 相关事件
 */
export const askAIEvents = {
  /**
   * 打开 Ask AI 对话框
   * @param source 来源：'auto' | 'manual'
   */
  dialogOpened: (source: 'auto' | 'manual') => {
    trackEvent('ai_dialog_opened', {
      source,
      event_category: 'Ask AI',
      event_label: source === 'auto' ? 'Auto Popup' : 'Manual Click',
    });
  },

  /**
   * 关闭 Ask AI 对话框
   * @param questionCount 已问问题数量
   * @param userType 用户类型：'logged_in' | 'guest'
   */
  dialogClosed: (questionCount: number, userType: 'logged_in' | 'guest') => {
    trackEvent('ai_dialog_closed', {
      question_count: questionCount,
      user_type: userType,
      event_category: 'Ask AI',
    });
  },

  /**
   * 发送问题
   * @param questionNumber 问题序号（第几个问题）
   * @param isFreeQuestion 是否是免费问题
   * @param userType 用户类型
   */
  questionSent: (
    questionNumber: number,
    isFreeQuestion: boolean,
    userType: 'logged_in' | 'guest'
  ) => {
    trackEvent('ai_question_sent', {
      question_number: questionNumber,
      is_free_question: isFreeQuestion,
      user_type: userType,
      event_category: 'Ask AI',
    });
  },

  /**
   * 收到 AI 回复
   * @param questionNumber 问题序号
   * @param responseLength 回复长度（字符数）
   */
  responseReceived: (questionNumber: number, responseLength: number) => {
    trackEvent('ai_response_received', {
      question_number: questionNumber,
      response_length: responseLength,
      event_category: 'Ask AI',
    });
  },

  /**
   * 积分不足提示
   * @param creditsRemaining 剩余积分
   * @param creditsRequired 所需积分
   */
  insufficientCredits: (creditsRemaining: number, creditsRequired: number) => {
    trackEvent('ai_insufficient_credits', {
      credits_remaining: creditsRemaining,
      credits_required: creditsRequired,
      event_category: 'Ask AI',
      event_label: 'Insufficient Credits',
    });
  },
};

/**
 * 城市检查与城市比较事件
 */
export const cityToolEvents = {
  opened: (tool: 'check_city' | 'compare_cities') => {
    trackEvent('city_tool_opened', {
      tool,
      event_category: 'City Tools',
    });
  },

  citySelected: (tool: 'check_city' | 'compare_cities') => {
    trackEvent('city_tool_city_selected', {
      tool,
      event_category: 'City Tools',
    });
  },

  cityRemoved: (cityCount: number) => {
    trackEvent('city_tool_city_removed', {
      city_count: cityCount,
      event_category: 'City Tools',
    });
  },

  goalChanged: (goal: string) => {
    trackEvent('city_tool_goal_changed', {
      goal,
      event_category: 'City Tools',
    });
  },

  comparisonRun: (
    goal: string,
    cityCount: number,
    topScore?: number
  ) => {
    trackEvent('city_tool_comparison_run', {
      goal,
      city_count: cityCount,
      top_score: topScore ?? 0,
      event_category: 'City Tools',
    });
  },

  limitReached: (
    maxCities: number,
    userState: 'anonymous' | 'signed_in'
  ) => {
    trackEvent('city_tool_compare_limit_reached', {
      max_cities: maxCities,
      user_state: userState,
      event_category: 'City Tools',
    });
  },

  reportUnlocked: (
    reportType: 'city_comparison_report',
    creditsRequired: number
  ) => {
    trackEvent('city_tool_report_unlock_clicked', {
      report_type: reportType,
      credits_required: creditsRequired,
      event_category: 'City Tools',
    });
  },

  aiContinued: (
    tool: 'check_city' | 'compare_cities',
    cityCount: number
  ) => {
    trackEvent('city_tool_ai_continued', {
      tool,
      city_count: cityCount,
      event_category: 'City Tools',
    });
  },
};

/**
 * 首页内嵌地图结果事件
 */
export const homeInlineMapEvents = {
  generated: () => {
    trackEvent('home_inline_map_generated', {
      event_category: 'Home Inline Map',
    });
  },

  generationFailed: () => {
    trackEvent('home_inline_generation_failed', {
      error_type: 'generation_failed',
      event_category: 'Home Inline Map',
    });
  },

  openFullMapClicked: () => {
    trackEvent('home_inline_open_full_map_clicked', {
      event_category: 'Home Inline Map',
    });
  },

  askAIClicked: () => {
    trackEvent('home_inline_ask_ai_clicked', {
      event_category: 'Home Inline Map',
    });
  },

  checkCityClicked: () => {
    trackEvent('home_inline_check_city_clicked', {
      event_category: 'Home Inline Map',
    });
  },

  compareCitiesClicked: () => {
    trackEvent('home_inline_compare_cities_clicked', {
      event_category: 'Home Inline Map',
    });
  },
};

/**
 * 付费相关事件
 */
export const paymentEvents = {
  /**
   * 打开价格弹窗
   * @param triggerSource 触发来源：'insufficient_credits' | 'manual' | 'other'
   */
  pricingModalOpened: (triggerSource: 'insufficient_credits' | 'manual' | 'other') => {
    trackEvent('pricing_modal_opened', {
      trigger_source: triggerSource,
      event_category: 'Payment',
      event_label: 'Pricing Modal',
    });
  },

  /**
   * 查看价格方案
   * @param planName 方案名称
   * @param planPrice 方案价格
   */
  planViewed: (planName: string, planPrice: number) => {
    trackEvent('pricing_plan_viewed', {
      plan_name: planName,
      plan_price: planPrice,
      event_category: 'Payment',
      event_label: planName,
    });
  },

  /**
   * 点击购买按钮
   * @param planName 方案名称
   * @param planPrice 方案价格
   * @param planId 方案 ID
   */
  buyButtonClicked: (planName: string, planPrice: number, planId: string) => {
    trackEvent('pricing_buy_clicked', {
      plan_name: planName,
      plan_price: planPrice,
      plan_id: planId,
      event_category: 'Payment',
      event_label: planName,
      value: planPrice, // 用于 GA4 的货币价值追踪
      currency: 'USD',
    });
  },

  /**
   * 开始支付流程
   * @param planName 方案名称
   * @param planPrice 方案价格
   * @param planId 方案 ID
   */
  paymentInitiated: (planName: string, planPrice: number, planId: string) => {
    trackEvent('payment_initiated', {
      plan_name: planName,
      plan_price: planPrice,
      plan_id: planId,
      event_category: 'Payment',
      event_label: 'Payment Started',
      value: planPrice,
      currency: 'USD',
    });
  },

  /**
   * 支付成功
   * @param planName 方案名称
   * @param planPrice 方案价格
   * @param planId 方案 ID
   * @param transactionId 交易 ID
   */
  paymentSuccess: (
    planName: string,
    planPrice: number,
    planId: string,
    transactionId?: string
  ) => {
    trackEvent('purchase', {
      // 使用 GA4 标准的 purchase 事件
      transaction_id: transactionId || `plan_${planId}_${Date.now()}`,
      value: planPrice,
      currency: 'USD',
      items: [
        {
          item_id: planId,
          item_name: planName,
          price: planPrice,
          quantity: 1,
        },
      ],
      event_category: 'Payment',
      event_label: 'Payment Success',
    });
  },

  /**
   * 支付失败
   * @param planName 方案名称
   * @param planPrice 方案价格
   * @param planId 方案 ID
   * @param errorReason 失败原因
   */
  paymentFailed: (
    planName: string,
    planPrice: number,
    planId: string,
    errorReason?: string
  ) => {
    trackEvent('payment_failed', {
      plan_name: planName,
      plan_price: planPrice,
      plan_id: planId,
      error_reason: errorReason || 'unknown',
      event_category: 'Payment',
      event_label: 'Payment Failed',
    });
  },
};

/**
 * 页面访问事件
 */
export const pageEvents = {
  /**
   * 访问地图页面
   */
  chartPageViewed: () => {
    trackEvent('page_view', {
      page_title: 'Astrocartography Chart',
      page_location: window.location.href,
      event_category: 'Page View',
    });
  },
};
