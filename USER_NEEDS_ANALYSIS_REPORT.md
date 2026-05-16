# 用户需求深度分析报告
## Astrocartography 项目优化方向建议

**分析日期**: 2026-05-15  
**数据来源**: 3000条真实用户聊天记录  
**时间范围**: 2026-05-03 至 2026-05-15 (12天)  
**平均对话长度**: 3.44条消息/会话

---

## 📊 执行摘要 (Executive Summary)

基于3000条真实用户对话的深度分析，我们发现了用户的核心需求和痛点：

### 🎯 关键发现
1. **35.2%的用户问"我应该去哪里"** - 用户需要直接的城市推荐，而不是自己探索地图
2. **42.6%的用户关心爱情** (love/amor/amore/liebe) - 爱情是最强烈的情感需求
3. **25.4%的用户关心事业** (career/work/job) - 职业发展是第二大关注点
4. **14.9%的用户要求Top 3推荐** - 用户希望得到排名列表
5. **7.7%的用户要求对比分析** - 爱情 vs 事业的权衡是核心决策难题

### 💡 核心洞察
**用户不想"探索工具"，他们想要"专家建议"**

当前产品定位：自助探索工具（给用户一张地图）  
用户期望定位：智能推荐顾问（直接告诉用户答案）

---

## 📈 数据统计详情

### 1. 用户问题类型分布

| 问题类型 | 数量 | 占比 | 关键词 |
|---------|------|------|--------|
| 询问"应该去哪里" | 1,056 | 35.2% | where should, donde, onde, dove, wo |
| 关心爱情关系 | 1,277 | 42.6% | love, amor, amore, liebe, amour |
| 关心事业发展 | 763 | 25.4% | career, work, job, carreira, karriere |
| 要求Top 3推荐 | 446 | 14.9% | top 3, top three, 3 cities |
| 要求对比分析 | 230 | 7.7% | compare, compara, confronta |
| 询问Venus线 | 150 | 5.0% | venus, vênus, venere |
| 关心幸福快乐 | 60 | 2.0% | happy, happiness, feliz |
| 关心财富金钱 | 48 | 1.6% | money, wealth, rich, dinero |
| 寻找灵魂伴侣 | 11 | 0.4% | soulmate, soul mate |

### 2. 语言分布

基于标题关键词分析：

- **英语**: ~65% (主导语言)
- **西班牙语**: ~15% (第二大语言)
- **葡萄牙语**: ~10% (拉美市场)
- **德语**: ~4%
- **意大利语**: ~3%
- **其他**: ~3% (日语、中文、荷兰语等)

### 3. 用户参与度

- **平均对话长度**: 3.44条消息
- **单次查询用户**: 约60% (2条消息以内)
- **深度探索用户**: 约40% (4条消息以上)
- **高度参与用户**: <1% (20条消息以上)

**洞察**: 大部分用户是"快速决策型"，他们希望在1-2轮对话中得到答案。

---

## 🎯 用户核心痛点分析

### 痛点 1: 决策焦虑 (Decision Paralysis)

**问题描述**:  
35.2%的用户直接问"我应该搬到哪里"，他们不想自己在地图上探索，而是希望得到直接的答案。

**典型用户问题**:
- "Where should I move to find love and success?"
- "What are my top 3 cities for career growth?"
- "whats THE city for me?"
- "¿Dónde debería mudarme para encontrar amor y éxito?"

**当前产品体验**:
1. 用户输入出生信息
2. 看到复杂的占星地图
3. 不知道如何解读
4. 需要自己提问AI

**用户期望体验**:
1. 用户输入出生信息
2. 立即看到"为你推荐的Top 5城市"
3. 每个城市有清晰的评分和理由
4. 可以点击查看详情

**优化建议**:
- ✅ 添加"为我推荐最佳城市"按钮（高优先级）
- ✅ 在地图页面默认显示Top 5推荐卡片
- ✅ 提供"快速决策模式" vs "深度探索模式"切换

---

### 痛点 2: 爱情是第一优先级 (Love is #1 Priority)

**问题描述**:  
42.6%的用户提到爱情相关词汇，这是最强烈的情感需求。用户想知道"在哪里能找到真爱"。

