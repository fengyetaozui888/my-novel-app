import { getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client'

async function execSql(sql: string): Promise<boolean> {
  const { url } = getSupabaseCredentials()
  const serviceRoleKey = getSupabaseServiceRoleKey()!
  const response = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })
  if (!response.ok) {
    console.log('SQL failed:', response.status, await response.text())
    return false
  }
  return true
}

async function main() {
  const sql = `
    CREATE TABLE IF NOT EXISTS group_chats (
      id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      novel_id varchar(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      name varchar(255) NOT NULL,
      member_ids text NOT NULL DEFAULT '[]',
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS group_chats_novel_id_idx ON group_chats(novel_id);
    CREATE TABLE IF NOT EXISTS group_messages (
      id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id varchar(36) NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
      role varchar(20) NOT NULL,
      character_id varchar(36),
      sender_name varchar(255),
      content text NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS group_messages_group_id_idx ON group_messages(group_id);
  `
  const ok = await execSql(sql)
  if (ok) console.log('Tables created successfully')
}
main().catch(console.error)
