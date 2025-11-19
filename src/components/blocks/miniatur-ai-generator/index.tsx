'use client';
import { useTranslations } from 'next-intl';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Globe, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import CompactSocialShare from '@/components/blocks/social-share/compact';

export default function MiniaturaAIGenerator() {
  const t = useTranslations('miniatureGenerator');
  const router = useRouter();
  
  // 出生数据状态
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthLocation, setBirthLocation] = useState('');
  const [timezone, setTimezone] = useState('UTC (London, Dublin)');
  const [useCoordinates, setUseCoordinates] = useState(false);
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedChart, setGeneratedChart] = useState<string | null>(null);
  const [generatedChartData, setGeneratedChartData] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    canUse: boolean;
    remaining: number;
    isLoggedIn: boolean;
  } | null>(null);
  
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 检查使用限制
  const checkUsageLimit = useCallback(async () => {
    try {
      const response = await fetch('/api/check-usage-limit');
      const data = await response.json();
      
      if (data.success) {
        setUsageInfo({
          canUse: data.canUse,
          remaining: data.remaining,
          isLoggedIn: data.isLoggedIn
        });
        
        // 移除了页面加载时的弹层提示，用户可以通过UI中的提示区域看到剩余次数
      }
    } catch (error) {
      console.error('Failed to check usage limit:', error);
    }
  }, []);

  // 记录使用
  const recordUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/check-usage-limit', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setUsageInfo({
          canUse: data.canUse,
          remaining: data.remaining || 0,
          isLoggedIn: data.isLoggedIn
        });
      }
      
      return data.success;
    } catch (error) {
      console.error('Failed to record usage:', error);
      return false;
    }
  }, []);

  // 验证出生数据
  const validateBirthData = useCallback(() => {
    if (!birthDate) {
      toast.error('请输入出生日期');
      return false;
    }
    if (!birthTime) {
      toast.error('请输入出生时间');
      return false;
    }
    if (!birthLocation) {
      toast.error('请输入出生地点');
      return false;
    }
    return true;
  }, [birthDate, birthTime, birthLocation]);

  const handleGenerate = useCallback(async () => {
    // 验证出生数据
    if (!validateBirthData()) {
      return;
    }

    // 跳转到 chart 页面，带上用户输入的数据
    const params = new URLSearchParams({
      birthDate,
      birthTime,
      birthLocation,
      timezone,
      useCoordinates: useCoordinates.toString()
    });
    
    router.push(`/chart?${params.toString()}`);
  }, [birthDate, birthTime, birthLocation, timezone, useCoordinates, validateBirthData, router]);

  // 下载星盘图功能
  const handleDownload = useCallback(() => {
    if (!generatedChartData) return;

    try {
      const link = document.createElement('a');
      link.href = generatedChartData;
      link.download = `astrocartography-chart-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('星盘图下载成功！');
    } catch (error) {
      toast.error('下载失败，请稍后重试');
    }
  }, [generatedChartData]);

  // 分享回调
  const handleShare = useCallback((platform: string) => {
    // 这里可以添加分享统计逻辑
    console.log(`Shared to ${platform}`);
    
    // 发送分享事件到分析工具
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'share', {
        method: platform,
        content_type: 'image',
        content_id: 'miniature_generation',
      });
    }
  }, []);
  
  // 页面加载时检查使用限制
  useEffect(() => {
    checkUsageLimit();
  }, [checkUsageLimit]);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="relative py-8 bg-transparent" id="generator">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-white">
              Generate Your Astrocartography Chart
            </h2>
            <p className="text-base text-gray-300">
              Enter your birth information to create your personalized astrocartography map
            </p>
          </div>

          {/* 表单卡片 */}
          <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4">
                {/* 出生日期 */}
                <div className="space-y-1.5">
                  <Label htmlFor="birthDate" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <Calendar className="size-4 text-purple-400" />
                    Birth Date
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    lang="en"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="YYYY/MM/DD"
                  />
                </div>

                {/* 出生时间 */}
                <div className="space-y-1.5">
                  <Label htmlFor="birthTime" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <Clock className="size-4 text-purple-400" />
                    Birth Time
                  </Label>
                  <Input
                    id="birthTime"
                    type="time"
                    lang="en"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="--:--"
                  />
                </div>

                {/* 出生地点 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="birthLocation" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                      <MapPin className="size-4 text-purple-400" />
                      Birth Location
                    </Label>
                    <button
                      type="button"
                      onClick={() => setUseCoordinates(!useCoordinates)}
                      className="text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      {useCoordinates ? 'Use city name' : 'Use coordinates'}
                    </button>
                  </div>
                  <Input
                    id="birthLocation"
                    type="text"
                    value={birthLocation}
                    onChange={(e) => setBirthLocation(e.target.value)}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    placeholder={useCoordinates ? 'Enter coordinates (e.g., 40.7128, -74.0060)' : 'Enter your birth city...'}
                  />
                </div>

                {/* 时区 */}
                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <Globe className="size-4 text-purple-400" />
                    Timezone
                  </Label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-md bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-purple-500 focus:outline-none focus:ring-2"
                  >
                    <option value="UTC (London, Dublin)" className="bg-gray-900">UTC (London, Dublin)</option>
                    <option value="EST (New York)" className="bg-gray-900">EST (New York)</option>
                    <option value="PST (Los Angeles)" className="bg-gray-900">PST (Los Angeles)</option>
                    <option value="CST (Chicago)" className="bg-gray-900">CST (Chicago)</option>
                    <option value="MST (Denver)" className="bg-gray-900">MST (Denver)</option>
                    <option value="CET (Paris, Berlin)" className="bg-gray-900">CET (Paris, Berlin)</option>
                    <option value="JST (Tokyo)" className="bg-gray-900">JST (Tokyo)</option>
                    <option value="AEST (Sydney)" className="bg-gray-900">AEST (Sydney)</option>
                    <option value="IST (Mumbai)" className="bg-gray-900">IST (Mumbai)</option>
                    <option value="CST (Beijing)" className="bg-gray-900">CST (Beijing)</option>
                  </select>
                </div>

                {/* 生成按钮 */}
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !birthDate || !birthTime || !birthLocation}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      ✨ Generate Your Chart ✨
                    </>
                  )}
                </Button>

                {/* 隐私提示 */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span>🔒</span>
                  <span>Your data is processed securely and never stored permanently. We respect your privacy while unlocking cosmic insights.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 生成结果展示 */}
          {(generatedChart || isGenerating) && (
            <Card className="mt-8 shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="p-8">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    {showProgress ? (
                      <>
                        {/* 环形进度条 */}
                        <div className="relative mb-6">
                          <svg className="size-32 transform -rotate-90" viewBox="0 0 100 100">
                            {/* 背景圆环 */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-white/20"
                            />
                            {/* 进度圆环 */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 45}`}
                              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                              className="text-purple-400 transition-all duration-1000 ease-in-out"
                              strokeLinecap="round"
                            />
                          </svg>
                          {/* 进度文字 */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-purple-400">{progress}%</span>
                          </div>
                        </div>
                        <p className="text-lg font-medium mb-2 text-white">生成你的星盘图中...</p>
                        <p className="text-sm text-gray-400">请稍候，即将完成</p>
                      </>
                    ) : (
                      <>
                        <div className="size-16 animate-spin rounded-full border-4 border-purple-400 border-t-transparent mb-4" />
                        <p className="text-lg font-medium mb-2 text-white">正在处理你的星盘数据...</p>
                        <p className="text-sm text-gray-400">这可能需要几秒钟</p>
                      </>
                    )}
                  </div>
                ) : generatedChart ? (
                  <div className="space-y-6">
                    <div className="rounded-lg overflow-hidden border-2 border-white/20">
                      <img
                        src={generatedChart}
                        alt="Generated Astrocartography Chart"
                        className="w-full h-auto"
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 border-white/30 text-white hover:bg-white/10 bg-white/5"
                        onClick={handleDownload}
                      >
                        <Calendar className="mr-2 size-4" />
                        Download Chart
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 border-white/30 text-white hover:bg-white/10 bg-white/5"
                        onClick={handleGenerate}
                      >
                        <Sparkles className="mr-2 size-4" />
                        Generate New Chart
                      </Button>
                    </div>
                    
                    {/* 分享选项 */}
                    {showShareOptions && generatedChartData && (
                      <CompactSocialShare
                        imageUrl={generatedChart || ''}
                        imageData={generatedChartData}
                        mimeType="image/png"
                        title="Check out my Astrocartography Chart!"
                        description="I just generated my personalized astrocartography map! Discover your cosmic connections around the world."
                        hashtags={["Astrocartography", "AstroMap", "Astrology", "CosmicConnections", "BirthChart"]}
                        onShare={handleShare}
                      />
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
