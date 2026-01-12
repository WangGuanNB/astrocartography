'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2, Sparkles, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AstroChat from '@/components/astro-chat';
import { useAppContext } from '@/contexts/app';
import SignModal from '@/components/sign/modal';
import { askAIEvents, pageEvents } from '@/lib/analytics';
import { useIsMobile } from '@/hooks/use-mobile';

// 动态导入地图组件（避免 SSR 问题）
const AstrocartographyMap = dynamic(
  () => import('@/components/astrocartography-map'),
  { ssr: false }
);

interface ChartData {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
}

interface PlanetLine {
  planet: string;
  type: 'AS' | 'DS' | 'MC' | 'IC';
  coordinates: [number, number][];
  color: string;
}

// localStorage key for tracking auto-popup dismissal
const AUTO_POPUP_DISMISSED_KEY = 'astro-chat-auto-popup-dismissed';

export default function ChartContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('astrocartographyGenerator');
  const isMobile = useIsMobile();
  const { user, setShowSignModal } = useAppContext();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [birthData, setBirthData] = useState<any>(null);
  const [planetLines, setPlanetLines] = useState<PlanetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasAutoPopped, setHasAutoPopped] = useState(false); // 标记是否已经自动弹出过
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false); // 右上角工具栏折叠状态

  useEffect(() => {
    // 从 URL 参数获取出生信息
    const birthDate = searchParams.get('birthDate');
    const birthTime = searchParams.get('birthTime');
    const birthLocation = searchParams.get('birthLocation');
    const timezone = searchParams.get('timezone');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (birthDate && birthTime && birthLocation && timezone) {
      const data: any = { birthDate, birthTime, birthLocation, timezone };
      
      // 如果有坐标参数，添加坐标信息
      if (latitude && longitude) {
        data.latitude = parseFloat(latitude);
        data.longitude = parseFloat(longitude);
      }
      
      setChartData(data);
      calculateChart(data);
      
      // 📊 埋点：访问地图页面
      pageEvents.chartPageViewed();
    } else {
      setError(t('messages.errorGeneral.missingInfo'));
      setIsLoading(false);
    }
  }, [searchParams]);

  const calculateChart = async (data: ChartData) => {
    try {
      setIsLoading(true);
      
      // 调用后端 API 计算行星线
      const response = await fetch('/api/calculate-astrocartography', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setBirthData(result.data.birthData);
        setPlanetLines(result.data.planetLines);
      } else {
        throw new Error(result.error || t('messages.errorGeneral.calculationFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('messages.errorGeneral.generationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    // TODO: 实现地图截图下载功能
    alert(t('messages.errorGeneral.downloadInDevelopment'));
  };

  const handleShare = () => {
    // 复制当前 URL
    navigator.clipboard.writeText(window.location.href);
    alert(t('messages.success.linkCopied'));
  };

  // 处理 AI 聊天按钮点击 - 直接打开聊天窗口，不验证登录
  const handleAskAIClick = () => {
    setChatOpen(true);
    // 📊 埋点：手动打开 Ask AI 对话框
    askAIEvents.dialogOpened('manual');
  };

  // 处理对话框关闭 - 记录用户手动关闭，避免重复自动弹出
  const handleChatOpenChange = (open: boolean) => {
    setChatOpen(open);
    // 如果用户手动关闭对话框，记录到 localStorage
    if (!open && hasAutoPopped) {
      try {
        localStorage.setItem(AUTO_POPUP_DISMISSED_KEY, 'true');
      } catch (e) {
        console.error('Failed to save auto-popup dismissal:', e);
      }
    }
  };

  // 🔥 智能自动弹出逻辑：地图加载完成后，根据用户状态延迟弹出
  useEffect(() => {
    // 只在以下条件满足时才自动弹出：
    // 1. 地图已加载完成（不再加载中，有数据，无错误）
    // 2. 用户还没有手动关闭过自动弹出
    // 3. 对话框当前是关闭状态
    // 4. 还没有自动弹出过（避免重复弹出）
    if (
      !isLoading &&
      birthData &&
      planetLines.length > 0 &&
      !error &&
      !chatOpen &&
      !hasAutoPopped
    ) {
      // 检查用户是否已经手动关闭过自动弹出
      try {
        const dismissed = localStorage.getItem(AUTO_POPUP_DISMISSED_KEY);
        if (dismissed === 'true') {
          // 用户已经关闭过，不再自动弹出
          return;
        }
      } catch (e) {
        console.error('Failed to check auto-popup dismissal:', e);
      }

      // 根据用户登录状态设置不同的延迟时间
      // 已登录用户：1.5秒（更可能付费，缩短等待时间）
      // 未登录用户：3秒（给更多时间查看地图）
      const delay = user ? 1500 : 3000;

      const timer = setTimeout(() => {
        setChatOpen(true);
        setHasAutoPopped(true);
        // 📊 埋点：自动打开 Ask AI 对话框
        askAIEvents.dialogOpened('auto');
      }, delay);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isLoading, birthData, planetLines, error, chatOpen, hasAutoPopped, user]);

  // 防止 hydration 不匹配：只在客户端挂载后渲染内容
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-black">
        <div className="w-full h-full flex items-center justify-center">
          <div className="size-16 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* 主内容 - 全屏地图 (z-0) */}
      <div className="absolute inset-0 w-full h-full z-0">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="flex flex-col items-center justify-center">
              <div className="size-16 animate-spin rounded-full border-4 border-purple-400 border-t-transparent mb-4" />
              <p className="text-lg font-medium text-white">{t('messages.success.calculating')}</p>
              <p className="text-sm text-gray-400 mt-2">{t('messages.success.mayTakeMoment')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="text-center">
              <p className="text-red-400 text-lg mb-4">⚠️ {error}</p>
              <Link href="/">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  {t('messages.errorGeneral.returnToRegenerate')}
                </Button>
              </Link>
            </div>
          </div>
        ) : birthData && planetLines.length > 0 ? (
          <>
            {/* 全屏地图 */}
            <div className="absolute inset-0 w-full h-full">
              <AstrocartographyMap 
                birthData={birthData}
                planetLines={planetLines}
              />
            </div>

          </>
        ) : null}
      </div>

      {/* 移动端：右上角工具栏（可折叠） */}
      {chartData && isMobile && (
        <div className="fixed top-16 right-3 z-[1100] flex flex-col items-end gap-2">
          {/* 折叠/展开切换按钮 */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
            className="h-10 w-10 rounded-full bg-black/80 border-white/30 text-white hover:bg-black/90"
          >
            {isToolbarExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>

          {/* 工具栏按钮组（可折叠） */}
          {isToolbarExpanded && (
            <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
              {birthData && planetLines.length > 0 && (
                <>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full bg-black/80 border-white/30 text-white hover:bg-black/90"
                    onClick={handleDownload}
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full bg-black/80 border-white/30 text-white hover:bg-black/90"
                    onClick={handleShare}
                  >
                    <Share2 className="size-4" />
                  </Button>
                </>
              )}
              <Link href="/">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-full bg-black/80 border-white/30 text-white hover:bg-black/90"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 移动端：右下角 Ask AI 按钮（始终显示） */}
      {chartData && isMobile && birthData && planetLines.length > 0 && (
        <div className="fixed right-3 bottom-20 z-[1100]">
          <Button
            onClick={handleAskAIClick}
            className="h-11 px-5 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white shadow-2xl shadow-purple-500/60 text-sm font-semibold flex items-center gap-2"
          >
            <MessageCircle className="size-4" />
            <span>Ask AI</span>
            <Sparkles className="size-4 text-yellow-300" />
          </Button>
        </div>
      )}

      {/* 桌面端：右侧导航栏 */}
      {chartData && !isMobile && (
        <div className="absolute top-0 right-0 bottom-0 z-[1100] pointer-events-none w-auto">
            <div className="h-full flex flex-col py-6 px-4 pointer-events-auto">
              {/* 标题和出生信息 */}
              <div className="mb-6 bg-black/80 backdrop-blur-md rounded-lg px-4 py-3 border border-white/20">
                <h1 className="text-sm md:text-base font-bold text-white mb-2">
                  Your Astrocartography Map
                </h1>
                <div className="text-gray-400 text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <span>📅</span>
                    <span>{chartData.birthDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span className="truncate max-w-[150px]">{chartData.birthLocation}</span>
                  </div>
                </div>
              </div>

              {/* 所有操作按钮 - 垂直排列，每个按钮都有背景 */}
              <div className="flex flex-col gap-2">
                {/* 返回首页 */}
                <Link href="/">
                  <Button
                    className="w-full justify-start bg-black/80 backdrop-blur-md hover:bg-black/90 text-white border border-white/20"
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    {t('messages.buttons.returnHome')}
                  </Button>
                </Link>

                {/* AI 聊天按钮 - 更醒目的设计 */}
                {birthData && planetLines.length > 0 && (
                  <Button
                    onClick={handleAskAIClick}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white justify-center font-bold text-base py-4 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300 transform hover:scale-105 border-2 border-purple-400/50 hover:border-purple-300 relative overflow-hidden group"
                  >
                    {/* 背景光效 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    
                    {/* 按钮内容 */}
                    <div className="relative flex items-center gap-2">
                      <MessageCircle className="size-5 animate-pulse" />
                      <span className="text-lg font-extrabold tracking-wide">Ask AI</span>
                      <Sparkles className="size-4 text-yellow-300 animate-pulse" />
                    </div>
                  </Button>
                )}

                {/* 下载按钮 */}
                {birthData && planetLines.length > 0 && (
                  <Button
                    onClick={handleDownload}
                    className="w-full justify-start bg-black/80 backdrop-blur-md hover:bg-black/90 text-white border border-white/20"
                  >
                    <Download className="size-4 mr-2" />
                    {t('messages.buttons.download')}
                  </Button>
                )}

                {/* 分享按钮 */}
                {birthData && planetLines.length > 0 && (
                  <Button
                    onClick={handleShare}
                    className="w-full justify-start bg-black/80 backdrop-blur-md hover:bg-black/90 text-white border border-white/20"
                  >
                    <Share2 className="size-4 mr-2" />
                    {t('messages.buttons.share')}
                  </Button>
                )}

                {/* 生成新星盘图 */}
                <Link href="/">
                  <Button
                    className="w-full justify-start bg-black/80 backdrop-blur-md hover:bg-black/90 text-white border border-white/20"
                  >
                    <Sparkles className="size-4 mr-2" />
                    {t('messages.buttons.newChart')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
      )}

      {/* AI 聊天对话框 - 未登录用户可免费问一个问题 */}
      {birthData && planetLines.length > 0 && (
        <AstroChat
          open={chatOpen}
          onOpenChange={handleChatOpenChange}
          chartData={{
            birthData: {
              date: birthData.date,
              time: birthData.time,
              location: birthData.location,
              latitude: birthData.latitude,
              longitude: birthData.longitude,
              timezone: chartData?.timezone || 'UTC',
            },
            planetLines: planetLines,
          }}
          user={user}
          onRequireLogin={() => setShowSignModal(true)}
        />
      )}

      {/* 登录弹窗 */}
      <SignModal />
    </div>
  );
}