**典型用户问题**:
- "Where should I go to find love"
- "Which city is best for me to find a life partner?"
- "What does my Venus line reveal about relationships?"
- "in what city will i find my soulmate"
- "Donde puedo encontrar el amor de mi vida?"

**当前产品功能**:
- ✅ 已有Venus line专门页面 (`/venus-line-astrocartography`)
- ✅ 地图上显示Venus线
- ❌ 但用户不知道如何快速找到"最佳恋爱城市"

**优化建议**:
- ✅ 在主页添加"寻找爱情"快速入口（高优先级）
- ✅ Venus线页面添加"最佳恋爱城市Top 5"推荐
- ✅ 提供"Love Score"评分系统（0-100分）
- ✅ 添加"爱情能量地图"可视化（突出显示Venus线区域）
- ✅ 提供"找到灵魂伴侣"专题页面

---

### 痛点 3: 爱情 vs 事业的权衡 (Love vs Career Tradeoff)

**问题描述**:  
7.7%的用户明确要求对比分析，这是一个未被满足的核心需求。用户在做人生重大决策时，需要看到清晰的权衡。

**典型用户问题**:
- "Compare my best locations for love vs. career"
- "Compara mis mejores ubicaciones para el amor vs. la carrera"
- "Compare meus melhores locais para amor vs. carreira"

**当前产品功能**:
- ❌ 没有对比功能
- ❌ 用户需要自己记住不同城市的信息
- ❌ 无法直观看到权衡关系

**优化建议**:
- ✅ 创建"Love vs Career"对比工具（高优先级）
- ✅ 提供可视化对比图表（雷达图或柱状图）
- ✅ 推荐"平衡型城市"（爱情和事业都不错的地方）
- ✅ 添加"我的优先级"设置（让用户选择权重）

---

### 痛点 4: 占星知识门槛 (Astrology Knowledge Barrier)

**问题描述**:  
很多用户对占星术一无所知，他们看到地图上的线条和符号感到困惑。

**典型用户问题**:
- "explain everyhting on the chart i know nothing about astrology"
- "Was sagt die gelbe Linie aus?" (黄线是什么意思？)
- "Que ascendente soy?" (我的上升星座是什么？)
- "このラインはどのような意味？" (这条线是什么意思？)

**当前产品功能**:
- ✅ 有各个行星线的专门页面
- ❌ 但新手用户不知道从哪里开始
- ❌ 地图上缺少简单易懂的解释

**优化建议**:
- ✅ 添加"新手引导模式"（首次访问时触发）
- ✅ 地图上添加悬停提示（hover tooltips）
- ✅ 提供"占星术101"快速教程（3分钟视频或动画）
- ✅ 用通俗语言解释专业术语（避免"MC"、"IC"等术语）
- ✅ 添加"简单模式" vs "专业模式"切换

---

### 痛点 5: 具体城市验证需求 (City Validation)

**问题描述**:  
用户经常询问特定城市对他们是否合适，他们需要详细的城市评估。

**典型用户问题**:
- "How is Grand Rapids Michigan for my life"
- "Will Los Angeles change my life on a deep level?"
- "¿Es Buenos Aires un gran lugar para hacer crecer mi carrera?"
- "Is Berlin a great place to grow my career and seize opportunities?"
- "São Paulo é um ótimo lugar para crescer na carreira?"

**当前产品功能**:
- ❌ 没有城市详情页
- ❌ 用户只能通过AI聊天获取信息
- ❌ 无法保存或分享城市评估结果

**优化建议**:
- ✅ 为主要城市创建详情页（中优先级）
- ✅ 提供城市评分卡（爱情、事业、健康、财富、创造力等维度）
- ✅ 添加"城市对比"功能（同时比较2-3个城市）
- ✅ 支持保存"我的候选城市列表"
- ✅ 提供分享功能（分享城市评估结果）

---


### 痛点 6: 地理限制需求 (Geographic Constraints)

**问题描述**:  
用户经常有地理偏好或限制，他们希望在特定区域内获得推荐。

**典型用户问题**:
- "Donde puedo encontrar el amor de mi vida? Que no sea en África o esos lugares"
- "give me 5 cities in uk for career growth"
- "Which US State is best for me with regards to Career, Business, health"
- "Best locations for belongingness, confidence, love, friends and careers in the Netherlands and Europe"

