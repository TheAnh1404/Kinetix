-- Không thể phục hồi phần thập phân đã bị làm tròn trước migration.
ALTER TABLE vaults ALTER COLUMN fast_withdraw_limit TYPE numeric(38,18), ALTER COLUMN cached_total_balance TYPE numeric(38,18), ALTER COLUMN cached_l1_buffer TYPE numeric(38,18), ALTER COLUMN cached_cchain_yield TYPE numeric(38,18), ALTER COLUMN target_goal_amount TYPE numeric(38,18), ALTER COLUMN rosca_round_contribution TYPE numeric(38,18);
--> statement-breakpoint
ALTER TABLE withdrawal_requests ALTER COLUMN amount TYPE numeric(38,18), ADD COLUMN deadline timestamptz;
--> statement-breakpoint
ALTER TABLE chores ALTER COLUMN reward_amount TYPE numeric(38,18);
--> statement-breakpoint
CREATE TABLE proof_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), chore_id uuid NOT NULL,
 owner_id uuid NOT NULL, content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 CONSTRAINT proof_attachments_chore_id_chores_id_fk FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE,
 CONSTRAINT proof_attachments_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE member_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
 vault_id uuid NOT NULL, user_id uuid NOT NULL,
 chain_id integer NOT NULL, tx_hash varchar(66) NOT NULL, event_key text NOT NULL, kind text NOT NULL,
 amount numeric(38,18) NOT NULL, asset text NOT NULL DEFAULT 'AVAX', created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT member_activity_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
 CONSTRAINT member_activity_vault_id_vaults_id_fk FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE,
 CONSTRAINT member_activity_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX member_activity_event_unique ON member_activity(chain_id,event_key);
CREATE INDEX member_activity_personal ON member_activity(user_id,workspace_id,created_at);
CREATE INDEX proof_attachment_expiry ON proof_attachments(expires_at);
--> statement-breakpoint
CREATE TABLE activity_cursors (id text PRIMARY KEY, next_block bigint NOT NULL);
--> statement-breakpoint
ALTER TABLE notifications ADD COLUMN source_event text;
CREATE UNIQUE INDEX notification_source_event_unique ON notifications(source_event);
