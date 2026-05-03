import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getCharacterById } from '@/lib/characters';

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

    return NextResponse.json({ 
      success: true,
      audioUrl: response.audioUri,
      audioSize: response.audioSize
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ 
      success: false,
      error: '语音生成失败' 
    }, { status: 500 });
  }
}
