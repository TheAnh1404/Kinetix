CREATE TABLE group_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  fund_type varchar(20) NOT NULL CHECK (fund_type IN ('OPERATING', 'GOAL')),
  custody_type varchar(30) NOT NULL DEFAULT 'SHARED_TREASURY' CHECK (custody_type IN ('ONCHAIN_HUB', 'SHARED_TREASURY')),
  onchain_vault_id integer,
  onchain_vault_address varchar(42),
  balance_wei numeric(78,0) NOT NULL DEFAULT 0,
  reserved_wei numeric(78,0) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
  target_amount_wei numeric(78,0) NOT NULL DEFAULT 0,
  target_deadline timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (balance_wei >= 0 AND reserved_wei >= 0 AND reserved_wei <= balance_wei)
);
--> statement-breakpoint
CREATE INDEX group_funds_workspace_idx ON group_funds(workspace_id);
--> statement-breakpoint
CREATE TABLE fund_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  signers jsonb NOT NULL DEFAULT '[]'::jsonb,
  quorum integer NOT NULL DEFAULT 2,
  fast_withdraw_limit_wei numeric(78,0) NOT NULL DEFAULT 0,
  approval_window_seconds integer NOT NULL DEFAULT 172800,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (quorum >= 1 AND fast_withdraw_limit_wei >= 0 AND approval_window_seconds > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX fund_policy_version_unique ON fund_policies(fund_id, version);
--> statement-breakpoint
CREATE TABLE contribution_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_wei numeric(78,0) NOT NULL CHECK (amount_wei > 0),
  cycle varchar(20) NOT NULL DEFAULT 'MONTHLY' CHECK (cycle IN ('ONCE', 'WEEKLY', 'MONTHLY')),
  due_date timestamptz,
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXEMPT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX contrib_obligation_fund_member_idx ON contribution_obligations(fund_id, member_user_id);
--> statement-breakpoint
CREATE TABLE contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  funder_address varchar(42) NOT NULL,
  amount_wei numeric(78,0) NOT NULL CHECK (amount_wei > 0),
  asset varchar(10) NOT NULL DEFAULT 'AVAX',
  tx_hash varchar(66),
  block_number bigint,
  log_index integer,
  status varchar(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'RECONCILED')),
  intent_id text,
  reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX contributions_fund_member_idx ON contributions(fund_id, member_user_id);
CREATE INDEX contributions_tx_hash_idx ON contributions(tx_hash);
--> statement-breakpoint
CREATE TABLE expense_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  policy_version_id uuid REFERENCES fund_policies(id),
  proposer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposer_address varchar(42) NOT NULL,
  recipient_address varchar(42) NOT NULL,
  recipient_name text NOT NULL,
  amount_wei numeric(78,0) NOT NULL CHECK (amount_wei > 0),
  title text NOT NULL,
  purpose text NOT NULL,
  category varchar(50) NOT NULL DEFAULT 'OPERATING',
  deadline timestamptz NOT NULL,
  status varchar(25) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'SETTLED')),
  receipt_attachment_url text,
  receipt_attachment_hash text,
  approvals_count integer NOT NULL DEFAULT 0,
  required_approvals integer NOT NULL DEFAULT 2,
  idempotency_key varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX expense_requests_fund_status_idx ON expense_requests(fund_id, status);
CREATE UNIQUE INDEX expense_requests_idempotency_unique ON expense_requests(fund_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
--> statement-breakpoint
CREATE TABLE expense_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  approver_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approver_address varchar(42) NOT NULL,
  decision varchar(15) NOT NULL DEFAULT 'APPROVE' CHECK (decision IN ('APPROVE', 'REJECT')),
  signature text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX expense_approval_unique ON expense_approvals(request_id, approver_user_id);
--> statement-breakpoint
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES group_funds(id) ON DELETE CASCADE,
  sender_address varchar(42) NOT NULL,
  recipient_address varchar(42) NOT NULL,
  amount_wei numeric(78,0) NOT NULL CHECK (amount_wei > 0),
  status varchar(20) NOT NULL DEFAULT 'READY' CHECK (status IN ('READY', 'BROADCAST', 'MINING', 'CONFIRMED', 'FAILED')),
  tx_hash varchar(66),
  nonce bigint,
  block_number bigint,
  gas_used_wei numeric(78,0),
  executed_by_user_id uuid REFERENCES users(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX payments_request_unique ON payments(request_id);
CREATE INDEX payments_tx_hash_idx ON payments(tx_hash);
--> statement-breakpoint
CREATE TABLE group_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fund_id uuid REFERENCES group_funds(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_wallet varchar(42),
  action text NOT NULL,
  metadata_diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX group_audit_ws_created_idx ON group_audit_events(workspace_id, created_at);
CREATE INDEX group_audit_fund_created_idx ON group_audit_events(fund_id, created_at);
