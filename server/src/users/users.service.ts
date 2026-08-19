import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { UploadService } from '@/upload/upload.service'

@Injectable()
export class UsersService {
  constructor(private readonly uploadService: UploadService) {}

  private get client() {
    return getSupabaseClient()
  }

  private async getOrCreateUser(): Promise<any> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .limit(1)

    if (error) throw new Error(`查询用户失败: ${error.message}`)

    if (data && data.length > 0) {
      return data[0]
    }

    // Create default user
    const uid = `U${Date.now().toString(36).toUpperCase()}`
    const { data: newUser, error: insertError } = await this.client
      .from('users')
      .insert({
        uid,
        nickname: '无名氏',
        credits: 1000,
      })
      .select()
      .single()

    if (insertError) throw new Error(`创建用户失败: ${insertError.message}`)
    return newUser
  }

  /** 扣除积分（3D 互动等消耗场景），返回扣除后的积分余额 */
  async deductCredits(amount: number): Promise<number> {
    if (!amount || amount <= 0) throw new Error('扣除积分必须大于 0')
    const user = await this.getOrCreateUser()
    const credits = Math.max(0, user.credits - amount)
    const { error } = await this.client
      .from('users')
      .update({ credits, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) throw new Error(`积分扣除失败: ${error.message}`)
    return credits
  }

  /** 充值积分，返回充值后的积分余额 */
  async recharge(amount: number): Promise<number> {
    if (!amount || amount <= 0) throw new Error('充值金额必须大于 0')
    const user = await this.getOrCreateUser()
    const credits = user.credits + amount
    const { error } = await this.client
      .from('users')
      .update({ credits, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) throw new Error(`充值失败: ${error.message}`)
    return credits
  }

  async getProfile() {
    const user = await this.getOrCreateUser()

    let avatar_url: string | null = null
    if (user.avatar_key) {
      try {
        avatar_url = await this.uploadService.getPresignedUrl(user.avatar_key)
      } catch {
        avatar_url = null
      }
    }

    return { ...user, avatar_url }
  }

  async updateNickname(nickname: string) {
    const user = await this.getOrCreateUser()

    // Check 15-day limit
    if (user.nickname_updated_at) {
      const lastUpdate = new Date(user.nickname_updated_at)
      const now = new Date()
      const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysDiff < 15) {
        const remainingDays = Math.ceil(15 - daysDiff)
        return {
          error: true,
          message: `昵称每15天可修改一次，还需等待 ${remainingDays} 天`,
        }
      }
    }

    const { data, error } = await this.client
      .from('users')
      .update({
        nickname,
        nickname_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw new Error(`更新昵称失败: ${error.message}`)

    let avatar_url: string | null = null
    if (data.avatar_key) {
      try {
        avatar_url = await this.uploadService.getPresignedUrl(data.avatar_key)
      } catch {
        avatar_url = null
      }
    }

    return { ...data, avatar_url }
  }

  async updateAvatar(avatar_key: string) {
    const user = await this.getOrCreateUser()

    const { data, error } = await this.client
      .from('users')
      .update({
        avatar_key,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw new Error(`更新头像失败: ${error.message}`)

    let avatar_url: string | null = null
    if (data.avatar_key) {
      try {
        avatar_url = await this.uploadService.getPresignedUrl(data.avatar_key)
      } catch {
        avatar_url = null
      }
    }

    return { ...data, avatar_url }
  }
}
