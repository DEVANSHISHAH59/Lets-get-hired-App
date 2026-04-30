-- Run this in your Supabase SQL Editor (https://supabase.com → your project → SQL Editor)
-- This creates the live_jobs cache table

CREATE TABLE IF NOT EXISTS live_jobs (
  id          TEXT PRIMARY KEY,
  title       TEXT,
  company     TEXT,
  location    TEXT,
  salary      TEXT,
  posted      TEXT,
  url         TEXT,
  desc        TEXT,
  source      TEXT,
  fetched_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public reads and writes (app uses anon key)
ALTER TABLE live_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_live_jobs" ON live_jobs
  FOR ALL USING (true) WITH CHECK (true);
