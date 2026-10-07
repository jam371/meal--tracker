# Meal Tracker — Neon + Vercel

This version keeps the existing Meal Tracker interface but replaces browser-only localStorage persistence with a Vercel serverless API backed by Neon/Postgres.

## Vercel environment variables

Set:

- `DATABASE_URL` = your Neon connection string
- `MEAL_TRACKER_USER_KEY` = any long random string for this private single-user app (optional; defaults to `default`)

Do not put `DATABASE_URL` in the browser or in GitHub.

## Database

`NEON-MIGRATION.sql` creates the persistence table. The API also creates it automatically if it does not exist.

## Deploy

Deploy the project root to Vercel. Vercel serves `index.html` and `/api/state.js` from the same deployment.

The app automatically loads saved data from Neon and automatically saves changes. The **Save to database** button forces an immediate save.
