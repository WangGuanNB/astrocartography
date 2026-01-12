/**
 * 主要城市列表（与地图组件共享）
 * 用于地图标记和 AI 对话中的城市名显示
 */
export const MAJOR_CITIES: Array<{ name: string; lat: number; lng: number; country: string }> = [
  // North America
  { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'USA' },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, country: 'USA' },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, country: 'USA' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, country: 'Canada' },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, country: 'Mexico' },
  // South America
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, country: 'Brazil' },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, country: 'Brazil' },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, country: 'Argentina' },
  { name: 'Lima', lat: -12.0464, lng: -77.0428, country: 'Peru' },
  { name: 'Bogotá', lat: 4.7110, lng: -74.0721, country: 'Colombia' },
  // Europe
  { name: 'London', lat: 51.5074, lng: -0.1278, country: 'UK' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'France' },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, country: 'Germany' },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, country: 'Spain' },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, country: 'Italy' },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, country: 'Russia' },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, country: 'Turkey' },
  // Asia
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'Japan' },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, country: 'China' },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, country: 'China' },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, country: 'India' },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090, country: 'India' },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, country: 'Thailand' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'Singapore' },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780, country: 'South Korea' },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, country: 'UAE' },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, country: 'Indonesia' },
  // Africa
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, country: 'Egypt' },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, country: 'Nigeria' },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, country: 'South Africa' },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, country: 'Kenya' },
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898, country: 'Morocco' },
  // Oceania
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'Australia' },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, country: 'Australia' },
  { name: 'Auckland', lat: -36.8485, lng: 174.7633, country: 'New Zealand' },
];

