ALTER TABLE vaults ADD COLUMN IF NOT EXISTS onchain_vault_address varchar(42);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vault_address_index ON vaults (onchain_chain_id, onchain_vault_address);
