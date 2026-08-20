import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class MemoriesService {
  private get client() {
    return getSupabaseClient()
  }

  /**
   * 保存记忆
   */
  async createMemory(data: {
    novel_id: string
    character_id?: string
    user_id?: string
    type: 'fact' | 'relationship' | 'event' | 'preference'
    content: string
    importance: number
    source_message_id?: string
  }) {
    const { data: memory, error } = await this.client
      .from('memories')
      .insert({
        novel_id: data.novel_id,
        character_id: data.character_id,
        user_id: data.user_id,
        type: data.type,
        content: data.content,
        importance: data.importance,
        source_message_id: data.source_message_id,
      })
      .select()
      .single()

    if (error) throw new Error(`创建记忆失败：${error.message}`)
    return memory
  }

  /**
   * 获取角色的关键记忆（按重要性排序）
   */
  async getCharacterMemories(
    characterId: string,
    limit: number = 10,
    minImportance: number = 0.7,
  ) {
    const { data, error } = await this.client
      .from('memories')
      .select('*')
      .eq('character_id', characterId)
      .gt('importance', minImportance)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`获取记忆失败：${error.message}`)
    return data || []
  }

  /**
   * 获取世界的记忆（通用设定）
   */
  async getWorldMemories(
    novelId: string,
    limit: number = 5,
  ) {
    const { data, error } = await this.client
      .from('memories')
      .select('*')
      .eq('novel_id', novelId)
      .is('character_id', null)
      .order('importance', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`获取世界记忆失败：${error.message}`)
    return data || []
  }

  /**
   * 删除旧记忆（为重要记忆腾出空间）
   */
  async pruneMemories(characterId: string, keepCount: number = 50) {
    const { data: allMemories, error } = await this.client
      .from('memories')
      .select('id')
      .eq('character_id', characterId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(`获取记忆列表失败：${error.message}`)

    if (allMemories && allMemories.length > keepCount) {
      const toDelete = allMemories.slice(keepCount)
      const ids = toDelete.map((m) => m.id)

      const { error: deleteError } = await this.client
        .from('memories')
        .delete()
        .in('id', ids)

      if (deleteError) throw new Error(`删除记忆失败：${deleteError.message}`)
      return toDelete.length
    }
    return 0
  }

  /**
   * 删除单条记忆
   */
  async deleteMemory(memoryId: number) {
    const { error } = await this.client
      .from('memories')
      .delete()
      .eq('id', memoryId)

    if (error) throw new Error(`删除记忆失败：${error.message}`)
    return true
  }
}
