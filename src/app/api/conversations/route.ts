import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, conversations } from '@/lib/db';
import { withAuth } from '@/lib/auth/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request, _context, userId) => {
  try {
    const { characterId } = await request.json();
    if (!characterId) {
      return NextResponse.json({ error: '缺少角色ID' }, { status: 400 });
    }

    const [conversation] = await db.insert(conversations).values({
      userId,
      characterId,
    }).returning();

    return NextResponse.json({ conversationId: conversation.id });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: '创建对话失败' }, { status: 500 });
  }
});

export const GET = withAuth(async (_request, _context, userId) => {
  try {
    const result = await db.select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(20);

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json({ error: '获取对话列表失败' }, { status: 500 });
  }
});