**当前产品功能**:
- ❌ 没有地理筛选器
- ❌ AI可能推荐用户不感兴趣的地区
- ❌ 用户需要反复说明地理限制

**优化建议**:
- ✅ 添加地理筛选器（按大陆、国家、地区）
- ✅ 提供"附近最佳城市"功能（基于当前位置）
- ✅ 支持"排除某些地区"的选项
- ✅ 记住用户的地理偏好设置

---

## 🚀 功能优先级建议

基于用户需求频率和实现难度，我们将优化建议分为三个优先级：

### 🔴 高优先级 (High Priority) - 立即实施

这些功能能解决最多用户的核心痛点，建议在1-2周内完成：

#### 1. "推荐Top 5城市"功能 ⭐⭐⭐⭐⭐
**解决痛点**: 35.2%用户的决策焦虑  
**实现方式**:
- 在地图页面添加"为我推荐最佳城市"按钮
- 点击后显示Top 5城市卡片（包含城市名、国家、综合评分、核心优势）
- 每个城市卡片可点击查看详情

**技术实现**:
```typescript
// 前端组件
<RecommendedCitiesPanel>
  <CityCard 
    name="Barcelona" 
    country="Spain"
    score={92}
    strengths={["Love", "Creativity", "Social Life"]}
    venusLineDistance={50} // km
  />
</RecommendedCitiesPanel>

// API endpoint
POST /api/recommend-cities
Body: { birthData, preferences: { priority: "love" | "career" | "balanced" } }
Response: { cities: City[], reasoning: string }
```

**预期效果**: 减少50%的"我应该去哪里"类问题

---

#### 2. "爱情 vs 事业对比"工具 ⭐⭐⭐⭐⭐
**解决痛点**: 7.7%用户的权衡决策需求  
**实现方式**:
- 添加"Compare Love vs Career"页面
- 提供雷达图可视化对比
- 显示"最佳爱情城市Top 3"和"最佳事业城市Top 3"
- 推荐"平衡型城市"（两者都不错的地方）

**UI设计**:
```
┌─────────────────────────────────────┐
│  Love Cities    vs    Career Cities │
├─────────────────────────────────────┤
│  🏙️ Barcelona (95)   🏙️ New York (94) │
│  🏙️ Paris (92)       🏙️ London (91)   │
│  🏙️ Rome (90)        🏙️ Singapore (89)│
├─────────────────────────────────────┤
│  ⚖️ Balanced Cities (Both High)      │
│  🏙️ Amsterdam (Love: 88, Career: 87) │
│  🏙️ Melbourne (Love: 85, Career: 86) │
└─────────────────────────────────────┘
```

**预期效果**: 提升用户决策信心，减少纠结时间

---

#### 3. Venus线专题优化 ⭐⭐⭐⭐
**解决痛点**: 42.6%用户的爱情需求  
**实现方式**:
- 在主页添加"🌹 寻找爱情"快速入口
- Venus线页面添加"最佳恋爱城市Top 5"
- 提供"Love Score"评分系统
- 添加"爱情能量地图"可视化（Venus线区域高亮）

**当前页面**: `/venus-line-astrocartography`  
**优化内容**:
1. 页面顶部添加"Your Top 5 Love Cities"卡片
2. 地图上Venus线区域用粉色渐变高亮
3. 添加"Find Your Soulmate City"CTA按钮
4. 提供"Love Compatibility Score"（0-100分）

**预期效果**: 提升Venus线页面的转化率和用户满意度

---

#### 4. 快速问题按钮 ⭐⭐⭐⭐
**解决痛点**: 降低用户输入成本，提升体验流畅度  
**实现方式**:
- 在AI聊天界面添加预设问题按钮
- 用户点击即可快速提问

**按钮设计**:
```
┌─────────────────────────────────────┐
│  Quick Questions:                   │
│  [🌹 Where to find love?]           │
│  [💼 Best cities for career?]       │
│  [⚖️ Compare love vs career]        │
│  [🏙️ Recommend top 5 cities]        │
│  [🌟 What's my Venus line?]         │
└─────────────────────────────────────┘
```

**多语言支持**:
- 英语: "Where to find love?"
- 西班牙语: "¿Dónde encontrar amor?"
- 葡萄牙语: "Onde encontrar amor?"
- 德语: "Wo finde ich Liebe?"

**预期效果**: 减少30%的用户输入时间，提升参与度

