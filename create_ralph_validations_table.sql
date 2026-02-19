-- Ralph Validation History Table
-- Stores hourly validation results for dashboard data integrity monitoring

CREATE TABLE IF NOT EXISTS ralph_validations (
    id SERIAL PRIMARY KEY,
    run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds DECIMAL(6,1) DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    fixes INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'UNKNOWN',
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE ralph_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_validations" ON ralph_validations FOR SELECT USING (true);
CREATE POLICY "anon_insert_validations" ON ralph_validations FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_delete_validations" ON ralph_validations FOR DELETE USING (true);

-- Index on timestamp for fast queries
CREATE INDEX idx_ralph_validations_timestamp ON ralph_validations (run_timestamp DESC);

-- Auto-cleanup: keep only last 30 days of records (run manually or via cron)
-- DELETE FROM ralph_validations WHERE run_timestamp < NOW() - INTERVAL '30 days';
