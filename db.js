import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

export const sql = neon(process.env.DATABASE_URL)

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS journals (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      subtitle    TEXT DEFAULT '',
      cover       TEXT DEFAULT '',
      ink         TEXT DEFAULT '#5a2a18',
      monogram    TEXT DEFAULT '',
      mono        TEXT DEFAULT '',
      last_opened TEXT DEFAULT 'today',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS pages (
      id         TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
      page_num   INTEGER NOT NULL,
      date       TEXT,
      content    JSONB DEFAULT '{"strokes":[],"texts":[],"images":[]}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}
