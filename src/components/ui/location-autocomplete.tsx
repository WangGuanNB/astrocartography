"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationResult {
  displayName: string;
  name: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  importance: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: LocationResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  placement?: 'above' | 'below';
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  disabled,
  id,
  placement = 'below'
}: LocationAutocompleteProps) {
  const locale = useLocale(); // 获取当前页面语言
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 根据页面语言生成 accept-language 参数
  const getAcceptLanguage = useCallback(() => {
    // 语言映射：将 next-intl 的 locale 映射到 HTTP Accept-Language 格式
    const languageMap: Record<string, string> = {
      en: 'en-US,en',
      zh: 'zh-CN,zh,en',
      pt: 'pt-BR,pt,en',
      es: 'es-ES,es,en',
      it: 'it-IT,it,en',
      de: 'de-DE,de,en',
    };
    
    // 返回当前语言的 accept-language，如果没有匹配则默认英文
    return languageMap[locale] || 'en-US,en';
  }, [locale]);

  // 搜索地点建议
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    // 根据页面语言动态设置 accept-language
    const acceptLanguage = getAcceptLanguage();
    
    // 直接调用 Nominatim API，避免服务器端网络问题
    const encodedQuery = encodeURIComponent(query);
    const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&addressdetails=1&accept-language=${acceptLanguage}`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Astrocartography-App/1.0',
          'Accept-Language': acceptLanguage
        }
      });
      
      if (!response.ok) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      const data = await response.json();
      
      // 格式化结果
      const results: LocationResult[] = (data || [])
        .map((item: any) => {
          let cityName = item.display_name?.split(',')[0] || '';
          if (item.address) {
            // 处理简繁体混合（如 "纽约;紐約"）
            const extractFirst = (value: string | undefined) => {
              if (!value) return undefined;
              return value.split(';')[0].split(',')[0].trim();
            };
            cityName = extractFirst(item.address.city) || 
                       extractFirst(item.address.town) || 
                       extractFirst(item.address.village) || 
                       extractFirst(item.address.state) || 
                       cityName;
          }
          
          let country = item.address?.country || '';
          if (country.includes(';')) {
            country = country.split(';')[0];
          }
          
          return {
            displayName: item.display_name || '',
            name: cityName,
            country: country,
            coordinates: {
              latitude: parseFloat(item.lat || 0),
              longitude: parseFloat(item.lon || 0)
            },
            importance: item.importance || 0
          };
        })
        .sort((a: LocationResult, b: LocationResult) => b.importance - a.importance);
      
      setSuggestions(results);
      if (results.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        setShowSuggestions(false);
      }
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [getAcceptLanguage]);

  // 防抖搜索
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300); // 300ms 防抖

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, searchLocations]);

  // 处理选择
  const handleSelect = (result: LocationResult) => {
    onChange(result.displayName);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onSelect) {
      onSelect(result);
    }
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 格式化坐标显示
  const formatCoordinates = (lat: number, lon: number) => {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // 当输入框获得焦点时，如果有建议或正在加载，显示下拉列表
            if (suggestions.length > 0 || isLoading) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
          </div>
        )}
      </div>

      {!disabled && showSuggestions && suggestions.length > 0 && (
        <div 
          className={cn("absolute z-[9999] w-full rounded-md border border-purple-500/30 bg-gray-900 shadow-2xl max-h-60 overflow-auto", placement === 'above' ? 'bottom-full mb-1' : 'mt-1')}
          style={{ zIndex: 9999 }}
        >
          <div className="p-1">
            {suggestions.map((result, index) => (
              <div
                key={`${result.coordinates.latitude}-${result.coordinates.longitude}-${index}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors",
                  "hover:bg-purple-500/30 text-white",
                  selectedIndex === index && "bg-purple-500/40 text-white"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-white">{result.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {result.country && `${result.country} • `}
                    {formatCoordinates(result.coordinates.latitude, result.coordinates.longitude)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
