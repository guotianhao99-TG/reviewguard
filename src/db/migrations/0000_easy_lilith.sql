CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_event_id" uuid NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"provider_message_id" varchar(255),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"inbound_prefix" varchar(100) NOT NULL,
	"gbp_review_url" varchar(1024) NOT NULL,
	"owner_email" varchar(255) NOT NULL,
	"owner_phone" varchar(50),
	"owner_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_inbound_prefix_unique" UNIQUE("inbound_prefix")
);
--> statement-breakpoint
CREATE TABLE "inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"business_id" uuid,
	"subject" varchar(512),
	"raw_html" text NOT NULL,
	"confidence_score" real DEFAULT 0 NOT NULL,
	"status" varchar(50) NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"review_event_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"viewed_at" timestamp,
	"copied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_event_id" uuid NOT NULL,
	"professional_draft" text,
	"warm_draft" text,
	"short_draft" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "response_drafts_review_event_id_unique" UNIQUE("review_event_id")
);
--> statement-breakpoint
CREATE TABLE "review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inbound_email_id" uuid,
	"reviewer" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"content" text,
	"status" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_review_event_id_review_events_id_fk" FOREIGN KEY ("review_event_id") REFERENCES "public"."review_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_review_event_id_review_events_id_fk" FOREIGN KEY ("review_event_id") REFERENCES "public"."review_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_drafts" ADD CONSTRAINT "response_drafts_review_event_id_review_events_id_fk" FOREIGN KEY ("review_event_id") REFERENCES "public"."review_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_inbound_email_id_inbound_emails_id_fk" FOREIGN KEY ("inbound_email_id") REFERENCES "public"."inbound_emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_emails_message_id_idx" ON "inbound_emails" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "magic_links_token_idx" ON "magic_links" USING btree ("token");