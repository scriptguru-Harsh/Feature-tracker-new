import pg from 'pg'
import { getSpreadsheetSeedFeatures, SPREADSHEET_SEED_MIGRATION } from './spreadsheetSeed.js'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const isLocalhost = /(?:localhost|127\.0\.0\.1|\[::1\])(?=[:/]|$)/i.test(process.env.DATABASE_URL)

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isLocalhost ? {} : { ssl: { rejectUnauthorized: false } }),
})

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'member',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS features (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      dev text NOT NULL DEFAULT 'Not Started',
      test text NOT NULL DEFAULT 'Not Started',
      dep text NOT NULL DEFAULT 'Not Deployed',
      requested_by text NOT NULL DEFAULT '',
      clinic text NOT NULL DEFAULT '',
      cred text NOT NULL DEFAULT 'Not Set',
      lead text NOT NULL DEFAULT '',
      inf text NOT NULL DEFAULT 'Not Informed',
      notes text NOT NULL DEFAULT '',
      deadline date,
      priority text NOT NULL DEFAULT 'Normal',
      created timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE features
      ADD COLUMN IF NOT EXISTS deadline date,
      ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Normal';
    CREATE TABLE IF NOT EXISTS feature_tracker_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

export async function seedSpreadsheetFeatures() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [SPREADSHEET_SEED_MIGRATION])
    const applied = await client.query(
      'SELECT 1 FROM feature_tracker_migrations WHERE name = $1',
      [SPREADSHEET_SEED_MIGRATION],
    )
    if (applied.rowCount) {
      await client.query('COMMIT')
      return
    }

    const seedFeatures = getSpreadsheetSeedFeatures()
    for (const feature of seedFeatures) {
      await client.query(`
        INSERT INTO features (
          name, dev, test, dep, requested_by, clinic, cred, lead, inf, notes,
          deadline, priority, created
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, COALESCE($13::date::timestamptz, now())
        )
      `, [
        feature.name,
        feature.dev,
        feature.test,
        feature.dep,
        feature.by,
        feature.clinic,
        feature.cred,
        feature.lead,
        feature.inf,
        feature.notes,
        feature.deadline,
        feature.priority,
        feature.sourceDate,
      ])
    }
    await client.query(
      'INSERT INTO feature_tracker_migrations (name) VALUES ($1)',
      [SPREADSHEET_SEED_MIGRATION],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function seedAdminIfEmpty(email, passwordHash) {
  if (!email || !passwordHash) return

  const { rows } = await pool.query('SELECT 1 FROM users LIMIT 1')
  if (rows.length) return

  await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
    [email.trim().toLowerCase(), passwordHash, 'admin'],
  )
}
