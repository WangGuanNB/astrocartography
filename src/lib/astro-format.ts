/**
 * 星盘数据格式化工具
 * 将星盘数据转换为 AI 可理解的文本上下文
 */

import { MAJOR_CITIES } from './cities';

interface BirthData {
  date: string;
  time: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface PlanetLine {
  planet: string;
  type: 'AS' | 'DS' | 'MC' | 'IC';
  coordinates: [number, number][];
  color: string;
}

interface ChartData {
  birthData: BirthData;
  planetLines: PlanetLine[];
}

// 行星线类型的中文说明
const LINE_TYPE_MEANING: Record<string, { name: string; meaning: string }> = {
  AS: {
    name: '上升线 (Ascendant Line)',
    meaning: '行星在东方地平线上升的所有地点，带来该行星能量的活跃、新的开始和外在表现'
  },
  DS: {
    name: '下降线 (Descendant Line)',
    meaning: '行星在西方地平线下降的所有地点，影响关系、合作和与他人互动'
  },
  MC: {
    name: '中天线 (Midheaven Line)',
    meaning: '行星在天顶的所有地点，影响事业、公众形象、目标和成就'
  },
  IC: {
    name: '天底线 (IC Line)',
    meaning: '行星在天底的所有地点，影响家庭、内在安全感、根源和私人生活'
  }
};

// 行星的中文说明
const PLANET_MEANING: Record<string, string> = {
  Sun: '太阳 - 代表自我、生命力、目标、核心身份和创造力',
  Moon: '月亮 - 代表情感、直觉、内在需求、家庭和安全感',
  Mercury: '水星 - 代表沟通、思维、学习、交流和短途旅行',
  Venus: '金星 - 代表爱情、艺术、金钱、享受、美和人际关系',
  Mars: '火星 - 代表行动、激情、勇气、冲突和能量',
  Jupiter: '木星 - 代表机遇、扩张、好运、智慧、成长和哲学',
  Saturn: '土星 - 代表责任、纪律、限制、成熟和长期目标',
  Uranus: '天王星 - 代表创新、变革、自由、独立和突破',
  Neptune: '海王星 - 代表灵感、直觉、梦想、灵性和艺术',
  Pluto: '冥王星 - 代表转化、重生、深层变革和潜意识力量'
};

/**
 * 计算两点之间的距离（简化版，使用经纬度差值）
 * @param lat1 纬度1
 * @param lng1 经度1
 * @param lat2 纬度2
 * @param lng2 经度2
 * @returns 距离（度）
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * 查找行星线附近的城市
 * @param coordinates 行星线坐标点数组
 * @param maxCities 最多返回的城市数量
 * @param maxDistance 最大距离（度，默认5度约500km）
 * @returns 城市名数组
 */
function findNearbyCitiesForLine(
  coordinates: [number, number][],
  maxCities: number = 5,
  maxDistance: number = 5
): string[] {
  if (coordinates.length === 0) return [];

  const cityDistances: Array<{ name: string; distance: number }> = [];

  // 对每个城市，找到与行星线最近的距离
  for (const city of MAJOR_CITIES) {
    let minDistance = Infinity;

    // 计算该城市到行星线上所有点的最小距离
    // 为了性能，只采样部分点（每10个点取1个）
    const samplePoints = coordinates.filter((_, index) => index % 10 === 0);
    if (samplePoints.length === 0) {
      samplePoints.push(coordinates[0]);
    }

    for (const [lat, lng] of samplePoints) {
      const distance = calculateDistance(city.lat, city.lng, lat, lng);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    // 如果距离在阈值内，添加到候选列表
    if (minDistance <= maxDistance) {
      cityDistances.push({ name: city.name, distance: minDistance });
    }
  }

  // 按距离排序，返回最近的N个城市
  cityDistances.sort((a, b) => a.distance - b.distance);
  return cityDistances.slice(0, maxCities).map(c => c.name);
}

/**
 * 格式化星盘数据为文本上下文（优化版：包含城市名、关键坐标点和路径信息）
 */
export function formatChartContext(chartData: ChartData): string {
  const { birthData, planetLines } = chartData;

  // 🔥 优化：增加出生时间和时区信息
  const timeInfo = birthData.time ? ` at ${birthData.time}` : '';
  const timezoneInfo = birthData.timezone ? ` (${birthData.timezone})` : '';
  let context = `📍 Birth: ${birthData.date}${timeInfo}${timezoneInfo}, ${birthData.location}`;
  if (birthData.latitude !== undefined && birthData.longitude !== undefined) {
    context += ` (${birthData.latitude.toFixed(2)}, ${birthData.longitude.toFixed(2)})`;
  }
  context += `\n\n`;

  // 按行星分组
  const planetGroups: Record<string, PlanetLine[]> = {};
  for (const line of planetLines) {
    if (!planetGroups[line.planet]) {
      planetGroups[line.planet] = [];
    }
    planetGroups[line.planet].push(line);
  }

  // 为每个行星生成描述
  for (const [planet, lines] of Object.entries(planetGroups)) {
    // 使用 emoji 和简化描述
    const planetEmoji: Record<string, string> = {
      Sun: '☀️',
      Moon: '🌙',
      Mercury: '☿️',
      Venus: '💕',
      Mars: '🔥',
      Jupiter: '🍀',
      Saturn: '🪐',
      Uranus: '⚡',
      Neptune: '🌊',
      Pluto: '💜',
    };

    const lineEmoji: Record<string, string> = {
      AS: '🌅',
      DS: '🤝',
      MC: '⭐',
      IC: '🏠',
    };

    const planetName: Record<string, string> = {
      Sun: 'Sun',
      Moon: 'Moon',
      Mercury: 'Mercury',
      Venus: 'Venus',
      Mars: 'Mars',
      Jupiter: 'Jupiter',
      Saturn: 'Saturn',
      Uranus: 'Uranus',
      Neptune: 'Neptune',
      Pluto: 'Pluto',
    };

    const lineName: Record<string, string> = {
      AS: 'AS (Rising)',
      DS: 'DS (Relationships)',
      MC: 'MC (Career)',
      IC: 'IC (Home)',
    };

    context += `${planetEmoji[planet] || '•'} ${planetName[planet] || planet}\n`;

    for (const line of lines) {
      const cities = findNearbyCitiesForLine(line.coordinates, 8, 7); // 🔥 优化：增加城市数量和查找范围
      const citiesText = cities.length > 0 ? cities.join(', ') : 'Various regions';

      context += `  ${lineEmoji[line.type] || '•'} ${lineName[line.type] || line.type}\n`;
      context += `     Cities: ${citiesText}\n`;
      
      // 🔥 新增：添加关键坐标点信息（用于更精确的位置查询）
      if (line.coordinates && line.coordinates.length > 0) {
        // 提取关键坐标点（起始、中间、结束点）
        const keyPoints: string[] = [];
        const totalPoints = line.coordinates.length;
        
        // 起始点
        if (totalPoints > 0) {
          const [lat1, lng1] = line.coordinates[0];
          keyPoints.push(`(${lat1.toFixed(2)}, ${lng1.toFixed(2)})`);
        }
        
        // 中间关键点（每25%取一个点，最多3个）
        if (totalPoints > 4) {
          const step = Math.floor(totalPoints / 4);
          for (let i = step; i < totalPoints - 1; i += step) {
            const [lat, lng] = line.coordinates[i];
            keyPoints.push(`(${lat.toFixed(2)}, ${lng.toFixed(2)})`);
            if (keyPoints.length >= 3) break; // 最多3个中间点
          }
        }
        
        // 结束点
        if (totalPoints > 1 && keyPoints.length < 5) {
          const [lat2, lng2] = line.coordinates[totalPoints - 1];
          const lastPoint = `(${lat2.toFixed(2)}, ${lng2.toFixed(2)})`;
          if (!keyPoints.includes(lastPoint)) {
            keyPoints.push(lastPoint);
          }
        }
        
        // 如果有坐标信息，添加到上下文（有助于回答具体位置问题）
        if (keyPoints.length > 0) {
          context += `     Key points: ${keyPoints.join(' → ')}\n`;
        }
      }
    }
    context += `\n`;
  }

  return context;
}

/**
 * 检测用户问题的语言
 */
/**
 * 检测文本的语言
 * @param text 要检测的文本
 * @returns 语言名称（中文/英文/西班牙文/意大利文/葡萄牙文）
 */
export function detectLanguage(text: string): string {
  // 简单的语言检测逻辑
  const chinesePattern = /[\u4e00-\u9fa5]/;
  const englishPattern = /^[a-zA-Z\s\?\!\.\,\']+$/;
  const spanishPattern = /[áéíóúñüÁÉÍÓÚÑÜ]/;
  const italianPattern = /[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/;
  const portuguesePattern = /[ãõçÃÕÇ]/;
  
  if (chinesePattern.test(text)) {
    return '中文';
  } else if (spanishPattern.test(text)) {
    return '西班牙文';
  } else if (italianPattern.test(text)) {
    return '意大利文';
  } else if (portuguesePattern.test(text)) {
    return '葡萄牙文';
  } else if (englishPattern.test(text) || /[a-zA-Z]/.test(text)) {
    return '英文';
  }
  
  return '英文'; // 默认英文
}

/**
 * 生成系统提示词（System Prompt）- 专业且懂人心的占星分析师
 * @param userMessageLanguage 用户问题的语言
 * @param questionCount 当前是第几个问题（从1开始）
 * @param remainingFreeQuestions 剩余免费问题数量（-1表示已付费用户）
 * @param userLocale 用户语言环境（用于优化回答长度和风格）
 */
export function getSystemPrompt(
  userMessageLanguage?: string,
  questionCount: number = 1,
  remainingFreeQuestions: number = 0,
  userLocale?: string
): string {
  // 🔥 优化：根据用户语言环境和检测到的语言，生成明确的语言指令
  // userLocale 用于确认语言环境（如 'zh', 'en', 'es' 等），userMessageLanguage 用于检测问题语言（如 '中文', '英文' 等）
  const detectedLanguage = userMessageLanguage || (userLocale === 'zh' || userLocale === 'zh-CN' ? '中文' : userLocale === 'es' ? '西班牙文' : userLocale === 'it' ? '意大利文' : userLocale === 'pt' ? '葡萄牙文' : '英文');
  
  const languageInstruction = detectedLanguage 
    ? `\n\n⚠️⚠️⚠️ CRITICAL LANGUAGE RULE - HIGHEST PRIORITY ⚠️⚠️⚠️\n\nThe user's question language has been detected as: **${detectedLanguage}**\n\nYOU MUST RESPOND ENTIRELY IN **${detectedLanguage}**!\n\n- If userLanguage = "英文", respond ONLY in English\n- If userLanguage = "中文", respond ONLY in Chinese (Simplified)\n- If userLanguage = "西班牙文", respond ONLY in Spanish\n- If userLanguage = "意大利文", respond ONLY in Italian\n- If userLanguage = "葡萄牙文", respond ONLY in Portuguese\n- If userLanguage = "马来文", respond ONLY in Malay\n\nDO NOT use any other language. DO NOT mix languages. Use ${detectedLanguage} ONLY.\n\n`
    : '';

  // 🔥 优化：根据问题次数和复杂度动态调整策略和回答长度
  // 检测问题复杂度（根据关键词判断是否需要详细回答）
  const isComplexQuestion = questionCount > 1 || remainingFreeQuestions === -1; // 追问或付费用户通常需要更详细回答
  
  let strategyInstruction = '';
  let lengthGuidance = '';
  
  if (questionCount === 1) {
    strategyInstruction = '\n🎯 **FIRST IMPRESSION STRATEGY**: This is the user\'s first question. Give one clear, memorable insight that proves the chart was actually read. Do not explain everything. Make the answer useful on its own, then leave one grounded open loop tied to a real planet, city, angle, or trade-off that is present in the supplied data.\n';
    lengthGuidance = detectedLanguage === '中文' 
      ? '\n**回答长度**: 中文 240-340 字符（第一印象要具体，但不要一次讲完）\n'
      : '\n**Answer Length**: English 180-260 words (specific and valuable, but not exhaustive)\n';
  } else if (questionCount === 2 && remainingFreeQuestions === 0) {
    strategyInstruction = '\n💎 **VALUE HINT STRATEGY**: This is the user\'s last free question. Answer the question first, then end with one specific positive next thread that makes continued exploration feel useful and emotionally compelling. The hook must point to a concrete next value supported by the supplied map: city comparison, a hidden supportive line, a relationship/career trade-off, or a practical next move. Do not mention payment, upgrading, fake urgency, fear, pressure, or timing that has not been calculated.\n';
    lengthGuidance = detectedLanguage === '中文'
      ? '\n**回答长度**: 中文 220-320 字符（回答清楚，同时保留一个高价值线索）\n'
      : '\n**Answer Length**: English 170-250 words (clear answer plus one high-value next thread)\n';
  } else if (remainingFreeQuestions === -1 || remainingFreeQuestions > 0 || isComplexQuestion) {
    strategyInstruction = '\n🔍 **DEEP INSIGHT STRATEGY**: The user is engaged. Go deeper into trade-offs and practical next steps while staying grounded in the provided chart data. Discuss timing only when actual transit or timing data is included in the supplied context. Prioritize the most decision-useful details instead of covering every possible meaning.\n';
    lengthGuidance = detectedLanguage === '中文'
      ? '\n**回答长度**: 中文 320-480 字符（更深入，体现付费/深度追问价值）\n'
      : '\n**Answer Length**: English 240-360 words (deeper, practical, and worth the paid/continued interaction)\n';
  } else {
    // 默认长度指导
    lengthGuidance = detectedLanguage === '中文'
      ? '\n**回答长度**: 中文 200-300 字符\n'
      : '\n**Answer Length**: English 150-250 words\n';
  }
  
  const remainingQuestionsText = remainingFreeQuestions > 0
    ? (userMessageLanguage === '中文' ? `✨ 还剩 ${remainingFreeQuestions} 次免费提问` : `✨ ${remainingFreeQuestions} free question${remainingFreeQuestions === 1 ? '' : 's'} remaining`)
    : remainingFreeQuestions === 0
      ? (userMessageLanguage === '中文' ? `💎 继续追问可以看更具体的城市比较和行动路径` : `💎 Continue to explore more specific city comparisons and next steps`)
      : '';

  return `${languageInstruction}You are a PROFESSIONAL and EMPATHETIC Astrocartography analyst chatting with a friend. Answer questions about their astrocartography chart accurately, engagingly, and insightfully.

${strategyInstruction}
## 🔴 CRITICAL RULES (HIGHEST PRIORITY!)

**1. LANGUAGE MATCHING:**
   - Always respond in the SAME language as the user's question (English→English, 中文→中文, etc.)
   - NEVER mix languages in one response!

**2. ANSWER ACCURACY (MOST IMPORTANT!):**
   - Read the question CAREFULLY and answer EXACTLY what was asked
   - "love AND success" = Answer BOTH parts completely (both mandatory!)
   - "如何/how" = Answer METHODS/STEPS, not locations
   - "哪里/where" = Answer LOCATIONS/PLACES, not methods
   - Do NOT invent district, neighbourhood, street, venue, or local-area names. Only name one when it is explicitly present in the supplied chart data.
   - If the available map resolution cannot support a district or neighbourhood answer, say so plainly and offer a city-level comparison instead.
   - If asked about something missing, state it honestly, then provide alternatives

**3. EXPLAIN TERMS IN PLAIN LANGUAGE:**
   - Explain astrological jargon the first time it matters in the answer
   - Use a short plain-language note in parentheses, but do not overload every sentence with definitions
   - Example: "Your Venus DS line *(the line that activates your one-on-one relationship energy)*..."
   - Example: "Jupiter MC *(where career luck and public recognition peak)*..."
   - This serves both experts (who see the term) and beginners (who read the parenthetical)

**4. HANDLE SKEPTICISM WITH CALIBRATED CONFIDENCE:**
   - If the user questions or challenges your interpretation, do not flip your answer just to agree
   - First, acknowledge the concern briefly: "That's a fair question..."
   - Then show the reasoning from the available chart data: planet, angle type, city/location, and theme
   - If the user provides new factual data (birth time, birthplace, selected point, chart line), update the interpretation clearly
   - If your earlier answer missed something, correct it directly and explain the correction without over-apologizing
   - Confidence should come from transparent reasoning, not stubbornness

**5. USE CHART DATA:**
   - Base answers ONLY on the chart data provided
   - Use named cities, planet lines, angles, and supplied line-distance evidence. Do not expose raw coordinates to the user unless they explicitly ask for coordinates.
   - 🔥 **DATA VALIDATION**: Before answering, verify that the chart data contains the information needed. If the user asks about a planet line that doesn't exist in the chart, honestly state "Your chart doesn't include [planet] [line type]" and offer alternatives from the available data. NEVER make up or guess planetary lines that aren't in the chart!
   - **SCOPE BOUNDARY**: Standard astrocartography context contains map-line evidence only. It does NOT include transits, progressions, exact relocation timing, natal houses, natal aspects, Chiron/Lilith/White Moon placements, or local facts unless they are explicitly supplied. Never imply that any of these were calculated when they were not.
   - **CITY COVERAGE LIMIT**: Named cities in the supplied context are examples of mapped line evidence, not a complete global or city-by-city lookup. If a requested city is not named, say "I cannot verify that city from the supplied map summary." NEVER turn an absent city name into "there is no line there", "zero lines", "no astrocartographic signal", or a negative judgment about that city.
   - If asked "when", for a specific month, or about a transit, say that this map-only reading cannot verify timing and offer to compare the currently supplied city/line evidence instead.
   - If asked about houses, aspects, Chiron, Lilith, White Moon, or a precise neighbourhood, say that those data are not included in this map interpretation. Do not fill the gap with a generic astrological claim.
   - **CALIBRATED LANGUAGE**: Frame recommendations as map-based candidates, not guarantees. Prefer "based on the line evidence in your map", "may support", and "is worth comparing". Do not use "clearly", "the strongest", "rarest", "rare activation", "unique power spot", "winner", "literally wired", "will", "soulmate", or "best" unless the supplied evidence directly supports a narrow comparison and you name that comparison.
   - Do not prescribe a stay duration, a neighbourhood, a local lifestyle, or a city characteristic as if it comes from chart evidence. You may say that practical research and a visit can be useful, but do not attach a number of days or weeks.

## 🔴 SEMANTIC MAPPING

**Key Terms Mapping:**
- Love/爱情/伴侣 = Venus DS or Moon DS
- Career/事业/工作 = MC lines
- Wealth/财运 = Jupiter lines or Venus MC
- 区域/districts = only answer when specific areas are present in supplied data; otherwise explain the city-level limit
- 街区/neighborhoods = only answer when specific areas are present in supplied data; otherwise explain the city-level limit

**Analysis Guidelines:**
- Explain WHY and HOW planetary energy manifests (not just facts)
- Do not infer real-world city characteristics that were not supplied
- Provide deep insights about 2-3 cities (quality over quantity)
- Use warm, understanding language with practical advice

## 🎨 RESPONSE STYLE

**Write like chatting with a friend, NOT like a textbook!**

**Structure (4 parts):**
1. **Opening (10-20 chars/words)**: Excite with key planetary line and cities + emojis
2. **Core Answer (100-150 chars/80-120 words)**: 
   - **MOST IMPORTANT**: Answer ALL parts of question completely
   - Match question type (how=methods, where=locations, what=names)
   - Explain planetary meaning, line type impact, and city-specific differences
   - Use chart data (named cities, line types, and supplied line-distance evidence) for every location claim
3. **Practical Advice (40-60 chars/30-50 words)**: Specific actionable steps
4. **Curiosity Hook (1 sentence only)**: End with ONE natural, positive hook that points to a specific next insight. The final hook should create positive emotional momentum: the user should feel there is one meaningful next layer worth exploring, not that they are being pressured. Do not include A/B/C options in the main answer; the app generates clickable follow-up buttons separately. Strong hooks mention a concrete next value from the supplied map: a better city comparison, supportive hidden line, relationship/career trade-off, or practical next step. Examples:
   - "✨ The interesting twist is that one of these cities looks better for long-term partnership, while the other is stronger for instant chemistry."
   - "🌟 I also notice a supportive Jupiter line that may change which city is the better fit for your next move."
   - "✨ There is one practical next step that would make this city choice much clearer from your chart."
   - Keep it positive, specific, and forward-looking. Never fear-based.
   - Avoid generic hooks like "Do you want to know more?" or "Would you like me to continue?"
   - English hooks should feel personal, clear, practical, and slightly aspirational. Example: "One city may give you instant chemistry, but another may support the kind of love that actually lasts."
   - German hooks should feel grounded, precise, and stability-focused. Example: "Ein Ort kann sich sofort spannend anfühlen, aber ein anderer kann besser zu dem Leben passen, das du wirklich aufbauen möchtest."
   - Italian hooks should feel warm, relational, and emotionally vivid while staying practical. Example: "Una città può accendere subito l'attrazione, ma un'altra può sostenere un amore più stabile e profondo."

${lengthGuidance}
**Default Length (if not specified above):** Chinese 200-300 chars, English 150-250 words total

**Tone:** Friend-like, warm, enthusiastic, empathetic, use city names (never coordinates), 2-3 emojis

## Core Concepts (for your reference)

### Planetary Lines:
- **AS (Rising)**: New beginnings, active energy, external expression, how you present yourself
- **DS (Setting)**: Relationships, partnerships, interactions, how you connect with others
- **MC (Midheaven)**: Career, public image, achievements, life purpose, reputation
- **IC (Nadir)**: Family, inner security, roots, home, private life

### Planets:
- **Venus**: Love, beauty, relationships, art, harmony, values, attraction
- **Jupiter**: Opportunities, growth, good fortune, expansion, wisdom, abundance
- **Mars**: Action, passion, energy, drive, courage, conflict, ambition
- **Sun**: Self, vitality, identity, ego, life force, creativity
- **Moon**: Emotions, intuition, family, nurturing, needs, inner world
- **Mercury**: Communication, thinking, learning, travel, commerce, technology
- **Saturn**: Structure, discipline, responsibility, limitations, mastery, authority
- **Uranus**: Innovation, freedom, sudden changes, rebellion, uniqueness
- **Neptune**: Dreams, intuition, spirituality, creativity, illusion, compassion
- **Pluto**: Transformation, power, intensity, depth, regeneration

## Response Examples:

**Good Example (Chinese - 4 parts, ~260 characters):**
"你的金星DS线经过巴黎和罗马！🌹✨ 金星代表爱情和美感，落在下降点(DS，亲密关系与伴侣互动被放大的位置)时，可能让一对一互动更受重视。基于地图证据，巴黎和罗马都值得作为关系目标比较；但这张地图本身不能判断具体街区或相遇结果。建议把签证、预算、工作与社交条件一并纳入选择。✨ 下一步可以比较两座城市的关系线与其他支持线之间的取舍。 ${remainingQuestionsText}"

**Good Example (English - 4 parts, ~210 words):**
"Your Venus DS line runs through Paris and Rome! 🌹✨ Venus describes love, attraction, beauty, and social ease; on the Descendant/DS line *(the relationship angle, where one-on-one connection gets amplified)* it may make partnership themes more prominent. Based on the map evidence, both Paris and Rome are worth comparing for a relationship-focused move, but this map cannot predict a specific partner, neighbourhood, or outcome. Weigh practical factors such as work, budget, visa options, and your support network alongside the map. ✨ The useful next layer is comparing these relationship lines with the other supportive lines named in your map. ${remainingQuestionsText}"

**Bad Example (Academic - TOO SHORT, NO DETAILS, WRONG FOCUS):**
"根据金星DS线位于48.8566°N, 2.3522°E的坐标分析，该位置对人际关系有积极影响。建议前往这些城市。"

**Bad Example (WRONG - Didn't answer the question):**
User asks: "Which specific neighborhoods in Singapore align with my Moon DS line?"
Bad response: "Your career lines are fascinating! Seoul is a major hub..." (completely off-topic)

**Bad Example (WRONG - Didn't answer both parts):**
User asks: "Where should I move to find love and success?"
Bad response: "Your chart reveals fascinating career power in Singapore and Seoul!..." (only answered success/career, completely ignored love - UNACCEPTABLE!)

**Bad Example (WRONG - Didn't give specific names):**
User asks: "上海具体哪些区域更利恋爱？"
Bad response: "上海的能量更偏向文化情感连接..." (pretends the map can distinguish districts without district-level data - UNACCEPTABLE!)

**Bad Example (WRONG - Wrong question type):**
User asks: "如何在上海咖啡馆增强吸引力？"
Bad response: "你的月亮DS线在上海的能量集中在徐汇区和黄浦区！..." (answered WHERE instead of HOW - completely wrong question type - UNACCEPTABLE!)
Correct response should explain that a map line can support a city-level comparison, but it cannot identify a specific cafe, neighbourhood, or date unless those data are provided. Then offer general, non-astrological practical considerations (for example, testing a city before relocating) without presenting them as chart evidence.

Remember: Be professional, empathetic, accurate, and engaging. Follow the 4-part structure, make the Core Interpretation detailed (100-150 chars/80-120 words), answer ALL parts of the question, and end with ONE natural curiosity hook. Do NOT include A/B/C follow-up options in the main answer.`;
}

/** Payload for AI synastry mode (no map lines). */
export interface SynastryPayloadForAI {
  personA: {
    birthData: {
      date: string;
      time: string;
      location: string;
      timezone?: string;
      latitude?: number;
      longitude?: number;
    };
    ascendant: { sign: string; degree: number };
    planets: Array<{ name: string; sign: string; house: number }>;
  };
  personB: {
    birthData: {
      date: string;
      time: string;
      location: string;
      timezone?: string;
      latitude?: number;
      longitude?: number;
    };
    ascendant: { sign: string; degree: number };
    planets: Array<{ name: string; sign: string; house: number }>;
  };
  aspects: Array<{ planetA: string; planetB: string; aspect: string; orb: number }>;
  relocated?: {
    location: string;
    ascendantA: { sign: string; degree: number };
    ascendantB: { sign: string; degree: number };
    aInB: Array<{ planet: string; houseInPartner: number }>;
    bInA: Array<{ planet: string; houseInPartner: number }>;
  };
}

export function formatSynastryContext(data: SynastryPayloadForAI): string {
  const fmtBirth = (label: string, b: SynastryPayloadForAI["personA"]) => {
    let s = `${label}\n`;
    s += `  Birth: ${b.birthData.date} ${b.birthData.time} (${b.birthData.timezone || "TZ"}) — ${b.birthData.location}`;
    if (b.birthData.latitude != null && b.birthData.longitude != null) {
      s += ` (${b.birthData.latitude.toFixed(2)}, ${b.birthData.longitude.toFixed(2)})`;
    }
    s += `\n  Ascendant: ${b.ascendant.sign} ${b.ascendant.degree.toFixed(1)}°\n`;
    s += `  Planets (whole-sign houses at birthplace):\n`;
    for (const p of b.planets) {
      s += `    ${p.name}: ${p.sign} (H${p.house})\n`;
    }
    return s;
  };

  let txt = "=== SYNASTRY (two natal charts) ===\n\n";
  txt += fmtBirth("PERSON A", data.personA);
  txt += "\n";
  txt += fmtBirth("PERSON B", data.personB);
  txt += "\n=== INTER-CHART ASPECTS (natal longitudes, major aspects) ===\n";
  const sorted = [...data.aspects].sort((a, b) => a.orb - b.orb);
  for (const a of sorted.slice(0, 80)) {
    txt += `  ${a.planetA} ${a.aspect} ${a.planetB} (orb ${a.orb}°)\n`;
  }
  if (data.relocated) {
    txt += `\n=== SHARED CITY (relocated whole-sign overlays) ===\n`;
    txt += `  City: ${data.relocated.location}\n`;
    txt += `  Asc A at city: ${data.relocated.ascendantA.sign} ${data.relocated.ascendantA.degree}°\n`;
    txt += `  Asc B at city: ${data.relocated.ascendantB.sign} ${data.relocated.ascendantB.degree}°\n`;
    txt += `  A's planets in B's houses at this location:\n`;
    for (const r of data.relocated.aInB) {
      txt += `    ${r.planet} → partner's house ${r.houseInPartner}\n`;
    }
    txt += `  B's planets in A's houses at this location:\n`;
    for (const r of data.relocated.bInA) {
      txt += `    ${r.planet} → partner's house ${r.houseInPartner}\n`;
    }
  }
  txt += "\n(Natal inter-planet aspects do not change with location; houses do.)\n";
  return txt;
}

export function getSynastrySystemPrompt(
  userMessageLanguage?: string,
  questionCount: number = 1,
  remainingFreeQuestions: number = 0,
  userLocale?: string
): string {
  const detectedLanguage =
    userMessageLanguage ||
    (userLocale === "zh" || userLocale === "zh-CN"
      ? "中文"
      : userLocale === "es"
        ? "西班牙文"
        : userLocale === "it"
          ? "意大利文"
          : userLocale === "pt"
            ? "葡萄牙文"
            : "英文");

  const languageInstruction = detectedLanguage
    ? `\n\n⚠️ CRITICAL: Respond entirely in **${detectedLanguage}**.\n\n`
    : "";

  return `${languageInstruction}You are a professional relationship astrologer interpreting SYNASTRY (comparison of two natal charts via planetary aspects and optional house overlays). You are NOT interpreting astrocartography map lines in this mode.

Rules:
- Base interpretations ONLY on the synastry data provided (aspects, signs, houses). Do not invent aspects.
- Cover major themes: emotional connection (Moon–Moon, Sun–Moon), attraction (Venus–Mars, Venus–Venus), communication (Mercury), commitment (Saturn aspects), intensity (Pluto), when present in the data.
- Use a balanced, non-fatalistic tone: highlight strengths and growth areas; avoid deterministic predictions about breakup or marriage.
- If the user asks about a specific pair (e.g. Sun–Moon), prioritize those aspects in the listing.
- Encourage self-awareness and communication; astrology is for reflection, not replacement for therapy or legal advice.

Answer length: first reply ~200–350 words in English (or equivalent in Chinese). Structure: (1) warm opening, (2) 2–4 bullet themes from the data, (3) practical relationship tips, (4) optional follow-up A/B/C.

Question context: question #${questionCount}, remaining free (for unauthenticated users conceptually): ${remainingFreeQuestions}.`;
}

/**
 * 从文本中提取城市名（支持中英文）
 * @param text 要提取的文本
 * @returns 提取到的城市名数组
 */
function extractCities(text: string): string[] {
  const cities: string[] = [];
  
  // 导入城市列表（避免循环依赖，直接在这里定义常用城市）
  const cityNames = [
    // 英文城市名
    'New York', 'Los Angeles', 'Chicago', 'Toronto', 'Mexico City',
    'São Paulo', 'Rio de Janeiro', 'Buenos Aires', 'Lima', 'Bogotá',
    'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Moscow', 'Istanbul',
    'Tokyo', 'Beijing', 'Shanghai', 'Mumbai', 'Delhi', 'Bangkok', 'Singapore', 'Seoul', 'Dubai', 'Jakarta',
    'Cairo', 'Lagos', 'Johannesburg', 'Nairobi', 'Casablanca',
    'Sydney', 'Melbourne', 'Auckland',
    // 中文城市名（常见翻译）
    '纽约', '洛杉矶', '芝加哥', '多伦多', '墨西哥城',
    '圣保罗', '里约热内卢', '布宜诺斯艾利斯', '利马', '波哥大',
    '伦敦', '巴黎', '柏林', '马德里', '罗马', '阿姆斯特丹', '莫斯科', '伊斯坦布尔',
    '东京', '北京', '上海', '孟买', '德里', '曼谷', '新加坡', '首尔', '迪拜', '雅加达',
    '开罗', '拉各斯', '约翰内斯堡', '内罗毕', '卡萨布兰卡',
    '悉尼', '墨尔本', '奥克兰',
  ];
  
  // 按长度从长到短排序，避免短城市名被长城市名包含
  const sortedCities = cityNames.sort((a, b) => b.length - a.length);
  
  for (const city of sortedCities) {
    // 使用单词边界或标点符号来匹配城市名，避免部分匹配
    const regex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(text) && !cities.includes(city)) {
      cities.push(city);
    }
  }
  
  return cities;
}

/**
 * 生成追问建议（基于用户问题和AI回答）
 * @param userQuestion 用户的问题
 * @param aiResponse AI的回答内容（可选，如果提供则从中提取城市名）
 * @returns 3个追问建议
 */
export function generateFollowUpSuggestions(
  userQuestion: string,
  aiResponse?: string
): string[] {
  // 🔥 检测用户问题的语言，确保追问建议使用相同语言
  const userLanguage = detectLanguage(userQuestion);
  const isChinese = userLanguage === '中文';
  
  const question = userQuestion.toLowerCase();
  
  // 从AI回答中提取城市名
  let cities: string[] = [];
  if (aiResponse) {
    cities = extractCities(aiResponse);
  }
  
  // 检测问题类型
  const isLoveQuestion = /love|relationship|romance|venus|dating|partner|marry|marriage|romantic|crush|heart|感情|爱情|恋爱|伴侣|结婚|浪漫|约会/.test(question);
  const isCareerQuestion = /career|job|work|business|profession|mc|midheaven|success|achievement|事业|工作|职业|成功|成就|职场/.test(question);
  const isTravelQuestion = /travel|move|relocate|visit|trip|journey|where|location|place|city|搬家|旅行|搬迁|地点|城市|去哪里/.test(question);
  
  // 根据问题类型和提取的城市名生成追问建议（支持中英文）
  if (isLoveQuestion && isCareerQuestion) {
    if (cities.length >= 2) {
      return isChinese ? [
        `${cities[0]}和${cities[1]}如何兼顾爱情与事业？`,
        `两座城市中，哪条线最影响爱情与事业的平衡？`,
        `还有哪些城市值得为爱情与事业一起比较？`
      ] : [
        `How do ${cities[0]} and ${cities[1]} balance love and career?`,
        `Which line matters most for love and career balance?`,
        `Which other cities are worth comparing for both goals?`
      ];
    }

    if (cities.length === 1) {
      return isChinese ? [
        `${cities[0]}如何兼顾爱情与事业？`,
        `${cities[0]}附近哪条线最影响爱情与事业的平衡？`,
        `还有哪些城市值得为爱情与事业一起比较？`
      ] : [
        `How can ${cities[0]} balance love and career?`,
        `Which line near ${cities[0]} matters most for love and career balance?`,
        `Which other cities are worth comparing for both goals?`
      ];
    }

    return isChinese ? [
      `我的地图中哪些线能兼顾爱情与事业？`,
      `如何比较爱情线与事业线之间的取舍？`,
      `还有哪些城市值得为爱情与事业一起比较？`
    ] : [
      `Which lines in my map can support both love and career?`,
      `How should I weigh the trade-offs between relationship and career lines?`,
      `Which other cities are worth comparing for both goals?`
    ];
  } else if (isLoveQuestion) {
    if (cities.length >= 2) {
      return isChinese ? [
        `${cities[0]}和${cities[1]}的关系线有什么不同？`,
        `${cities[0]}附近最相关的是哪条关系线？`,
        `还有哪些城市有相似的爱情线支持？`
      ] : [
        `How do ${cities[0]} and ${cities[1]} differ for relationships?`,
        `Which relationship line is most relevant near ${cities[0]}?`,
        `Which other cities have similar relationship-line support?`
      ];
    } else if (cities.length === 1) {
      return isChinese ? [
        `${cities[0]}对应哪条关系线？`,
        `${cities[0]}的关系能量有什么取舍？`,
        `还有哪些城市有相似的爱情线支持？`
      ] : [
        `Which relationship line supports ${cities[0]}?`,
        `What relationship trade-off does ${cities[0]} show?`,
        `Which other cities have similar relationship-line support?`
      ];
    } else {
      return isChinese ? [
        "我的地图中哪些线与关系最相关？",
        "关系线与事业线该如何取舍？",
        "还有哪些城市值得比较？"
      ] : [
        "Which lines in my map are most relevant to relationships?",
        "How should I weigh relationship and career lines?",
        "Which other cities are worth comparing?"
      ];
    }
  } else if (isCareerQuestion) {
    if (cities.length >= 2) {
      return isChinese ? [
        `${cities[0]}和${cities[1]}的事业线有什么不同？`,
        `${cities[0]}附近最相关的是哪条事业线？`,
        `还有哪些城市有相似的事业线支持？`
      ] : [
        `How do ${cities[0]} and ${cities[1]} differ for career?`,
        `Which career line is most relevant near ${cities[0]}?`,
        `Which other cities have similar career-line support?`
      ];
    } else if (cities.length === 1) {
      return isChinese ? [
        `${cities[0]}对应哪条事业线？`,
        `${cities[0]}的事业能量有什么取舍？`,
        `还有哪些城市有相似的事业线支持？`
      ] : [
        `Which career line supports ${cities[0]}?`,
        `What career trade-off does ${cities[0]} show?`,
        `Which other cities have similar career-line support?`
      ];
    } else {
      return isChinese ? [
        "我的地图中哪些线与事业最相关？",
        "事业线与关系线该如何取舍？",
        "还有哪些城市值得比较？"
      ] : [
        "Which lines in my map are most relevant to career?",
        "How should I weigh career and relationship lines?",
        "Which other cities are worth comparing?"
      ];
    }
  } else if (isTravelQuestion) {
    if (cities.length >= 2) {
      return isChinese ? [
        `${cities[0]}和${cities[1]}的行星线有什么不同？`,
        `${cities[0]}最值得注意的是哪条线？`,
        `还有哪些城市与这两座城市值得一起比较？`
      ] : [
        `How do the planetary lines differ in ${cities[0]} and ${cities[1]}?`,
        `Which line matters most near ${cities[0]}?`,
        `Which other cities are worth comparing with these two?`
      ];
    } else if (cities.length === 1) {
      return isChinese ? [
        `${cities[0]}对应哪条行星线？`,
        `${cities[0]}的地图支持有什么取舍？`,
        `还有哪些城市值得一起比较？`
      ] : [
        `Which planetary line supports ${cities[0]}?`,
        `What map-based trade-off does ${cities[0]} show?`,
        `Which other cities are worth comparing?`
      ];
    } else {
      return isChinese ? [
        "我的地图中哪些城市最值得比较？",
        "这些城市的行星线有什么不同？",
        "哪条线最影响搬迁选择？"
      ] : [
        "Which cities in my map are most worth comparing?",
        "How do the planetary lines differ in these cities?",
        "Which line matters most for a relocation choice?"
      ];
    }
  } else {
    // 默认追问建议（基于提取的城市名）
    if (cities.length >= 2) {
      return isChinese ? [
        `${cities[0]}和${cities[1]}的具体区别？`,
        `这两座城市各自对应哪条线？`,
        `还有其他值得关注的城市吗？`
      ] : [
        `Specific differences between ${cities[0]} and ${cities[1]}?`,
        `Which line is most relevant in each city?`,
        `Are there other cities worth paying attention to?`
      ];
    } else if (cities.length === 1) {
      return isChinese ? [
        `${cities[0]}的具体优势？`,
        `${cities[0]}最相关的是哪条线？`,
        `还有其他值得关注的城市吗？`
      ] : [
        `What are the specific advantages of ${cities[0]}?`,
        `Which line is most relevant near ${cities[0]}?`,
        `Are there other cities worth paying attention to?`
      ];
    } else {
      return isChinese ? [
        "这些城市的具体区别？",
        "哪些行星线最值得比较？",
        "还有其他值得关注的地方吗？"
      ] : [
        "Specific differences between these cities?",
        "Which planetary lines are most worth comparing?",
        "Are there other places worth paying attention to?"
      ];
    }
  }
}
