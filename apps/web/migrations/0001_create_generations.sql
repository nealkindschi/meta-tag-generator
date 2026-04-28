-- Migration number: 0001 	 2026-04-28T15:47:29.784Z
CREATE TABLE generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_input TEXT NOT NULL,
  keywords TEXT,
  title_position TEXT NOT NULL DEFAULT 'none',
  title_label TEXT NOT NULL DEFAULT '',
  serp_research INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_generations_created_at ON generations(created_at);
