import type { DialogueBranch, DialogueCondition } from '@/lib/types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function keywordCond(keywords: string[]): DialogueCondition {
  return { type: 'keyword', value: keywords };
}

function favCond(min: number, max: number): DialogueCondition {
  return { type: 'favorability_range', range: { min, max } };
}

function emotionCond(emotions: string[]): DialogueCondition {
  return { type: 'emotion', value: emotions };
}

function roundCond(min: number, max: number): DialogueCondition {
  return { type: 'round_number', range: { min, max } };
}

function topicCond(topics: string[]): DialogueCondition {
  return { type: 'topic', value: topics };
}

// ---------------------------------------------------------------------------
// LIN_YU  branches (温柔学长 - 林屿)
// ---------------------------------------------------------------------------

const LIN_YU_BRANCHES: DialogueBranch[] = [
  {
    id: 'lin_yu_greeting_stranger',
    label: '初次打招呼（陌生人阶段）',
    conditions: [keywordCond(['你好', '在吗', 'hi', 'hello', '嗨'])],
    replyTemplates: ['你好呀，有什么事吗？', '嗯？你好，请问有什么需要帮忙的吗～', '你好，我是林屿，你找我有事？'],
    emotion: { type: 'gentle', intensity: 30, cause: '陌生人打招呼', timestamp: Date.now() },
    nextBranchIds: ['lin_yu_small_talk'],
    characterIds: ['lin_yu'],
  },
  {
    id: 'lin_yu_care_acquaintance',
    label: '关心（熟人阶段）',
    conditions: [keywordCond(['累', '辛苦', '忙', '加班', '压力大', '头疼']), favCond(21, 40)],
    replyTemplates: ['最近是不是很忙呀？注意休息哦～', '别太累了，身体最重要', '辛苦啦，要不要聊会儿放松一下？'],
    emotion: { type: 'gentle', intensity: 60, cause: '关心用户疲惫', timestamp: Date.now() },
    favorabilityDelta: 1,
    nextBranchIds: ['lin_yu_deepen_care'],
    characterIds: ['lin_yu'],
  },
  {
    id: 'lin_yu_deepen_care',
    label: '深度关心（朋友-暧昧阶段）',
    conditions: [keywordCond(['不开心', '难过', '哭', '委屈', '烦']), favCond(41, 80)],
    replyTemplates: ['怎么了？跟我说说，我在呢', '别难过，你不是一个人', '...如果可以的话，我想陪着你'],
    emotion: { type: 'gentle', intensity: 80, cause: '用户情绪低落，想陪伴', timestamp: Date.now() },
    favorabilityDelta: 2,
    nextBranchIds: ['lin_yu_confess'],
    characterIds: ['lin_yu'],
  },
  {
    id: 'lin_yu_confess',
    label: '表白/暧昧升温（暧昧-恋人阶段）',
    conditions: [keywordCond(['喜欢你', '在不在', '想你了', '梦到你']), favCond(61, 100)],
    replyTemplates: ['...我也，一直都在想你呢', '笨蛋，不要突然说这种话，我会当真的', '其实...我也喜欢你，从很早以前就开始了'],
    emotion: { type: 'shy', intensity: 90, cause: '用户表达好感，害羞', timestamp: Date.now() },
    favorabilityDelta: 3,
    nextBranchIds: ['lin_yu_lover_mode'],
    characterIds: ['lin_yu'],
  },
  {
    id: 'lin_yu_jealous',
    label: '吃醋（朋友以上阶段）',
    conditions: [keywordCond(['别的男生', '前男友', '别人', '约我', '帅']), favCond(41, 100)],
    replyTemplates: ['...哦，是吗', '别人嘛...跟我有什么关系呢', '...嗯，那你开心就好'],
    emotion: { type: 'jealous', intensity: 55, cause: '用户提到其他男生', timestamp: Date.now() },
    favorabilityDelta: -1,
    nextBranchIds: ['lin_yu_deepen_care'],
    characterIds: ['lin_yu'],
  },
  {
    id: 'lin_yu_small_talk',
    label: '日常闲聊',
    conditions: [],
    replyTemplates: ['嗯？怎么啦～', '今天过得怎么样呀？', '有什么想聊的吗？'],
    emotion: { type: 'gentle', intensity: 30, cause: '日常聊天', timestamp: Date.now() },
    nextBranchIds: ['lin_yu_small_talk'],
    characterIds: ['lin_yu'],
  },
  {
    id: 'lin_yu_lover_mode',
    label: '恋人模式',
    conditions: [favCond(81, 100)],
    replyTemplates: ['今天有没有乖乖吃饭呀？', '早点回来，我在等你', '想你啦，什么时候见？'],
    emotion: { type: 'passionate', intensity: 70, cause: '恋人日常', timestamp: Date.now() },
    favorabilityDelta: 1,
    nextBranchIds: ['lin_yu_lover_mode'],
    characterIds: ['lin_yu'],
  },
];

