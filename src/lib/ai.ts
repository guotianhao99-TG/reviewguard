import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export interface ResponseDrafts {
  professional: string;
  warm: string;
  short: string;
}

export const LOW_CONFIDENCE_PLACEHOLDER_DRAFT =
  "We detected a Google review notification but couldn't extract the full text. Please paste the review content below to generate a professional reply instantly.";

interface GenerateDraftsParams {
  reviewerName: string;
  rating: number;
  reviewContent: string | null;
  businessName: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
}

/**
 * High-quality offline template generator for V1 Demo & fallback
 */
function generateFallbackDrafts(params: GenerateDraftsParams): ResponseDrafts {
  const { reviewerName, rating, businessName, ownerName, ownerPhone, ownerEmail } = params;

  const nameSig = ownerName ? `${ownerName}, Owner` : 'Management Team';
  const phoneSig = ownerPhone ? ` at ${ownerPhone}` : '';
  const emailSig = ownerEmail ? ` or email us at ${ownerEmail}` : '';
  const contactMethod = phoneSig || emailSig ? `Please call us directly${phoneSig}${emailSig}` : 'Please contact us directly';

  // Customized fallback templates depending on rating
  if (rating <= 3) {
    // 1-3 Star templates
    return {
      professional: `Dear ${reviewerName},\n\nThank you for sharing your feedback with us. We take our service quality very seriously, and we are disappointed to hear that your experience did not meet expectations. We would appreciate the opportunity to investigate this issue further and work toward a direct resolution. ${contactMethod} so we can discuss the details of your visit and make things right.\n\nSincerely,\n${businessName} ${nameSig}`,
      
      warm: `Hi ${reviewerName},\n\nWe're sorry to hear this was your experience. We care deeply about our customers and we'd like to look into what happened and help resolve it directly. ${contactMethod} at your earliest convenience. We value your feedback and hope to connect with you soon to earn back your trust.\n\nWarm regards,\n${businessName} ${nameSig}`,
      
      short: `Hello ${reviewerName},\n\nThank you for your feedback. We would like to learn more about what happened and resolve this directly with you. ${contactMethod} at your earliest convenience so we can assist you.\n\nBest,\n${businessName} ${nameSig}`,
    };
  } else {
    // 4-5 Star templates (as fallback/placeholder)
    return {
      professional: `Dear ${reviewerName},\n\nThank you so much for the review! We are delighted to hear you had a great experience with our team. We appreciate your business and look forward to serving you again in the future.\n\nBest regards,\n${businessName} ${nameSig}`,
      
      warm: `Hi ${reviewerName},\n\nThank you so much for your kind words! Your support means the world to our team. We're so glad we could help, and we look forward to serving you again!\n\nWarmly,\n${businessName} ${nameSig}`,
      
      short: `Hello ${reviewerName},\n\nThanks for the great review! We appreciate your support and look forward to working with you again.\n\nBest,\n${businessName} ${nameSig}`,
    };
  }
}

/**
 * Generate 3 safe, highly professional AI draft responses
 */
export async function generateAIDrafts(params: GenerateDraftsParams): Promise<ResponseDrafts> {
  const { reviewerName, rating, reviewContent, businessName, ownerName, ownerPhone, ownerEmail } = params;

  // If review content is empty or confidence is too low, return the product placeholder copy.
  if (!reviewContent) {
    return {
      professional: LOW_CONFIDENCE_PLACEHOLDER_DRAFT,
      warm: LOW_CONFIDENCE_PLACEHOLDER_DRAFT,
      short: LOW_CONFIDENCE_PLACEHOLDER_DRAFT,
    };
  }

  const prompt = `
You are an expert PR and customer support assistant for local service businesses (like HVAC, plumbers, locksmiths, roofers).
Generate three professional Google Review response drafts for a ${rating}-star review from a customer named "${reviewerName}".

Business Name: "${businessName}"
Review Text: "${reviewContent}"
${ownerName ? `Owner Name: "${ownerName}"` : ''}
${ownerPhone ? `Owner Phone: "${ownerPhone}"` : ''}
${ownerEmail ? `Owner Email: "${ownerEmail}"` : ''}

CRITICAL SAFETY COMPLIANCE GUIDELINES:
1. NEVER admit legal liability, fault, or negligence for any property damage, accidents, or service issues.
2. NEVER offer public refunds, financial compensation, or discounts in these drafts.
3. Maintain a highly professional, constructive, and polite tone. Never be defensive, argumentative, or sarcastic.
4. Always steer the conversation offline by asking them to contact the business directly via phone or email.
5. In the "Warm" tone, DO NOT use incriminating clichés like "This is not the standard we strive for." Instead, use: "We're sorry to hear this was your experience. We'd like to look into what happened and help resolve it directly."

Generate exactly 3 drafts inside a valid JSON object matching this structure:
{
  "professional": "Draft in a professional, polite, and brand-safe tone.",
  "warm": "Draft in a warm, deeply empathetic, and caring tone (while remaining legally safe).",
  "short": "Draft in a short, direct, and action-oriented tone that immediately guides them offline."
}

Sign off each draft using the business name "${businessName}" and the owner/management signature.
Output ONLY the JSON object. Do not include markdown code block styling or any conversational prefaces.
`;

  // 1. Try Gemini API
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      
      const text = result.response.text()?.trim() || '';
      // Clean JSON formatting if Gemini wrapped it in ```json
      const cleanJson = text.replace(/^```json/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.professional && parsed.warm && parsed.short) {
        return parsed as ResponseDrafts;
      }
    } catch (e) {
      console.error('Failed to generate drafts using Gemini API, falling back to OpenAI/Local:', e);
    }
  }

  // 2. Try OpenAI API
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0].message.content?.trim() || '';
      const parsed = JSON.parse(text);
      if (parsed.professional && parsed.warm && parsed.short) {
        return parsed as ResponseDrafts;
      }
    } catch (e) {
      console.error('Failed to generate drafts using OpenAI API, falling back to Local templates:', e);
    }
  }

  // 3. Fallback to offline template generator
  return generateFallbackDrafts(params);
}
