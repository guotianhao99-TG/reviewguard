import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businesses, inboundEmails, magicLinks, reviewEvents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { DemoDashboardReview, getDemoDashboardData, updateDemoBusiness } from '@/lib/demo-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const demoData = getDemoDashboardData();
  let activeBusiness = demoData.activeBusiness;
  let verificationCode: string | null = demoData.verificationCode;
  let recentReviews: DemoDashboardReview[] = demoData.recentReviews;
  const isDemoMode = false;

  try {
    // 1. Fetch business from Postgres database
    let dbBiz = await db.query.businesses.findFirst();
    
    // Seed database with a default business if empty (Concierge MVP mode)
    if (!dbBiz) {
      const [newBiz] = await db
        .insert(businesses)
        .values({
          name: demoData.activeBusiness.name,
          inboundPrefix: demoData.activeBusiness.inboundPrefix,
          gbpReviewUrl: demoData.activeBusiness.gbpReviewUrl,
          ownerEmail: demoData.activeBusiness.ownerEmail,
          ownerPhone: demoData.activeBusiness.ownerPhone,
          ownerName: demoData.activeBusiness.ownerName,
        })
        .returning();
      dbBiz = newBiz;
    }
    
    activeBusiness = {
      id: dbBiz.id,
      name: dbBiz.name,
      inboundPrefix: dbBiz.inboundPrefix,
      gbpReviewUrl: dbBiz.gbpReviewUrl,
      ownerEmail: dbBiz.ownerEmail,
      ownerPhone: dbBiz.ownerPhone || '',
      ownerName: dbBiz.ownerName || '',
    };

    // 2. Query for recently received Gmail verification emails
    const dbVerEmail = await db.query.inboundEmails.findFirst({
      where: eq(inboundEmails.status, 'gmail_verification'),
      orderBy: desc(inboundEmails.createdAt),
    });

    if (dbVerEmail) {
      const codeRegex = /\b(\d{3}-\d{3}-\d{3})\b|\b(\d{9})\b/;
      const codeMatch = dbVerEmail.rawHtml.match(codeRegex);
      verificationCode = codeMatch ? (codeMatch[1] || codeMatch[2]) : null;
    } else {
      verificationCode = null; // No code received yet in real DB
    }

    // 3. Fetch recent Google review events
    const dbReviews = await db.query.reviewEvents.findMany({
      orderBy: desc(reviewEvents.createdAt),
      limit: 10,
    });

    if (dbReviews && dbReviews.length > 0) {
      recentReviews = await Promise.all(
        dbReviews.map(async (r) => {
          const dbMagicLink = await db.query.magicLinks.findFirst({
            where: eq(magicLinks.reviewEventId, r.id),
            orderBy: desc(magicLinks.createdAt),
          });

          return {
            id: r.id,
            reviewer: r.reviewer,
            rating: r.rating,
            content: r.content || '',
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            magicLink: dbMagicLink ? `${new URL(req.url).origin}/alerts/${r.id}?token=${dbMagicLink.token}` : null,
          };
        })
      );
    } else {
      recentReviews = [];
    }
  } catch (error) {
    console.error('Failed to query Postgres database, falling back to Demo Mode:', error);
    return NextResponse.json(getDemoDashboardData());
  }

  return NextResponse.json({
    activeBusiness,
    verificationCode,
    recentReviews,
    isDemoMode,
  });
}

// POST endpoint to simulate saving business settings in Postgres
export async function POST(req: NextRequest) {
  const updatedBiz = await req.json();

  try {
    const dbBiz = await db.query.businesses.findFirst();
    if (dbBiz) {
      await db
        .update(businesses)
        .set({
          name: updatedBiz.name,
          gbpReviewUrl: updatedBiz.gbpReviewUrl,
          ownerName: updatedBiz.ownerName,
          ownerEmail: updatedBiz.ownerEmail,
          ownerPhone: updatedBiz.ownerPhone,
        })
        .where(eq(businesses.id, dbBiz.id));
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, reason: 'No business to update' }, { status: 404 });
  } catch (error: any) {
    console.warn('Postgres save settings bypassed, simulating success for local demo:', error.message);
    updateDemoBusiness(updatedBiz);
    return NextResponse.json({ success: true, simulated: true });
  }
}
