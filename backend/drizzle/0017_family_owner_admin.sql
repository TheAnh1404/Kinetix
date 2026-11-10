ALTER TABLE workspaces ADD COLUMN creator_user_id uuid REFERENCES users(id);
ALTER TABLE treasury_jars ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
--> statement-breakpoint
-- Only verified evidence of the original creator can establish ownership.
WITH candidates AS (
 SELECT w.id AS workspace_id, wm.user_id
 FROM workspaces w JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.role = 'ADMIN'
 JOIN user_wallets uw ON uw.user_id = wm.user_id
 WHERE lower(w.creator_wallet) = lower(uw.address)
 UNION
 SELECT w.id, a.actor_id FROM workspaces w
 JOIN audit_logs a ON a.workspace_id = w.id AND a.action = 'GUARDIAN_REGISTERED'
 JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = a.actor_id AND wm.role = 'ADMIN'
), verified AS (
 SELECT workspace_id, (array_agg(DISTINCT user_id))[1] AS user_id
 FROM candidates GROUP BY workspace_id HAVING count(DISTINCT user_id) = 1
)
UPDATE workspaces w SET creator_user_id = v.user_id FROM verified v WHERE w.id = v.workspace_id;
--> statement-breakpoint
UPDATE workspace_members wm SET can_manage_members = false
WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id=wm.workspace_id AND w.creator_user_id=wm.user_id AND wm.role='ADMIN');
--> statement-breakpoint
CREATE TABLE family_admin_state (
 workspace_id uuid PRIMARY KEY REFERENCES workspaces(id), revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 outgoing_paused boolean NOT NULL DEFAULT false, pause_reason text NOT NULL DEFAULT '', archived boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE family_admin_intents (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), actor_id uuid NOT NULL REFERENCES users(id),
 session_id uuid NOT NULL REFERENCES sessions(id), revision integer NOT NULL, action text NOT NULL, payload jsonb NOT NULL,
 message text NOT NULL, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETED','CANCELLED')),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX family_admin_intents_workspace ON family_admin_intents(workspace_id,created_at);
