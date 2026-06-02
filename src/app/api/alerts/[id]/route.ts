import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewEvents, magicLinks, responseDrafts, inboundEmails, businesses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getDemoAlert } from '@/lib/demo-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const reviewId = resolvedParams.id;
  
  // Extract token from query parameters
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || '';

  if (!token) {
    return NextResponse.json({ error: 'Forbidden: Missing magic link access token' }, { status: 403 });
  }

  try {
    // 1. Validate magic link token
    const dbLink = await db.query.magicLinks.findFirst({
      where: and(eq(magicLinks.token, token), eq(magicLinks.reviewEventId, reviewId)),
    });

    if (!dbLink) {
      return NextResponse.json({ error: 'Unauthorized: Invalid magic link access token' }, { status: 404 });
    }

    // Check if token has expired (72 hours life limit)
    if (new Date() > dbLink.expiresAt) {
      return NextResponse.json({ error: 'Forbidden: This magic link has expired', reason: 'expired' }, { status: 403 });
    }

    // 2. Update viewed_at timestamp if first view
    if (!dbLink.viewedAt) {
      await db
        .update(magicLinks)
        .set({ viewedAt: new Date() })
        .where(eq(magicLinks.id, dbLink.id));
    }

    // 3. Fetch review event details
    const dbReview = await db.query.reviewEvents.findFirst({
      where: eq(reviewEvents.id, reviewId),
    });

    if (!dbReview) {
      return NextResponse.json({ error: 'Not Found: Review event does not exist' }, { status: 404 });
    }

    // 4. Fetch related drafts
    const dbDrafts = await db.query.responseDrafts.findFirst({
      where: eq(responseDrafts.reviewEventId, reviewId),
    });

    // 5. Fetch associated business name & GBP review URL
    let matchedBusinessName = 'Our Business';
    let matchedGbpReviewUrl = 'https://google.com/business';

    if (dbReview.inboundEmailId) {
      const dbEmail = await db.query.inboundEmails.findFirst({
        where: eq(inboundEmails.id, dbReview.inboundEmailId),
      });

      if (dbEmail?.businessId) {
        const dbBiz = await db.query.businesses.findFirst({
          where: eq(businesses.id, dbEmail.businessId),
        });

        if (dbBiz) {
          matchedBusinessName = dbBiz.name;
          matchedGbpReviewUrl = dbBiz.gbpReviewUrl;
        }
      }
    }

    // Return detailed compliant payload
    return NextResponse.json({
      reviewer: dbReview.reviewer,
      rating: dbReview.rating,
      content: dbReview.content,
      status: dbReview.status,
      businessName: matchedBusinessName,
      gbpReviewUrl: matchedGbpReviewUrl,
      drafts: dbDrafts ? {
        professional: dbDrafts.professionalDraft,
        warm: dbDrafts.warmDraft,
        short: dbDrafts.shortDraft,
      } : null,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch magic alert details:', error);
    const demoAlert = getDemoAlert(reviewId, token);

    if (demoAlert?.expired) {
      return NextResponse.json({ error: 'Forbidden: This magic link has expired', reason: 'expired' }, { status: 403 });
    }

    if (demoAlert) {
      return NextResponse.json(demoAlert);
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
