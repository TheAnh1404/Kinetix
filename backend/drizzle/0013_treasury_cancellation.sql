ALTER TABLE treasury_transfers DROP CONSTRAINT treasury_transfers_status_check;
ALTER TABLE treasury_transfers ADD CONSTRAINT treasury_transfers_status_check CHECK (status IN ('READY','SUBMITTED','CONFIRMED','REVERTED','CANCELLED'));
