CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  task TEXT NOT NULL,
  mode TEXT NOT NULL,
  verdict TEXT NOT NULL,
  results_json TEXT NOT NULL,
  verification_json TEXT NOT NULL,
  usage_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_task_id ON runs (task_id);
CREATE INDEX IF NOT EXISTS idx_runs_status_created_at ON runs (verdict, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC);
