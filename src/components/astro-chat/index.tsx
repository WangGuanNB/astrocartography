'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

// 预设问题
const SUGGESTED_QUESTIONS = [
  "What should I know about my planetary lines?",
  "Where should I move for love and career?",
  "What's special about my Venus placement?",
  "Which locations support my career goals?",
  "How do different cities affect my energy?",
];

export default function AstroChat({ open, onOpenChange, chartData }: AstroChatProps) {
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

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 处理预设问题点击
  const handleSuggestedQuestion = (question: string) => {
    setShowSuggestions(false);
    append({
      role: 'user',
      content: question,
    });
  };

  // 处理表单提交
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    handleSubmit(e);
    // 清空输入框后重新聚焦
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
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
          <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
            <div className="size-2 rounded-full bg-green-400 animate-pulse" />
            <span>Chart for: {chartData.birthData.location}</span>
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
                      onClick={() => handleSuggestedQuestion(question)}
                      className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all hover:border-purple-500/50"
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
          </div>
        </div>

        {/* 输入框 */}
        <form onSubmit={onSubmit} className="pt-4 border-t border-white/10">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me anything about your astrocartography chart!"
              className="min-h-[60px] max-h-[120px] resize-none bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 flex-shrink-0"
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

