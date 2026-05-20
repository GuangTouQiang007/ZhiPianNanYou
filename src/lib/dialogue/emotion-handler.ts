import type { EmotionState, EmotionType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Emotion keyword detection
// ---------------------------------------------------------------------------

const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  happy: ['开心', '高兴', '哈哈', '幸福', '棒', '太好了', '好开心', '快乐', '可爱', '喜欢', '爱'],
  sad: ['难过', '伤心', '哭', '委屈', '想哭', '心酸', '难受', '心痛', '失去', '离开'],
  angry: ['生气', '烦', '讨厌', '气死', '受不了', '过分', '凭什么', '无语', '忍不了'],
  shy: ['喜欢你', '表白', '在不在', '想你了', '心动', '好帅', '可爱', '亲亲', '抱抱'],
  jealous: ['别的', '前男友', '前女友', '约会别人', '跟别人', '别人更好', '他和她'],
  gentle: ['累', '辛苦', '加班', '生病', '不舒服', '头疼', '忙', '压力大', '照顾自己'],
  cold: ['哦', '嗯', '随便', '无所谓', '不关你事', '不需要', '别管我'],
  passionate: ['想见你', '想念', '宝贝', '亲爱的', '抱抱', '亲亲', '在一起', '一辈子'],
  neutral: [],
};

/**
 * Detect the dominant emotion from a user message.
 * Returns the emotion type with the most keyword matches, or 'neutral'.
 */
export function detectUserEmotion(message: string): EmotionType {
  let bestType: EmotionType = 'neutral';
  let bestCount = 0;

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const count = keywords.filter(kw => message.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      bestType = emotion as EmotionType;
    }
  }

  return bestType;
}

// ---------------------------------------------------------------------------
// Emotion response mapping per character
// ---------------------------------------------------------------------------

/**
 * Given the current character state and detected user emotion, compute the
 * character's resulting emotion and intensity.
 */
export function computeCharacterEmotion(
  characterId: string,
  userEmotion: EmotionType,
  favorabilityScore: number,
  currentEmotion: EmotionState,
): EmotionState {
  // Intensity scales with favorability
  const favMultiplier = 0.5 + (favorabilityScore / 100) * 0.5; // 0.5 at 0, 1.0 at 100

  // Base mappings: user emotion -> character response emotion
  const responseMap: Record<EmotionType, { type: EmotionType; baseIntensity: number }> = {
    happy: { type: 'happy', baseIntensity: 60 },
    sad: { type: 'gentle', baseIntensity: 70 },
    angry: { type: 'cold', baseIntensity: 40 },
    shy: { type: 'shy', baseIntensity: 75 },
    jealous: { type: 'jealous', baseIntensity: 60 },
    gentle: { type: 'gentle', baseIntensity: 65 },
    cold: { type: 'sad', baseIntensity: 35 },
    passionate: { type: 'passionate', baseIntensity: 80 },
    neutral: { type: currentEmotion.type, baseIntensity: 30 },
  };

  // Character-specific overrides
  const charOverrides: Partial<Record<string, Partial<Record<EmotionType, { type: EmotionType; baseIntensity: number }>>>> = {
    gu_lie: {
      // 顾冽对大部分情感都维持冷面，只是程度不同
      sad: { type: 'gentle', baseIntensity: 30 },
      shy: { type: 'cold', baseIntensity: 25 },
      jealous: { type: 'jealous', baseIntensity: 50 },
      passionate: { type: 'shy', baseIntensity: 60 },
    },
    shen_mo: {
      // 沈默情绪内化，不会直接表达
      angry: { type: 'sad', baseIntensity: 40 },
      happy: { type: 'gentle', baseIntensity: 45 },
      passionate: { type: 'gentle', baseIntensity: 55 },
    },
    su_chen: {
      // 苏晨情感外露，强度更高
      sad: { type: 'gentle', baseIntensity: 80 },
      jealous: { type: 'sad', baseIntensity: 45 },
      angry: { type: 'sad', baseIntensity: 50 },
    },
    lin_yu: {
      // 林屿最温柔，对负面情绪有强共情
      angry: { type: 'gentle', baseIntensity: 60 },
      sad: { type: 'gentle', baseIntensity: 80 },
      jealous: { type: 'gentle', baseIntensity: 45 },
    },
  };

  const charMap = charOverrides[characterId];
  const entry = charMap?.[userEmotion] ?? responseMap[userEmotion];

  return {
    type: entry.type,
    intensity: Math.round(entry.baseIntensity * favMultiplier),
    cause: `用户情绪: ${userEmotion}`,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// System prompt augmentation
// ---------------------------------------------------------------------------

/**
 * Generate a dynamic prompt fragment describing the current emotional state
 * to be injected into the system prompt.
 */
export function generateEmotionPromptFragment(emotion: EmotionState, characterId: string): string {
  if (emotion.intensity < 20) {
    return '';
  }

  const emotionDescriptions: Record<EmotionType, string> = {
    happy: '你现在心情很好，说话带着笑意',
    sad: '你现在有些低落，话比平时更少',
    angry: '你现在有点烦躁，语气不太耐烦',
    shy: '你现在有点害羞，说话会结巴或不自在',
    jealous: '你现在有点吃醋，会阴阳怪气或冷嘲热讽',
    gentle: '你现在非常温柔体贴，想照顾对方',
    cold: '你现在很冷淡，不想多说话',
    passionate: '你现在很动情，想表达对对方的感情',
    neutral: '',
  };

  // Character-specific flavor
  const charFlavor: Record<string, string> = {
    gu_lie: '但即使有情绪，你也不会直接表达出来，而是通过行动暗示。',
    shen_mo: '你的情绪通过音乐和沉默来表达，而不是语言。',
    su_chen: '你的情绪完全写在脸上，藏不住。',
    lin_yu: '你会温柔地表达你的情绪，让对方感到安心。',
  };

  const desc = emotionDescriptions[emotion.type] ?? '';
  const flavor = charFlavor[characterId] ?? '';
  const level = emotion.intensity > 70 ? '非常强烈' : emotion.intensity > 40 ? '有些' : '略微';

  return `\n### 当前情绪状态\n${desc}，程度${level}。${flavor}`;
}

/**
 * Extract topic tags from recent messages for dialogue branch matching.
 */
export function extractTopics(messages: Array<{ role: string; content: string }>): string[] {
  const topicKeywords: Record<string, string[]> = {
    work: ['工作', '上班', '项目', '开会', '同事', '加班', '老板', 'KPI', '汇报'],
    study: ['考试', '学习', '作业', '论文', '图书馆', '课', '老师', '复习'],
    food: ['吃', '美食', '好吃', '做饭', '餐厅', '外卖', '饿', '火锅'],
    entertainment: ['电影', '游戏', '音乐', '追剧', '综艺', '动漫', '小说', '演唱会'],
    emotion_talk: ['喜欢', '讨厌', '开心', '难过', '烦', '累', '压力', '孤独', '迷茫'],
    daily: ['天气', '周末', '假期', '旅行', '睡觉', '起床', '早上', '晚安'],
    relationship: ['男朋友', '女朋友', '恋爱', '分手', '表白', '暧昧', '约会', '在一起'],
  };

  const recentText = messages.slice(-10).map(m => m.content).join(' ');
  const matched: string[] = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => recentText.includes(kw))) {
      matched.push(topic);
    }
  }

  return matched;
}
