DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_funds_custody_type_check') THEN
    ALTER TABLE group_funds DROP CONSTRAINT group_funds_custody_type_check;
    ALTER TABLE group_funds ADD CONSTRAINT group_funds_custody_type_check CHECK (custody_type IN ('ONCHAIN_HUB', 'SHARED_TREASURY', 'ONCHAIN_V2'));
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE group_funds ADD COLUMN IF NOT EXISTS contract_address varchar(42);
--> statement-breakpoint
ALTER TABLE group_funds ADD COLUMN IF NOT EXISTS factory_address varchar(42);
--> statement-breakpoint
ALTER TABLE group_funds ADD COLUMN IF NOT EXISTS policy_epoch integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE group_funds ADD COLUMN IF NOT EXISTS terms_hash varchar(66);
--> statement-breakpoint
ALTER TABLE group_funds ADD COLUMN IF NOT EXISTS goal_reached boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE group_funds ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS group_funds_contract_idx ON group_funds(contract_address);
--> statement-breakpoint
ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS onchain_expense_id integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expense_requests_onchain_idx ON expense_requests(fund_id, onchain_expense_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS fund_policy_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  onchain_proposal_id integer NOT NULL,
  proposer_address varchar(42) NOT NULL,
  quorum integer NOT NULL,
  daily_limit_wei numeric(78,0) NOT NULL,
  terms_hash varchar(66) NOT NULL,
  timelock_ends_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'EXECUTED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'INVALIDATED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fund_policy_proposals_fund_idx ON fund_policy_proposals(fund_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS fund_policy_proposal_unique ON fund_policy_proposals(fund_id, onchain_proposal_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS fund_governance_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  onchain_proposal_id integer NOT NULL,
  action varchar(20) NOT NULL CHECK (action IN ('POLICY', 'PAUSE', 'RESUME', 'CLOSE', 'SURPLUS')),
  proposer_address varchar(42) NOT NULL,
  epoch integer NOT NULL DEFAULT 0,
  commitment varchar(66),
  approvals_count integer NOT NULL DEFAULT 0,
  ready_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'EXECUTED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'INVALIDATED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fund_gov_actions_fund_idx ON fund_governance_actions(fund_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS fund_gov_action_unique ON fund_governance_actions(fund_id, onchain_proposal_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS fund_refund_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  claimant_address varchar(42) NOT NULL,
  amount_wei numeric(78,0) NOT NULL CHECK (amount_wei > 0),
  tx_hash varchar(66) NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fund_refund_claims_fund_idx ON fund_refund_claims(fund_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS fund_refund_claims_tx_hash_unique ON fund_refund_claims(tx_hash);
