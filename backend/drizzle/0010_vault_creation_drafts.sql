CREATE TABLE vault_creation_drafts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  config jsonb NOT NULL,
  step integer NOT NULL DEFAULT 1 CHECK (step BETWEEN 1 AND 5),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  preflight jsonb,
  send_attempt_id uuid,
  claimed_at timestamptz,
  tx_hash varchar(66) CHECK (tx_hash IS NULL OR tx_hash ~ '^0x[0-9a-f]{64}$'),
  vault_id uuid REFERENCES vaults(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX vault_creation_actor_workspace ON vault_creation_drafts(user_id,workspace_id,updated_at);
--> statement-breakpoint
CREATE UNIQUE INDEX vault_creation_transaction ON vault_creation_drafts(tx_hash);
