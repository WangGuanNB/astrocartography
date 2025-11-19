'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

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
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [birthData, setBirthData] = useState<any>(null);
  const [planetLines, setPlanetLines] = useState<PlanetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 从 URL 参数获取出生信息
    const birthDate = searchParams.get('birthDate');
    const birthTime = searchParams.get('birthTime');
    const birthLocation = searchParams.get('birthLocation');
    const timezone = searchParams.get('timezone');

    if (birthDate && birthTime && birthLocation && timezone) {
      const data = { birthDate, birthTime, birthLocation, timezone };
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

            {/* 浮动操作按钮 */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex gap-3 bg-black/80 backdrop-blur-md rounded-full px-6 py-3 border border-white/20">
                <Button
                  onClick={handleDownload}
                  className="bg-purple-600 hover:bg-purple-700 h-12"
                >
                  <Download className="mr-2 size-4" />
                  下载星盘图
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-white/5 h-12"
                >
                  <Share2 className="mr-2 size-4" />
                  分享链接
                </Button>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 bg-white/5 h-12 w-full"
                  >
                    <Sparkles className="mr-2 size-4" />
                    生成新的星盘图
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* 顶部浮动栏 (z-20) */}
      {chartData && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm pointer-events-none">
          <div className="container py-3 pointer-events-auto">
            <div className="flex items-center justify-between">
              {/* 返回按钮 */}
              <Link href="/" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300">
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">返回首页</span>
              </Link>

              {/* 标题信息 */}
              <div className="flex-1 text-center">
                <h1 className="text-lg md:text-xl font-bold text-white">
                  Your Astrocartography Map
                </h1>
                <div className="text-gray-400 text-xs md:text-sm space-x-2 md:space-x-4">
                  <span>📅 {chartData.birthDate}</span>
                  <span>📍 {chartData.birthLocation}</span>
                </div>
              </div>

              {/* 占位 */}
              <div className="w-20"></div>
            </div>
          </div>
        </div>
      )}
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
