CREATE TABLE treasury_jars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name text NOT NULL,
  balance_wei numeric(78,0) NOT NULL DEFAULT 0,
  reserved_wei numeric(78,0) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (balance_wei >= 0 AND reserved_wei >= 0 AND reserved_wei <= balance_wei)
);
--> statement-breakpoint
CREATE TABLE treasury_transfers (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  jar_id uuid NOT NULL REFERENCES treasury_jars(id),
  destination_jar_id uuid REFERENCES treasury_jars(id),
  kind varchar(16) NOT NULL CHECK (kind IN ('DEPOSIT','WITHDRAW','INTERNAL')),
  amount_wei numeric(78,0) NOT NULL CHECK (amount_wei > 0),
  sender varchar(42) NOT NULL,
  recipient varchar(42) NOT NULL,
  nonce bigint,
  chain_id integer NOT NULL DEFAULT 43113 CHECK (chain_id = 43113),
  tx_hash varchar(66),
  status varchar(16) NOT NULL DEFAULT 'READY' CHECK (status IN ('READY','SUBMITTED','CONFIRMED','REVERTED')),
  block_number bigint,
  block_hash varchar(66),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'INTERNAL' AND destination_jar_id IS NOT NULL AND destination_jar_id <> jar_id AND nonce IS NULL AND tx_hash IS NULL) OR (kind <> 'INTERNAL' AND destination_jar_id IS NULL AND nonce IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX treasury_tx_unique ON treasury_transfers(chain_id, tx_hash);
CREATE UNIQUE INDEX treasury_nonce_unique ON treasury_transfers(chain_id, sender, nonce);
CREATE INDEX treasury_workspace_history ON treasury_transfers(workspace_id, created_at);
--> statement-breakpoint
CREATE TABLE treasury_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES treasury_transfers(id),
  jar_id uuid NOT NULL REFERENCES treasury_jars(id),
  delta_wei numeric(78,0) NOT NULL CHECK (delta_wei <> 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX treasury_entry_unique ON treasury_entries(transfer_id, jar_id);
