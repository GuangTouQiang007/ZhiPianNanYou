'use client';

import type { EmotionType } from '@/lib/types';
import { getEmotionColors } from './emotion-colors';
import { cn } from '@/lib/utils';

interface CharacterAvatarProps {
  avatarUrl: string;
  name: string;
  emotion?: EmotionType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 ring-1',
  md: 'w-10 h-10 ring-2',
  lg: 'w-14 h-14 ring-2',
};

export function CharacterAvatar({ avatarUrl, name, emotion = 'neutral', size = 'md', className }: CharacterAvatarProps) {
  const colors = getEmotionColors(emotion);

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden transition-all duration-500',
          SIZE_MAP[size],
          colors.ring,
        )}
      >
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      {/* Emotion glow */}
      <div
        className={cn(
          'absolute inset-0 rounded-full transition-all duration-500 pointer-events-none animate-[pulse_3s_ease-in-out_infinite]',
          `shadow-[0_0_8px_2px_var(--tw-shadow-color)]`,
          emotion === 'happy' && 'shadow-yellow-300/60 dark:shadow-yellow-500/40',
          emotion === 'sad' && 'shadow-blue-300/60 dark:shadow-blue-500/40',
          emotion === 'angry' && 'shadow-red-300/60 dark:shadow-red-500/40',
          emotion === 'shy' && 'shadow-pink-300/60 dark:shadow-pink-500/40',
          emotion === 'jealous' && 'shadow-purple-300/60 dark:shadow-purple-500/40',
          emotion === 'gentle' && 'shadow-green-300/60 dark:shadow-green-500/40',
          emotion === 'cold' && 'shadow-slate-300/40 dark:shadow-slate-500/30',
          emotion === 'passionate' && 'shadow-orange-300/60 dark:shadow-orange-500/40',
          emotion === 'neutral' && 'shadow-transparent',
        )}
        style={{
          animationDuration: emotion === 'neutral' ? '0s' : '3s',
        }}
      />
    </div>
  );
}
