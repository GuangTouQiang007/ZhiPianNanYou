'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CHARACTERS, Character, Message, UserMemory } from '@/lib/characters';
import { useAuth } from '@/lib/auth/auth-context';
import { getBrowserClient } from '@/lib/supabase/client';
import { AuthForm } from '@/components/auth/auth-form';
import { SettingsSheet } from '@/components/settings-sheet';
import { toast } from 'sonner';
import type { EmotionType } from '@/lib/types';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { CharacterAvatar } from '@/components/chat/character-avatar';
import { FavorabilityDisplay } from '@/components/chat/favorability-display';
import { EmotionIndicator } from '@/components/chat/emotion-indicator';

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [userMemory, setUserMemory] = useState<UserMemory>({});
  const [favorability, setFavorability] = useState<{ score: number; level: { name: string; min: number; max: number } } | null>(null);
  const [allFavorabilities, setAllFavorabilities] = useState<Record<string, { score: number; level: { name: string } }>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ displayName: string; avatarUrl: string } | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 选择角色后聚焦输入框
  useEffect(() => {
    if (currentCharacter) {
      inputRef.current?.focus();
    }
  }, [currentCharacter]);

  // 生成唯一ID
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 获取带认证的请求头
  const getAuthHeaders = useCallback(async () => {
    const supabase = getBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }, []);

  // 加载所有角色的好感度
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/favorability', { headers });
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, any> = {};
          for (const f of data.favorabilities ?? []) {
            map[f.characterId] = f;
          }
          setAllFavorabilities(map);
        }
      } catch {}
    })();
  }, [user, getAuthHeaders]);

  // 选择角色并创建对话
  const selectCharacter = useCallback(async (character: Character) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ characterId: character.id }),
      });

      if (!response.ok) throw new Error('创建对话失败');
      const data = await response.json();

      setCurrentCharacter(character);
      setConversationId(data.conversationId);
      setMessages([]);
      setRoundNumber(0);
      setUserMemory({});
      setCurrentEmotion('neutral');

      // 获取好感度
      try {
        const favRes = await fetch(`/api/favorability?characterId=${character.id}`, { headers });
        if (favRes.ok) {
          const favData = await favRes.json();
          setFavorability({ score: favData.score, level: favData.level });
        } else {
          setFavorability(null);
        }
      } catch {
        setFavorability(null);
      }
    } catch (error) {
      console.error('选择角色失败:', error);
    }
  }, [getAuthHeaders]);

  // 生成TTS语音
  const generateTTS = useCallback(async (messageId: string, text: string, charId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, characterId: charId, messageId })
      });

      const data = await response.json();

      if (data.success && data.audioUrl) {
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? { ...m, audioUrl: data.audioUrl }
            : m
        ));
      }
    } catch (error) {
      console.error('TTS生成失败:', error);
    }
  }, [getAuthHeaders]);

  // 生成图片
  const generateImage = useCallback(async (messageId: string, prompt: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, imageLoading: true }
        : m
    ));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/image', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, messageId })
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? { ...m, imageUrl: data.imageUrl, imageLoading: false }
            : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? { ...m, imageLoading: false }
            : m
        ));
      }
    } catch (error) {
      console.error('图片生成失败:', error);
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, imageLoading: false }
          : m
      ));
    }
  }, [getAuthHeaders]);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !currentCharacter || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const assistantMessageId = generateId();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      imageLoading: false
    }]);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          characterId: currentCharacter.id,
          userMessage: content.trim(),
          conversationId
        })
      });

      if (response.status === 401) {
        signOut();
        return;
      }

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let hasImage = false;
      let imagePrompt = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text') {
                assistantContent += data.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantContent }
                    : m
                ));
              } else if (data.type === 'done') {
                assistantContent = data.content;
                hasImage = data.hasImage;
                imagePrompt = data.imagePrompt;

                setMessages(prev => prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantContent }
                    : m
                ));
                setRoundNumber(prev => prev + 1);

                // 更新好感度
                if (data.favorability) {
                  setFavorability({
                    score: data.favorability.score,
                    level: data.favorability.level,
                  });
                  if (data.favorability.levelChanged) {
                    toast(`关系升级！现在是：${data.favorability.level.name}`, {
                      icon: '💖',
                      duration: 4000,
                    });
                  }
                }
                // 更新情绪状态
                if (data.emotion) {
                  setCurrentEmotion(data.emotion);
                }
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      if (assistantContent) {
        generateTTS(assistantMessageId, assistantContent, currentCharacter.id);
      }

      if (hasImage && imagePrompt) {
        generateImage(assistantMessageId, imagePrompt);
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: '抱歉，网络好像不太好，再说一次好吗？' }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [currentCharacter, isLoading, conversationId, signOut, getAuthHeaders, generateTTS, generateImage]);

  // 处理回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // 返回角色选择
  const handleBack = () => {
    setCurrentCharacter(null);
    setConversationId(null);
    setMessages([]);
    setRoundNumber(0);
    setUserMemory({});
    setFavorability(null);
    setCurrentEmotion('neutral');
  };

  // 处理个人资料更新
  const handleProfileUpdate = (updated: { displayName: string; avatarUrl: string }) => {
    setUserProfile(updated);
  };

  // Auth gates — after all hooks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // 角色选择页面
  if (!currentCharacter) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">虚拟男友</h1>
          <p className="text-gray-500">选择一个他，开始聊天吧</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {CHARACTERS.map(character => (
            <button
              key={character.id}
              onClick={() => selectCharacter(character)}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-105 text-left group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-pink-100">
                  <img
                    src={character.avatarUrl}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-semibold text-gray-800 group-hover:text-pink-600 transition-colors">
                    {character.name}
                  </div>
                  <div className="text-sm text-gray-400">{character.title}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {character.traits.slice(0, 3).map(trait => (
                  <span
                    key={trait}
                    className="text-xs px-2 py-1 rounded-full bg-pink-50 text-pink-600"
                  >
                    {trait}
                  </span>
                ))}
              </div>
              {allFavorabilities[character.id] && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-pink-50">
                  <span className="text-xs text-pink-400">{allFavorabilities[character.id].level.name}</span>
                  <div className="flex-1 h-1 bg-pink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-300 to-pink-400"
                      style={{ width: `${allFavorabilities[character.id].score}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 聊天界面
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <CharacterAvatar
            avatarUrl={currentCharacter.avatarUrl}
            name={currentCharacter.name}
            emotion={currentEmotion}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">{currentCharacter.name}</span>
              <EmotionIndicator emotion={currentEmotion} />
            </div>
            <FavorabilityDisplay
              score={favorability?.score ?? 0}
              level={favorability?.level as any}
              compact
              className="mt-0.5"
            />
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            title="设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {messages.map(message => (
            <ChatBubble
              key={message.id}
              message={message}
              characterAvatarUrl={currentCharacter.avatarUrl}
              characterName={currentCharacter.name}
              emotion={message.role === 'assistant' ? currentEmotion : undefined}
              isStreaming={isLoading && message.role === 'assistant' && message.id === messages[messages.length - 1]?.id}
              onAudioClick={(url) => {
                const audio = new Audio(url);
                audio.play().catch(() => {});
              }}
              onImageClick={(url) => window.open(url, '_blank')}
            />
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t sticky bottom-0">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说点什么..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}
