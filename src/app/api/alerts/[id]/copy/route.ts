import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { magicLinks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { markDemoAlertCopied } from '@/lib/demo-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const reviewId = resolvedParams.id;
  let token = '';
  
  try {
    const body = await req.json();
    token = body.token || '';

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Update copied_at timestamp for analytics audit log
    const dbLink = await db.query.magicLinks.findFirst({
      where: and(eq(magicLinks.token, token), eq(magicLinks.reviewEventId, reviewId)),
    });

    if (dbLink) {
      if (new Date() > dbLink.expiresAt) {
        return NextResponse.json({ error: 'Forbidden: Magic link has expired' }, { status: 403 });
      }

      await db
        .update(magicLinks)
        .set({ copiedAt: new Date() })
        .where(eq(magicLinks.id, dbLink.id));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  } catch (error: unknown) {
    const copied = markDemoAlertCopied(reviewId, token);

    if (copied) {
      return NextResponse.json({ success: true, simulated: true });
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
