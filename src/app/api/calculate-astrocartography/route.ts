import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getTimezoneForCoordinates } from '@/lib/timezone';
import { calculatePlanetaryLines } from '@/lib/astrocartography-lines';

export const revalidate = 3600; // 1 小时，与业务 TTL 一致
export const maxDuration = 30; // 避免复杂计算被过早终止

interface BirthData {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone?: string;
  timezoneMode?: 'auto' | 'manual';
  latitude?: number;
  longitude?: number;
}

// 缓存机制
interface CacheEntry {
  data: any;
  timestamp: number;
}

const calculationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60; // 1 小时缓存
const CALCULATION_VERSION = 'v2-geocentric-angular-lines';

function getCacheKey(birthData: BirthData): string {
  return `${CALCULATION_VERSION}-${birthData.birthDate}-${birthData.birthTime}-${birthData.latitude}-${birthData.longitude}-${birthData.timezone}`;
}

/**
 * 使用 unstable_cache 包装计算函数，实现 Vercel 持久化缓存
 * 这样可以在多个实例间共享缓存，大幅提升缓存命中率
 */
async function getCachedCalculation(
  cacheKey: string,
  birthData: BirthData & { latitude: number; longitude: number; timezone: string }
) {
  // 使用 unstable_cache，将 cacheKey 作为 keyParts 的一部分
  // 这样相同参数的请求会命中同一个缓存
  return await unstable_cache(
    async () => {
      const planetLines = calculatePlanetaryLines(birthData);
      return {
        success: true,
        data: {
          birthData: {
            date: birthData.birthDate,
            time: birthData.birthTime,
            location: birthData.birthLocation,
            latitude: birthData.latitude,
            longitude: birthData.longitude,
            timezone: birthData.timezone,
          },
          planetLines,
        },
      };
    },
    ['astrocartography-calculation-v2', cacheKey], // versioned to invalidate old incorrect lines
    {
      revalidate: CACHE_TTL / 1000, // 转为秒（3600秒 = 1小时）
      tags: ['astrocartography'], // 用于手动清除缓存
    }
  )();
}

// 常见城市坐标缓存
const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  // 中国主要城市
  '北京': { latitude: 39.9042, longitude: 116.4074 },
  '上海': { latitude: 31.2304, longitude: 121.4737 },
  '广州': { latitude: 23.1291, longitude: 113.2644 },
  '深圳': { latitude: 22.5431, longitude: 114.0579 },
  '成都': { latitude: 30.5728, longitude: 104.0668 },
  '杭州': { latitude: 30.2741, longitude: 120.1551 },
  '重庆': { latitude: 29.4316, longitude: 106.9123 },
  '西安': { latitude: 34.2658, longitude: 108.9541 },
  '武汉': { latitude: 30.5928, longitude: 114.3055 },
  '南京': { latitude: 32.0603, longitude: 118.7969 },
  '天津': { latitude: 39.3434, longitude: 117.3616 },
  '合肥': { latitude: 31.8206, longitude: 117.2272 },
  'beijing': { latitude: 39.9042, longitude: 116.4074 },
  'shanghai': { latitude: 31.2304, longitude: 121.4737 },
  'hefei': { latitude: 31.8206, longitude: 117.2272 },
  
  // 国际主要城市
  'new york': { latitude: 40.7128, longitude: -74.0060 },
  'new york, usa': { latitude: 40.7128, longitude: -74.0060 },
  'london': { latitude: 51.5074, longitude: -0.1278 },
  'london, uk': { latitude: 51.5074, longitude: -0.1278 },
  'paris': { latitude: 48.8566, longitude: 2.3522 },
  'paris, france': { latitude: 48.8566, longitude: 2.3522 },
  'tokyo': { latitude: 35.6762, longitude: 139.6503 },
  'tokyo, japan': { latitude: 35.6762, longitude: 139.6503 },
  'los angeles': { latitude: 34.0522, longitude: -118.2437 },
  'los angeles, usa': { latitude: 34.0522, longitude: -118.2437 },
  'sydney': { latitude: -33.8688, longitude: 151.2093 },
  'sydney, australia': { latitude: -33.8688, longitude: 151.2093 },
  'singapore': { latitude: 1.3521, longitude: 103.8198 },
  'dubai': { latitude: 25.2048, longitude: 55.2708 },
  'hong kong': { latitude: 22.3193, longitude: 114.1694 },
  '香港': { latitude: 22.3193, longitude: 114.1694 },
};

// 将地点名称转换为坐标（简化版）
async function geocodeLocation(location: string): Promise<{ latitude: number; longitude: number } | null> {
  // 先检查缓存
  const normalizedLocation = location.toLowerCase().trim();
  if (CITY_COORDINATES[normalizedLocation]) {
    console.log('Using cached coordinates for:', location);
    return CITY_COORDINATES[normalizedLocation];
  }
  
  try {
    // 使用免费的 Nominatim API，添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Astrocartography-App/1.0'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Geocoding timeout:', location);
      } else {
        console.error('Geocoding error:', error.message);
      }
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: BirthData = await request.json();
    const { birthDate, birthTime, birthLocation, timezone } = body;
    
    console.log('Received request:', { birthDate, birthTime, birthLocation, timezone });
    
    // 如果没有提供坐标，尝试地理编码
    let latitude = body.latitude;
    let longitude = body.longitude;
    
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.log('Geocoding location:', birthLocation);
      const coords = await geocodeLocation(birthLocation);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
        console.log('Geocoded coordinates:', { latitude, longitude });
      } else {
        console.error('Failed to geocode location:', birthLocation);
        return NextResponse.json(
          { 
            success: false, 
            error: `无法找到地点 "${birthLocation}" 的坐标。请尝试输入更详细的地址，例如："北京, 中国" 或 "New York, USA"` 
          },
          { status: 400 }
        );
      }
    }

    const resolvedTimezone =
      body.timezoneMode === 'auto' || !timezone
        ? getTimezoneForCoordinates(latitude!, longitude!)
        : timezone;

    const resolvedBirthData: BirthData & {
      latitude: number;
      longitude: number;
      timezone: string;
    } = {
      ...body,
      timezone: resolvedTimezone,
      latitude: latitude!,
      longitude: longitude!,
    };
    
    // 生成缓存键
    const cacheKey = getCacheKey(resolvedBirthData);
    
    // L1 缓存：检查内存缓存（快速，但仅限单实例）
    const cached = calculationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Using L1 (in-memory) cached result for:', cacheKey);
      return NextResponse.json(cached.data);
    }

    // L2 缓存：使用 unstable_cache（持久化，跨实例共享，Vercel 自动管理）
    console.log('🔍 Checking L2 (unstable_cache) for:', cacheKey);
    const result = await getCachedCalculation(cacheKey, resolvedBirthData);
    
    console.log('✅ Calculation complete. Lines generated:', result.data.planetLines.length);
    
    // 更新 L1 缓存（提升后续同实例请求的速度）
    calculationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // 清理过期 L1 缓存（防止内存泄漏）
    if (calculationCache.size > 1000) {
      const now = Date.now();
      for (const [key, entry] of calculationCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
          calculationCache.delete(key);
        }
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error calculating astrocartography:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '计算失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}
