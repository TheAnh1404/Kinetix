CREATE TABLE workspace_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  flow_version integer NOT NULL CHECK (flow_version > 0),
  status text NOT NULL CHECK (status IN ('IN_PROGRESS','COMPLETED','DEFERRED','LEGACY')),
  last_step text NOT NULL CHECK (last_step IN ('WELCOME','FAMILY','READINESS','FINISH')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deferred_at timestamptz,
  CONSTRAINT workspace_onboarding_terminal_times CHECK (
    (status = 'COMPLETED' AND completed_at IS NOT NULL AND deferred_at IS NULL) OR
    (status = 'DEFERRED' AND deferred_at IS NOT NULL AND completed_at IS NULL) OR
    (status IN ('IN_PROGRESS','LEGACY') AND completed_at IS NULL AND deferred_at IS NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX workspace_onboarding_user_ws_version ON workspace_onboarding(user_id,workspace_id,flow_version);
--> statement-breakpoint
-- Existing memberships must not be unexpectedly forced through the new wizard.
-- New memberships created after this migration have no row and start at WELCOME.
INSERT INTO workspace_onboarding(user_id,workspace_id,membership_id,flow_version,status,last_step)
SELECT user_id,workspace_id,id,1,'LEGACY','WELCOME' FROM workspace_members;
