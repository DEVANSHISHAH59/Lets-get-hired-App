-- ============================================================
-- LETS GET HIRED - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Applications tracker
create table if not exists applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null default 'devanshi',
  title        text not null,
  company      text not null,
  role_type    text not null default 'Trust & Safety',
  source       text,
  status       text not null default 'Saved',
  date_applied date default current_date,
  posted_date  text,
  salary       text,
  job_url      text,
  contact_name text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Agency contacts log
create table if not exists agency_contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null default 'devanshi',
  agency_name  text not null,
  contact_name text,
  contacted_at date default current_date,
  notes        text,
  created_at   timestamptz default now()
);

-- CV data
create table if not exists cv_data (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null default 'devanshi',
  full_name    text default 'Devanshi',
  contact_line text default 'Dublin, Ireland | LinkedIn',
  summary      text,
  skills       text,
  exp1_title   text,
  exp1_company text,
  exp1_dates   text,
  exp1_bullets text,
  exp2_title   text,
  exp2_company text,
  exp2_dates   text,
  exp2_bullets text,
  education    text,
  updated_at   timestamptz default now(),
  unique(user_id)
);

-- Insert default CV
insert into cv_data (user_id, full_name, contact_line, summary, skills, exp1_title, exp1_company, exp1_dates, exp1_bullets, exp2_title, exp2_company, exp2_dates, exp2_bullets, education)
values (
  'devanshi',
  'Devanshi',
  'Dublin, Ireland | devanshi@email.com | LinkedIn',
  'Trust & Safety AI Analyst with 3+ years in LLM evaluation, content safety, abuse detection, and product policy. MSc Business Analytics (Dublin Business School). CSPO certified. Experienced sole market owner across 4 markets. Immediately available.',
  'LLM Evaluation · Trust & Safety · Content Policy · SQL · Python/Pandas · Data Visualisation · Stakeholder Management · Agile/CSPO · EU AI Act · Abuse Detection',
  'Trust & Safety AI Analyst',
  'Meta (via Covalen Solutions)',
  '2022 – 2025',
  '• Sole market owner for regional content safety assessments across 4 markets\n• LLM evaluation, spam, malware, and ID verification abuse detection\n• Built data visualisation dashboards for policy reporting\n• Supported international markets with policy enforcement decisions',
  'Business Analyst',
  'Sunrise Enterprise',
  '2020 – 2022',
  '• HRM software implementation and requirements gathering\n• Stakeholder workshops and process documentation',
  'MSc Business Analytics — Dublin Business School\nCSPO Certification — Scrum Alliance\nIIT Roorkee PM Certification (in progress)'
) on conflict (user_id) do nothing;

-- Enable Row Level Security (optional - open for now)
alter table applications    enable row level security;
alter table agency_contacts enable row level security;
alter table cv_data         enable row level security;

-- Allow all operations for now (tighten later with auth)
create policy "allow all" on applications    for all using (true) with check (true);
create policy "allow all" on agency_contacts for all using (true) with check (true);
create policy "allow all" on cv_data         for all using (true) with check (true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_updated_at
  before update on applications
  for each row execute function update_updated_at();
