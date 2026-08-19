import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

export type AffinityLevel =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'intimate'

export const AFFINITY_LEVELS: { key: AffinityLevel; label: string; min: number }[] = [
  { key: 'stranger', label: '陌生', min: 0 },
  { key: 'acquaintance', label: '相识', min: 20 },
  { key: 'friend', label: '朋友', min: 40 },
  { key: 'close_friend', label: '密友', min: 60 },
  { key: 'intimate', label: '知己', min: 80 },
]

@Injectable()
export class AffinityService {
  private get client() {
    return getSupabaseClient()
  }

  /** 单用户模式：取 users 表中的唯一用户 id */
  private async getUserId(): Promise<string> {
    const { data, error } = await this.client
      .from('users')
      .select('id')
      .limit(1)
    if (error) throw new Error(`查询用户失败: ${error.message}`)
    if (!data || data.length === 0) {
      // 先创建默认用户再取 id
      const uid = `U${Date.now().toString(36).toUpperCase()}`
      const { data: created, error: insertError } = await this.client
        .from('users')
        .insert({ uid, nickname: '无名氏', credits: 1000 })
        .select()
        .single()
      if (insertError) throw new Error(`创建用户失败: ${insertError.message}`)
      return created.id
    }
    return data[0].id
  }

  levelOf(value: number): AffinityLevel {
    let level: AffinityLevel = 'stranger'
    for (const item of AFFINITY_LEVELS) {
      if (value >= item.min) level = item.key
    }
    return level
  }

  /** 获取某角色与用户的亲密度（不存在则初始化为 50） */
  async getAffinity(characterId: string): Promise<{ value: number; level: AffinityLevel }> {
    const userId = await this.getUserId()
    const { data } = await this.client
      .from('affinity')
      .select('value, level')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle()

    const value = data?.value ?? 50
    return { value, level: this.levelOf(value) }
  }

  /** 调整亲密度（delta 可正可负），并返回最新值 */
  async adjustAffinity(characterId: string, delta: number): Promise<{ value: number; level: AffinityLevel }> {
    const userId = await this.getUserId()
    const { data: existing } = await this.client
      .from('affinity')
      .select('id, value')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle()

    const current = existing?.value ?? 50
    const next = Math.max(0, Math.min(100, current + delta))
    const level = this.levelOf(next)

    if (existing) {
      const { error } = await this.client
        .from('affinity')
        .update({ value: next, level, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw new Error(`亲密度更新失败: ${error.message}`)
    } else {
      const { error } = await this.client
        .from('affinity')
        .insert({ user_id: userId, character_id: characterId, value: next, level })
      if (error) throw new Error(`亲密度创建失败: ${error.message}`)
    }
    return { value: next, level }
  }

  /** 亲密度图鉴：按 novelId 返回所有角色的亲密度 */
  async getBook(novelId: string) {
    const userId = await this.getUserId()
    const { data: characters, error } = await this.client
      .from('characters')
      .select('id, name, category, gender, tagline, portrait_key, avatar_key')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`查询角色失败: ${error.message}`)

    const { data: affinities } = await this.client
      .from('affinity')
      .select('character_id, value, level')
      .eq('user_id', userId)

    const map = new Map<string, number>()
    for (const item of affinities ?? []) {
      map.set(item.character_id, item.value)
    }

    return (characters ?? []).map((c) => {
      const value = map.get(c.id) ?? 50
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        gender: c.gender,
        tagline: c.tagline,
        hasPortrait: !!c.portrait_key,
        affinityValue: value,
        affinityLevel: this.levelOf(value),
      }
    })
  }
}
