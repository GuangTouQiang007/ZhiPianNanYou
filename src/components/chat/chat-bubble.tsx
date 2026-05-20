'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '@/lib/characters';
import type { EmotionType } from '@/lib/types';
import { getEmotionColors } from './emotion-colors';
import { CharacterAvatar } from './character-avatar';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: Message;
  characterAvatarUrl?: string;
  characterName?: string;
  emotion?: EmotionType;
  isStreaming?: boolean;
  /** typing speed in ms per character, 0 = instant */
  typingSpeed?: number;
  onAudioClick?: (audioUrl: string) => void;
  onImageClick?: (imageUrl: string) => void;
  className?: string;
}

export function ChatBubble({
  message,
  characterAvatarUrl,
  characterName,
  emotion,
  isStreaming = false,
  typingSpeed = 30,
  onAudioClick,
  onImageClick,
  className,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [displayedContent, setDisplayedContent] = useState(isUser ? message.content : '');
  const [isTypingDone, setIsTypingDone] = useState(isUser || !message.content);
  const prevContentRef = useRef(message.content);
  const targetContentRef = useRef(message.content);
  const isTypingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emotionColors = emotion ? getEmotionColors(emotion) : null;

  // Update target when content changes from streaming
  useEffect(() => {
    if (isUser) {
      setDisplayedContent(message.content);
      setIsTypingDone(true);
      return;
    }

    targetContentRef.current = message.content;

    if (typingSpeed <= 0 || !message.content) {
      setDisplayedContent(message.content);
      setIsTypingDone(true);
      prevContentRef.current = message.content;
      return;
    }

    // If streaming is active, show content directly (typewriter only on completion)
    if (isStreaming) {
      setDisplayedContent(message.content);
      setIsTypingDone(false);
      prevContentRef.current = message.content;
      return;
    }

    // Typewriter effect when streaming finishes
    const prevLen = prevContentRef.current.length;
    const newLen = message.content.length;
    const hasNewContent = newLen > prevLen;

    if (hasNewContent && !isTypingRef.current) {
      isTypingRef.current = true;
      setDisplayedContent(prevContentRef.current);
      setIsTypingDone(false);

      let idx = prevLen;
      const type = () => {
        if (idx >= targetContentRef.current.length) {
          setDisplayedContent(targetContentRef.current);
          setIsTypingDone(true);
          isTypingRef.current = false;
          prevContentRef.current = targetContentRef.current;
          return;
        }
        // Type multiple characters to catch up without being too slow
        const chunk = Math.max(1, Math.floor((targetContentRef.current.length - prevLen) / 40));
        idx = Math.min(idx + chunk, targetContentRef.current.length);
        setDisplayedContent(targetContentRef.current.slice(0, idx));
        timerRef.current = setTimeout(type, typingSpeed);
      };
      type();
    } else if (!hasNewContent) {
      prevContentRef.current = message.content;
    }
  }, [message.content, isUser, isStreaming, typingSpeed]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showCursor = !isTypingDone && !isUser;

  const bubbleClass = isUser
    ? 'bg-pink-500 text-white rounded-br-sm'
    : emotionColors
      ? cn('border', emotionColors.bg, emotionColors.border, 'rounded-bl-sm shadow-sm')
      : 'bg-white text-gray-800 rounded-bl-sm shadow-sm dark:bg-gray-800 dark:text-gray-200';

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start', className)}>
      {/* Character avatar */}
      {!isUser && characterAvatarUrl && (
        <CharacterAvatar
          avatarUrl={characterAvatarUrl}
          name={characterName ?? ''}
          emotion={emotion ?? 'neutral'}
          size="sm"
          className="mt-1"
        />
      )}

      <div className="max-w-[80%] flex flex-col">
        <div className={cn('rounded-2xl px-4 py-2.5', bubbleClass)}>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {displayedContent}
            {showCursor && <span className="inline-block w-[2px] h-4 ml-0.5 bg-current align-text-bottom animate-pulse" />}
          </p>
        </div>

        {/* Audio */}
        {message.role === 'assistant' && message.audioUrl && isTypingDone && (
          <button
            onClick={() => onAudioClick?.(message.audioUrl!)}
            className="mt-1.5 ml-1 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-pink-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18V6l-4 4H4v4h4l4 4z" />
            </svg>
            语音消息
          </button>
        )}

        {/* Image loading */}
        {message.role === 'assistant' && message.imageLoading && isTypingDone && (
          <div className="mt-2 ml-1 flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
            照片生成中...
          </div>
        )}

        {/* Image */}
        {message.role === 'assistant' && message.imageUrl && isTypingDone && (
          <button
            onClick={() => onImageClick?.(message.imageUrl!)}
            className="mt-2 ml-1 group relative rounded-xl overflow-hidden max-w-[200px] cursor-pointer"
          >
            <img
              src={message.imageUrl}
              alt="照片"
              className="w-full rounded-xl object-cover transition-opacity group-hover:opacity-90"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl">
              <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-70 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
