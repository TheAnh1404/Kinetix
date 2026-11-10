CREATE TABLE treasury_attempts (
  tx_hash varchar(66) PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES treasury_transfers(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX treasury_attempts_transfer ON treasury_attempts(transfer_id);
INSERT INTO treasury_attempts(tx_hash, transfer_id) SELECT tx_hash, id FROM treasury_transfers WHERE tx_hash IS NOT NULL;