---

### 🟡 中优先级 (Medium Priority) - 1-2个月内实施

这些功能能显著提升用户体验，但实现复杂度较高：

#### 5. 城市详情页 ⭐⭐⭐
**解决痛点**: 具体城市验证需求  
**实现方式**:
- 为主要城市（Top 100）创建详情页
- URL格式: `/city/[cityName]` (例如: `/city/barcelona`)
- 提供多维度评分和详细解释

**页面结构**:
```
┌─────────────────────────────────────┐
│  Barcelona, Spain                   │
│  Overall Score: 92/100              │
├─────────────────────────────────────┤
│  📊 Detailed Scores:                │
│  💕 Love & Relationships: 95        │
│  💼 Career & Success: 78            │
│  💰 Wealth & Finance: 82            │
│  🏥 Health & Wellness: 88           │
│  🎨 Creativity & Arts: 94           │
│  🧘 Spirituality: 85                │
├─────────────────────────────────────┤
│  🌟 Key Planetary Lines:            │
│  • Venus Line (50km away)           │
│  • Jupiter Line (120km away)        │
├─────────────────────────────────────┤
│  📝 AI Interpretation:              │
│  Barcelona is excellent for...      │
└─────────────────────────────────────┘
```

**SEO优化**: 每个城市页面都是独立的SEO页面，可以吸引搜索流量

**预期效果**: 提升用户停留时间，增加页面浏览量

---

#### 6. 地理筛选器 ⭐⭐⭐
**解决痛点**: 地理限制需求  
**实现方式**:
- 在推荐页面添加筛选器
- 支持按大陆、国家、地区筛选

**UI设计**:
```
┌─────────────────────────────────────┐
│  🌍 Filter by Region:               │
│  [ ] North America                  │
│  [ ] South America                  │
│  [✓] Europe                         │
│  [ ] Asia                           │
│  [ ] Africa                         │
│  [ ] Oceania                        │
├─────────────────────────────────────┤
│  🗺️ Specific Countries:             │
│  [Search countries...]              │
│  [✓] Spain                          │
│  [✓] France                         │
│  [✓] Italy                          │
└─────────────────────────────────────┘
```

**预期效果**: 减少用户反复说明地理限制的次数

---

#### 7. 新手引导模式 ⭐⭐⭐
**解决痛点**: 占星知识门槛  
**实现方式**:
- 首次访问时触发引导流程
- 用简单语言解释核心概念
- 提供3分钟快速教程

**引导流程**:
```
Step 1: "Welcome! Let's find your perfect city 🌍"
Step 2: "These colorful lines show where different energies are strong for you"
Step 3: "Pink = Love 💕, Blue = Career 💼, Yellow = Creativity 🎨"
Step 4: "Click 'Recommend Cities' to get your personalized list"
```

**预期效果**: 降低新手用户的困惑，提升激活率

---

#### 8. "平衡型城市"推荐 ⭐⭐⭐
**解决痛点**: 用户不想在爱情和事业之间做极端选择  
**实现方式**:
- 在推荐结果中添加"Balanced Cities"分类
- 筛选出爱情和事业评分都在80+的城市

**算法逻辑**:
```typescript
function getBalancedCities(cities: City[]): City[] {
  return cities.filter(city => 
    city.loveScore >= 80 && 
    city.careerScore >= 80 &&
    Math.abs(city.loveScore - city.careerScore) <= 15
  ).sort((a, b) => 
    (a.loveScore + a.careerScore) - (b.loveScore + b.careerScore)
  );
}
```

**预期效果**: 为纠结的用户提供"两全其美"的选择

---

### 🟢 低优先级 (Low Priority) - 3个月后考虑

这些功能是"锦上添花"，可以在核心功能完善后再实施：

#### 9. 城市对比功能 ⭐⭐
**实现方式**: 支持同时比较2-3个城市的详细数据

#### 10. "附近最佳"功能 ⭐⭐
**实现方式**: 基于用户当前位置推荐附近的最佳城市

#### 11. 占星术教程内容 ⭐⭐
**实现方式**: 创建教育内容（博客、视频、动画）

#### 12. 用户保存和历史记录 ⭐⭐
**实现方式**: 允许用户保存候选城市列表，查看历史查询

