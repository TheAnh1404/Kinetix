CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  ui_mode varchar(10) NOT NULL DEFAULT 'LITE',
  default_currency varchar(10) NOT NULL DEFAULT 'VND',
  preferred_network varchar(20) NOT NULL DEFAULT 'TESTNET',
  gas_preference varchar(20) NOT NULL DEFAULT 'SPONSORED',
  privacy_hide_balance boolean NOT NULL DEFAULT false,
  notification_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS linked_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address varchar(42) NOT NULL,
  wallet_type varchar(30) NOT NULL DEFAULT 'EXTERNAL_CORE',
  is_primary_receiving boolean NOT NULL DEFAULT false,
  chain_id integer NOT NULL DEFAULT 43113,
  label text,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT linked_wallets_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS linked_wallets_user_primary ON linked_wallets(user_id, is_primary_receiving);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS linked_wallets_user_address ON linked_wallets(user_id, wallet_address);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS member_allowance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  wallet_address varchar(42),
  role varchar(20) NOT NULL DEFAULT 'SPENDER',
  daily_limit_amount numeric(38,18) NOT NULL DEFAULT '50',
  auto_approve_threshold numeric(38,18) NOT NULL DEFAULT '10',
  allowed_categories jsonb NOT NULL DEFAULT '["FOOD", "EDUCATION", "HEALTHCARE"]'::jsonb,
  is_frozen boolean NOT NULL DEFAULT false,
  onchain_sync_status varchar(30) NOT NULL DEFAULT 'SYNCED',
  last_tx_hash varchar(66),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_allowance_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT member_allowance_member_user_id_fk FOREIGN KEY (member_user_id) REFERENCES users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS member_allowance_ws_member ON member_allowance_policies(workspace_id, member_user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS session_keys_and_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  session_key_address varchar(42) NOT NULL,
  label text NOT NULL DEFAULT 'AI Agent Automation Key',
  permissions_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  is_revoked boolean NOT NULL DEFAULT false,
  revoke_tx_hash varchar(66),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_keys_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT session_keys_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS session_keys_user_ws ON session_keys_and_approvals(user_id, workspace_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS settings_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  action_type varchar(50) NOT NULL,
  layer varchar(20) NOT NULL DEFAULT 'OFF_CHAIN',
  metadata_diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  tx_hash varchar(66),
  status varchar(30) NOT NULL DEFAULT 'COMPLETED',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_audit_actor_id_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT settings_audit_workspace_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS settings_audit_ws_created ON settings_audit_logs(workspace_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS settings_audit_actor_created ON settings_audit_logs(actor_id, created_at);
