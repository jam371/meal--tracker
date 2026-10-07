# Meal Tracker — normalized Neon + Vercel

This version stores the app data in separate Neon/Postgres tables instead of one JSON blob.

## Tables

- `app_users` — private app user key
- `meal_plans` — Main / Alternative plan definitions and daily targets
- `plan_meals` — the five meal slots for each plan
- `plan_foods` — the foods and nutrition values belonging to each planned meal
- `daily_logs` — one row per user per date
- `daily_meal_choices` — which plan (Main/Alternative) was selected for each slot and its note
- `daily_food_logs` — actual quantity and eaten/completed state for each planned food
- `custom_meals` — saved additional meal definitions
- `custom_meal_foods` — foods/nutrition inside saved additional meals
- `daily_custom_meals` — additional meals added to a particular day
- `daily_custom_food_logs` — actual quantities and eaten state for additional-meal foods
- `weight_entries` — weight history

The API keeps the existing front end format, but translates it into these relational tables on save and rebuilds the front-end state on load.

## Vercel environment variables

Set:

- `DATABASE_URL` = your Neon connection string
- `MEAL_TRACKER_USER_KEY` = a long random string for your private single-user app

Do not put `DATABASE_URL` in the browser or GitHub.

## Database

Run `NEON-MIGRATION-NORMALIZED.sql` in Neon. The API also creates/repairs the schema and seeds the Main/Alternative plan definitions automatically, so the SQL migration is safe to run first.

The two plan rows both use the app-wide daily target of **2,515 kcal / 186g protein / 328g carbs / 51g fat**. The Alternative plan's displayed screenshot totals are not used as a separate daily target.

## Existing data

The current app previously stored everything in one `meal_tracker_state` JSON row. This normalized version does not depend on that table. If you already have important data in the old table, export/backup it before deploying this version; the new API will not automatically import that old JSON blob.

## Deploy

Deploy the project root to Vercel. Vercel serves `index.html` and `/api/state.js` from the same deployment.

The app still auto-saves changes and the **Save to database** button forces an immediate save, but Neon now receives separate relational records rather than one large JSON state object.
