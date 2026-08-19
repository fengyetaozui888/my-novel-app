import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '../storage/database/supabase-client'
import { LLMClient, Config } from 'coze-coding-dev-sdk'

@Injectable()
export class CafeInteractionService {
  async getInteractions(characterId?: string) {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('cafe_interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (characterId) {
      query = query.or(`character_a_id.eq.${characterId},character_b_id.eq.${characterId}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('getInteractions error:', error)
      return []
    }
    return data || []
  }

  async deleteInteraction(id: number) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('cafe_interactions').delete().eq('id', id)
    if (error) {
      console.error('deleteInteraction error:', error)
      return null
    }
    return { id }
  }

  async generateInteraction() {
    const supabase = getSupabaseClient()

    // Get all characters
    const { data: characters, error } = await supabase
      .from('characters')
      .select('id, name, persona, principles, novel_id')
      .limit(50)

    if (error || !characters || characters.length < 2) {
      return { error: '需要至少两个角色才能产生互动' }
    }

    // Randomly select 2 different characters
    const idxA = Math.floor(Math.random() * characters.length)
    let idxB = Math.floor(Math.random() * characters.length)
    while (idxB === idxA) {
      idxB = Math.floor(Math.random() * characters.length)
    }

    const charA = characters[idxA]
    const charB = characters[idxB]

    // Get novel names
    const novelA = charA.novel_id
      ? await supabase.from('novels').select('name').eq('id', charA.novel_id).single()
      : null
    const novelB = charB.novel_id
      ? await supabase.from('novels').select('name').eq('id', charB.novel_id).single()
      : null

    const novelAName = novelA?.data?.name || null
    const novelBName = novelB?.data?.name || null

    // Generate interaction using LLM
    const prompt = `你是时空咖啡厅的AI导演。现在有两个角色在咖啡厅相遇：

角色A：${charA.name}（来自${novelAName || '未知世界'}）
人设：${charA.persona || '未设定'}
行事准则：${charA.principles || '未设定'}

角色B：${charB.name}（来自${novelBName || '未知世界'}）
人设：${charB.persona || '未设定'}
行事准则：${charB.principles || '未设定'}

请根据两个角色的性格和人设，生成一段他们在时空咖啡厅的互动。可以是：
- 对话（互相聊天）
- 写信（一个角色给另一个角色写信）
- 留言（在便利贴墙上给对方留言）
- 偶遇（在咖啡厅偶然相遇的场景）

要求：
1. 完全符合两个角色的性格和人设
2. 有趣、有温度，体现跨世界相遇的奇妙感
3. 内容长度100-300字
4. 只输出互动内容，不要加任何前缀说明

直接输出互动内容：`

    try {
      const config = new Config()
      const llmClient = new LLMClient(config)
      const response = await llmClient.invoke(
        [{ role: 'user' as const, content: prompt }],
        { model: 'doubao-seed-2-0-mini-260215', temperature: 0.8 },
      )
      const content = (response?.content || '').trim()

      // Save to database
      const { data, error: insertError } = await supabase
        .from('cafe_interactions')
        .insert({
          character_a_id: charA.id,
          character_a_name: charA.name,
          character_b_id: charB.id,
          character_b_name: charB.name,
          novel_a_name: novelAName,
          novel_b_name: novelBName,
          content: content.trim(),
          interaction_type: 'message',
        })
        .select()
        .single()

      if (insertError) {
        console.error('insert interaction error:', insertError)
        return { error: '保存互动失败' }
      }

      return data
    } catch (err) {
      console.error('generate interaction error:', err)
      return { error: '生成互动失败' }
    }
  }
}
