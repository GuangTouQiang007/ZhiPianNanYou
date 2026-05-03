'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CHARACTERS, Character, Message, UserMemory } from '@/lib/characters';
import { cn } from '@/lib/utils';

export default function Home() {
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [roundNumber, setRoundNumber] = useState(0);
  const [userMemory, setUserMemory] = useState<UserMemory>({});
  
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

    // 创建助手消息占位
    const assistantMessageId = generateId();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      imageLoading: false
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacter.id,
          userMessage: content.trim(),
          sessionId
        })
      });

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
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      // 生成语音
      if (assistantContent) {
        generateTTS(assistantMessageId, assistantContent, currentCharacter.id);
      }

      // 生成图片
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
  }, [currentCharacter, isLoading, sessionId]);

  // 生成TTS语音
  const generateTTS = async (messageId: string, text: string, characterId: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, characterId })
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
  };

  // 生成图片
  const generateImage = async (messageId: string, prompt: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, imageLoading: true }
        : m
    ));

    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
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
  };

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
    setMessages([]);
    setRoundNumber(0);
    setUserMemory({});
  };

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
              onClick={() => setCurrentCharacter(character)}
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
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-100">
            <img 
              src={currentCharacter.avatarUrl} 
              alt={currentCharacter.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-800">{currentCharacter.name}</div>
            <div className="text-xs text-green-500">在线</div>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2',
                  message.role === 'user'
                    ? 'bg-pink-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                
                {/* 语音播放按钮 */}
                {message.role === 'assistant' && message.audioUrl && (
                  <div className="mt-2">
                    <audio 
                      controls 
                      src={message.audioUrl}
                      className="h-8 w-full max-w-[200px]"
                    />
                  </div>
                )}
                
                {/* 图片 */}
                {message.role === 'assistant' && message.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={message.imageUrl} 
                      alt="照片" 
                      className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(message.imageUrl, '_blank')}
                    />
                  </div>
                )}
                
                {/* 图片加载中 */}
                {message.role === 'assistant' && message.imageLoading && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin" />
                    照片生成中...
                  </div>
                )}
              </div>
            </div>
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
    </div>
  );
}
