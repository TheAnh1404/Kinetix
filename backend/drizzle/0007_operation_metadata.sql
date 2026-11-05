ALTER TABLE financial_operations ADD COLUMN asset text NOT NULL DEFAULT 'AVAX';
--> statement-breakpoint
ALTER TABLE financial_operations ADD COLUMN recipient varchar(42);
--> statement-breakpoint
ALTER TABLE financial_operations ADD COLUMN resource_type text;
--> statement-breakpoint
ALTER TABLE financial_operations ADD COLUMN resource_id text;
