'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat } from 'ai/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Sparkles, Coins, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import { useTranslations, useLocale } from 'next-intl';
import PricingModal from '@/components/pricing/pricing-modal';
import { Pricing as PricingType } from '@/types/blocks/pricing';
import { askAIEvents, paymentEvents } from '@/lib/analytics';
import { toast } from 'sonner';

interface AstroChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartData: {
    birthData: {
      date: string;
      time: string;
      location: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };
    planetLines: {
      planet: string;
      type: 'AS' | 'DS' | 'MC' | 'IC';
      coordinates: [number, number][];
      color: string;
    }[];
  };
  user?: User | null;
  onRequireLogin?: () => void;
}

// 预设问题（按转化优先级排序）
const SUGGESTED_QUESTIONS = [
  "Where should I move to find love and success?",
  "What are my top 3 cities for career growth?",
  "How will moving to a new city change my life?",
  "What does my Venus line reveal about relationships?",
  "Compare my best locations for love vs. career",
];

const FREE_QUESTIONS_LIMIT = 1; // 免费问题数量限制

export default function AstroChat({ open, onOpenChange, chartData, user, onRequireLogin }: AstroChatProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [creditCost, setCreditCost] = useState<number>(10); // 默认 10 积分
  const [userCredits, setUserCredits] = useState<number | null>(null); // 用户积分余额
  const [lastCredits, setLastCredits] = useState<number | null>(null); // 上次积分值，用于检测变化
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<PricingType | null>(null);
  const [showInsufficientCreditsDialog, setShowInsufficientCreditsDialog] = useState(false); // 积分不足提示框
  const t = useTranslations('astro_chat');
  const locale = useLocale();

  // 获取用户积分余额
  const fetchUserCredits = useCallback(async (): Promise<number | null> => {
    if (!user) return null;
    
    try {
      const response = await fetch('/api/get-user-credits', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.code === 0 && data.data) {
        const credits = data.data.left_credits || 0;
        // 检测积分变化（使用函数式更新避免依赖 lastCredits）
        setLastCredits(prev => {
          if (prev !== null && credits !== prev) {
            console.log('积分变化:', { old: prev, new: credits });
          }
          return credits;
        });
        setUserCredits(credits);
        return credits;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch user credits:', err);
      return null;
    }
  }, [user]);

  // 获取定价数据
  const fetchPricingData = async () => {
    try {
      const response = await fetch(`/api/get-pricing?locale=${locale}`);
      const data = await response.json();
      if (data.success && data.pricing) {
        setPricingData(data.pricing);
      }
    } catch (err) {
      console.error('Failed to fetch pricing data:', err);
    }
  };

  // 处理积分不足的情况（显示提示框而不是直接打开价格弹窗）
  const handleInsufficientCredits = useCallback(async () => {
    let currentCredits = userCredits;
    // 刷新积分（确保显示最新的积分值）
    if (user) {
      currentCredits = await fetchUserCredits();
    }
    // 显示积分不足提示框
    setShowInsufficientCreditsDialog(true);
    // 📊 埋点：积分不足（使用刷新后的积分值）
    askAIEvents.insufficientCredits(currentCredits || 0, creditCost);
  }, [user, userCredits, creditCost, fetchUserCredits]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append, setMessages } = useChat({
    api: '/api/astro-chat',
    body: {
      chartData,
    },
    onError: async (error) => {
      const errorMessage = error.message || '';
      
      // 尝试从错误消息中解析 JSON（useChat 可能会将响应体包含在错误消息中）
      try {
        // 检查错误消息是否包含 JSON 格式的错误信息
        const jsonMatch = errorMessage.match(/\{.*"code".*"type".*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          
          // 401: 需要登录
          if (errorData.code === 401 && errorData.type === 'auth_required') {
            if (onRequireLogin) {
              onRequireLogin();
            }
            // 不打印错误日志，这是正常的业务提示
            return;
          }
          
          // 402: 积分不足
          if (errorData.code === 402 && errorData.type === 'insufficient_credits') {
            handleInsufficientCredits();
            // 不打印错误日志，这是正常的业务提示
            return;
          }
        }
      } catch (parseError) {
        // 解析失败，继续使用关键词匹配
      }
      
      // 通过关键词匹配识别错误类型（兼容旧格式）
      if (errorMessage.includes('auth_required') || 
          errorMessage.includes('Please sign in') ||
          errorMessage.includes('sign in first')) {
        if (onRequireLogin) {
          onRequireLogin();
        }
        // 不打印错误日志
        return;
      }
      
      if (errorMessage.includes('insufficient_credits') || 
          errorMessage.includes('积分不足') || 
          errorMessage.includes('Insufficient credits')) {
        handleInsufficientCredits();
        // 不打印错误日志
        return;
      }
      
      // 其他错误只在开发环境打印日志
      if (process.env.NODE_ENV === 'development') {
        console.error('Chat error:', error);
      }
    },
  });

  // 计算用户消息数量（只统计 role 为 'user' 的消息）
  const userMessageCount = useMemo(() => {
    return messages.filter(msg => msg.role === 'user').length;
  }, [messages]);

  // 下载聊天记录
  const handleDownloadChat = useCallback(() => {
    if (messages.length === 0) {
      toast.error(t('no_messages'));
      return;
    }

    try {
      // 格式化日期时间
      const now = new Date();
      const dateStr = now.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // 构建文件内容
      let content = 'Astro Chat Conversation\n';
      content += '='.repeat(50) + '\n\n';
      content += `Date: ${dateStr}\n`;
      content += `Chart for: ${chartData.birthData.location}\n`;
      content += '\n' + '='.repeat(50) + '\n';
      content += 'Conversation\n';
      content += '='.repeat(50) + '\n\n';

      // 添加每条消息
      messages.forEach((message) => {
        const role = message.role === 'user' ? 'User' : 'AI';
        content += `[${role}]\n`;
        content += message.content + '\n';
        content += '\n';
      });

      // 创建 Blob 并下载
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `astro-chat-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('download_success'));
    } catch (error) {
      console.error('Failed to download chat:', error);
      toast.error(t('download_failed'));
    }
  }, [messages, chartData, locale, t]);

  // 📊 埋点：收到 AI 回复（监听消息变化）
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        askAIEvents.responseReceived(userMessageCount, lastMessage.content.length);
      }
    }
  }, [messages.length, isLoading, userMessageCount]);

  // 检查是否可以继续提问
  const canAskQuestion = useMemo(() => {
    // 如果已登录，可以无限提问
    if (user) {
      return true;
    }
    // 如果未登录，只能问免费问题数量
    return userMessageCount < FREE_QUESTIONS_LIMIT;
  }, [user, userMessageCount]);

  // 剩余免费问题数量
  const remainingFreeQuestions = useMemo(() => {
    if (user) return -1; // 已登录用户无限制
    return Math.max(0, FREE_QUESTIONS_LIMIT - userMessageCount);
  }, [user, userMessageCount]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);


  // 获取积分消耗配置和用户积分
  useEffect(() => {
    if (open && user) {
      // 获取积分消耗配置
      fetch('/api/ai-chat-credit-cost')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.creditCost) {
            setCreditCost(data.creditCost);
          }
        })
        .catch(err => {
          console.error('Failed to fetch credit cost:', err);
        });
      
      // 获取用户积分余额
      fetchUserCredits();
    } else if (!user) {
      // 未登录用户清空积分显示
      setUserCredits(null);
      setLastCredits(null);
    }
  }, [open, user, fetchUserCredits]);

  // 监听页面可见性变化，用户返回时刷新积分
  useEffect(() => {
    if (!user || !open) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && open) {
        // 用户返回页面，刷新积分（检测积分变化）
        fetchUserCredits();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, open, fetchUserCredits]);

  // 每次对话完成后刷新积分（检测到消息增加时）
  useEffect(() => {
    if (user && messages.length > 0 && !isLoading) {
      // 延迟一下，确保后端已经处理完积分扣除
      const timer = setTimeout(() => {
        fetchUserCredits();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isLoading, user, fetchUserCredits]);


  // 处理表单提交
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 检查是否可以提问
    if (!canAskQuestion) {
      // 需要登录才能继续提问
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }
    
    // 🔥 检查用户积分是否足够（仅对已登录用户）
    if (user) {
      let currentCredits = userCredits;
      
      // 如果积分还没加载，先尝试获取
      if (currentCredits === null) {
        currentCredits = await fetchUserCredits();
      }
      
      // 如果获取到积分且积分不足，显示提示框
      if (currentCredits !== null && currentCredits < creditCost) {
        setShowInsufficientCreditsDialog(true);
        // 📊 埋点：积分不足
        askAIEvents.insufficientCredits(currentCredits, creditCost);
        return;
      }
      
      // 如果积分还是 null（网络问题），允许继续提交让后端检查
    }
    
    setShowSuggestions(false);
    
    // 📊 埋点：发送问题
    const nextQuestionNumber = userMessageCount + 1;
    const isFreeQuestion = !user && nextQuestionNumber <= FREE_QUESTIONS_LIMIT;
    askAIEvents.questionSent(
      nextQuestionNumber,
      isFreeQuestion,
      user ? 'logged_in' : 'guest'
    );
    
    handleSubmit(e);
    // 清空输入框后重新聚焦
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // 处理预设问题点击
  const handleSuggestedQuestionClick = async (question: string) => {
    // 检查是否可以提问
    if (!canAskQuestion) {
      // 需要登录才能继续提问
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }
    
    // 🔥 检查用户积分是否足够（仅对已登录用户）
    if (user) {
      let currentCredits = userCredits;
      
      // 如果积分还没加载，先尝试获取
      if (currentCredits === null) {
        currentCredits = await fetchUserCredits();
      }
      
      // 如果获取到积分且积分不足，显示提示框
      if (currentCredits !== null && currentCredits < creditCost) {
        setShowInsufficientCreditsDialog(true);
        // 📊 埋点：积分不足
        askAIEvents.insufficientCredits(currentCredits, creditCost);
        return;
      }
      
      // 如果积分还是 null（网络问题），允许继续提交让后端检查
    }
    
    setShowSuggestions(false);
    
    // 📊 埋点：发送问题（预设问题）
    const nextQuestionNumber = userMessageCount + 1;
    const isFreeQuestion = !user && nextQuestionNumber <= FREE_QUESTIONS_LIMIT;
    askAIEvents.questionSent(
      nextQuestionNumber,
      isFreeQuestion,
      user ? 'logged_in' : 'guest'
    );
    
    append({
      role: 'user',
      content: question,
    });
  };

  // 聊天内容组件（复用）
  const chatContent = (
    <>
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4" ref={scrollRef}>
        <div className="space-y-4">
            {messages.length === 0 && showSuggestions && (
              <div className="space-y-6 py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="size-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Sparkles className="size-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-white mb-2">
                      Welcome! Ready to explore your planetary blueprint?
                    </p>
                    <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
                      Discover the stories written in your stars and planetary lines
                      <Sparkles className="size-4 text-yellow-400" />
                    </p>
                  </div>
                </div>

                {/* 预设问题 */}
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestionClick(question)}
                      className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canAskQuestion}
                    >
                      "{question}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 聊天消息 */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="size-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-100 border border-white/10'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="size-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="size-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* 加载状态 */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="size-4 text-white" />
                </div>
                <div className="bg-white/10 text-gray-100 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="size-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="size-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="size-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* 错误提示 - 不显示 401/402 错误（这些是业务提示，不是错误） */}
            {error && (() => {
              const errorMessage = error.message || '';
              // 检查是否是业务提示错误（401/402），如果是则不显示
              const isBusinessPrompt = 
                errorMessage.includes('auth_required') ||
                errorMessage.includes('insufficient_credits') ||
                errorMessage.includes('Please sign in') ||
                errorMessage.includes('sign in first') ||
                errorMessage.includes('Insufficient credits') ||
                errorMessage.includes('积分不足');
              
              // 只显示真正的系统错误
              if (!isBusinessPrompt) {
                return (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg px-4 py-3 text-sm">
                    {errorMessage || 'An error occurred, please try again later'}
                  </div>
                );
              }
              return null;
            })()}

            {/* 登录提示 - 当免费问题用完后显示 */}
            {!user && userMessageCount >= FREE_QUESTIONS_LIMIT && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 text-white rounded-lg px-4 py-4 text-sm">
                <div className="flex items-start gap-3">
                  <Sparkles className="size-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">You've used your free question!</p>
                    <p className="text-gray-300 text-xs mb-3">
                      Sign in to continue asking unlimited questions about your astrocartography chart.
                    </p>
                    <Button
                      onClick={() => {
                        if (onRequireLogin) {
                          onRequireLogin();
                        }
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs"
                    >
                      Sign In to Continue
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* 输入框 */}
      <form onSubmit={onSubmit} className="pt-4 border-t border-white/10 px-4 pb-4">
          {/* 未登录且免费问题用尽时的提示 */}
          {!user && !canAskQuestion && (
            <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs text-center">
              Please sign in to continue asking questions
            </div>
          )}
          {/* 已登录用户显示积分消耗说明 */}
          {user && (
            <div className="mb-3 flex items-center justify-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs">
              <Coins className="size-3.5" />
              <span>
                {userCredits !== null && (
                  <span className="font-semibold">Credits: {userCredits} | </span>
                )}
                {creditCost === 1 
                  ? t('credit_cost_notice_singular', { credits: creditCost })
                  : t('credit_cost_notice', { credits: creditCost })
                }
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder={
                !user && !canAskQuestion
                  ? "Sign in to continue asking questions..."
                  : "Ask me anything about your astrocartography chart!"
              }
              className="min-h-[60px] max-h-[120px] resize-none bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || (!user && !canAskQuestion)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || (!user && !canAskQuestion)}
              className="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="size-5" />
              )}
            </Button>
          </div>
        </form>
    </>
  );

  // 桌面端使用 Dialog
  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl h-[80vh] flex flex-col bg-gradient-to-br from-purple-900/20 via-gray-900/95 to-gray-900/95 border border-white/10 backdrop-blur-xl">
            <DialogHeader className="pb-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-white">
                      Astro Chat
                    </DialogTitle>
                    <p className="text-sm text-gray-400">
                      Revealing your planetary story
                    </p>
                  </div>
                </div>
                {/* 下载按钮 */}
                {messages.length > 0 && (
                  <Button
                    onClick={handleDownloadChat}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                    title={t('download_chat')}
                  >
                    <Download className="size-4 mr-2" />
                    {t('download_chat')}
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <div className="size-2 rounded-full bg-green-400 animate-pulse" />
                  <span>Chart for: {chartData.birthData.location}</span>
                </div>
                <div className="flex items-center gap-3">
                  {user && userCredits !== null && (
                    <div className="text-xs text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                      Credits: {userCredits}
                    </div>
                  )}
                  {!user && (
                    <div className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                      {remainingFreeQuestions > 0 
                        ? `Free: ${remainingFreeQuestions} question${remainingFreeQuestions > 1 ? 's' : ''} left`
                        : 'Sign in for unlimited questions'}
                    </div>
                  )}
                </div>
              </div>
            </DialogHeader>
            {chatContent}
          </DialogContent>
        </Dialog>

        {/* 价格弹窗 */}
        {pricingData && (
          <PricingModal
            open={showPricingModal}
            onOpenChange={setShowPricingModal}
            pricing={pricingData}
            onSuccess={() => {
              fetchUserCredits();
            }}
          />
        )}

        {/* 积分不足提示框 - 桌面端和移动端都使用 Dialog，居中显示 */}
        <Dialog open={showInsufficientCreditsDialog} onOpenChange={setShowInsufficientCreditsDialog}>
          <DialogContent className="max-w-lg w-[calc(100%-2rem)] mx-4 bg-gradient-to-br from-purple-900/20 via-gray-900/95 to-gray-900/95 border border-white/10 backdrop-blur-xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
                {t('insufficient_credits_title')}
              </DialogTitle>
              <p className="text-sm sm:text-base text-gray-300 mt-2 sm:mt-3 leading-relaxed">
                {t('insufficient_credits_message')}
              </p>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end mt-6 sm:mt-8">
              <Button
                variant="outline"
                onClick={() => setShowInsufficientCreditsDialog(false)}
                className="border-white/20 text-white hover:bg-white/10 px-6 py-2.5 w-full sm:w-auto"
              >
                {t('insufficient_credits_close')}
              </Button>
              <Button
                onClick={async () => {
                  setShowInsufficientCreditsDialog(false);
                  // 先获取定价数据（如果还没有）
                  if (!pricingData) {
                    await fetchPricingData();
                  }
                  // 打开价格弹窗
                  setShowPricingModal(true);
                  // 📊 埋点：打开价格弹窗（由积分不足触发）
                  paymentEvents.pricingModalOpened('insufficient_credits');
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 w-full sm:w-auto"
              >
                {t('insufficient_credits_upgrade')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // 移动端使用 Drawer
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] bg-gradient-to-br from-purple-900/20 via-gray-900/95 to-gray-900/95 border-t border-white/10 backdrop-blur-xl flex flex-col">
          <DrawerHeader className="pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="size-4 text-white" />
                </div>
                <div>
                  <DrawerTitle className="text-lg font-bold text-white">
                    Astro Chat
                  </DrawerTitle>
                  <p className="text-xs text-gray-400">
                    Revealing your planetary story
                  </p>
                </div>
              </div>
              {/* 下载按钮 */}
              {messages.length > 0 && (
                <Button
                  onClick={handleDownloadChat}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 text-xs px-2 py-1 h-auto"
                  title={t('download_chat')}
                >
                  <Download className="size-3 mr-1" />
                  <span className="hidden sm:inline">{t('download_chat')}</span>
                </Button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <div className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="truncate max-w-[120px]">Chart for: {chartData.birthData.location}</span>
              </div>
              <div className="flex items-center gap-2">
                {user && userCredits !== null && (
                  <div className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                    Credits: {userCredits}
                  </div>
                )}
                {!user && (
                  <div className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                    {remainingFreeQuestions > 0 
                      ? `Free: ${remainingFreeQuestions} left`
                      : 'Sign in'}
                  </div>
                )}
              </div>
            </div>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden flex flex-col px-3">
            {chatContent}
          </div>
        </DrawerContent>
      </Drawer>

      {/* 价格弹窗 */}
      {pricingData && (
        <PricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          pricing={pricingData}
          onSuccess={() => {
            fetchUserCredits();
          }}
        />
      )}

      {/* 积分不足提示框 - 桌面端和移动端都使用 Dialog，居中显示 */}
      <Dialog open={showInsufficientCreditsDialog} onOpenChange={setShowInsufficientCreditsDialog}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] mx-4 bg-gradient-to-br from-purple-900/20 via-gray-900/95 to-gray-900/95 border border-white/10 backdrop-blur-xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
              {t('insufficient_credits_title')}
            </DialogTitle>
            <p className="text-sm sm:text-base text-gray-300 mt-2 sm:mt-3 leading-relaxed">
              {t('insufficient_credits_message')}
            </p>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end mt-6 sm:mt-8">
            <Button
              variant="outline"
              onClick={() => setShowInsufficientCreditsDialog(false)}
              className="border-white/20 text-white hover:bg-white/10 px-6 py-2.5 w-full sm:w-auto"
            >
              {t('insufficient_credits_close')}
            </Button>
            <Button
              onClick={async () => {
                setShowInsufficientCreditsDialog(false);
                // 先获取定价数据（如果还没有）
                if (!pricingData) {
                  await fetchPricingData();
                }
                // 打开价格弹窗
                setShowPricingModal(true);
                // 📊 埋点：打开价格弹窗（由积分不足触发）
                paymentEvents.pricingModalOpened('insufficient_credits');
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 w-full sm:w-auto"
            >
              {t('insufficient_credits_upgrade')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

