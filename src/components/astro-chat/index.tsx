'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from 'ai/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';

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

// 预设问题
const SUGGESTED_QUESTIONS = [
  "What should I know about my planetary lines?",
  "Where should I move for love and career?",
  "What's special about my Venus placement?",
  "Which locations support my career goals?",
  "How do different cities affect my energy?",
];

const FREE_QUESTIONS_LIMIT = 1; // 免费问题数量限制

export default function AstroChat({ open, onOpenChange, chartData, user, onRequireLogin }: AstroChatProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append, setMessages } = useChat({
    api: '/api/astro-chat',
    body: {
      chartData,
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // 计算用户消息数量（只统计 role 为 'user' 的消息）
  const userMessageCount = useMemo(() => {
    return messages.filter(msg => msg.role === 'user').length;
  }, [messages]);

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


  // 处理表单提交
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 检查是否可以提问
    if (!canAskQuestion) {
      // 需要登录才能继续提问
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }
    
    setShowSuggestions(false);
    handleSubmit(e);
    // 清空输入框后重新聚焦
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // 处理预设问题点击
  const handleSuggestedQuestionClick = (question: string) => {
    // 检查是否可以提问
    if (!canAskQuestion) {
      // 需要登录才能继续提问
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }
    
    setShowSuggestions(false);
    append({
      role: 'user',
      content: question,
    });
  };

  return (
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
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <div className="size-2 rounded-full bg-green-400 animate-pulse" />
              <span>Chart for: {chartData.birthData.location}</span>
            </div>
            {!user && (
              <div className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                {remainingFreeQuestions > 0 
                  ? `Free: ${remainingFreeQuestions} question${remainingFreeQuestions > 1 ? 's' : ''} left`
                  : 'Sign in for unlimited questions'}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* 消息列表 */}
        <div className="flex-1 px-4 py-4 overflow-y-auto" ref={scrollRef}>
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

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg px-4 py-3 text-sm">
                {error.message || '发生错误，请稍后重试'}
              </div>
            )}

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
        <form onSubmit={onSubmit} className="pt-4 border-t border-white/10">
          {/* 未登录且免费问题用尽时的提示 */}
          {!user && !canAskQuestion && (
            <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs text-center">
              Please sign in to continue asking questions
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
      </DialogContent>
    </Dialog>
  );
}

