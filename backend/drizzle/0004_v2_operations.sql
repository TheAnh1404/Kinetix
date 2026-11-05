CREATE TABLE IF NOT EXISTS "financial_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "deployment_ref" text NOT NULL,
  "chain_id" integer NOT NULL,
  "hub" varchar(42) NOT NULL,
  "tx_hash" varchar(66) NOT NULL,
  "sender" varchar(42) NOT NULL,
  "nonce" text NOT NULL,
  "function_name" text NOT NULL,
  "calldata" text NOT NULL,
  "amount_wei" text NOT NULL,
  "status" text DEFAULT 'BROADCAST' NOT NULL,
  "block_number" bigint,
  "block_hash" varchar(66),
  "sync_intent" jsonb,
  "last_error_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT operation_amount_wei CHECK (amount_wei ~ '^[0-9]+$'),
  CONSTRAINT operation_tx_hash CHECK (tx_hash ~ '^0x[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "financial_operation_chain_tx_unique" ON "financial_operations" ("chain_id", "hub", "tx_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_operation_personal" ON "financial_operations" ("user_id", "workspace_id", "created_at");
--> statement-breakpoint
ALTER TABLE "provisioning_requests" ADD COLUMN IF NOT EXISTS "hub" varchar(42);
--> statement-breakpoint
ALTER TABLE "provisioning_requests" ADD COLUMN IF NOT EXISTS "deployment_ref" text DEFAULT 'legacy' NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "provisioning_request_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "provisioning_request_unique" ON "provisioning_requests" ("user_id", "workspace_id", "chain_id", "deployment_ref");
--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "as_of_block" bigint;
--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "as_of_block_hash" varchar(66);
--> statement-breakpoint
ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "signature_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "signature_verified_at" timestamp with time zone;
