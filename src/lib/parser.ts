export interface GmailVerificationData {
  confirmationCode: string | null;
  confirmationUrl: string | null;
}

export interface GoogleReviewData {
  reviewer: string;
  rating: number;
  content: string | null;
  reviewUrl: string | null;
  businessName: string | null;
}

export type ParsingResult =
  | {
      type: 'gmail_verification';
      confidence_score: number;
      data: GmailVerificationData;
    }
  | {
      type: 'google_review';
      confidence_score: number;
      data: GoogleReviewData;
    }
  | {
      type: 'unknown';
      confidence_score: number;
      data: Record<string, never>;
      error: string;
    };

/**
 * Clean up HTML tags and entities to return raw text
 */
function stripHtml(html: string): string {
  // Convert basic tags to spacing/newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse consecutive whitespaces but preserve single newlines
  return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}

/**
 * Parse raw email HTML and Subject to extract reviews or Gmail verification info
 */
export function parseInboundEmail(subject: string, htmlContent: string): ParsingResult {
  const cleanSubject = subject.trim();
  const textContent = stripHtml(htmlContent);
  const lowerSubject = cleanSubject.toLowerCase();

  // 1. Check if it's a Gmail Forwarding Confirmation
  if (
    lowerSubject.includes('gmail forwarding confirmation') ||
    lowerSubject.includes('gmail 自动转发确认') ||
    textContent.includes('requested to automatically forward mail to your email address') ||
    textContent.includes('请求将邮件自动转发到您的电子邮箱')
  ) {
    // Extract 9-digit confirmation code (e.g. 123-456-789 or 123456789)
    const codeRegex = /\b(\d{3}-\d{3}-\d{3})\b|\b(\d{9})\b/;
    const codeMatch = textContent.match(codeRegex);
    const confirmationCode = codeMatch ? (codeMatch[1] || codeMatch[2]).replace(/-/g, '') : null;

    // Extract confirmation URL
    const urlRegex = /(https:\/\/mail\.google\.com\/mail\/[^\s"'>\)]+key=[^\s"'>\)]+)/i;
    const urlMatch = htmlContent.match(urlRegex) || textContent.match(urlRegex);
    const confirmationUrl = urlMatch ? urlMatch[1] : null;

    return {
      type: 'gmail_verification',
      confidence_score: confirmationCode || confirmationUrl ? 1 : 0.75,
      data: {
        confirmationCode,
        confirmationUrl,
      },
    };
  }

  // 2. Check if it's a Google Review Notification
  const isGoogleReviewSubject =
    lowerSubject.includes('new review') ||
    lowerSubject.includes('left you a review') ||
    lowerSubject.includes('left a review') ||
    lowerSubject.includes('google') ||
    lowerSubject.includes('评价') ||
    lowerSubject.includes('stars');

  if (isGoogleReviewSubject) {
    let rating = 0;
    let reviewer = 'Google User';
    let content: string | null = null;
    let reviewUrl: string | null = null;
    let businessName: string | null = null;
    const confidenceChecks = {
      subject: true,
      reviewer: false,
      rating: false,
      content: false,
      businessName: false,
      reviewUrl: false,
    };

    // A. Detect Star Rating
    // Count visual star characters like ★
    const starLineMatch = textContent.match(/([★☆]{1,5})\s*(?:\(|$)/);
    const starMatches = starLineMatch?.[1]?.match(/★/g);
    if (starMatches && starMatches.length >= 1 && starMatches.length <= 5) {
      rating = starMatches.length;
      confidenceChecks.rating = true;
    } else {
      // Look for text: "rated you 4 stars", "4/5", "4-star review"
      const textRatingMatch = textContent.match(/(\d)\s*-\s*star review|rated you (\d) stars|(\d)\s*\/\s*5 stars|(\d)\s*star/i);
      if (textRatingMatch) {
        const foundRating = parseInt(
          textRatingMatch[1] || textRatingMatch[2] || textRatingMatch[3] || textRatingMatch[4],
          10
        );
        if (foundRating >= 1 && foundRating <= 5) {
          rating = foundRating;
          confidenceChecks.rating = true;
        }
      }
    }

    // B. Detect Reviewer Name
    // In Google Review emails, it typically starts like "John Doe left you a review" or "Reviewer: Jane Smith"
    const reviewerMatch =
      cleanSubject.match(/^([^<>]+) left you a review/i) ||
      cleanSubject.match(/^([^<>]+) left a review for/i) ||
      cleanSubject.match(/new review from ([^<>]+)/i) ||
      textContent.match(/Reviewer:\s*([^<>\n]+)/i) ||
      textContent.match(/([^<>]+) left you a review/i) ||
      textContent.match(/([^<>\n]+) rated you \d stars/i) ||
      textContent.match(/Review by ([^<>\n]+)/i);

    if (reviewerMatch) {
      reviewer = reviewerMatch[1].trim();
      // Remove any trailing details or brackets
      reviewer = reviewer.split('(')[0].split('wrote:')[0].trim();
      confidenceChecks.reviewer = true;
    }

    // C. Detect Review Content
    // Google review text is often wrapped in quotes or follows a specific pattern in textContent
    // Like: "Here is what they wrote:" followed by the review, or it's the largest block of text surrounded by quotes.
    const quoteMatches = textContent.match(/"([^"]{10,1000})"/);
    if (quoteMatches) {
      content = quoteMatches[1].trim();
      confidenceChecks.content = true;
    } else {
      // Find text after typical markers
      const markerRegex = /(?:wrote:|what they wrote:|review details:)\s*\n*([\s\S]{10,800})/i;
      const markerMatch = textContent.match(markerRegex);
      if (markerMatch) {
        // Grab the text and split by common next sections or footer
        let block = markerMatch[1].trim();
        const footerIndex = block.search(/(?:open google profile|respond to this|privacy policy|this email was sent)/i);
        if (footerIndex !== -1) {
          block = block.substring(0, footerIndex).trim();
        }
        content = block;
        confidenceChecks.content = true;
      }
    }

    // D. Match Business Name
    // Usually: "New review on Google for XYZ Business"
    const bizMatch =
      cleanSubject.match(/for\s+([^<>]+)$/i) ||
      textContent.match(/on Google for\s+([^<>\n]+)/i);

    if (bizMatch) {
      businessName = bizMatch[1].trim();
      confidenceChecks.businessName = true;
    }

    // E. Extract Google Review Link / Profile link
    // Standard links contain "google.com/maps" or "google.com/business" or similar
    const linkRegex = /(https:\/\/(?:www\.)?google\.com\/(?:maps|business|search)[^\s"'>\)]+)/i;
    const linkMatch = htmlContent.match(linkRegex) || textContent.match(linkRegex);
    if (linkMatch) {
      reviewUrl = linkMatch[1];
      confidenceChecks.reviewUrl = true;
    }

    // F. Star count constraint fallback
    if (rating === 0) {
      // Default to 1 star if we detected it's a review but rating was not parsed
      rating = 1;
    }

    const keyFieldScore =
      (confidenceChecks.reviewer ? 0.3 : 0) +
      (confidenceChecks.rating ? 0.3 : 0) +
      (confidenceChecks.content ? 0.3 : 0);
    const supportingScore =
      (confidenceChecks.businessName ? 0.05 : 0) + (confidenceChecks.reviewUrl ? 0.05 : 0);
    const confidenceScore = keyFieldScore + supportingScore;

    return {
      type: 'google_review',
      confidence_score: Math.min(1.0, confidenceScore),
      data: {
        reviewer,
        rating,
        content: content || null,
        reviewUrl: reviewUrl || null,
        businessName: businessName || null,
      },
    };
  }

  return {
    type: 'unknown',
    confidence_score: 0,
    data: {},
    error: 'Subject does not match typical Google Review or Gmail Forwarding format.',
  };
}
