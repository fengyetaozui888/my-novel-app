import { getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client'

async function execSql(sql: string): Promise<boolean> {
  const { url } = getSupabaseCredentials()
  const key = getSupabaseServiceRoleKey()!
  const response = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  })
  if (!response.ok) { console.log('FAILED:', response.status, await response.text()); return false }
  return true
}

async function main() {
  const sql = `
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS era TEXT DEFAULT 'ancient';
    ALTER TABLE novels ADD COLUMN IF NOT EXISTS news_refreshed_date TEXT DEFAULT NULL;
    CREATE TABLE IF NOT EXISTS world_news (
      id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      novel_id varchar(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      content text NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS world_news_novel_id_idx ON world_news(novel_id);
  `
  console.log(await execSql(sql) ? 'Migration OK' : 'Migration FAILED')
}
main().catch(console.error)
