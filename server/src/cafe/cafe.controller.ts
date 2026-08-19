import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { CafeService } from './cafe.service'
import { CafeInteractionService } from './cafe-interaction.service'

@Controller('cafe')
export class CafeController {
  constructor(
    private readonly cafeService: CafeService,
    private readonly interactionService: CafeInteractionService,
  ) {}

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

  @Get('interactions')
  async getInteractions(@Query('character_id') characterId?: string) {
    const data = await this.interactionService.getInteractions(characterId)
    return { code: 200, msg: 'success', data }
  }

  @Delete('interactions/:id')
  async deleteInteraction(@Param('id') id: string) {
    const data = await this.interactionService.deleteInteraction(Number(id))
    return { code: 200, msg: 'success', data }
  }

  @Post('interactions/generate')
  @HttpCode(HttpStatus.OK)
  async generateInteraction() {
    const data = await this.interactionService.generateInteraction()
    if (data && (data as any).error) {
      return { code: 400, msg: (data as any).error, data: null }
    }
    return { code: 200, msg: 'success', data }
  }
}