#### 13. 社交分享功能 ⭐
**实现方式**: 分享城市评估结果到社交媒体

---

## 🎨 UI/UX 优化建议

### 1. 主页优化

**当前主页**: 主要是介绍和输入出生信息  
**优化建议**: 添加快速入口

```
┌─────────────────────────────────────┐
│  🌍 Astrocartography Calculator     │
│  [Enter Birth Data]                 │
├─────────────────────────────────────┤
│  🚀 Quick Actions:                  │
│  [🌹 Find Love Cities]              │
│  [💼 Find Career Cities]            │
│  [⚖️ Compare Love vs Career]        │
│  [🏙️ Get Top 5 Recommendations]     │
└─────────────────────────────────────┘
```

---

### 2. 地图页面优化

**当前地图页面**: 显示占星地图和行星线  
**优化建议**: 添加推荐卡片

```
┌─────────────────────────────────────┐
│  [Your Astrocartography Map]        │
│  (地图显示区域)                      │
├─────────────────────────────────────┤
│  ⭐ Recommended for You:             │
│  1. Barcelona (92) - Love & Creativity│
│  2. New York (89) - Career & Success │
│  3. Amsterdam (88) - Balanced Life   │
│  [See All Recommendations]          │
└─────────────────────────────────────┘
```

---

### 3. AI聊天界面优化

**当前聊天界面**: 空白输入框  
**优化建议**: 添加快速问题按钮（已在高优先级中说明）

---

## 📱 移动端优化建议

基于用户行为分析，预计50%+的用户使用移动设备访问：

1. **简化地图交互**: 移动端地图操作困难，应提供"列表视图"替代
2. **大按钮设计**: 快速问题按钮应足够大，方便点击
3. **减少输入**: 尽量用选择替代输入（例如：地理筛选器用复选框）
4. **快速加载**: 优化地图加载速度（已完成Cobe Globe优化）

---

## 🌍 多语言优化建议

### 当前语言支持
- ✅ 英语 (en)
- ✅ 西班牙语 (es)
- ✅ 葡萄牙语 (pt)
- ✅ 德语 (de)
- ✅ 意大利语 (it)
- ✅ 马来语 (ms)
- ✅ 中文 (zh)

### 优化建议
1. **确保新功能的多语言支持**: 所有新增的快速问题按钮、推荐卡片都需要翻译
2. **优先优化西班牙语和葡萄牙语**: 这两个语言的用户占比25%，是重要市场
3. **添加语言切换提示**: 检测用户浏览器语言，提示切换到对应语言

---

## 💰 商业化建议

基于用户需求分析，以下功能可以作为付费功能：

### 免费功能 (Free Tier)
- 基础地图查看
- Top 3城市推荐
- 基础AI聊天（每天5条消息）

### 付费功能 (Premium Tier)
- ✅ Top 10城市推荐（而不是Top 3）
- ✅ 城市详情页（深度分析）
- ✅ Love vs Career对比工具
- ✅ 无限AI聊天
- ✅ 保存候选城市列表
- ✅ 导出PDF报告
- ✅ 优先客服支持

**定价建议**: $9.99/月 或 $79.99/年（当前定价需要查看）

---

## 📊 成功指标 (KPIs)

实施优化后，应跟踪以下指标：

### 用户参与度指标
- **平均对话长度**: 目标从3.44提升到5+
- **返回用户率**: 目标提升30%
- **页面停留时间**: 目标提升50%

### 转化指标
- **付费转化率**: 目标提升20%
- **推荐功能使用率**: 目标60%+的用户使用
- **对比工具使用率**: 目标30%+的用户使用

### 用户满意度指标
- **NPS评分**: 目标达到50+
- **"我应该去哪里"类问题占比**: 目标从35.2%降低到20%
- **用户反馈评分**: 目标4.5+/5.0

---

## 🛠️ 技术实现建议

### 1. 城市推荐算法

