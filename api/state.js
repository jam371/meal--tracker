const { neon } = require('@neondatabase/serverless');

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in Vercel.');
  return neon(process.env.DATABASE_URL);
}

const defaultState = { days: {}, weights: [], customMeals: [] };

async function ensureTable(sql) {
  await sql`
    create table if not exists meal_tracker_state (
      user_key text primary key,
      state jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
}

function userKey() {
  return process.env.MEAL_TRACKER_USER_KEY || 'default';
}

function cleanState(input) {
  return {
    days: input && input.days && typeof input.days === 'object' ? input.days : {},
    weights: Array.isArray(input?.weights) ? input.weights : [],
    customMeals: Array.isArray(input?.customMeals) ? input.customMeals : []
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sql = getSql();
    await ensureTable(sql);
    const key = userKey();

    if (req.method === 'GET') {
      const rows = await sql`select state from meal_tracker_state where user_key=${key} limit 1`;
      return res.status(200).json(rows[0]?.state || defaultState);
    }

    if (req.method === 'POST') {
      const state = cleanState(req.body || {});
      await sql`
        insert into meal_tracker_state (user_key, state)
        values (${key}, ${JSON.stringify(state)}::jsonb)
        on conflict (user_key) do update
        set state=excluded.state, updated_at=now()
      `;
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
};
