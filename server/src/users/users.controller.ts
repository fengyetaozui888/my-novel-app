import { Controller, Get, Put, Post, Body, HttpCode, BadRequestException } from '@nestjs/common'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @HttpCode(200)
  async getProfile() {
    const data = await this.usersService.getProfile()
    return { code: 200, msg: 'success', data }
  }

  @Post('recharge')
  @HttpCode(200)
  async recharge(@Body() body: { amount: number }) {
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('充值金额必须大于 0')
    }
    // 限制单次充值上限，防止误操作
    if (amount > 100000) {
      throw new BadRequestException('单次充值金额不能超过 100000')
    }
    const credits = await this.usersService.recharge(amount)
    return { code: 200, msg: 'success', data: { credits } }
  }

  @Put('nickname')
  @HttpCode(200)
  async updateNickname(@Body() body: { nickname: string }) {
    const result = await this.usersService.updateNickname(body.nickname)

    if (result.error) {
      return { code: 400, msg: result.message, data: null }
    }

    return { code: 200, msg: 'success', data: result }
  }

  @Put('avatar')
  @HttpCode(200)
  async updateAvatar(@Body() body: { avatar_key: string }) {
    const data = await this.usersService.updateAvatar(body.avatar_key)
    return { code: 200, msg: 'success', data }
  }
}
