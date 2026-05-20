import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getCharacterById } from '@/lib/characters';
import { ttsCache, hashKey } from '@/lib/cache';
import { withAuth } from '@/lib/auth/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request, _context, _userId) => {
  try {
    const { text, characterId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: '缺少文本内容' }, { status: 400 });
    }

    let voiceId = 'zh_male_m191_uranus_bigtts';
    if (characterId) {
      const character = getCharacterById(characterId);
      if (character) {
        voiceId = character.voiceId;
      }
    }

    const cacheKey = hashKey(text, voiceId);
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, ...cached, fromCache: true });
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new TTSClient(config, customHeaders);

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

    ttsCache.set(cacheKey, result);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({
      success: false,
      error: '语音生成失败'
    }, { status: 500 });
  }
});
