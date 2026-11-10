CREATE TABLE treasury_policies (jar_id uuid PRIMARY KEY REFERENCES treasury_jars(id), config jsonb NOT NULL);
CREATE TABLE treasury_jobs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), jar_id uuid NOT NULL REFERENCES treasury_jars(id),
 subject_id uuid NOT NULL REFERENCES users(id), kind varchar(20) NOT NULL CHECK(kind IN ('SUPPORT','CHORE','CONTRIBUTION','PAYOUT')),
 title text NOT NULL, description text NOT NULL DEFAULT '', amount_wei numeric(78,0) NOT NULL CHECK(amount_wei > 0),
 recipient varchar(42) NOT NULL, status varchar(16) NOT NULL CHECK(status IN ('TODO','RETURNED','SUBMITTED','PENDING','APPROVED','PAYING','PAID','REJECTED','CANCELLED')),
 approvals jsonb NOT NULL DEFAULT '[]', round integer, transfer_id uuid REFERENCES treasury_transfers(id), proof text,
 proof_expires_at timestamptz, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX treasury_job_transfer ON treasury_jobs(transfer_id);
CREATE UNIQUE INDEX treasury_round_contribution ON treasury_jobs(jar_id, round, subject_id) WHERE kind='CONTRIBUTION';
CREATE UNIQUE INDEX treasury_round_payout ON treasury_jobs(jar_id, round) WHERE kind='PAYOUT';
CREATE INDEX treasury_jobs_workspace ON treasury_jobs(workspace_id, created_at);
CREATE TABLE treasury_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id), entity_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
