import { pgTable, uuid, varchar, integer, text, real, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Businesses Table
export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  inboundPrefix: varchar('inbound_prefix', { length: 100 }).notNull().unique(),
  gbpReviewUrl: varchar('gbp_review_url', { length: 1024 }).notNull(),
  ownerEmail: varchar('owner_email', { length: 255 }).notNull(),
  ownerPhone: varchar('owner_phone', { length: 50 }),
  ownerName: varchar('owner_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Inbound Emails Table (Audit Log & Raw Data)
export const inboundEmails = pgTable('inbound_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: varchar('message_id', { length: 255 }).notNull(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 512 }),
  rawHtml: text('raw_html').notNull(),
  confidenceScore: real('confidence_score').default(0).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'parsed' | 'needs_text' | 'failed' | 'gmail_verification'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('inbound_emails_message_id_idx').on(table.messageId),
]);

// 3. Review Events Table
export const reviewEvents = pgTable('review_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  inboundEmailId: uuid('inbound_email_id').references(() => inboundEmails.id, { onDelete: 'set null' }),
  reviewer: varchar('reviewer', { length: 255 }).notNull(),
  rating: integer('rating').notNull(), // 1 to 5
  content: text('content'),
  status: varchar('status', { length: 50 }).notNull(), // 'drafted' | 'needs_text'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Response Drafts Table
export const responseDrafts = pgTable('response_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewEventId: uuid('review_event_id').references(() => reviewEvents.id, { onDelete: 'cascade' }).unique().notNull(),
  professionalDraft: text('professional_draft'),
  warmDraft: text('warm_draft'),
  shortDraft: text('short_draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Magic Links Table (Secure Access Token)
export const magicLinks = pgTable('magic_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 255 }).notNull(),
  reviewEventId: uuid('review_event_id').references(() => reviewEvents.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  viewedAt: timestamp('viewed_at'),
  copiedAt: timestamp('copied_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('magic_links_token_idx').on(table.token),
]);

// 6. Alert Deliveries Table
export const alertDeliveries = pgTable('alert_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewEventId: uuid('review_event_id').references(() => reviewEvents.id, { onDelete: 'cascade' }).notNull(),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'pending' | 'sent' | 'failed'
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations Definitions
export const businessesRelations = relations(businesses, ({ many }) => ({
  inboundEmails: many(inboundEmails),
}));

export const inboundEmailsRelations = relations(inboundEmails, ({ one, many }) => ({
  business: one(businesses, {
    fields: [inboundEmails.businessId],
    references: [businesses.id],
  }),
  reviewEvents: many(reviewEvents),
}));

export const reviewEventsRelations = relations(reviewEvents, ({ one, many }) => ({
  inboundEmail: one(inboundEmails, {
    fields: [reviewEvents.inboundEmailId],
    references: [inboundEmails.id],
  }),
  responseDraft: one(responseDrafts, {
    fields: [reviewEvents.id],
    references: [responseDrafts.reviewEventId],
  }),
  magicLinks: many(magicLinks),
  alertDeliveries: many(alertDeliveries),
}));

export const responseDraftsRelations = relations(responseDrafts, ({ one }) => ({
  reviewEvent: one(reviewEvents, {
    fields: [responseDrafts.reviewEventId],
    references: [reviewEvents.id],
  }),
}));

export const magicLinksRelations = relations(magicLinks, ({ one }) => ({
  reviewEvent: one(reviewEvents, {
    fields: [magicLinks.reviewEventId],
    references: [reviewEvents.id],
  }),
}));

export const alertDeliveriesRelations = relations(alertDeliveries, ({ one }) => ({
  reviewEvent: one(reviewEvents, {
    fields: [alertDeliveries.reviewEventId],
    references: [reviewEvents.id],
  }),
}));
