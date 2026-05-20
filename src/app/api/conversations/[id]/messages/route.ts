import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, messages, conversations } from '@/lib/db';
import { withAuth } from '@/lib/auth/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, context, userId) => {
  try {
    const { id } = await context.params;

    const [conv] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!conv || conv.userId !== userId) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const msgs = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    return NextResponse.json({ messages: msgs.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: '获取消息失败' }, { status: 500 });
  }
});
