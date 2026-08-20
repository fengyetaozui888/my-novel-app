import { getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client'
async function main() {
  const { url } = getSupabaseCredentials()
  const key = getSupabaseServiceRoleKey()!
  const r = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `
      ALTER TABLE novels ADD COLUMN IF NOT EXISTS world_info TEXT DEFAULT '';
      ALTER TABLE novels ADD COLUMN IF NOT EXISTS world_score INT DEFAULT NULL;
    ` })
  })
  console.log(r.ok ? 'OK' : await r.text())
}
main().catch(console.error)
