'use client';

import { cn } from '@/lib/utils';
import { FAVORABILITY_LEVELS, type FavorabilityLevel } from '@/lib/favorability';

interface FavorabilityDisplayProps {
  score: number;
  level?: FavorabilityLevel;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

const LEVEL_STYLES: Record<string, { bar: string; text: string; bg: string }> = {
  '陌生人': { bar: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  '熟人': { bar: 'bg-blue-400', text: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  '朋友': { bar: 'bg-green-400', text: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  '暧昧': { bar: 'bg-pink-400', text: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  '恋人': { bar: 'bg-gradient-to-r from-pink-400 to-rose-500', text: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
};

function resolveLevel(score: number, level?: FavorabilityLevel): FavorabilityLevel {
  if (level) return level;
  return FAVORABILITY_LEVELS.find(l => score >= l.min && score <= l.max) ?? FAVORABILITY_LEVELS[0];
}

export function FavorabilityDisplay({ score, level, showLabel = true, compact = false, className }: FavorabilityDisplayProps) {
  const resolved = resolveLevel(score, level);
  const styles = LEVEL_STYLES[resolved.name] ?? LEVEL_STYLES['陌生人'];

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className={cn('text-[10px] font-medium', styles.text)}>{resolved.name}</span>
        <div className="w-12 h-1 rounded-full overflow-hidden bg-gray-200/60 dark:bg-gray-700/40">
          <div
            className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400 tabular-nums">{score}</span>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className={cn('text-xs font-medium', styles.text)}>{resolved.name}</span>
          <span className="text-xs text-gray-400 tabular-nums">{score}/100</span>
        </div>
      )}
      <div className="relative h-2 rounded-full overflow-hidden bg-gray-200/60 dark:bg-gray-700/40">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', styles.bar)}
          style={{ width: `${score}%` }}
        />
      </div>
      {/* Level markers */}
      <div className="flex justify-between mt-1 px-px">
        {FAVORABILITY_LEVELS.map(l => {
          const lStyles = LEVEL_STYLES[l.name] ?? LEVEL_STYLES['陌生人'];
          const isActive = score >= l.min;
          return (
            <span
              key={l.name}
              className={cn(
                'text-[9px] transition-colors duration-300',
                isActive ? lStyles.text : 'text-gray-300 dark:text-gray-600',
              )}
            >
              {l.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
