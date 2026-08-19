import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '../storage/database/supabase-client'

@Injectable()
export class CafeService {
  async getMessages() {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('cafe_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  async createMessage(data: {
    character_id: string
    character_name: string
    novel_id: string
    novel_name: string
    content: string
  }) {
    const supabase = getSupabaseClient()
    const { data: result, error } = await supabase
      .from('cafe_messages')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return result
  }

  async deleteMessage(id: number) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('cafe_messages')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }
}
