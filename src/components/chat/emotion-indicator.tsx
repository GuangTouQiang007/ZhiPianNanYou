'use client';

import { useState, useEffect } from 'react';
import type { EmotionType } from '@/lib/types';
import { getEmotionColors, EMOTION_ICONS, EMOTION_LABELS } from './emotion-colors';
import { cn } from '@/lib/utils';

interface EmotionIndicatorProps {
  emotion: EmotionType;
  intensity?: number;
  className?: string;
}

export function EmotionIndicator({ emotion, intensity, className }: EmotionIndicatorProps) {
  const [displayEmotion, setDisplayEmotion] = useState(emotion);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const colors = getEmotionColors(emotion);

  useEffect(() => {
    if (emotion !== displayEmotion) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayEmotion(emotion);
        setIsTransitioning(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [emotion, displayEmotion]);

  const displayColors = getEmotionColors(displayEmotion);

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300', displayColors.bg, displayColors.border, 'border', className)}>
      <span
        className={cn(
          'text-sm transition-all duration-300',
          isTransitioning ? 'opacity-0 scale-75' : 'opacity-100 scale-100',
        )}
      >
        {EMOTION_ICONS[displayEmotion]}
      </span>
      <span className={cn('text-xs font-medium transition-colors duration-300', displayColors.text)}>
        {EMOTION_LABELS[displayEmotion]}
      </span>
      {intensity !== undefined && intensity > 0 && (
        <span className={cn('text-[10px] transition-colors duration-300', displayColors.text, 'opacity-70')}>
          {intensity}
        </span>
      )}
    </div>
  );
}
