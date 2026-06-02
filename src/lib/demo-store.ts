import { generateAIDrafts } from '@/lib/ai';

export interface DemoBusiness {
  id: string;
  name: string;
  inboundPrefix: string;
  gbpReviewUrl: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerName: string;
}

export interface DemoReview {
  id: string;
  reviewer: string;
  rating: number;
  content: string | null;
  status: 'drafted' | 'needs_text';
  createdAt: string;
  businessName: string;
  gbpReviewUrl: string;
  drafts: {
    professional: string;
    warm: string;
    short: string;
  } | null;
}

export interface DemoDashboardReview {
  id: string;
  reviewer: string;
  rating: number;
  content: string;
  status: string;
  createdAt: string;
  magicLink: string | null;
}

export interface DemoGmailVerification {
  id: string;
  code: string;
  confirmationUrl: string | null;
  subject: string;
  rawHtml: string;
  createdAt: string;
}

interface DemoMagicLink {
  token: string;
  reviewId: string;
  expiresAt: string;
  viewedAt: string | null;
  copiedAt: string | null;
}

interface DemoStore {
  business: DemoBusiness;
  reviews: DemoReview[];
  gmailVerifications: DemoGmailVerification[];
  magicLinks: DemoMagicLink[];
}

const MOCK_BUSINESS: DemoBusiness = {
  id: 'demo-biz-123',
  name: 'CoolAir Heating & Cooling',
  inboundPrefix: 'hvac-plumbing-123',
  gbpReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJo-GzCqNx44kR58J407yB0P8',
  ownerEmail: 'owner@coolairhvac.com',
  ownerPhone: '(555) 123-4567',
  ownerName: 'Sarah Jenkins',
};

