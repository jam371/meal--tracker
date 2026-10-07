-- Meal Tracker: normalized Neon/Postgres schema
-- This stores users, plan definitions, daily logs, food completion/quantities,
-- custom meals and weight history in separate relational tables.

create table if not exists app_users (
  id bigserial primary key,
  user_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meal_plans (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  target_calories numeric(8,2) not null,
  target_protein_g numeric(8,2) not null,
  target_carbs_g numeric(8,2) not null,
  target_fat_g numeric(8,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists plan_meals (
  id bigserial primary key,
  meal_plan_id bigint not null references meal_plans(id) on delete cascade,
  slot_number smallint not null check (slot_number between 1 and 5),
  name text not null,
  subtitle text,
  unique (meal_plan_id, slot_number)
);

create table if not exists plan_foods (
  id bigserial primary key,
  plan_meal_id bigint not null references plan_meals(id) on delete cascade,
  food_order smallint not null,
  name text not null,
  planned_amount numeric(10,2) not null,
  unit text not null,
  calories numeric(10,2) not null default 0,
  protein_g numeric(10,2) not null default 0,
  carbs_g numeric(10,2) not null default 0,
  fat_g numeric(10,2) not null default 0,
  unique (plan_meal_id, food_order)
);

create table if not exists daily_logs (
  id bigserial primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists daily_meal_choices (
  id bigserial primary key,
  daily_log_id bigint not null references daily_logs(id) on delete cascade,
  slot_number smallint not null check (slot_number between 1 and 5),
  meal_plan_id bigint not null references meal_plans(id),
  meal_note text,
  unique (daily_log_id, slot_number)
);

create table if not exists daily_food_logs (
  id bigserial primary key,
  daily_log_id bigint not null references daily_logs(id) on delete cascade,
  plan_food_id bigint not null references plan_foods(id),
  actual_amount numeric(10,2) not null,
  eaten boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (daily_log_id, plan_food_id)
);

create table if not exists custom_meals (
  id bigserial primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  name text not null,
  subtitle text not null default 'Custom meal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists custom_meal_foods (
  id bigserial primary key,
  custom_meal_id bigint not null references custom_meals(id) on delete cascade,
  food_order smallint not null,
  name text not null,
  planned_amount numeric(10,2) not null,
  unit text not null,
  calories numeric(10,2) not null default 0,
  protein_g numeric(10,2) not null default 0,
  carbs_g numeric(10,2) not null default 0,
  fat_g numeric(10,2) not null default 0,
  unique (custom_meal_id, food_order)
);

create table if not exists daily_custom_meals (
  id bigserial primary key,
  daily_log_id bigint not null references daily_logs(id) on delete cascade,
  custom_meal_id bigint references custom_meals(id) on delete set null,
  meal_name text not null,
  meal_note text,
  meal_order smallint not null,
  unique (daily_log_id, meal_order)
);

create table if not exists daily_custom_food_logs (
  id bigserial primary key,
  daily_custom_meal_id bigint not null references daily_custom_meals(id) on delete cascade,
  custom_meal_food_id bigint references custom_meal_foods(id) on delete set null,
  food_name text not null,
  planned_amount numeric(10,2) not null,
  unit text not null,
  calories numeric(10,2) not null default 0,
  protein_g numeric(10,2) not null default 0,
  carbs_g numeric(10,2) not null default 0,
  fat_g numeric(10,2) not null default 0,
  actual_amount numeric(10,2) not null,
  eaten boolean not null default false,
  unique (daily_custom_meal_id, food_name, unit)
);

create table if not exists weight_entries (
  id bigserial primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric(6,2) not null check (weight_kg > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists daily_logs_user_date_idx on daily_logs(user_id, log_date desc);
create index if not exists daily_food_logs_day_idx on daily_food_logs(daily_log_id);
create index if not exists custom_meals_user_idx on custom_meals(user_id);
create index if not exists weight_entries_user_date_idx on weight_entries(user_id, entry_date desc);

-- Seed the two fixed plan definitions used by the app.
insert into meal_plans (code, name, target_calories, target_protein_g, target_carbs_g, target_fat_g)
values
  ('main', 'Main Day', 2515, 186, 328, 51),
  ('alt', 'Alternative Day', 2515, 186, 328, 51)
on conflict (code) do update set
  name = excluded.name,
  target_calories = excluded.target_calories,
  target_protein_g = excluded.target_protein_g,
  target_carbs_g = excluded.target_carbs_g,
  target_fat_g = excluded.target_fat_g;

-- The API seeds/repairs plan meals and foods from the app's authoritative meal definitions
-- so this migration does not duplicate the large food lists.
