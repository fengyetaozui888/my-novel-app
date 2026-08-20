import { getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const { url } = getSupabaseCredentials()
  const serviceRoleKey = getSupabaseServiceRoleKey()
  
  const adminClient = createClient(url, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  
  // Try to select all columns from characters
  const { data, error } = await adminClient
    .from('characters')
    .select('*')
    .limit(1)
  
  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Columns:', data ? Object.keys(data[0] || {}) : 'no data')
  }
  
  // Try to insert with status
  const { data: insertData, error: insertError } = await adminClient
    .from('characters')
    .insert({
      id: 'test_' + Date.now(),
      name: '测试',
      gender: 'male',
      source: '测试',
      personality: '开朗',
      background: '测试',
      status: 'burning'
    })
    .select()
  
  if (insertError) {
    console.log('Insert error:', insertError.message)
  } else {
    console.log('Insert success:', insertData)
  }
}
main().catch(console.error)
