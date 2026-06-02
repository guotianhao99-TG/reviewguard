import { after, NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businesses, inboundEmails, reviewEvents, responseDrafts, magicLinks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseInboundEmail } from '@/lib/parser';
import { generateAIDrafts } from '@/lib/ai';
import { createPendingAlertDelivery, sendPendingReviewAlertEmail, sendReviewAlertEmail } from '@/lib/email';
import { getDemoDashboardData, recordDemoGmailVerification, recordDemoReview } from '@/lib/demo-store';
import crypto from 'crypto';

const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET ||
  process.env.REVIEWGUARD_WEBHOOK_SECRET ||
  process.env.X_REVIEWGUARD_WEBHOOK_SECRET ||
  'rg_inbound_secret_demo';

export const dynamic = 'force-dynamic';

type Business = typeof businesses.$inferSelect;

async function getOrCreateMatchedBusiness(toAddress: string): Promise<Business | undefined> {
  let matchedBusiness: Business | undefined;
  const toMatch = toAddress.match(/(?:forward-|incoming\+)([^@\s]+)@/i);

  if (toMatch) {
    const prefix = toMatch[1].toLowerCase();
    matchedBusiness =
      (await db.query.businesses.findFirst({
        where: eq(businesses.inboundPrefix, prefix),
      })) || undefined;
  }

  matchedBusiness = matchedBusiness || (await db.query.businesses.findFirst()) || undefined;

  if (!matchedBusiness) {
    const demoBusiness = getDemoDashboardData().activeBusiness;
    const [createdBusiness] = await db
      .insert(businesses)
      .values({
        name: demoBusiness.name,
        inboundPrefix: demoBusiness.inboundPrefix,
        gbpReviewUrl: demoBusiness.gbpReviewUrl,
        ownerEmail: demoBusiness.ownerEmail,
        ownerPhone: demoBusiness.ownerPhone,
        ownerName: demoBusiness.ownerName,
      })
      .returning();
    matchedBusiness = createdBusiness;
  }

  return matchedBusiness;
}

function extractPayloadField(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}

