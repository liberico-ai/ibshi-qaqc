CREATE TABLE IF NOT EXISTS sys_cronjob_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INT,
    result_details JSONB,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sys_cronjob_logs_name ON sys_cronjob_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_sys_cronjob_logs_started_at ON sys_cronjob_logs(started_at DESC);
