const languageNames: Record<string, string> = {
  en: '英文', zh: '中文', de: '德文', es: '西班牙文', it: '意大利文', pt: '葡萄牙文', ms: '马来文',
};

const aliases: Record<string, string> = {
  en: 'english|englisch|ingl[eêé]s|inglese|英语|英文',
  zh: 'chinese|mandarin|chinesisch|chin[eê]s|chino|cinese|中文|汉语',
  de: 'german|deutsch|alem[aã]o|alem[aá]n|tedesco|德语|德文',
  es: 'spanish|espa[nñ]ol|espanhol|spanisch|spagnolo|西班牙语|西班牙文',
  it: 'italian|italiano|italienisch|意大利语|意大利文',
  pt: 'portugu[eêé]s(?:e)?|portugiesisch|portoghese|葡萄牙语|葡萄牙文|葡语',
  ms: 'malay|bahasa melayu|马来文',
};

export function localeLanguage(locale?: string): string {
  return languageNames[(locale || 'en').toLowerCase().split(/[-_]/)[0]] || languageNames.en;
}

function requestedLanguage(text: string): string | undefined {
  const normalized = text.trim().toLowerCase();
  const requests: Array<{index:number; language:string}> = [];
  for (const [code, alias] of Object.entries(aliases)) {
    // Only explicit language requests, not a single accent or a place name.
    const bare = new RegExp(`^(?:${alias})(?:\\s+please)?[.!?。！\uFF1F]*$`, 'iu').exec(normalized);
    if (bare) requests.push({index:0,language:languageNames[code]});
    const pattern = new RegExp(`(?:\\b(?:in|into|to|auf|en|em)\\s+(?:${alias})\\b|(?:用|使用|请用)(?:${alias}))`, 'giu');
    for (const match of normalized.matchAll(pattern)) {
      const prefix = normalized.slice(0, match.index);
      if (/(?:\b(?:not|never|don't|dont|no|não|nicht)\s+(?:answer|respond|reply|write)?\s*|(?:不要|别|不用|请勿))$/iu.test(prefix)) continue;
      requests.push({index:match.index!,language:languageNames[code]});
    }
  }
  return requests.sort((a,b)=>b.index-a.index)[0]?.language;
}

function textLanguage(text: string): string | undefined {
  if (/[\u3400-\u9fff]/u.test(text)) return languageNames.zh;
  const words = text.toLowerCase().match(/[\p{L}]+/gu) || [];
  const markers: Record<string, string[]> = {
    de: ['ich','mein','meine','meiner','mich','mir','kannst','deutsch','welche','wohin','auswertung','überblick','wichtigsten','astrokartografie'],
    pt: ['eu','meu','minha','você','vocês','onde','mudar','moro','quero','português','para','sucesso','pode','cidades','não'],
    es: ['dónde','donde','debería','mudarse','mudarme','quiero','puedes','ciudades','éxito','sucede','mi','qué','español','gracias'],
    it: ['dove','vorrei','trasferirmi','quali','città','mio','mia','puoi','italiano','successo','amore','perché'],
    en: ['where','should','move','find','love','success','what','which','how','please','interpret','my','cities','compare','does','live'],
  };
  const scores = Object.entries(markers).map(([code, list]) => ({code, score: words.filter(w => list.includes(w)).length})).sort((a,b) => b.score-a.score);
  if (scores[0].score >= 2 && scores[0].score > scores[1].score) return languageNames[scores[0].code];
}

export function resolveChatLanguage(
  text: string,
  locale?: string,
  history: Array<{role: string; content: string}> = [],
): string {
  const explicit = requestedLanguage(text);
  if (explicit) return explicit;
  const detected = textLanguage(text);
  if (detected) return detected;
  // Short replies and city names inherit the conversation, not an English default.
  for (const message of [...history].reverse()) {
    if (message.role !== 'user' || message.content === text) continue;
    const previous = requestedLanguage(message.content) || textLanguage(message.content);
    if (previous) return previous;
  }
  return localeLanguage(locale);
}
