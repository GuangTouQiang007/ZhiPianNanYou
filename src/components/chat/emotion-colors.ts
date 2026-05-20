import type { EmotionType } from '@/lib/types';

const EMOTION_COLOR_MAP: Record<EmotionType, { bg: string; border: string; text: string; glow: string; ring: string }> = {
  happy: {
    bg: 'bg-yellow-50/80 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-700/40',
    text: 'text-yellow-700 dark:text-yellow-300',
    glow: 'shadow-yellow-200/50 dark:shadow-yellow-500/20',
    ring: 'ring-yellow-300 dark:ring-yellow-600',
  },
  sad: {
    bg: 'bg-blue-50/80 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700/40',
    text: 'text-blue-700 dark:text-blue-300',
    glow: 'shadow-blue-200/50 dark:shadow-blue-500/20',
    ring: 'ring-blue-300 dark:ring-blue-600',
  },
  angry: {
    bg: 'bg-red-50/80 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700/40',
    text: 'text-red-700 dark:text-red-300',
    glow: 'shadow-red-200/50 dark:shadow-red-500/20',
    ring: 'ring-red-300 dark:ring-red-600',
  },
  shy: {
    bg: 'bg-pink-50/80 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-700/40',
    text: 'text-pink-700 dark:text-pink-300',
    glow: 'shadow-pink-200/50 dark:shadow-pink-500/20',
    ring: 'ring-pink-300 dark:ring-pink-600',
  },
  jealous: {
    bg: 'bg-purple-50/80 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-700/40',
    text: 'text-purple-700 dark:text-purple-300',
    glow: 'shadow-purple-200/50 dark:shadow-purple-500/20',
    ring: 'ring-purple-300 dark:ring-purple-600',
  },
  gentle: {
    bg: 'bg-green-50/80 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700/40',
    text: 'text-green-700 dark:text-green-300',
    glow: 'shadow-green-200/50 dark:shadow-green-500/20',
    ring: 'ring-green-300 dark:ring-green-600',
  },
  cold: {
    bg: 'bg-slate-50/80 dark:bg-slate-800/30',
    border: 'border-slate-200 dark:border-slate-600/40',
    text: 'text-slate-600 dark:text-slate-400',
    glow: 'shadow-slate-200/50 dark:shadow-slate-500/20',
    ring: 'ring-slate-300 dark:ring-slate-500',
  },
  passionate: {
    bg: 'bg-orange-50/80 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-700/40',
    text: 'text-orange-700 dark:text-orange-300',
    glow: 'shadow-orange-200/50 dark:shadow-orange-500/20',
    ring: 'ring-orange-300 dark:ring-orange-600',
  },
  neutral: {
    bg: 'bg-gray-50/80 dark:bg-gray-800/20',
    border: 'border-gray-200 dark:border-gray-700/40',
    text: 'text-gray-500 dark:text-gray-400',
    glow: 'shadow-gray-200/50 dark:shadow-gray-500/20',
    ring: 'ring-gray-300 dark:ring-gray-600',
  },
};

export function getEmotionColors(emotion: EmotionType) {
  return EMOTION_COLOR_MAP[emotion] ?? EMOTION_COLOR_MAP.neutral;
}

export const EMOTION_ICONS: Record<EmotionType, string> = {
  happy: '\u{1F60A}',
  sad: '\u{1F622}',
  angry: '\u{1F621}',
  shy: '\u{1F60A}',
  jealous: '\u{1F624}',
  gentle: '\u{1F60C}',
  cold: '\u{1F9CA}',
  passionate: '\u{2764}\u{FE0F}',
  neutral: '\u{25CB}',
};

export const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '开心',
  sad: '难过',
  angry: '生气',
  shy: '害羞',
  jealous: '吃醋',
  gentle: '温柔',
  cold: '冷漠',
  passionate: '热烈',
  neutral: '平静',
};
