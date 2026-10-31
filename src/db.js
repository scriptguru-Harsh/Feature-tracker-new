import pg from 'pg'

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
      created timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)
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
