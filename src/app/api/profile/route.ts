import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, profiles } from '@/lib/db';
import { withAuth } from '@/lib/auth/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, _context, userId) => {
  try {
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: '获取资料失败' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, _context, userId) => {
  try {
    const body = await request.json();
    const updates: Record<string, string> = {};

    if (typeof body.displayName === 'string') updates.display_name = body.displayName;
    if (typeof body.favoriteCharacterId === 'string') updates.favorite_character_id = body.favoriteCharacterId;
    if (typeof body.avatarUrl === 'string') updates.avatar_url = body.avatarUrl;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    await db.update(profiles)
      .set(updates)
      .where(eq(profiles.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: '更新资料失败' }, { status: 500 });
  }
});