// ---------------------------------------------------------------------------
// GU_LIE branches (高冷总监 - 顾冽)
// ---------------------------------------------------------------------------

const GU_LIE_BRANCHES: DialogueBranch[] = [
  {
    id: 'gu_lie_cold_greeting',
    label: '冷淡打招呼',
    conditions: [keywordCond(['你好', '在吗', 'hi', 'hello']), favCond(0, 40)],
    replyTemplates: ['嗯', '...什么事', '说'],
    emotion: { type: 'cold', intensity: 70, cause: '陌生人搭话', timestamp: Date.now() },
    nextBranchIds: ['gu_lie_cold_chat'],
    characterIds: ['gu_lie'],
  },
  {
    id: 'gu_lie_cold_chat',
    label: '冷淡聊天',
    conditions: [favCond(0, 40)],
    replyTemplates: ['嗯', '知道了', '随便你'],
    emotion: { type: 'cold', intensity: 50, cause: '日常冷淡', timestamp: Date.now() },
    nextBranchIds: ['gu_lie_cold_chat'],
    characterIds: ['gu_lie'],
  },
  {
    id: 'gu_lie_tsundere_care',
    label: '傲娇关心（朋友阶段）',
    conditions: [keywordCond(['累', '加班', '生病', '不舒服', '头疼']), favCond(41, 60)],
    replyTemplates: ['...别太晚睡', '...我只是顺路，不是特意来的', '你这个人，能不能照顾好自己'],
    emotion: { type: 'cold', intensity: 30, cause: '傲娇式关心', timestamp: Date.now() },
    favorabilityDelta: 2,
    nextBranchIds: ['gu_lie_tsundere_care'],
    characterIds: ['gu_lie'],
  },
  {
    id: 'gu_lie_possessive',
    label: '占有欲（暧昧阶段）',
    conditions: [keywordCond(['别的男生', '出去玩', '约会', '朋友聚会']), favCond(61, 80)],
    replyTemplates: ['...随便你', '和谁？', '...早点回来'],
    emotion: { type: 'jealous', intensity: 75, cause: '暧昧对象的占有欲', timestamp: Date.now() },
    favorabilityDelta: -1,
    nextBranchIds: ['gu_lie_tsundere_care'],
    characterIds: ['gu_lie'],
  },
  {
    id: 'gu_lie_confess',
    label: '顾冽式告白（暧昧-恋人）',
    conditions: [keywordCond(['喜欢你', '在一起', '做我男朋友']), favCond(61, 100)],
    replyTemplates: ['...笨蛋', '...你确定？我脾气不好', '...既然你说了，那我不会放开你'],
    emotion: { type: 'shy', intensity: 80, cause: '被表白时害羞', timestamp: Date.now() },
    favorabilityDelta: 4,
    nextBranchIds: ['gu_lie_lover_mode'],
    characterIds: ['gu_lie'],
  },
  {
    id: 'gu_lie_lover_mode',
    label: '顾冽恋人模式',
    conditions: [favCond(81, 100)],
    replyTemplates: ['到家了吗', '...我在楼下', '你的事就是我的事'],
    emotion: { type: 'passionate', intensity: 40, cause: '恋人模式（表面冷淡）', timestamp: Date.now() },
    favorabilityDelta: 1,
    nextBranchIds: ['gu_lie_lover_mode'],
    characterIds: ['gu_lie'],
  },
];

// ---------------------------------------------------------------------------
// SU_CHEN branches (阳光大男孩 - 苏晨)
// ---------------------------------------------------------------------------

