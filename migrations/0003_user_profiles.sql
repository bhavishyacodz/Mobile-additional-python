-- One-time Google onboarding (age + display name). Additive; does not touch
-- Better Auth user/session/account tables or career_saves.
create table if not exists user_profiles (
  user_id      text primary key,
  display_name text,
  age          integer not null,
  onboarded_at timestamptz not null default now()
);
