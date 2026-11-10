ALTER TABLE treasury_jobs DROP CONSTRAINT treasury_jobs_status_check;
ALTER TABLE treasury_jobs ADD CONSTRAINT treasury_jobs_status_check CHECK(status IN ('TODO','RETURNED','SUBMITTED','PENDING','APPROVED','PAYING','PAID','REJECTED','CANCELLED','EXPIRED'));
ALTER TABLE treasury_audit ALTER COLUMN actor_id DROP NOT NULL;
