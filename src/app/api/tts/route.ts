import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getCharacterById } from '@/lib/characters';
import { ttsCache, hashKey } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { text, characterId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: '缺少文本内容' }, { status: 400 });
    }

    // 获取角色音色
    let voiceId = 'zh_male_m191_uranus_bigtts'; // 默认音色
    if (characterId) {
      const character = getCharacterById(characterId);
      if (character) {
        voiceId = character.voiceId;
      }
    }

    // 查缓存：相同文本+音色直接返回
    const cacheKey = hashKey(text, voiceId);
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, ...cached, fromCache: true });
    }

    // 创建TTS客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new TTSClient(config, customHeaders);

    // 生成语音
    const response = await client.synthesize({
      uid: 'virtual_boyfriend_user',
      text: text,
      speaker: voiceId,
      audioFormat: 'mp3',
      sampleRate: 24000
    });

    const result = {
      audioUrl: response.audioUri,
      audioSize: response.audioSize,
    };

    // 写入缓存
    ttsCache.set(cacheKey, result);

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ 
      success: false,
      error: '语音生成失败' 
    }, { status: 500 });
  }
}
