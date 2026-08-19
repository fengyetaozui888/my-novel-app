import { Injectable } from '@nestjs/common'
import { SupabaseClient } from '../storage/database/supabase-client'
import { eq, and } from 'drizzle-orm'
import { affinity } from '../storage/database/shared/schema'

@Injectable()
export class AffinityService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAffinity(userId: string, characterId: string) {
    const result = await this.supabase.db
      .select()
      .from(affinity)
      .where(and(eq(affinity.user_id, userId), eq(affinity.character_id, characterId)))
      .limit(1)

    if (result.length > 0) {
      return result[0]
    }

    // 创建默认亲密度
    const newAffinity = await this.supabase.db
      .insert(affinity)
      .values({
        user_id: userId,
        character_id: characterId,
        value: 50,
        level: 'stranger',
      })
      .returning()

    return newAffinity[0]
  }

  async updateAffinity(userId: string, characterId: string, delta: number) {
    const current = await this.getAffinity(userId, characterId)
    const newValue = Math.max(0, Math.min(100, current.value + delta))

    let level = 'stranger'
    if (newValue >= 80) level = 'intimate'
    else if (newValue >= 60) level = 'friendly'
    else if (newValue >= 40) level = 'neutral'
    else if (newValue >= 20) level = 'unfamiliar'

    const result = await this.supabase.db
      .update(affinity)
      .set({
        value: newValue,
        level,
        updated_at: new Date(),
      })
      .where(and(eq(affinity.user_id, userId), eq(affinity.character_id, characterId)))
      .returning()

    return result[0]
  }
}
