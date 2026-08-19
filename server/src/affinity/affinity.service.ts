import { Injectable, BadRequestException } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { UploadService } from '../upload/upload.service'

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
  private uploadService: UploadService

  constructor() {
    this.uploadService = new UploadService()
  }

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

  /** 亲密度图鉴：按 novelId 返回所有角色的亲密度（按分类分组） */
  async getBook(novelId: string) {
    const userId = await this.getUserId()
    const { data: characters, error } = await this.client
      .from('characters')
      .select('id, name, category, gender, tagline, portrait_key')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`查询角色失败: ${error.message}`)

    const { data: affinities } = await this.client
      .from('affinity')
      .select('character_id, value, level, user_persona, affinity_edit_available')
      .eq('user_id', userId)

    const map = new Map<string, { value: number; persona: string | null; editable: boolean }>()
    for (const item of affinities ?? []) {
      map.set(item.character_id, {
        value: item.value,
        persona: item.user_persona,
        editable: !!item.affinity_edit_available,
      })
    }

    const grouped: Record<string, any[]> = { protagonist: [], supporting: [], minor: [] }
    for (const c of characters ?? []) {
      const info = map.get(c.id)
      const value = info?.value ?? 50
      let portrait_url: string | null = null
      if (c.portrait_key) {
        try {
          portrait_url = await this.uploadService.getPresignedUrl(c.portrait_key)
        } catch {
          portrait_url = null
        }
      }
      const item = {
        id: c.id,
        name: c.name,
        category: c.category,
        gender: c.gender,
        tagline: c.tagline,
        portrait_url,
        hasPortrait: !!c.portrait_key,
        affinity: value,
        affinityLevel: this.levelOf(value),
        userPersona: info?.persona ?? null,
        affinityEditAvailable: info?.editable ?? false,
      }
      const key = c.category === 'protagonist' ? 'protagonist' : c.category === 'supporting' ? 'supporting' : 'minor'
      grouped[key].push(item)
    }
    return grouped
  }

  /** 更新"我"在该角色眼中的专属人设，并授予一次修改亲密度的机会 */
  async updateUserPersona(characterId: string, persona: string) {
    const userId = await this.getUserId()
    const trimmed = (persona ?? '').trim()
    if (!trimmed) throw new Error('人设不能为空')

    const { data: existing } = await this.client
      .from('affinity')
      .select('id, value')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle()

    if (existing) {
      const { error } = await this.client
        .from('affinity')
        .update({
          user_persona: trimmed,
          affinity_edit_available: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (error) throw new Error(`人设更新失败: ${error.message}`)
      return { value: existing.value, level: this.levelOf(existing.value), userPersona: trimmed, affinityEditAvailable: true }
    }

    // 无记录时先初始化
    const { data: created, error: insertError } = await this.client
      .from('affinity')
      .insert({
        user_id: userId,
        character_id: characterId,
        novel_id: await this.getNovelIdOf(characterId),
        value: 50,
        level: 'friend',
        user_persona: trimmed,
        affinity_edit_available: true,
      })
      .select('value')
      .single()
    if (insertError) throw new Error(`人设创建失败: ${insertError.message}`)
    const value = created?.value ?? 50
    return { value, level: this.levelOf(value), userPersona: trimmed, affinityEditAvailable: true }
  }

  /** 使用一次性的亲密度修改机会（仅在更改人设后可用） */
  async setAffinityByOpportunity(characterId: string, value: number) {
    const userId = await this.getUserId()
    const { data: existing } = await this.client
      .from('affinity')
      .select('id, value, affinity_edit_available')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle()

    if (!existing || !existing.affinity_edit_available) {
      throw new BadRequestException('当前没有可用的亲密度修改机会，先更改人设来获取一次机会吧')
    }

    const next = Math.max(0, Math.min(100, Math.round(value)))
    const level = this.levelOf(next)
    const { error } = await this.client
      .from('affinity')
      .update({
        value: next,
        level,
        affinity_edit_available: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw new Error(`亲密度修改失败: ${error.message}`)
    return { value: next, level, affinityEditAvailable: false }
  }

  /** 查询角色所属小说 */
  private async getNovelIdOf(characterId: string): Promise<string> {
    const { data, error } = await this.client
      .from('characters')
      .select('novel_id')
      .eq('id', characterId)
      .maybeSingle()
    if (error || !data) throw new Error(`查询角色失败: ${error?.message || '不存在'}`)
    return data.novel_id
  }
}
