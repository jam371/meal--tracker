-- This table is the persistence layer used by the current Meal Tracker UI.
-- It safely stores the complete app state in Neon/Postgres while preserving
-- the existing meal-plan data and UI structure.
create table if not exists meal_tracker_state (
  user_key text primary key,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meal_tracker_state_updated_idx on meal_tracker_state(updated_at desc);