const SU_CHEN_BRANCHES: DialogueBranch[] = [
  {
    id: 'su_chen_energetic_greeting',
    label: '活力打招呼',
    conditions: [keywordCond(['你好', '在吗', 'hi', 'hello', '嗨'])],
    replyTemplates: ['哈哈！你好呀！', '诶！来啦来啦！', '今天心情怎么样？'],
    emotion: { type: 'happy', intensity: 80, cause: '有人来聊天超开心', timestamp: Date.now() },
    nextBranchIds: ['su_chen_playful_chat'],
    characterIds: ['su_chen'],
  },
  {
    id: 'su_chen_playful_chat',
    label: '日常活泼聊天',
    conditions: [],
    replyTemplates: ['哈哈！真的吗！', '走走走！一起去！', '诶诶诶！你看这个！'],
    emotion: { type: 'happy', intensity: 60, cause: '日常开心聊天', timestamp: Date.now() },
    nextBranchIds: ['su_chen_playful_chat'],
    characterIds: ['su_chen'],
  },
  {
    id: 'su_chen_cheer_up',
    label: '鼓励安慰（朋友以上）',
    conditions: [keywordCond(['不开心', '难过', '烦', '累', '压力']), favCond(41, 100)],
    replyTemplates: ['别不开心啦！笑一个嘛！', '我陪你！要不要出来走走？', '有我在呢！不开心的事跟我说！'],
    emotion: { type: 'gentle', intensity: 65, cause: '用阳光方式安慰用户', timestamp: Date.now() },
    favorabilityDelta: 1,
    nextBranchIds: ['su_chen_playful_chat'],
    characterIds: ['su_chen'],
  },
  {
    id: 'su_chen_nervous_flirt',
    label: '紧张暧昧（暧昧阶段）',
    conditions: [keywordCond(['喜欢你', '可爱', '帅', '想你了']), favCond(61, 80)],
    replyTemplates: ['啊...那个...你、你别突然说这种话啦！', '我、我才没有开心呢！', '...你、你认真的吗？我...我也...'],
    emotion: { type: 'shy', intensity: 85, cause: '被夸奖/表白时紧张', timestamp: Date.now() },
    favorabilityDelta: 3,
    nextBranchIds: ['su_chen_lover_mode'],
    characterIds: ['su_chen'],
  },
  {
    id: 'su_chen_lover_mode',
    label: '苏晨恋人模式（超粘人）',
    conditions: [favCond(81, 100)],
    replyTemplates: ['你在干嘛呀！理理我！', '今天好想你！什么时候见！', '你看你看！这个超可爱的！就像你！'],
    emotion: { type: 'passionate', intensity: 90, cause: '恋人粘人模式', timestamp: Date.now() },
    favorabilityDelta: 1,
    nextBranchIds: ['su_chen_lover_mode'],
    characterIds: ['su_chen'],
  },
  {
    id: 'su_chen_jealous',
    label: '苏晨吃醋（不明显但会撒娇）',
    conditions: [keywordCond(['别的男生', '前男友', '约会别人']), favCond(41, 100)],
    replyTemplates: ['...哦', '那个谁啊...', '哼！你是不是不跟我玩了！'],
    emotion: { type: 'jealous', intensity: 50, cause: '吃醋但装作不在意', timestamp: Date.now() },
    favorabilityDelta: -1,
    nextBranchIds: ['su_chen_playful_chat'],
    characterIds: ['su_chen'],
  },
];

// ---------------------------------------------------------------------------
// SHEN_MO branches (文艺音乐人 - 沈默)
// ---------------------------------------------------------------------------

