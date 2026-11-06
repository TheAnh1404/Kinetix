-- Legacy databases upgraded through the member-only baseline may have the auth
-- tables but not workspace_invitations. Do not replay 0001: it also changes
-- credentials, sessions and indexes. Repair only this missing table.
CREATE TABLE IF NOT EXISTS workspace_invitations (
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
