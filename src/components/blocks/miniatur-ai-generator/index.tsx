'use client';
import { useTranslations } from 'next-intl';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Globe, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import CompactSocialShare from '@/components/blocks/social-share/compact';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/app';
import PricingModal from '@/components/pricing/pricing-modal';
import { Pricing as PricingType } from '@/types/blocks/pricing';
import type { UserEntitlements } from '@/types/user';
import { paymentEvents } from '@/lib/analytics';
import { applyBrandingFooterToPngDataUrl } from '@/lib/export-branding';

export default function MiniaturaAIGenerator() {
  const t = useTranslations('astrocartographyGenerator');
  const params = useParams();
  const { user, setShowSignModal } = useAppContext();
  // 获取当前语言，如果没有locale参数则说明是默认语言（英文）
  const locale = (params.locale as string) || 'en';
  
  // 出生数据状态
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthLocation, setBirthLocation] = useState('');
  const [timezone, setTimezone] = useState('UTC (London, Dublin)');
  const [useCoordinates, setUseCoordinates] = useState(false);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
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
  const [miniEntitlements, setMiniEntitlements] =
    useState<UserEntitlements | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<PricingType | null>(null);
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
      toast.error(t('messages.error.birthDateRequired'));
      return false;
    }
    if (!birthTime) {
      toast.error(t('messages.error.birthTimeRequired'));
      return false;
    }
    if (!birthLocation) {
      toast.error(t('messages.error.birthLocationRequired'));
      return false;
    }
    return true;
  }, [birthDate, birthTime, birthLocation, t]);

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
      useCoordinates: useCoordinates.toString(),
      // 如果用户从自动完成列表选择了地点，使用保存的坐标
      ...(selectedLocationCoords && !useCoordinates && {
        latitude: selectedLocationCoords.latitude.toString(),
        longitude: selectedLocationCoords.longitude.toString(),
      })
    });
    
    // 🔥 修复：构建包含语言前缀的路径
    // 根据 localePrefix = "as-needed"，默认语言（en）不需要前缀
    const chartPath = locale === 'en' 
      ? `/chart?${params.toString()}`
      : `/${locale}/chart?${params.toString()}`;
    
    // 调试日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [MiniaturaAIGenerator] 跳转到 chart 页面:', {
        currentLocale: locale,
        chartPath,
        params: params.toString(),
      });
    }
    
    // 使用 window.location.href 确保 query 参数正确传递（与 locale/toggle.tsx 保持一致）
    window.location.href = chartPath;
  }, [birthDate, birthTime, birthLocation, timezone, useCoordinates, selectedLocationCoords, validateBirthData, locale]);

  const fetchMiniPricing = useCallback(async () => {
    try {
      const response = await fetch(`/api/get-pricing?locale=${locale}`);
      const data = await response.json();
      if (data.success && data.pricing) {
        setPricingData(data.pricing);
      }
    } catch (e) {
      console.error('Failed to fetch pricing:', e);
    }
  }, [locale]);

  useEffect(() => {
    if (!user) {
      setMiniEntitlements(null);
      return;
    }
    fetch('/api/get-user-credits', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 0 && data.data?.entitlements) {
          setMiniEntitlements(data.data.entitlements);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleDownload = useCallback(async () => {
    if (!generatedChartData) return;
    if (!user) {
      setShowSignModal(true);
      return;
    }
    if (!miniEntitlements?.canDownloadChart) {
      toast.error(t('messages.errorGeneral.chartDownloadRequiresPaid'));
      await fetchMiniPricing();
      setShowPricingModal(true);
      paymentEvents.pricingModalOpened('other');
      return;
    }
    try {
      const dataUrl = await applyBrandingFooterToPngDataUrl(generatedChartData);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `astrocartography-chart-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('messages.success.chartDownloaded'));
    } catch (error) {
      toast.error(t('messages.errorGeneral.downloadFailed'));
    }
  }, [
    generatedChartData,
    t,
    user,
    miniEntitlements?.canDownloadChart,
    fetchMiniPricing,
    setShowSignModal,
  ]);

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
              {t('ui.title')}
            </h2>
            <p className="text-base text-gray-300">
              {t('ui.subtitle')}
            </p>
          </div>

          {/* 表单卡片 */}
          <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md relative overflow-visible">
            <CardContent className="p-6 md:p-8 relative overflow-visible">
              <div className="space-y-4">
                {/* 出生日期 */}
                <div className="space-y-1.5">
                  <Label htmlFor="birthDate" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <Calendar className="size-4 text-purple-400" />
                    {t('form.birthDate.label')}
                  </Label>
                  <DatePicker
                    id="birthDate"
                    value={birthDate}
                    onChange={setBirthDate}
                    onTimeChange={setBirthTime}
                    timeValue={birthTime}
                    placeholder={t('form.birthDate.placeholder')}
                  />
                </div>

                {/* 出生时间 */}
                <div className="space-y-1.5">
                  <Label htmlFor="birthTime" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <Clock className="size-4 text-purple-400" />
                    {t('form.birthTime.label')}
                  </Label>
                  <Input
                    id="birthTime"
                    type="time"
                    lang="en"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    placeholder={t('form.birthTime.placeholder')}
                  />
                </div>

                {/* 出生地点 */}
                <div className="space-y-1.5 relative z-10">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="birthLocation" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                      <MapPin className="size-4 text-purple-400" />
                      {t('form.birthLocation.label')}
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseCoordinates(!useCoordinates);
                        // 切换模式时清除保存的坐标
                        setSelectedLocationCoords(null);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      {useCoordinates ? t('form.birthLocation.useCityName') : t('form.birthLocation.useCoordinates')}
                    </button>
                  </div>
                  {useCoordinates ? (
                    <Input
                      id="birthLocation"
                      type="text"
                      value={birthLocation}
                      onChange={(e) => {
                        setBirthLocation(e.target.value);
                        setSelectedLocationCoords(null); // 清除坐标，因为用户手动输入了坐标
                      }}
                      className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                      placeholder={t('form.birthLocation.placeholderCoordinates')}
                    />
                  ) : (
                    <LocationAutocomplete
                      id="birthLocation"
                      value={birthLocation}
                      onChange={(value) => {
                        setBirthLocation(value);
                        // 如果用户清空了输入，清除坐标
                        if (!value) {
                          setSelectedLocationCoords(null);
                        }
                      }}
                      onSelect={(result) => {
                        // 用户从列表选择了地点，保存坐标
                        setSelectedLocationCoords(result.coordinates);
                      }}
                      placeholder={t('form.birthLocation.placeholder')}
                      className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    />
                  )}
                </div>

                {/* 时区 */}
                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <Globe className="size-4 text-purple-400" />
                    {t('form.timezone.label')}
                  </Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger
                      className="w-full h-10 px-3 text-sm rounded-md bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-purple-500 focus:outline-none focus:ring-2"
                      aria-label="Timezone"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border border-white/10 text-white">
                      <SelectItem value="UTC (London, Dublin)">UTC (London, Dublin)</SelectItem>
                      <SelectItem value="EST (New York)">EST (New York)</SelectItem>
                      <SelectItem value="PST (Los Angeles)">PST (Los Angeles)</SelectItem>
                      <SelectItem value="CST (Chicago)">CST (Chicago)</SelectItem>
                      <SelectItem value="MST (Denver)">MST (Denver)</SelectItem>
                      <SelectItem value="CET (Paris, Berlin)">CET (Paris, Berlin)</SelectItem>
                      <SelectItem value="CST (Mexico City)">CST (Mexico City)</SelectItem>
                      <SelectItem value="COT (Bogotá)">COT (Bogotá)</SelectItem>
                      <SelectItem value="PET (Lima)">PET (Lima)</SelectItem>
                      <SelectItem value="CLT (Santiago)">CLT (Santiago)</SelectItem>
                      <SelectItem value="ART (Buenos Aires)">ART (Buenos Aires)</SelectItem>
                      <SelectItem value="BRT (São Paulo)">BRT (São Paulo)</SelectItem>
                      <SelectItem value="JST (Tokyo)">JST (Tokyo)</SelectItem>
                      <SelectItem value="AEST (Sydney)">AEST (Sydney)</SelectItem>
                      <SelectItem value="IST (Mumbai)">IST (Mumbai)</SelectItem>
                      <SelectItem value="CST (Beijing)">CST (Beijing)</SelectItem>
                    </SelectContent>
                  </Select>
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
                      {t('form.buttons.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      {t('form.buttons.generate')}
                    </>
                  )}
                </Button>

                {/* 隐私提示 */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span>🔒</span>
                  <span>{t('form.privacy')}</span>
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
                        <p className="text-lg font-medium mb-2 text-white">{t('messages.success.generating')}</p>
                        <p className="text-sm text-gray-400">{t('messages.success.almostDone')}</p>
                      </>
                    ) : (
                      <>
                        <div className="size-16 animate-spin rounded-full border-4 border-purple-400 border-t-transparent mb-4" />
                        <p className="text-lg font-medium mb-2 text-white">{t('messages.success.processing')}</p>
                        <p className="text-sm text-gray-400">{t('messages.success.mayTakeMoment')}</p>
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
                        onClick={() => void handleDownload()}
                      >
                        <Calendar className="mr-2 size-4" />
                        {t('form.buttons.download')}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 border-white/30 text-white hover:bg-white/10 bg-white/5"
                        onClick={handleGenerate}
                      >
                        <Sparkles className="mr-2 size-4" />
                        {t('form.buttons.generateNew')}
                      </Button>
                    </div>
                    
                    {/* 分享选项 */}
                    {showShareOptions && generatedChartData && (
                      <CompactSocialShare
                        imageUrl={generatedChart || ''}
                        imageData={generatedChartData}
                        mimeType="image/png"
                        title={t('result.title')}
                        description={t('result.description')}
                        hashtags={t.raw('result.hashtags') as string[]}
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
      {pricingData && (
        <PricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          pricing={pricingData}
          onSuccess={() => {
            fetch('/api/get-user-credits', { method: 'POST' })
              .then((r) => r.json())
              .then((data) => {
                if (data.code === 0 && data.data?.entitlements) {
                  setMiniEntitlements(data.data.entitlements);
                }
              });
          }}
        />
      )}
    </section>
  );
}
