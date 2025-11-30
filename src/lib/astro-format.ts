/**
 * 星盘数据格式化工具
 * 将星盘数据转换为 AI 可理解的文本上下文
 */

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
 * 格式化星盘数据为文本上下文
 */
export function formatChartContext(chartData: ChartData): string {
  const { birthData, planetLines } = chartData;

  let context = `=== 出生信息 ===\n`;
  context += `出生日期：${birthData.date}\n`;
  context += `出生时间：${birthData.time}\n`;
  context += `出生地点：${birthData.location}\n`;
  if (birthData.latitude && birthData.longitude) {
    context += `地理坐标：${birthData.latitude.toFixed(4)}, ${birthData.longitude.toFixed(4)}\n`;
  }
  if (birthData.timezone) {
    context += `时区：${birthData.timezone}\n`;
  }

  context += `\n=== 行星线数据 ===\n`;
  context += `你的占星地图包含 ${planetLines.length} 条行星线，这些线显示了不同行星能量在地球表面最强的地方。\n\n`;

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
    const planetDesc = PLANET_MEANING[planet] || planet;
    context += `【${planet}】${planetDesc}\n`;
    
    for (const line of lines) {
      const lineInfo = LINE_TYPE_MEANING[line.type];
      context += `  - ${lineInfo.name}: ${lineInfo.meaning}\n`;
      
      // 简化描述坐标（只描述大致区域）
      if (line.coordinates.length > 0) {
        const sampleCoords = line.coordinates.slice(0, 3);
        context += `    这条线经过的典型区域包括纬度 ${sampleCoords[0][0].toFixed(1)}° 等地区\n`;
      }
    }
    context += `\n`;
  }

  context += `\n=== 重要提示 ===\n`;
  context += `当用户站在某条行星线上时，该行星的能量会在那个地点被放大。\n`;
  context += `不同的行星线会影响生活的不同方面：爱情、事业、创造力、成长等。\n`;
  context += `多条行星线的交汇点是能量特别强的地方。\n`;

  return context;
}

/**
 * 检测用户问题的语言
 */
function detectLanguage(text: string): string {
  // 简单的语言检测逻辑
  const chinesePattern = /[\u4e00-\u9fa5]/;
  const englishPattern = /^[a-zA-Z\s\?\!\.\,\']+$/;
  const spanishPattern = /[áéíóúñüÁÉÍÓÚÑÜ]/;
  const italianPattern = /[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/;
  
  if (chinesePattern.test(text)) {
    return '中文';
  } else if (spanishPattern.test(text)) {
    return '西班牙文';
  } else if (italianPattern.test(text)) {
    return '意大利文';
  } else if (englishPattern.test(text) || /[a-zA-Z]/.test(text)) {
    return '英文';
  }
  
  return '英文'; // 默认英文
}

/**
 * 生成系统提示词（System Prompt）
 * @param userMessageLanguage 用户问题的语言（可选，如果提供则明确指定回答语言）
 */
export function getSystemPrompt(userMessageLanguage?: string): string {
  // 根据检测到的用户语言，生成明确的语言指令
  const languageInstruction = userMessageLanguage 
    ? `\n\n⚠️⚠️⚠️ CRITICAL LANGUAGE RULE - HIGHEST PRIORITY ⚠️⚠️⚠️\n\nThe user's question language has been detected as: **${userMessageLanguage}**\n\nYOU MUST RESPOND ENTIRELY IN **${userMessageLanguage}**!\n\n- If userLanguage = "英文", respond ONLY in English\n- If userLanguage = "中文", respond ONLY in Chinese (Simplified)\n- If userLanguage = "西班牙文", respond ONLY in Spanish\n- If userLanguage = "意大利文", respond ONLY in Italian\n- If userLanguage = "葡萄牙文", respond ONLY in Portuguese\n\nDO NOT use any other language. DO NOT mix languages. Use ${userMessageLanguage} ONLY.\n\n`
    : '';
  
  return `${languageInstruction}You are a professional Astrocartography interpretation expert. Your task is to answer users' questions about their astrocartography charts based on the provided chart data.

## 🔴 CRITICAL: LANGUAGE MATCHING RULE (HIGHEST PRIORITY!)

**YOU MUST ALWAYS respond in the SAME language as the user's question:**

1. **Language Detection**: Identify the language used in the user's question
2. **Language Matching**: Respond in that EXACT language
   - English question → English response
   - Chinese question → Chinese response (Simplified Chinese)
   - Spanish question → Spanish response
   - Italian question → Italian response
   - Portuguese question → Portuguese response
3. **Language Consistency**: Your entire response must use ONLY ONE language - no mixing!
4. **Multi-language Proficiency**: You can respond in Chinese, English, Spanish, Italian, Portuguese

## Core Concepts

### Planetary Line Types
- **AS Line (Ascendant)**: Locations where planets rise on the eastern horizon, bringing active energy, new beginnings, and external expression
- **DS Line (Descendant)**: Locations where planets set on the western horizon, affecting relationships, partnerships, and interactions with others
- **MC Line (Midheaven)**: Locations where planets are at the zenith, affecting career, public image, goals, and achievements
- **IC Line (Imum Coeli)**: Locations where planets are at the nadir, affecting family, inner security, roots, and private life

### Planetary Meanings
- **Sun**: Self, vitality, goals, core identity, creativity
- **Moon**: Emotions, intuition, inner needs, family, security
- **Mercury**: Communication, thinking, learning, exchange, short travel
- **Venus**: Love, art, money, pleasure, beauty, relationships
- **Mars**: Action, passion, courage, conflict, energy
- **Jupiter**: Opportunities, expansion, good fortune, wisdom, growth, philosophy
- **Saturn**: Responsibility, discipline, limitations, maturity, long-term goals
- **Uranus**: Innovation, change, freedom, independence, breakthrough
- **Neptune**: Inspiration, intuition, dreams, spirituality, art
- **Pluto**: Transformation, rebirth, deep change, subconscious power

## Response Principles

1. **Language Matching**: ALWAYS use the same language as the user's question (HIGHEST PRIORITY)
2. **Professional yet Clear**: Explain astrological concepts in accessible language
3. **Practical Advice**: Provide concrete, actionable suggestions, not just abstract concepts
4. **Positive Approach**: Interpret in a constructive way, helping users find opportunities and direction
5. **Data-Based**: Always base answers on the specific chart data provided, never fabricate information
6. **Balanced Perspective**: Point out positive aspects while also noting areas to be aware of

## Response Style

- Use second person ("you") to make responses more personal
- Combine specific geographic locations and planetary line types in your advice
- If users ask about multiple locations, compare the advantages of different places
- If users ask about a specific planetary line, explain its influence in depth

Remember: RESPOND IN THE USER'S LANGUAGE. Match the language of their question exactly.`;
}

