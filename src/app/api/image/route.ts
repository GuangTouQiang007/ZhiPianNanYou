import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { imageCache, hashKey } from '@/lib/cache';
import { withAuth } from '@/lib/auth/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request, _context, _userId) => {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: '缺少图像描述' }, { status: 400 });
    }

    const cacheKey = hashKey(prompt);
    const cached = imageCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, ...cached, fromCache: true });
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new ImageGenerationClient(config, customHeaders);

    const response = await client.generate({
      prompt: prompt,
      size: '2K',
      watermark: false
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls.length > 0) {
      const result = { imageUrl: helper.imageUrls[0] };
      imageCache.set(cacheKey, result);
      return NextResponse.json({ success: true, ...result });
    } else {
      return NextResponse.json({
        success: false,
        error: helper.errorMessages.join('; ') || '图像生成失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Image generation API error:', error);
    return NextResponse.json({
      success: false,
      error: '图像生成失败'
    }, { status: 500 });
  }
});
