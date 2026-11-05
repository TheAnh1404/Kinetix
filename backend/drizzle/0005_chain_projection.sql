CREATE TABLE IF NOT EXISTS "chain_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chain_id" integer NOT NULL,
  "hub" varchar(42) NOT NULL,
  "tx_hash" varchar(66) NOT NULL,
  "log_index" integer NOT NULL,
  "block_number" bigint NOT NULL,
  "block_hash" varchar(66) NOT NULL,
  "event_name" text NOT NULL,
  "payload" jsonb NOT NULL,
  "indexed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chain_event_identity_unique" ON "chain_events" ("chain_id", "hub", "tx_hash", "log_index");
