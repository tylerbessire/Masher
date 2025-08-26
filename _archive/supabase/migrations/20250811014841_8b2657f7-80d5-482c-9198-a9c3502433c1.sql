-- Enable RLS on critical tables and revoke broad privileges
-- This migration tightens data access so only service-role code paths can read/write

-- 1) Enable Row Level Security
alter table if exists public.mashup_jobs enable row level security;
alter table if exists public.mashup_cache enable row level security;

-- 2) Revoke default privileges from anon/authenticated (RLS blocks anyway, this is defense-in-depth)
revoke all on table public.mashup_jobs from anon, authenticated;
revoke all on table public.mashup_cache from anon, authenticated;

-- 3) Ensure only service_role can access (service_role bypasses RLS, but keep explicit grant for clarity)
-- Note: service_role already has elevated privileges in Supabase. These grants are explicit and harmless.
grant select, insert, update, delete on table public.mashup_jobs to service_role;
grant select, insert, update, delete on table public.mashup_cache to service_role;