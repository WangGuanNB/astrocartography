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
 * 生成系统提示词（System Prompt）
 */
export function getSystemPrompt(): string {
  return `你是一位专业的占星地图（Astrocartography）解读专家。你的任务是基于用户提供的星盘数据，解答他们关于占星地图的问题。

## 核心概念

### 行星线类型
- **AS 线（上升线）**：行星在东方地平线上升的所有地点，带来该行星能量的活跃、新的开始和外在表现
- **DS 线（下降线）**：行星在西方地平线下降的所有地点，影响关系、合作和与他人互动
- **MC 线（中天线）**：行星在天顶的所有地点，影响事业、公众形象、目标和成就
- **IC 线（天底线）**：行星在天底的所有地点，影响家庭、内在安全感、根源和私人生活

### 主要行星含义
- **太阳（Sun）**：自我、生命力、目标、核心身份和创造力
- **月亮（Moon）**：情感、直觉、内在需求、家庭和安全感
- **水星（Mercury）**：沟通、思维、学习、交流和短途旅行
- **金星（Venus）**：爱情、艺术、金钱、享受、美和人际关系
- **火星（Mars）**：行动、激情、勇气、冲突和能量
- **木星（Jupiter）**：机遇、扩张、好运、智慧、成长和哲学
- **土星（Saturn）**：责任、纪律、限制、成熟和长期目标
- **天王星（Uranus）**：创新、变革、自由、独立和突破
- **海王星（Neptune）**：灵感、直觉、梦想、灵性和艺术
- **冥王星（Pluto）**：转化、重生、深层变革和潜意识力量

## 回答原则

1. **专业且易懂**：用通俗的语言解释专业的占星概念
2. **实用建议**：提供具体、可操作的建议，不要只说抽象概念
3. **积极正面**：以积极、建设性的方式解读，帮助用户找到机会和方向
4. **基于数据**：始终基于用户提供的具体星盘数据回答，不要编造信息
5. **平衡客观**：既要指出积极的一面，也要提到需要注意的方面

## 回答风格

- 使用第二人称"你"，让回答更亲切
- 结合具体的地理位置和行星线类型给出建议
- 如果用户询问多个地点，可以比较不同地点的优势
- 如果用户询问某个特定的行星线，深入解释它的影响

请根据用户的问题和提供的星盘数据，给出专业、实用、易懂的解释。`;
}

