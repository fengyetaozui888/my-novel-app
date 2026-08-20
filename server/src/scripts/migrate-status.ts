import { getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client'

async function main() {
  const { url } = getSupabaseCredentials()
  const serviceRoleKey = getSupabaseServiceRoleKey()
  
  if (!serviceRoleKey) {
    console.log('No service role key')
    return
  }
  
  // Try to use the Supabase SQL endpoint (pg-meta)
  // The endpoint is: /rest/v1/ for PostgREST
  // But there's also /pg/ for pg-meta
  
  // Try different endpoints
  const endpoints = [
    '/pg/query',
    '/pg/sql',
    '/rest/v1/rpc',
    '/functions/v1/exec_sql',
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${url}${endpoint}`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'ALTER TABLE characters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;'
        })
      })
      
      console.log(`${endpoint}: ${response.status}`)
      if (response.ok) {
        const result = await response.json()
        console.log('Success!', result)
        break
      }
    } catch (e) {
      console.log(`${endpoint}: Error - ${e}`)
    }
  }
}
main().catch(console.error)
