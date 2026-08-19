import { Controller, Get, Put, Body, HttpCode } from '@nestjs/common'
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
