ALTER TABLE group_funds ADD COLUMN treasury_wallet_address varchar(42);
--> statement-breakpoint
ALTER TABLE expense_requests DROP CONSTRAINT expense_requests_status_check;
--> statement-breakpoint
ALTER TABLE expense_requests ADD CONSTRAINT expense_requests_status_check CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'REJECTED', 'CANCELLED', 'EXPIRED', 'SETTLED'));
--> statement-breakpoint
CREATE TABLE group_transfer_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES group_funds(id),
  user_id uuid NOT NULL REFERENCES users(id),
  request_id uuid REFERENCES expense_requests(id),
  kind varchar(20) NOT NULL CHECK (kind IN ('CONTRIBUTION', 'PAYMENT')),
  sender_address varchar(42) NOT NULL,
  recipient_address varchar(42) NOT NULL,
  amount_wei numeric(78,0) NOT NULL CHECK (amount_wei > 0),
  nonce integer NOT NULL CHECK (nonce >= 0),
  tx_hash varchar(66),
  status varchar(20) NOT NULL DEFAULT 'READY' CHECK (status IN ('READY', 'BROADCAST', 'CONFIRMED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX group_transfer_request_unique ON group_transfer_intents(request_id);
--> statement-breakpoint
CREATE UNIQUE INDEX group_transfer_hash_unique ON group_transfer_intents(tx_hash);
