-- Migration: Add webhook_events table for idempotency tracking
-- Created: 2026-02-02

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" varchar(255) NOT NULL UNIQUE,
  "event_type" varchar(100) NOT NULL,
  "processed_at" timestamp NOT NULL DEFAULT now(),
  "status" varchar(20) NOT NULL DEFAULT 'processed',
  "error_message" text,
  "retry_count" integer NOT NULL DEFAULT 0,
  "payload" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS "we_event_id_idx" ON "webhook_events" ("event_id");
CREATE INDEX IF NOT EXISTS "we_event_type_idx" ON "webhook_events" ("event_type");
CREATE INDEX IF NOT EXISTS "we_processed_at_idx" ON "webhook_events" ("processed_at");

-- Comment
COMMENT ON TABLE "webhook_events" IS 'Stripe webhook event tracking for idempotency';