export async function POST(req: NextRequest) {
  // 1. Webhook Secret Verification in Request Header (secure & out of logs)
  const incomingSecret = req.headers.get('X-ReviewGuard-Webhook-Secret');
  if (incomingSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized: Invalid secret header' }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>;

    // Standard fields from Postmark Inbound Webhook payload
    const rawMessageId = extractPayloadField(payload, [
      'MessageID',
      'Message-Id',
      'Message-ID',
      'messageId',
      'message_id',
    ]);
    const toAddress = extractPayloadField(payload, ['To', 'to', 'DeliveredTo', 'delivered_to']);
    const subject = extractPayloadField(payload, ['Subject', 'subject']);
    const htmlBody = extractPayloadField(payload, ['HtmlBody', 'htmlBody', 'html', 'TextBody', 'text', 'raw_html']);

    if (!rawMessageId) {
      return NextResponse.json({ error: 'Bad Request: Missing unique MessageID/messageId' }, { status: 400 });
    }

    const messageId = String(rawMessageId).trim();

    // Try DB operations, fallback to simulator mock mode if it fails (no DATABASE_URL set)
    try {
      // 2. Webhook Idempotency Check: Prevent duplicate webhook invocations
      const existingEmail = await db.query.inboundEmails.findFirst({
        where: eq(inboundEmails.messageId, messageId),
      });

      if (existingEmail) {
        console.log(`[Idempotency Block] Already processed inbound email with MessageID: ${messageId}`);
        return NextResponse.json({ message: 'Duplicate blocked', id: existingEmail.id }, { status: 200 });
      }

      // 3. Match Business by Inbound Email Prefix in the To address
      const matchedBusiness = await getOrCreateMatchedBusiness(toAddress);

      // 4. Parse the email contents
      const parseResult = parseInboundEmail(subject, htmlBody);

      if (parseResult.type === 'gmail_verification') {
        const [insertedInbound] = await db
          .insert(inboundEmails)
          .values({
            messageId,
            businessId: matchedBusiness?.id || null,
            subject,
            rawHtml: htmlBody,
            confidenceScore: parseResult.confidence_score,
            status: 'gmail_verification',
          })
          .returning();

        return NextResponse.json({
          message: 'Gmail forwarding verification parsed successfully',
          id: insertedInbound.id,
          code: parseResult.data.confirmationCode,
          confirmationUrl: parseResult.data.confirmationUrl,
        });
      }

      if (parseResult.type === 'google_review') {
        const review = parseResult.data;
        const isHighConfidence = parseResult.confidence_score >= 0.85;

        // A. Write to inbound_emails
        const [insertedInbound] = await db
          .insert(inboundEmails)
          .values({
            messageId,
            businessId: matchedBusiness?.id || null,
            subject,
            rawHtml: htmlBody,
            confidenceScore: parseResult.confidence_score,
            status: isHighConfidence ? 'parsed' : 'needs_text',
          })
          .returning();

        // B. Create Review Event
        const [insertedReview] = await db
          .insert(reviewEvents)
          .values({
            inboundEmailId: insertedInbound.id,
            reviewer: review.reviewer,
            rating: review.rating,
            content: review.content,
            status: isHighConfidence ? 'drafted' : 'needs_text',
          })
          .returning();

        // C. Generate AI drafts
        if (isHighConfidence) {
          try {
            const drafts = await generateAIDrafts({
              reviewerName: review.reviewer,
              rating: review.rating,
              reviewContent: review.content,
              businessName: matchedBusiness?.name || review.businessName || 'Our Business',
              ownerName: matchedBusiness?.ownerName,
              ownerPhone: matchedBusiness?.ownerPhone,
              ownerEmail: matchedBusiness?.ownerEmail,
            });

            await db.insert(responseDrafts).values({
              reviewEventId: insertedReview.id,
              professionalDraft: drafts.professional,
              warmDraft: drafts.warm,
              shortDraft: drafts.short,
            });
          } catch (aiError) {
            console.error('Failed to generate and store AI drafts:', aiError);
            await db
              .update(reviewEvents)
              .set({ status: 'needs_text' })
              .where(eq(reviewEvents.id, insertedReview.id));
          }
        }

        // D. Magic Link
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        await db.insert(magicLinks).values({
          token,
          reviewEventId: insertedReview.id,
          expiresAt,
        });

        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.nextUrl.protocol || 'http:';
        const magicLinkUrl = `${protocol}//${host}/alerts/${insertedReview.id}?token=${token}`;

        if (matchedBusiness?.ownerEmail) {
          const emailParams = {
            reviewEventId: insertedReview.id,
            recipientEmail: matchedBusiness.ownerEmail,
            reviewerName: review.reviewer,
            rating: review.rating,
            content: review.content,
            magicLinkUrl,
            isHighConfidence,
            businessName: matchedBusiness.name,
            ownerName: matchedBusiness.ownerName,
          };
          const delivery = await createPendingAlertDelivery(emailParams);

          after(async () => {
            await sendPendingReviewAlertEmail(delivery.id, emailParams);
          });
        }

        return NextResponse.json({
          message: 'Google review webhook processed successfully',
          reviewId: insertedReview.id,
          confidence: parseResult.confidence_score,
          magicLink: magicLinkUrl,
          emailQueued: Boolean(matchedBusiness?.ownerEmail),
        });
      }

      // Default failed fallback
      const [insertedFailed] = await db
        .insert(inboundEmails)
        .values({
          messageId,
          businessId: matchedBusiness?.id || null,
          subject,
          rawHtml: htmlBody,
          confidenceScore: 0.0,
          status: 'failed',
          errorMessage: parseResult.error,
        })
        .returning();

      return NextResponse.json({
          message: 'Unknown email format received',
          id: insertedFailed.id,
        error: parseResult.error,
      });

    } catch (dbError: any) {
      console.warn('⚠️ Webhook database write failed, switching to sandboxed mock execution:', dbError.message);
      
      const parseResult = parseInboundEmail(subject, htmlBody);

      if (parseResult.type === 'gmail_verification') {
        const verification = recordDemoGmailVerification({
          code: parseResult.data.confirmationCode,
          confirmationUrl: parseResult.data.confirmationUrl,
          subject,
          rawHtml: htmlBody,
        });

        return NextResponse.json({
          message: 'Gmail forwarding verification parsed successfully [SANDBOXED MOCK]',
          id: verification.id,
          code: verification.code,
          simulated: true,
        });
      }

      if (parseResult.type === 'google_review') {
        const review = parseResult.data;
        const isHighConfidence = parseResult.confidence_score >= 0.85;
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.nextUrl.protocol || 'http:';
        const { review: demoReview, token } = await recordDemoReview({
          reviewer: review.reviewer,
          rating: review.rating,
          content: review.content,
          status: isHighConfidence ? 'drafted' : 'needs_text',
          businessName: review.businessName,
          gbpReviewUrl: review.reviewUrl,
        });
        const magicLinkUrl = `${protocol}//${host}/alerts/${demoReview.id}?token=${token}`;

        // Simulate alert email in server console
        await sendReviewAlertEmail({
          reviewEventId: demoReview.id,
          recipientEmail: 'owner@coolairhvac.com',
          reviewerName: review.reviewer,
          rating: review.rating,
          content: review.content,
          magicLinkUrl,
          isHighConfidence,
          businessName: 'CoolAir Heating & Cooling',
        });

        return NextResponse.json({
          message: 'Google review processed successfully [SANDBOXED MOCK]',
          reviewId: demoReview.id,
          confidence: parseResult.confidence_score,
          magicLink: magicLinkUrl,
          simulated: true,
        });
      }

      return NextResponse.json({
        message: 'Unknown email format received [SANDBOXED MOCK]',
        error: parseResult.error || 'Parsing exception',
        simulated: true,
      });
    }

  } catch (error: any) {
    console.error('Fatal Inbound Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
