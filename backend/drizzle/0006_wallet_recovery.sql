ALTER TABLE auth_challenges DROP CONSTRAINT IF EXISTS auth_challenges_purpose_check;
--> statement-breakpoint
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenges_purpose_check CHECK (purpose IN ('REGISTER','LOGIN','LINK','REAUTH','RECOVERY'));
--> statement-breakpoint
CREATE TABLE wallet_recoveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 old_wallet varchar(42) NOT NULL, new_wallet varchar(42) NOT NULL UNIQUE,
 deployment_ref text NOT NULL, proof_challenge_id uuid NOT NULL UNIQUE REFERENCES auth_challenges(id),
 status text NOT NULL DEFAULT 'PROVEN', created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX recovery_one_active_per_user ON wallet_recoveries(user_id) WHERE completed_at IS NULL;
--> statement-breakpoint
CREATE TABLE recovery_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recovery_id uuid NOT NULL REFERENCES wallet_recoveries(id),
 vault_id uuid NOT NULL REFERENCES vaults(id), epoch text NOT NULL, required_approvals integer NOT NULL,
 status text NOT NULL DEFAULT 'PENDING', tx_hash varchar(66), applied_epoch text
);
--> statement-breakpoint
CREATE UNIQUE INDEX recovery_step_vault_unique ON recovery_steps(recovery_id, vault_id);
--> statement-breakpoint
CREATE TABLE wallet_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 address varchar(42) NOT NULL UNIQUE, recovery_id uuid NOT NULL REFERENCES wallet_recoveries(id),
 revoked_at timestamptz NOT NULL DEFAULT now()
);
