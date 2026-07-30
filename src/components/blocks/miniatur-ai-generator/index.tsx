'use client';
import { useTranslations } from 'next-intl';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Check, ChevronDown, Clock, MapPin, Globe, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { DatePicker } from '@/components/ui/date-picker';
import { useAppContext } from '@/contexts/app';
import { homeInlineMapEvents } from '@/lib/analytics';
import {
  getSupportedTimeZones,
  getTimezoneForCoordinates,
  getTimezoneOffsetLabel,
  isIanaTimeZone,
} from '@/lib/timezone';

const InlineMapResult = dynamic(
  () => import('@/components/astrocartography-map/inline-map-result'),
  { ssr: false }
);

type PlanetLine = {
  planet: string;
  type: 'AS' | 'DS' | 'MC' | 'IC';
  coordinates: [number, number][];
  color: string;
};

type InlineBirthData = {
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
};

type InlineChartData = {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
};

function parseCoordinateInput(value: string) {
  const match = value
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function getTimezoneCityLabel(timeZone: string) {
  const city = timeZone.split('/').at(-1)?.replaceAll('_', ' ') || timeZone;
  return city
    .replace('Calcutta', 'Kolkata')
    .replace('Katmandu', 'Kathmandu')
    .replace('Kiev', 'Kyiv');
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Rome',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Calcutta',
  'Australia/Sydney',
];

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
  const [timezone, setTimezone] = useState('UTC');
  const [isTimezoneManual, setIsTimezoneManual] = useState(false);
  const [isTimezoneEditorOpen, setIsTimezoneEditorOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [useCoordinates, setUseCoordinates] = useState(false);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [inlineChartData, setInlineChartData] =
    useState<InlineChartData | null>(null);
  const [inlineBirthData, setInlineBirthData] =
    useState<InlineBirthData | null>(null);
  const [inlinePlanetLines, setInlinePlanetLines] = useState<PlanetLine[]>([]);
  const [inlineChartPath, setInlineChartPath] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<{
    canUse: boolean;
    remaining: number;
    isLoggedIn: boolean;
  } | null>(null);
  const inlineResultRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToResultRef = useRef(false);
  const timeZoneOptions = useMemo(() => getSupportedTimeZones(), []);
  const detectedTimezone = useMemo(() => {
    const coordinates = useCoordinates
      ? parseCoordinateInput(birthLocation)
      : selectedLocationCoords;

    return coordinates
      ? getTimezoneForCoordinates(coordinates.latitude, coordinates.longitude)
      : null;
  }, [birthLocation, selectedLocationCoords, useCoordinates]);
  const filteredTimeZones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase();
    if (!query) {
      const initialOptions = [detectedTimezone, timezone, ...COMMON_TIMEZONES].filter(
        (timeZone): timeZone is string => timeZone !== null
      );
      return Array.from(new Set(initialOptions)).filter((timeZone) => timeZoneOptions.includes(timeZone));
    }

    return timeZoneOptions.filter((timeZone) =>
      `${timeZone} ${getTimezoneCityLabel(timeZone)}`.toLowerCase().includes(query)
    );
  }, [detectedTimezone, timeZoneOptions, timezone, timezoneSearch]);

  const applyDetectedTimezone = useCallback((coordinates: { latitude: number; longitude: number }) => {
    if (!isTimezoneManual) {
      setTimezone(getTimezoneForCoordinates(coordinates.latitude, coordinates.longitude));
    }
  }, [isTimezoneManual]);

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
    if (!isIanaTimeZone(timezone)) {
      toast.error(t('form.timezone.invalid'));
      return false;
    }
    return true;
  }, [birthDate, birthTime, birthLocation, timezone, t]);

  const handleGenerate = useCallback(async () => {
    // 验证出生数据
    if (!validateBirthData()) {
      return;
    }

    const manualCoordinates = useCoordinates
      ? parseCoordinateInput(birthLocation)
      : null;
    const resolvedCoordinates =
      manualCoordinates || (!useCoordinates ? selectedLocationCoords : null);

    const resolvedTimezone =
      !isTimezoneManual && resolvedCoordinates
        ? getTimezoneForCoordinates(
            resolvedCoordinates.latitude,
            resolvedCoordinates.longitude
          )
        : timezone;

    const requestData = {
      birthDate,
      birthTime,
      birthLocation,
      timezone: resolvedTimezone,
      timezoneMode: isTimezoneManual ? 'manual' : 'auto',
      // 如果用户从自动完成列表选择了地点，或手动输入了坐标，使用明确坐标
      ...(resolvedCoordinates && {
        latitude: resolvedCoordinates.latitude,
        longitude: resolvedCoordinates.longitude,
      }),
    };

    // 保留原 chart 页面路径，作为 Open full map 与异常兜底
    const chartParams = new URLSearchParams({
      birthDate,
      birthTime,
      birthLocation,
      timezone: resolvedTimezone,
      useCoordinates: useCoordinates.toString(),
      ...(resolvedCoordinates && {
        latitude: resolvedCoordinates.latitude.toString(),
        longitude: resolvedCoordinates.longitude.toString(),
      })
    });
    
    // 🔥 修复：构建包含语言前缀的路径
    // 根据 localePrefix = "as-needed"，默认语言（en）不需要前缀
    const chartPath = locale === 'en' 
      ? `/chart?${chartParams.toString()}`
      : `/${locale}/chart?${chartParams.toString()}`;
    
    // 调试日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [MiniaturaAIGenerator] 首页内嵌生成地图:', {
        currentLocale: locale,
        chartPath,
        params: chartParams.toString(),
      });
    }

    setIsGenerating(true);
    setInlineChartPath(chartPath);

    try {
      const response = await fetch('/api/calculate-astrocartography', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('messages.errorGeneral.calculationFailed'));
      }

      const calculatedTimezone = result.data.birthData.timezone || resolvedTimezone;
      if (!isTimezoneManual) {
        setTimezone(calculatedTimezone);
      }
      setInlineChartData({ birthDate, birthTime, birthLocation, timezone: calculatedTimezone });
      setInlineBirthData(result.data.birthData);
      setInlinePlanetLines(result.data.planetLines || []);
      shouldScrollToResultRef.current = true;
      homeInlineMapEvents.generated();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('messages.errorGeneral.generationFailed');
      console.error('Failed to generate inline astrocartography map:', error);
      homeInlineMapEvents.generationFailed(message);
      toast.error(t('messages.errorGeneral.generationFailed'));
      // 兜底：保持原主流程，避免用户卡死在首页
      window.location.href = chartPath;
    } finally {
      setIsGenerating(false);
    }
  }, [birthDate, birthTime, birthLocation, timezone, isTimezoneManual, useCoordinates, selectedLocationCoords, validateBirthData, locale, t]);

  useEffect(() => {
    if (
      !shouldScrollToResultRef.current ||
      !inlineBirthData ||
      !inlineChartData ||
      !inlineChartPath
    ) {
      return;
    }

    shouldScrollToResultRef.current = false;

    const scrollTimer = window.setTimeout(() => {
      if (!inlineResultRef.current) {
        return;
      }

      const headerOffset =
        window.matchMedia('(max-width: 767px)').matches ? 96 : 120;
      const targetTop =
        inlineResultRef.current.getBoundingClientRect().top +
        window.scrollY -
        headerOffset;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });
    }, 80);

    return () => window.clearTimeout(scrollTimer);
  }, [inlineBirthData, inlineChartData, inlineChartPath]);

  // 接近视口再检查额度，减少首屏主线程与网络竞争（不影响功能）
  useEffect(() => {
    const el = document.getElementById("generator");
    if (!el) {
      checkUsageLimit();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          checkUsageLimit();
          io.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [checkUsageLimit]);
  
  return (
    <section className="relative py-8 bg-transparent" id="generator">
      <div className="container">
        <div className="mx-auto max-w-[1200px]">
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
          <Card className="mx-auto max-w-3xl shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md relative overflow-visible">
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
                        setSelectedLocationCoords(null);
                        const coordinates = parseCoordinateInput(e.target.value);
                        if (coordinates) {
                          applyDetectedTimezone(coordinates);
                        }
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
                        // Typing after a selection must not submit the old place's coordinates.
                        setSelectedLocationCoords(null);
                      }}
                      onSelect={(result) => {
                        setSelectedLocationCoords(result.coordinates);
                        applyDetectedTimezone(result.coordinates);
                      }}
                      placeholder={t('form.birthLocation.placeholder')}
                      className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    />
                  )}
                </div>

                {/* 时区 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={isTimezoneEditorOpen ? 'timezone' : undefined} className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                      <Globe className="size-4 text-purple-400" />
                      {t('form.timezone.label')}
                    </Label>
                    {isTimezoneManual && detectedTimezone ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTimezone(detectedTimezone);
                          setIsTimezoneManual(false);
                          setIsTimezoneEditorOpen(false);
                          setTimezoneSearch('');
                        }}
                        className="shrink-0 text-xs text-purple-400 underline underline-offset-2 hover:text-purple-300"
                      >
                        {t('form.timezone.reset')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsTimezoneEditorOpen(true);
                          setTimezoneSearch('');
                        }}
                        className="shrink-0 text-xs text-purple-400 underline underline-offset-2 hover:text-purple-300"
                      >
                        {t('form.timezone.change')}
                      </button>
                    )}
                  </div>
                  <Popover
                    open={isTimezoneEditorOpen}
                    onOpenChange={(open) => {
                      setIsTimezoneEditorOpen(open);
                      if (!open) {
                        setTimezoneSearch('');
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        id="timezone"
                        type="button"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-white/20 bg-white/10 px-3 text-left text-sm text-white transition-colors hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        aria-describedby="timezone-help"
                      >
                        <span className="truncate">{timezone}</span>
                        <ChevronDown className="ml-2 size-4 shrink-0 text-gray-300" aria-hidden="true" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[var(--radix-popover-trigger-width)] border-white/15 bg-[#15111e] p-2 text-white shadow-2xl"
                    >
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                        <Input
                          value={timezoneSearch}
                          onChange={(event) => setTimezoneSearch(event.target.value)}
                          className="h-9 border-white/15 bg-white/5 pl-9 text-sm text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                          placeholder={t('form.timezone.placeholder')}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto pr-1" role="listbox" aria-label={t('form.timezone.label')}>
                        {filteredTimeZones.map((timeZone) => {
                          const isSelected = timeZone === timezone;
                          return (
                            <button
                              key={timeZone}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setTimezone(timeZone);
                                setIsTimezoneManual(true);
                                setTimezoneSearch('');
                                setIsTimezoneEditorOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-white">
                                  {getTimezoneCityLabel(timeZone)}
                                </span>
                                <span className="block truncate text-xs text-gray-400">
                                  {timeZone} · {getTimezoneOffsetLabel(birthDate || '2000-01-01', birthTime || '12:00', timeZone)}
                                </span>
                              </span>
                              {isSelected && <Check className="size-4 shrink-0 text-purple-300" aria-label="Selected" />}
                            </button>
                          );
                        })}
                        {filteredTimeZones.length === 0 && (
                          <p className="px-2 py-6 text-center text-sm text-gray-400">
                            {t('form.timezone.no_results')}
                          </p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div id="timezone-help" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                    <span>
                      {isTimezoneManual
                        ? t('form.timezone.manual')
                        : detectedTimezone
                          ? t('form.timezone.auto', { location: birthLocation })
                          : t('form.timezone.waiting')}
                    </span>
                    {(isTimezoneManual || detectedTimezone) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{getTimezoneOffsetLabel(birthDate || '2000-01-01', birthTime || '12:00', timezone)}</span>
                      </>
                    )}
                  </div>
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

          {inlineBirthData && inlineChartData && inlineChartPath && (
            <div ref={inlineResultRef}>
              <InlineMapResult
                birthData={inlineBirthData}
                chartData={inlineChartData}
                planetLines={inlinePlanetLines}
                chartPath={inlineChartPath}
                user={user}
                onRequireLogin={() => setShowSignModal(true)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