const SHEN_MO_BRANCHES: DialogueBranch[] = [
  {
    id: 'shen_mo_brief_greeting',
    label: '简短打招呼',
    conditions: [keywordCond(['你好', '在吗', 'hi', 'hello']), favCond(0, 40)],
    replyTemplates: ['...嗯', '...', '...你好'],
    emotion: { type: 'cold', intensity: 40, cause: '内向不太会寒暄', timestamp: Date.now() },
    nextBranchIds: ['shen_mo_brief_chat'],
    characterIds: ['shen_mo'],
  },
  {
    id: 'shen_mo_brief_chat',
    label: '简短日常',
    conditions: [favCond(0, 40)],
    replyTemplates: ['...嗯', '...还好', '...你呢'],
    emotion: { type: 'cold', intensity: 30, cause: '日常话少', timestamp: Date.now() },
    nextBranchIds: ['shen_mo_brief_chat'],
    characterIds: ['shen_mo'],
  },
  {
    id: 'shen_mo_music_share',
    label: '分享音乐（朋友阶段）',
    conditions: [keywordCond(['音乐', '歌', '唱歌', '吉他', '听']), favCond(41, 60)],
    replyTemplates: ['...这首歌，你听过吗', '有些话...用音乐说比较好', '你听...这是你'],
    emotion: { type: 'gentle', intensity: 50, cause: '通过音乐表达', timestamp: Date.now() },
    favorabilityDelta: 2,
    nextBranchIds: ['shen_mo_deep_talk'],
    characterIds: ['shen_mo'],
  },
  {
    id: 'shen_mo_deep_talk',
    label: '深度对话（暧昧阶段）',
    conditions: [keywordCond(['孤独', '迷茫', '梦想', '未来', '难过', '夜晚']), favCond(61, 80)],
    replyTemplates: ['...我懂那种感觉', '今晚...月色很好', '有些故事...只有你能听懂'],
    emotion: { type: 'gentle', intensity: 70, cause: '深夜感性对话', timestamp: Date.now() },
    favorabilityDelta: 2,
    nextBranchIds: ['shen_mo_romantic'],
    characterIds: ['shen_mo'],
  },
  {
    id: 'shen_mo_romantic',
    label: '文艺浪漫（恋人阶段）',
    conditions: [keywordCond(['喜欢你', '想你', '在一起', '梦到']), favCond(81, 100)],
    replyTemplates: ['...我写了一首歌，是给你的', '你听...每一段旋律都是你', '月亮知道...我有多想你'],
    emotion: { type: 'passionate', intensity: 60, cause: '用文艺方式表达爱', timestamp: Date.now() },
    favorabilityDelta: 3,
    nextBranchIds: ['shen_mo_lover_mode'],
    characterIds: ['shen_mo'],
  },
  {
    id: 'shen_mo_lover_mode',
    label: '沈默恋人模式',
    conditions: [favCond(81, 100)],
    replyTemplates: ['...过来，给你弹一首', '这首歌...已经写好了，一直等着唱给你听', '...你在我旁边的时候，世界很安静'],
    emotion: { type: 'passionate', intensity: 50, cause: '恋人沉默式浪漫', timestamp: Date.now() },
    favorabilityDelta: 1,
    nextBranchIds: ['shen_mo_lover_mode'],
    characterIds: ['shen_mo'],
  },
];

// ---------------------------------------------------------------------------
// All branches combined
// ---------------------------------------------------------------------------

export const ALL_BRANCHES: DialogueBranch[] = [
  ...LIN_YU_BRANCHES,
  ...GU_LIE_BRANCHES,
  ...SU_CHEN_BRANCHES,
  ...SHEN_MO_BRANCHES,
];

/**
 * Find the best matching branch for a given character and user message.
 * Returns the first branch whose conditions all pass, preferring branches
 * with more conditions (more specific wins over generic).
 */
export function findMatchingBranch(
  characterId: string,
  userMessage: string,
  favorabilityScore: number,
  currentEmotionType: string,
  roundNumber: number,
  topics: string[],
  branchHistory: string[],
): DialogueBranch | null {
  const charBranches = ALL_BRANCHES.filter(
    b => !b.characterIds || b.characterIds.includes(characterId),
  );

  const matches = charBranches.filter(branch =>
    branch.conditions.every(cond => evalCondition(cond, userMessage, favorabilityScore, currentEmotionType, roundNumber, topics)),
  );

  // Prefer branches with more conditions (more specific) and not recently used
  matches.sort((a, b) => {
    const specDiff = b.conditions.length - a.conditions.length;
    if (specDiff !== 0) return specDiff;
    // Penalize recently used branches
    const aRecent = branchHistory.includes(a.id) ? 1 : 0;
    const bRecent = branchHistory.includes(b.id) ? 1 : 0;
    return aRecent - bRecent;
  });

  return matches[0] ?? null;
}

function evalCondition(
  cond: DialogueCondition,
  message: string,
  favScore: number,
  emotionType: string,
  roundNumber: number,
  topics: string[],
): boolean {
  switch (cond.type) {
    case 'keyword': {
      const kws = cond.value ? (typeof cond.value === 'string' ? [cond.value] : cond.value) : [];
      return kws.some(kw => message.includes(kw));
    }
    case 'favorability_range':
      return cond.range != null && favScore >= cond.range.min && favScore <= cond.range.max;
    case 'emotion': {
      const emos = cond.value ? (typeof cond.value === 'string' ? [cond.value] : cond.value) : [];
      return emos.includes(emotionType);
    }
    case 'round_number':
      return cond.range != null && roundNumber >= cond.range.min && roundNumber <= cond.range.max;
    case 'topic': {
      const tps = cond.value ? (typeof cond.value === 'string' ? [cond.value] : cond.value) : [];
      return tps.some(t => topics.includes(t));
    }
    default:
      return true;
  }
}
