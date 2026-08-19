import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { CafeService } from './cafe.service'

@Controller('cafe')
export class CafeController {
  constructor(private readonly cafeService: CafeService) {}

  @Get('messages')
  async getMessages() {
    const data = await this.cafeService.getMessages()
    return { code: 200, msg: 'success', data }
  }

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  async createMessage(@Body() body: {
    character_id: string
    character_name: string
    novel_id: string
    novel_name: string
    content: string
  }) {
    const data = await this.cafeService.createMessage(body)
    return { code: 200, msg: 'success', data }
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    const data = await this.cafeService.deleteMessage(Number(id))
    return { code: 200, msg: 'success', data }
  }
}
