import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import * as Astronomy from 'astronomy-engine';

export const revalidate = 3600; // 1 小时，与业务 TTL 一致
export const maxDuration = 30; // 避免复杂计算被过早终止

// 行星颜色配置
const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700',      // 金色
  Moon: '#C0C0C0',     // 银色
  Mercury: '#FFA500',  // 橙色
  Venus: '#FF69B4',    // 粉色
  Mars: '#FF4500',     // 红色
  Jupiter: '#9370DB',  // 紫色
  Saturn: '#4169E1',   // 蓝色
  Uranus: '#00CED1',   // 青色
  Neptune: '#1E90FF',  // 深蓝
  Pluto: '#8B4513',    // 棕色
};

interface BirthData {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
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

function getCacheKey(birthData: BirthData): string {
  return `${birthData.birthDate}-${birthData.birthTime}-${birthData.latitude}-${birthData.longitude}-${birthData.timezone}`;
}

/**
 * 使用 unstable_cache 包装计算函数，实现 Vercel 持久化缓存
 * 这样可以在多个实例间共享缓存，大幅提升缓存命中率
 */
async function getCachedCalculation(cacheKey: string, birthData: BirthData & { latitude: number; longitude: number }) {
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
          },
          planetLines,
        },
      };
    },
    ['astrocartography-calculation', cacheKey], // cacheKey 作为缓存键的一部分
    {
      revalidate: CACHE_TTL / 1000, // 转为秒（3600秒 = 1小时）
      tags: ['astrocartography'], // 用于手动清除缓存
    }
  )();
}

/**
 * 将时区字符串转换为 UTC 偏移量（小时）
 */
function parseTimezoneOffset(timezone: string): number {
  // 提取时区偏移量
  const timezoneMap: Record<string, number> = {
    'UTC': 0,
    'EST': -5,  // 东部标准时间
    'PST': -8,  // 太平洋标准时间
    'CST': -6,  // 中部标准时间（美国）或 +8（中国）
    'MST': -7,  // 山地标准时间
    'CET': 1,   // 中欧时间
    'JST': 9,   // 日本标准时间
    'AEST': 10, // 澳大利亚东部标准时间
    'IST': 5.5, // 印度标准时间
  };

  // 尝试匹配时区缩写
  for (const [tz, offset] of Object.entries(timezoneMap)) {
    if (timezone.toUpperCase().includes(tz)) {
      // 特殊处理：CST 可能是中国标准时间（+8）或美国中部时间（-6）
      if (tz === 'CST' && (timezone.includes('Beijing') || timezone.includes('China'))) {
        return 8;
      }
      return offset;
    }
  }

  // 默认返回 UTC
  return 0;
}

/**
 * 计算恒星时（Sidereal Time）
 */
function getSiderealTime(date: Date, longitude: number): number {
  // 创建时间对象
  const time = Astronomy.MakeTime(date);
  
  // 计算格林威治恒星时（小时）
  const gmst = Astronomy.SiderealTime(time);
  
  // 转换为度数（1小时 = 15度）并加上经度修正
  const lst = (gmst * 15 + longitude) % 360;
  return lst < 0 ? lst + 360 : lst;
}

/**
 * 使用正确的球面三角学计算 AS 线（上升线）
 */
function calculateASLine(
  planetRA: number,
  planetDec: number,
  birthTime: Date,
  birthLongitude: number
): [number, number][] {
  const coordinates: [number, number][] = [];
  const siderealTime = getSiderealTime(birthTime, 0); // 格林威治恒星时
  
  // 遍历所有纬度
  // 优化：步长从 2 改为 3，再次减少约 33% 计算量（Leaflet 会平滑曲线）
  for (let lat = -85; lat <= 85; lat += 3) {
    const latRad = lat * Math.PI / 180;
    const decRad = planetDec * Math.PI / 180;
    
    // 计算行星在该纬度上升时的时角
    // cos(H) = -tan(φ) * tan(δ)
    const cosH = -Math.tan(latRad) * Math.tan(decRad);
    
    // 如果 |cos(H)| > 1，行星在该纬度永不升起或永不落下
    if (Math.abs(cosH) > 1) {
      continue;
    }
    
    const H = Math.acos(cosH) * 180 / Math.PI; // 时角（度）
    
    // 计算该纬度上行星上升时的经度
    // 经度 = 行星赤经 - 时角 - 格林威治恒星时
    let longitude = (planetRA - H - siderealTime) % 360;
    
    // 标准化到 -180 到 180
    if (longitude > 180) longitude -= 360;
    if (longitude < -180) longitude += 360;
    
    coordinates.push([lat, longitude]);
  }
  
  return coordinates;
}

/**
 * 计算 DS 线（下降线）- 与 AS 线相对（相差 180 度经度）
 */
function calculateDSLine(
  planetRA: number,
  planetDec: number,
  birthTime: Date,
  birthLongitude: number
): [number, number][] {
  const asLine = calculateASLine(planetRA, planetDec, birthTime, birthLongitude);
  
  // DS 线是 AS 线的对跖点（经度 + 180）
  return asLine.map(([lat, lng]) => {
    let dsLng = lng + 180;
    if (dsLng > 180) dsLng -= 360;
    return [lat, dsLng] as [number, number];
  });
}

/**
 * 计算 MC 线（中天线）- 行星在天顶的所有地点
 */
