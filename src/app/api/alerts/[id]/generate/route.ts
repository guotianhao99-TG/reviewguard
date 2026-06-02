import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewEvents, responseDrafts, magicLinks, inboundEmails, businesses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateAIDrafts } from '@/lib/ai';
import { generateDemoAlertDrafts } from '@/lib/demo-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const reviewId = resolvedParams.id;
  let token = '';
  let content = '';

  try {
    const body = await req.json();
    token = body.token || '';
    content = body.content || '';

    if (!token || !content) {
      return NextResponse.json({ error: 'Bad Request: Missing token or review content' }, { status: 400 });
    }

    // 1. Validate magic link token
    const dbLink = await db.query.magicLinks.findFirst({
      where: and(eq(magicLinks.token, token), eq(magicLinks.reviewEventId, reviewId)),
    });

    if (!dbLink) {
      return NextResponse.json({ error: 'Unauthorized: Invalid magic link token' }, { status: 404 });
    }

    if (new Date() > dbLink.expiresAt) {
      return NextResponse.json({ error: 'Forbidden: Magic link has expired' }, { status: 403 });
    }

    // 2. Fetch related review event
    const dbReview = await db.query.reviewEvents.findFirst({
      where: eq(reviewEvents.id, reviewId),
    });

    if (!dbReview) {
      return NextResponse.json({ error: 'Not Found: Review event does not exist' }, { status: 404 });
    }

    // 3. Fetch matched business for AI signature integration
    let businessName = 'Our Business';
    let ownerName = null;
    let ownerPhone = null;
    let ownerEmail = null;

    if (dbReview.inboundEmailId) {
      const dbEmail = await db.query.inboundEmails.findFirst({
        where: eq(inboundEmails.id, dbReview.inboundEmailId),
      });

      if (dbEmail?.businessId) {
        const dbBiz = await db.query.businesses.findFirst({
          where: eq(businesses.id, dbEmail.businessId),
        });

        if (dbBiz) {
          businessName = dbBiz.name;
          ownerName = dbBiz.ownerName;
          ownerPhone = dbBiz.ownerPhone;
          ownerEmail = dbBiz.ownerEmail;
        }
      }
    }

    // 4. Update the review event details in the DB
    await db
      .update(reviewEvents)
      .set({
        content,
        status: 'drafted',
      })
      .where(eq(reviewEvents.id, reviewId));

    // 5. Generate AI Response Drafts
    const generatedDrafts = await generateAIDrafts({
      reviewerName: dbReview.reviewer,
      rating: dbReview.rating,
      reviewContent: content,
      businessName,
      ownerName,
      ownerPhone,
      ownerEmail,
    });

    // 6. Write drafts to the response_drafts DB table (upsert behavior)
    const dbDraft = await db.query.responseDrafts.findFirst({
      where: eq(responseDrafts.reviewEventId, reviewId),
    });

    if (dbDraft) {
      await db
        .update(responseDrafts)
        .set({
          professionalDraft: generatedDrafts.professional,
          warmDraft: generatedDrafts.warm,
          shortDraft: generatedDrafts.short,
        })
        .where(eq(responseDrafts.id, dbDraft.id));
    } else {
      await db.insert(responseDrafts).values({
        reviewEventId: reviewId,
        professionalDraft: generatedDrafts.professional,
        warmDraft: generatedDrafts.warm,
        shortDraft: generatedDrafts.short,
      });
    }

    return NextResponse.json({
      success: true,
      drafts: generatedDrafts,
    });
  } catch (error: unknown) {
    console.error('Failed to generate drafts on demand:', error);
    const drafts = await generateDemoAlertDrafts(reviewId, token, content);

    if (drafts) {
      return NextResponse.json({ success: true, drafts, simulated: true });
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
