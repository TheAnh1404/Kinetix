-- Stop on ambiguous legacy data. Reconcile with an operator; never choose a role automatically.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM workspace_members GROUP BY workspace_id,user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'AUTH migration blocked: duplicate workspace memberships need manual reconciliation';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE wallet_address IS NOT NULL GROUP BY lower(wallet_address) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'AUTH migration blocked: case-insensitive wallet collisions need manual reconciliation';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE users ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
-- Legacy PINs are intentionally invalidated; no wallet is treated as verified by migration.
UPDATE users SET pin_code = NULL;
DELETE FROM auth_nonces;
CREATE UNIQUE INDEX users_wallet_lower_unique ON users (lower(wallet_address));
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS access_disabled_at timestamptz;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS can_manage_members boolean DEFAULT false NOT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS family_code varchar(16);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS admin_wallet varchar(42);
CREATE UNIQUE INDEX workspace_members_unique ON workspace_members(workspace_id,user_id);
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS onchain_hub varchar(42);
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS onchain_chain_id integer;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS target_goal_amount numeric(18,6) DEFAULT 0 NOT NULL;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS target_deadline timestamptz;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS rosca_round_duration integer DEFAULT 0 NOT NULL;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS rosca_round_contribution numeric(18,6) DEFAULT 0 NOT NULL;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS rosca_current_round integer DEFAULT 0 NOT NULL;
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS rosca_last_round_timestamp timestamptz;
CREATE UNIQUE INDEX vault_onchain_unique ON vaults(onchain_chain_id,onchain_hub,onchain_vault_id);
--> statement-breakpoint
CREATE TABLE user_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username varchar(50) NOT NULL UNIQUE CHECK (username = lower(username) AND username ~ '^[a-z0-9][a-z0-9._-]{2,49}$'),
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  temporary_expires_at timestamptz,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_wallets (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address varchar(42) NOT NULL UNIQUE CHECK (address = lower(address) AND address ~ '^0x[0-9a-f]{40}$'),
  verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('onboarding','full')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  reauthenticated_at timestamptz
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE TABLE auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce text NOT NULL UNIQUE,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  browser_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('REGISTER','LOGIN','LINK','REAUTH')),
  address varchar(42) NOT NULL,
  message text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE TABLE guardian_member_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES users(id),
  member_id uuid NOT NULL REFERENCES users(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  created_by uuid NOT NULL REFERENCES users(id),
  active boolean NOT NULL DEFAULT true,
  CHECK (guardian_id <> member_id)
);
CREATE UNIQUE INDEX guardian_member_link_unique ON guardian_member_links(workspace_id,guardian_id,member_id);
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  subject_id uuid REFERENCES users(id),
  workspace_id uuid REFERENCES workspaces(id),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_subject_workspace_idx ON audit_logs(workspace_id,subject_id,created_at);
CREATE TABLE auth_rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 1,
  resets_at timestamptz NOT NULL
);
CREATE TABLE auth_operations (
  key text PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES users(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  member_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE provisioning_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  chain_id integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','FAILED')),
  tx_hash varchar(66),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX provisioning_request_unique ON provisioning_requests(user_id,workspace_id,chain_id);

--> statement-breakpoint
CREATE UNIQUE INDEX vault_members_unique ON vault_members(vault_id,user_id);
CREATE UNIQUE INDEX withdrawal_onchain_unique ON withdrawal_requests(vault_id,onchain_request_id);
CREATE UNIQUE INDEX chore_onchain_unique ON chores(vault_id,onchain_task_id);
--> statement-breakpoint
CREATE TABLE workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  expected_wallet varchar(42) NOT NULL CHECK(expected_wallet = lower(expected_wallet)),
  created_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES users(id),
  accepted_at timestamptz,
  revoked_at timestamptz
);
