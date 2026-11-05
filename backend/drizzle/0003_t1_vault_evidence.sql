-- Không backfill suy đoán: mapping cũ thiếu receipt tiếp tục bị chặn giao dịch.
ALTER TYPE chore_status ADD VALUE IF NOT EXISTS 'CANCELLED';
--> statement-breakpoint
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS onchain_creation_tx varchar(66);
--> statement-breakpoint
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS onchain_creation_log_index integer;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS vault_creation_event_unique ON vaults (onchain_chain_id, onchain_hub, onchain_creation_tx, onchain_creation_log_index);
--> statement-breakpoint
ALTER TABLE vaults ADD CONSTRAINT vault_creation_evidence_pair CHECK ((onchain_creation_tx IS NULL AND onchain_creation_log_index IS NULL) OR (onchain_creation_tx IS NOT NULL AND onchain_creation_log_index IS NOT NULL AND onchain_creation_tx ~ '^0x[0-9a-f]{64}$' AND onchain_creation_log_index >= 0));
