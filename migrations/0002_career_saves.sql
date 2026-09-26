-- Per-user Jarvis Career save so Google sign-in restores progress across devices.
create table if not exists career_saves (
  user_id    text not null primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);
