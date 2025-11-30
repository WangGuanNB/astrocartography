'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2, Sparkles, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AstroChat from '@/components/astro-chat';
import { useAppContext } from '@/contexts/app';
import SignModal from '@/components/sign/modal';

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

function ChartContent() {
  const searchParams = useSearchParams();
  const { user, setShowSignModal } = useAppContext();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [birthData, setBirthData] = useState<any>(null);
  const [planetLines, setPlanetLines] = useState<PlanetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

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
    } else {
      setError('缺少必要的出生信息');
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
        throw new Error(result.error || '计算失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成星盘图失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    // TODO: 实现地图截图下载功能
    alert('下载功能开发中...');
  };

  const handleShare = () => {
    // 复制当前 URL
    navigator.clipboard.writeText(window.location.href);
    alert('链接已复制到剪贴板！');
  };

  // 处理 AI 聊天按钮点击 - 直接打开聊天窗口，不验证登录
  const handleAskAIClick = () => {
    setChatOpen(true);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* 主内容 - 全屏地图 (z-0) */}
      <div className="absolute inset-0 w-full h-full z-0">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="flex flex-col items-center justify-center">
              <div className="size-16 animate-spin rounded-full border-4 border-purple-400 border-t-transparent mb-4" />
              <p className="text-lg font-medium text-white">计算你的星盘图中...</p>
              <p className="text-sm text-gray-400 mt-2">这可能需要几秒钟</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="text-center">
              <p className="text-red-400 text-lg mb-4">⚠️ {error}</p>
              <Link href="/">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  返回重新生成
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

      {/* 右侧导航栏 - 完全透明背景，按钮带背景 */}
      {chartData && (
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
                  返回首页
                </Button>
              </Link>

              {/* AI 聊天按钮 */}
              {birthData && planetLines.length > 0 && (
                <Button
                  onClick={handleAskAIClick}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white justify-start shadow-lg"
                >
                  <MessageCircle className="size-4 mr-2" />
                  Ask AI
                </Button>
              )}

              {/* 下载按钮 */}
              {birthData && planetLines.length > 0 && (
                <Button
                  onClick={handleDownload}
                  className="w-full justify-start bg-black/80 backdrop-blur-md hover:bg-black/90 text-white border border-white/20"
                >
                  <Download className="size-4 mr-2" />
                  下载
                </Button>
              )}

              {/* 分享按钮 */}
              {birthData && planetLines.length > 0 && (
                <Button
                  onClick={handleShare}
                  className="w-full justify-start bg-black/80 backdrop-blur-md hover:bg-black/90 text-white border border-white/20"
                >
                  <Share2 className="size-4 mr-2" />
                  分享
                </Button>
              )}

              {/* 生成新星盘图 */}
              <Link href="/">
                <Button
                  className="w-full justify-start bg-black/80 backdrop-blur-md hover:bg-black/90 text-white border border-white/20"
                >
                  <Sparkles className="size-4 mr-2" />
                  新星盘图
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
          onOpenChange={setChatOpen}
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

export default function ChartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="size-16 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
      </div>
    }>
      <ChartContent />
    </Suspense>
  );
}