function calculateMCLine(
  planetRA: number,
  planetDec: number,
  birthTime: Date,
  birthLongitude: number
): [number, number][] {
  const coordinates: [number, number][] = [];
  const siderealTime = getSiderealTime(birthTime, 0);
  
  // MC 线：行星的赤经等于当地恒星时
  // 经度 = 行星赤经 - 格林威治恒星时
  const baseLongitude = (planetRA - siderealTime) % 360;
  const normalizedLng = baseLongitude > 180 ? baseLongitude - 360 : baseLongitude;
  
  // MC 线是垂直的经度线（但需要考虑赤纬的曲率）
  // 优化：步长与 AS 一致，使用 3°
  for (let lat = -85; lat <= 85; lat += 3) {
    const latRad = lat * Math.PI / 180;
    const decRad = planetDec * Math.PI / 180;
    
    // 根据赤纬调整经度（球面投影）
    const declinationEffect = Math.sin(latRad) * Math.tan(decRad) * 15;
    let longitude = normalizedLng + declinationEffect;
    
    if (longitude > 180) longitude -= 360;
    if (longitude < -180) longitude += 360;
    
    coordinates.push([lat, longitude]);
  }
  
  return coordinates;
}

/**
 * 计算 IC 线（天底线）- 与 MC 线相对
 */
function calculateICLine(
  planetRA: number,
  planetDec: number,
  birthTime: Date,
  birthLongitude: number
): [number, number][] {
  const mcLine = calculateMCLine(planetRA, planetDec, birthTime, birthLongitude);
  
  // IC 线是 MC 线的对跖点
  return mcLine.map(([lat, lng]) => {
    let icLng = lng + 180;
    if (icLng > 180) icLng -= 360;
    return [lat, icLng] as [number, number];
  });
}

/**
 * 使用 astronomy-engine 计算真实的行星位置和行星线
 */
function calculatePlanetaryLines(birthData: BirthData) {
  const lines = [];
  
  // 解析时区偏移
  const timezoneOffset = parseTimezoneOffset(birthData.timezone);
  
  // 解析出生日期和时间，并转换为 UTC
  const [hours, minutes] = birthData.birthTime.split(':').map(Number);
  const localTime = new Date(`${birthData.birthDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  
  // 转换为 UTC（减去时区偏移）
  const utcTime = new Date(localTime.getTime() - timezoneOffset * 60 * 60 * 1000);
  
  // 主要行星（包括外行星）
  const planetNames: Astronomy.Body[] = [
    Astronomy.Body.Sun,
    Astronomy.Body.Moon,
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn,
    Astronomy.Body.Uranus,
    Astronomy.Body.Neptune,
    Astronomy.Body.Pluto,
  ];
  
  const planetNameMap: Record<Astronomy.Body, string> = {
    [Astronomy.Body.Sun]: 'Sun',
    [Astronomy.Body.Moon]: 'Moon',
    [Astronomy.Body.Mercury]: 'Mercury',
    [Astronomy.Body.Venus]: 'Venus',
    [Astronomy.Body.Mars]: 'Mars',
    [Astronomy.Body.Jupiter]: 'Jupiter',
    [Astronomy.Body.Saturn]: 'Saturn',
    [Astronomy.Body.Uranus]: 'Uranus',
    [Astronomy.Body.Neptune]: 'Neptune',
    [Astronomy.Body.Pluto]: 'Pluto',
  };
  
  for (const body of planetNames) {
    const planetName = planetNameMap[body];
    const color = PLANET_COLORS[planetName] || '#FFFFFF';
    
    try {
      // 获取行星在出生时刻的赤道坐标
      const time = Astronomy.MakeTime(utcTime);
      const observer = new Astronomy.Observer(birthData.latitude!, birthData.longitude!, 0);
      const equator = Astronomy.Equator(body, time, observer, true, true);
      
      // 计算行星的赤经（度）和赤纬（度）
      const ra = equator.ra * 15; // 转换为度数（1小时 = 15度）
      const dec = equator.dec;
      
      // 计算 AS 线
      const asLine = calculateASLine(ra, dec, utcTime, birthData.longitude!);
      if (asLine.length > 0) {
        lines.push({
          planet: planetName,
          type: 'AS' as const,
          color,
          coordinates: asLine
        });
      }
      
      // 计算 DS 线
      const dsLine = calculateDSLine(ra, dec, utcTime, birthData.longitude!);
      if (dsLine.length > 0) {
        lines.push({
          planet: planetName,
          type: 'DS' as const,
          color,
          coordinates: dsLine
        });
      }
      
      // 计算 MC 线
      const mcLine = calculateMCLine(ra, dec, utcTime, birthData.longitude!);
      if (mcLine.length > 0) {
        lines.push({
          planet: planetName,
          type: 'MC' as const,
          color,
          coordinates: mcLine
        });
      }
      
      // 计算 IC 线
      const icLine = calculateICLine(ra, dec, utcTime, birthData.longitude!);
      if (icLine.length > 0) {
        lines.push({
          planet: planetName,
          type: 'IC' as const,
          color,
          coordinates: icLine
        });
      }
      
    } catch (error) {
      console.error(`Error calculating ${planetName}:`, error);
    }
  }
  
  return lines;
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
    
    if (!latitude || !longitude) {
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
    
    // 生成缓存键
    const cacheKey = getCacheKey({
      birthDate,
      birthTime,
      birthLocation,
      timezone,
      latitude: latitude!,
      longitude: longitude!
    });
    
    // L1 缓存：检查内存缓存（快速，但仅限单实例）
    const cached = calculationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Using L1 (in-memory) cached result for:', cacheKey);
      return NextResponse.json(cached.data);
    }

    // L2 缓存：使用 unstable_cache（持久化，跨实例共享，Vercel 自动管理）
    console.log('🔍 Checking L2 (unstable_cache) for:', cacheKey);
    const result = await getCachedCalculation(cacheKey, {
      birthDate,
      birthTime,
      birthLocation,
      timezone,
      latitude: latitude!,
      longitude: longitude!
    });
    
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
