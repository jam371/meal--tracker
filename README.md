# Meal Tracker

Meal Tracker is a lightweight progressive web app for recording daily meals, tracking nutrition, and monitoring weight over time. It is designed around a fixed daily meal plan with main and alternative meal choices, plus support for additional custom meals.

## What the app does

- Tracks food eaten for each meal and records actual quantities.
- Calculates calories, protein, carbohydrates, and fat from the recorded quantities.
- Supports main and alternative options for each planned meal.
- Allows users to mark foods as eaten and add optional meal notes.
- Shows daily summaries, seven-day adherence, logging streaks, and history.
- Records weight entries with notes and displays a weight trend.
- Lets users create reusable additional meals and add them to a day's log.
- Loads saved state when the app opens and persists changes when the user clicks **Save**.

The Save button is disabled when there are no unsaved changes and becomes available after the user edits the log, weight entries, or custom meals.

## Architecture overview

```text
Browser
	index.html + styles.css + app.js
			 |
			 | GET /api/state
			 | POST /api/state
			 v
Vercel serverless function
	api/state.js
			 |
			 v
Neon PostgreSQL
	meal_tracker_state
```

### Frontend

- `index.html` contains the page structure and controls.
- `styles.css` contains the responsive layout and visual styles.
- `app.js` contains the meal plans, UI rendering, client-side state, change tracking, and Save interaction.
- The frontend keeps the current application state in memory. It does not store the app state in browser `localStorage`.

### API

- `api/state.js` is a Vercel serverless function exposed at `/api/state`.
- `GET /api/state` loads the saved state.
- `POST /api/state` validates the top-level state shape and upserts the complete state document.
- The API uses `@neondatabase/serverless` to connect to Neon.

### Database

The app stores one JSON document per configured user key in the `meal_tracker_state` table:

- `user_key`: primary key for the app user or installation.
- `state`: JSONB document containing `days`, `weights`, and `customMeals`.
- `created_at` and `updated_at`: persistence timestamps.

The schema is defined in `NEON-MIGRATION.sql`. The API also creates the table if it does not already exist.

## Configuration

Copy `.env.example` to `.env.local` for local development and replace the placeholder values:

```sh
cp .env.example .env.local
```

The API reads these server-side environment variables from `process.env`:

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `MEAL_TRACKER_USER_KEY`: optional stable identifier for this private single-user deployment. It defaults to `default`.

Keep `DATABASE_URL` server-side. Do not place it in frontend code or commit `.env.local` to the repository. `.env` and `.env.*` files are ignored by Git except for the committed `.env.example` template.

## Deployment

Deploy the repository root to Vercel. In the Vercel project settings, add `DATABASE_URL` and `MEAL_TRACKER_USER_KEY` under **Settings > Environment Variables** for the environments where the app runs. Vercel injects those values into the `/api/state` serverless function at runtime.

Vercel serves the static frontend and the `/api/state` serverless function from the same deployment. Before using the app, run the SQL in `NEON-MIGRATION.sql` if you want to create the table manually. The API can also create the table automatically on its first request.

## Project files

| Path | Purpose |
| --- | --- |
| `index.html` | Application markup |
| `styles.css` | Responsive styles |
| `app.js` | Client-side application logic |
| `api/state.js` | Vercel API for loading and saving state |
| `NEON-MIGRATION.sql` | Neon/Postgres table definition |
| `manifest.webmanifest` | PWA metadata |
| `service-worker.js` | Service worker registration and caching support |
| `vercel.json` | Vercel project configuration |