function nowMinus(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function seedDrafts(reviewer: string, businessName = MOCK_BUSINESS.name) {
  return {
    professional: `Dear ${reviewer},\n\nThank you for sharing your feedback with us. We take our service quality very seriously, and we are disappointed to hear that your experience did not meet expectations. We would appreciate the opportunity to investigate this issue further and work toward a direct resolution. Please call our owner ${MOCK_BUSINESS.ownerName} at ${MOCK_BUSINESS.ownerPhone} so we can discuss the details of your visit.\n\nSincerely,\n${businessName} Management Team`,
    warm: `Hi ${reviewer},\n\nWe're truly sorry to hear this was your experience. We'd like to look into what happened and help resolve it directly. Please contact our owner ${MOCK_BUSINESS.ownerName} at ${MOCK_BUSINESS.ownerPhone} at your earliest convenience so we can discuss this with you directly.\n\nWarm regards,\n${businessName} Management`,
    short: `Hello ${reviewer},\n\nThank you for your feedback. We would like to learn more about what happened and resolve this directly with you. Please call ${MOCK_BUSINESS.ownerName} at ${MOCK_BUSINESS.ownerPhone} so we can assist you.\n\nBest,\n${businessName}`,
  };
}

function createInitialStore(): DemoStore {
  const reviews: DemoReview[] = [
    {
      id: 'rev-1',
      reviewer: 'James Peterson',
      rating: 1,
      content:
        "Terrible customer service! The technician showed up 3 hours late and charged me $250 just to look at the furnace. When I complained, he was extremely rude and told me to find someone else if I didn't like the price. Avoid this HVAC company at all costs!",
      status: 'drafted',
      createdAt: nowMinus(1),
      businessName: MOCK_BUSINESS.name,
      gbpReviewUrl: MOCK_BUSINESS.gbpReviewUrl,
      drafts: seedDrafts('James Peterson'),
    },
    {
      id: 'rev-2',
      reviewer: 'James Miller',
      rating: 3,
      content:
        'The AC repair was done quickly and the system works fine now. However, the technician left greasy fingerprints all over our white wall in the hallway, and the price was a bit higher than the initial quote. Decent work but lack of attention to detail.',
      status: 'drafted',
      createdAt: nowMinus(2),
      businessName: MOCK_BUSINESS.name,
      gbpReviewUrl: MOCK_BUSINESS.gbpReviewUrl,
      drafts: seedDrafts('James Miller'),
    },
  ];

  return {
    business: { ...MOCK_BUSINESS },
    reviews,
    gmailVerifications: [
      {
        id: 'mock-gmail-1',
        code: '498-382-901',
        confirmationUrl: null,
        subject: 'Gmail Forwarding Confirmation - Receive Mail from forward-hvac-plumbing-123@reviewguard.com',
        rawHtml: 'Confirmation Code: 498-382-901',
        createdAt: new Date().toISOString(),
      },
    ],
    magicLinks: reviews.map((review) => ({
      token: 'simulated-demo-token',
      reviewId: review.id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      viewedAt: null,
      copiedAt: null,
    })),
  };
}

const globalForDemoStore = globalThis as typeof globalThis & {
  reviewGuardDemoStore?: DemoStore;
};

function getStore() {
  if (!globalForDemoStore.reviewGuardDemoStore) {
    globalForDemoStore.reviewGuardDemoStore = createInitialStore();
  }

  return globalForDemoStore.reviewGuardDemoStore;
}

export function formatVerificationCode(code: string) {
  const digits = code.replace(/\D/g, '');
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return code;
}

export function getDemoDashboardData() {
  const store = getStore();
  const latestVerification = store.gmailVerifications[0];

  return {
    activeBusiness: store.business,
    verificationCode: latestVerification?.code ?? null,
    recentReviews: store.reviews.map(({ id, reviewer, rating, content, status, createdAt }) => {
      const magicLink = store.magicLinks.find((link) => link.reviewId === id);

      return {
        id,
        reviewer,
        rating,
        content: content || '',
        status,
        createdAt,
        magicLink: magicLink ? `/alerts/${id}?token=${magicLink.token}` : null,
      };
    }),
    isDemoMode: true,
  };
}

export function updateDemoBusiness(updates: Partial<DemoBusiness>) {
  const store = getStore();
  store.business = {
    ...store.business,
    ...updates,
  };

  return store.business;
}

export function recordDemoGmailVerification(params: {
  code: string | null;
  confirmationUrl: string | null;
  subject: string;
  rawHtml: string;
}) {
  const store = getStore();
  const verification: DemoGmailVerification = {
    id: `mock-gmail-${Date.now()}`,
    code: formatVerificationCode(params.code || '498382901'),
    confirmationUrl: params.confirmationUrl,
    subject: params.subject,
    rawHtml: params.rawHtml,
    createdAt: new Date().toISOString(),
  };

  store.gmailVerifications.unshift(verification);
  store.gmailVerifications = store.gmailVerifications.slice(0, 10);

  return verification;
}

export async function recordDemoReview(params: {
  reviewer: string;
  rating: number;
  content: string | null;
  status: 'drafted' | 'needs_text';
  businessName?: string | null;
  gbpReviewUrl?: string | null;
}) {
  const store = getStore();
  const id = `mock-rev-${Date.now()}`;
  const businessName = params.businessName || store.business.name;
  const gbpReviewUrl = params.gbpReviewUrl || store.business.gbpReviewUrl;
  const shouldGenerateDrafts = params.status === 'drafted' && params.content;
  const drafts = shouldGenerateDrafts
    ? await generateAIDrafts({
        reviewerName: params.reviewer,
        rating: params.rating,
        reviewContent: params.content || '',
        businessName,
        ownerName: store.business.ownerName,
        ownerPhone: store.business.ownerPhone,
        ownerEmail: store.business.ownerEmail,
      })
    : null;

  const review: DemoReview = {
    id,
    reviewer: params.reviewer,
    rating: params.rating,
    content: params.content,
    status: params.status,
    createdAt: new Date().toISOString(),
    businessName,
    gbpReviewUrl,
    drafts,
  };
  const token = `mock-token-${Date.now()}`;

  store.reviews.unshift(review);
  store.reviews = store.reviews.slice(0, 20);
  store.magicLinks.unshift({
    token,
    reviewId: id,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    viewedAt: null,
    copiedAt: null,
  });

  return { review, token };
}

export function getDemoAlert(reviewId: string, token: string) {
  const store = getStore();
  const magicLink = store.magicLinks.find((link) => link.reviewId === reviewId && link.token === token);
  const review = store.reviews.find((item) => item.id === reviewId);

  if (!magicLink || !review) {
    return null;
  }

  if (new Date() > new Date(magicLink.expiresAt)) {
    return { expired: true as const };
  }

  if (!magicLink.viewedAt) {
    magicLink.viewedAt = new Date().toISOString();
  }

  return {
    expired: false as const,
    reviewer: review.reviewer,
    rating: review.rating,
    content: review.content,
    status: review.status,
    businessName: review.businessName,
    gbpReviewUrl: review.gbpReviewUrl,
    drafts: review.drafts,
  };
}

export function markDemoAlertCopied(reviewId: string, token: string) {
  const store = getStore();
  const magicLink = store.magicLinks.find((link) => link.reviewId === reviewId && link.token === token);

  if (!magicLink) {
    return false;
  }

  magicLink.copiedAt = new Date().toISOString();
  return true;
}

export async function generateDemoAlertDrafts(reviewId: string, token: string, content: string) {
  const store = getStore();
  const magicLink = store.magicLinks.find((link) => link.reviewId === reviewId && link.token === token);
  const review = store.reviews.find((item) => item.id === reviewId);

  if (!magicLink || !review) {
    return null;
  }

  const drafts = await generateAIDrafts({
    reviewerName: review.reviewer,
    rating: review.rating,
    reviewContent: content,
    businessName: review.businessName,
    ownerName: store.business.ownerName,
    ownerPhone: store.business.ownerPhone,
    ownerEmail: store.business.ownerEmail,
  });

  review.content = content;
  review.status = 'drafted';
  review.drafts = drafts;

  return drafts;
}