```typescript
interface CityScore {
  cityName: string;
  country: string;
  coordinates: { lat: number; lng: number };
  scores: {
    love: number;        // 0-100
    career: number;      // 0-100
    wealth: number;      // 0-100
    health: number;      // 0-100
    creativity: number;  // 0-100
    spirituality: number;// 0-100
  };
  overall: number;       // 加权平均
  planetaryLines: {
    planet: string;
    distance: number;    // km
    aspect: string;      // "conjunction" | "trine" | "square"
  }[];
}

function calculateCityScore(
  city: City,
  birthData: BirthData,
  preferences: { priority: "love" | "career" | "balanced" }
): CityScore {
  // 1. 计算城市到各行星线的距离
  // 2. 根据距离和相位计算各维度评分
  // 3. 根据用户偏好计算加权总分
  // 4. 返回详细评分
}

function recommendCities(
  birthData: BirthData,
  preferences: UserPreferences
): CityScore[] {
  const allCities = getCityDatabase(); // 从数据库获取城市列表
  const scoredCities = allCities.map(city => 
    calculateCityScore(city, birthData, preferences)
  );
  return scoredCities
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 10);
}
```

### 2. 数据库设计

需要创建城市数据库：

```sql
CREATE TABLE cities (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  population INTEGER,
  timezone TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX idx_cities_coordinates ON cities(latitude, longitude);
```

**城市数据来源**:
- 使用GeoNames数据库（免费，包含全球主要城市）
- 初始可以只包含Top 1000城市
- 后续根据用户查询逐步扩展

### 3. 缓存策略

```typescript
// 缓存用户的推荐结果（24小时）
const cacheKey = `recommendations:${userUUID}:${birthDataHash}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const recommendations = await calculateRecommendations(birthData);
await cache.set(cacheKey, recommendations, { ttl: 86400 });
return recommendations;
```

---

## 📅 实施路线图

### Phase 1: 快速胜利 (Week 1-2)
- ✅ 添加快速问题按钮
- ✅ 优化Venus线页面（添加Top 5推荐）
- ✅ 在主页添加快速入口

**预期效果**: 立即改善用户体验，减少困惑

### Phase 2: 核心功能 (Week 3-4)
- ✅ 实现"推荐Top 5城市"功能
- ✅ 创建"Love vs Career对比"工具
- ✅ 添加地理筛选器

**预期效果**: 解决核心用户痛点，提升转化率

### Phase 3: 深度优化 (Week 5-8)
- ✅ 创建城市详情页（Top 100城市）
- ✅ 实现新手引导模式
- ✅ 添加"平衡型城市"推荐

**预期效果**: 提升用户满意度和留存率

### Phase 4: 高级功能 (Week 9-12)
- ✅ 城市对比功能
- ✅ 用户保存和历史记录
- ✅ 社交分享功能

**预期效果**: 增加用户粘性，促进口碑传播

---

## 🎯 总结

### 核心发现
1. **用户需要答案，不是工具** - 35.2%的用户直接问"我应该去哪里"
2. **爱情是最强需求** - 42.6%的用户关心爱情
3. **决策需要对比** - 7.7%的用户要求爱情vs事业对比
4. **知识门槛是障碍** - 很多用户对占星术一无所知

### 优化方向
1. **从工具到顾问** - 主动提供推荐，而不是等用户探索
2. **简化决策流程** - 提供Top 5推荐、对比工具、快速问题按钮
3. **降低知识门槛** - 新手引导、通俗解释、简单模式
4. **满足核心需求** - 优先优化爱情相关功能（Venus线、恋爱城市推荐）

### 预期效果
- **用户满意度提升**: 从当前的未知提升到4.5+/5.0
- **转化率提升**: 预计提升20-30%
- **用户留存提升**: 预计提升30-40%
- **口碑传播**: 用户更愿意推荐给朋友

---

## 📎 附录

### A. 数据导出文件
- `exports/chat-large-sample-2026-05-15T03-19-28.json` - 3000条完整聊天记录
- `exports/chat-titles-2026-05-15T03-19-28.txt` - 3000条聊天标题

### B. 分析脚本
- `scripts/export-large-sample.ts` - 大量数据导出脚本
- `scripts/export-chat-sessions.ts` - 会话元数据导出脚本
- `scripts/export-sample-chats.ts` - 样本数据导出脚本

### C. 相关文档
- 当前项目功能列表（见项目目录结构）
- 多语言配置文件（`src/i18n/pages/landing/`）
- Venus线页面（`src/app/[locale]/(default)/venus-line-astrocartography/`）

---

**报告生成日期**: 2026-05-15  
**分析师**: Kiro AI  
**数据来源**: 3000条真实用户聊天记录（2026-05-03 至 2026-05-15）

