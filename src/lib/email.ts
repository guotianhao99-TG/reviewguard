import { Resend } from 'resend';
import { db } from '@/lib/db';
import { alertDeliveries } from '@/db/schema';
import { eq } from 'drizzle-orm';

let resend: Resend | null | undefined;

function getResend() {
  if (resend !== undefined) {
    return resend;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn(
      'RESEND_API_KEY is not set. ReviewGuard will print magic alert notification emails to the server console.'
    );
    resend = null;
  } else {
    resend = new Resend(resendApiKey);
  }

  return resend;
}

interface SendAlertParams {
  reviewEventId: string;
  recipientEmail: string;
  reviewerName: string;
  rating: number;
  content: string | null;
  magicLinkUrl: string;
  isHighConfidence: boolean;
  businessName: string;
  ownerName?: string | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAlertEmail(params: SendAlertParams) {
  const {
    reviewerName,
    rating,
    content,
    magicLinkUrl,
    isHighConfidence,
    ownerName,
  } = params;
  const ownerDisplayName = ownerName || 'there';
  const safeOwnerName = escapeHtml(ownerDisplayName);
  const safeReviewerName = escapeHtml(reviewerName);
  const safeContent = escapeHtml(content || 'No review text provided.');
  const safeMagicLinkUrl = escapeHtml(magicLinkUrl);

  if (isHighConfidence) {
    const subject = `⚠️ New ${rating}-star Google review - Reply draft ready`;
    const text = `Dear ${ownerDisplayName},

A new review just arrived on your Google Business Profile.

📱 Reviewer: ${reviewerName}
⭐ Rating: ${rating} stars
📝 Review: "${content || 'No review text provided.'}"

✅ We've prepared 3 professional reply drafts for you.
Click the link below to view and copy your reply:
${magicLinkUrl}

⏱️ This link expires in 72 hours.

ReviewGuard © 2024`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
        <p>Dear ${safeOwnerName},</p>
        <p>A new review just arrived on your Google Business Profile.</p>
        <p>📱 <strong>Reviewer:</strong> ${safeReviewerName}<br/>
        ⭐ <strong>Rating:</strong> ${rating} stars<br/>
        📝 <strong>Review:</strong> "${safeContent}"</p>
        <p>✅ We've prepared 3 professional reply drafts for you.</p>
        <p><a href="${safeMagicLinkUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700;margin-top:8px;margin-bottom:8px;">View and copy your reply</a></p>
        <p style="color:#6b7280; font-size: 14px;">⏱️ This link expires in 72 hours.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color:#9ca3af; font-size: 12px;">ReviewGuard &copy; 2024</p>
      </div>
    `;

    return { subject, text, html };
  }

  const subject = '⚠️ Possible Google review notification - Action needed';
  const text = `Dear ${ownerDisplayName},

A Google review notification arrived, but Google hid the review text from the email!

⚠️ Action Required: We need the original review text to generate your reply drafts.

Please click the link below to quickly paste the review content:
${magicLinkUrl}

Once pasted, we'll instantly generate 3 professional replies for you to copy.

⏱️ This link expires in 72 hours.

ReviewGuard © 2024`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
      <p>Dear ${safeOwnerName},</p>
      <p>A Google review notification arrived, but Google hid the review text from the email!</p>
      <p>⚠️ <strong>Action Required:</strong> We need the original review text to generate your reply drafts.</p>
      <p>Please click the button below to quickly paste the review content:</p>
      <p><a href="${safeMagicLinkUrl}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700;margin-top:8px;margin-bottom:8px;">Paste review content to get drafts</a></p>
      <p>Once pasted, we'll instantly generate 3 professional replies for you to copy.</p>
      <p style="color:#6b7280; font-size: 14px;">⏱️ This link expires in 72 hours.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color:#9ca3af; font-size: 12px;">ReviewGuard &copy; 2024</p>
    </div>
  `;

  return { subject, text, html };
}

export async function createPendingAlertDelivery(params: Pick<SendAlertParams, 'reviewEventId' | 'recipientEmail'>) {
  const [inserted] = await db
    .insert(alertDeliveries)
    .values({
      reviewEventId: params.reviewEventId,
      recipientEmail: params.recipientEmail,
      status: 'pending',
    })
    .returning({ id: alertDeliveries.id });

  return inserted;
}

export async function sendPendingReviewAlertEmail(
  deliveryId: string | null,
  params: SendAlertParams
): Promise<boolean> {
  const { recipientEmail } = params;
  const { subject, text, html } = buildAlertEmail(params);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'ReviewGuard Alerts <onboarding@resend.dev>';

  let success = false;
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;

  const resendClient = getResend();

  if (resendClient) {
    try {
      const response = await resendClient.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: subject,
        html,
        text,
      });

      if (response.error) {
        const statusCode =
          'statusCode' in response.error && response.error.statusCode
            ? `statusCode=${response.error.statusCode}; `
            : '';
        errorMessage = `${statusCode}${response.error.message}`;
        console.error('Resend failed to deliver email:', response.error);
      } else {
        success = true;
        providerMessageId = response.data?.id || null;
      }
    } catch (e: unknown) {
      errorMessage = e instanceof Error ? e.message : 'Unknown Resend exception';
      console.error('Resend exception occurred during alert dispatch:', e);
    }
  } else {
    // Console Simulation mode (extremely visual for demoing out of the box!)
    success = true;
    providerMessageId = 'SIMULATED_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    console.log('\n==================================================');
    console.log('[SIMULATED EMAIL DISPATCH]');
    console.log(`To:      ${recipientEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${params.magicLinkUrl}`);
    console.log('==================================================\n');
  }

  if (!deliveryId) {
    return success;
  }

  try {
    await db
      .update(alertDeliveries)
      .set({
        status: success ? 'sent' : 'failed',
        providerMessageId,
        errorMessage,
      })
      .where(eq(alertDeliveries.id, deliveryId));
  } catch (dbUpdateError) {
    console.error('Failed to update alert delivery status in DB:', dbUpdateError);
  }

  return success;
}

/**
 * Send alert email and maintain state log in the alert_deliveries database table.
 * State machine flow: pending -> call provider -> sent OR failed.
 */
export async function sendReviewAlertEmail(params: SendAlertParams): Promise<boolean> {
  try {
    const delivery = await createPendingAlertDelivery(params);
    return sendPendingReviewAlertEmail(delivery.id, params);
  } catch (error) {
    console.error('Failed to create pending alert delivery log:', error);
    return sendPendingReviewAlertEmail(null, params);
  }
}
