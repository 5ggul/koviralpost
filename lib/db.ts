import { sql } from '@vercel/postgres';

export { sql };

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      keyword TEXT NOT NULL,
      format TEXT NOT NULL,
      content TEXT NOT NULL,
      is_saved INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS trends (
      id SERIAL PRIMARY KEY,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      keyword TEXT NOT NULL,
      buzz_count INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tone_presets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      examples TEXT NOT NULL DEFAULT '[]'
    )
  `;

  // 기본 프리셋 (없을 때만 삽입)
  await sql`
    INSERT INTO tone_presets (id, name, examples)
    VALUES
      (1, '기본 (내 말투)', '[]'),
      (2, '병맛체', '[]'),
      (3, '감성체', '[]')
    ON CONFLICT (id) DO NOTHING
  `;
}
