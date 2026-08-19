import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { MomentsService } from './moments.service'

@Controller('moments')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @Get()
  async getMoments(@Query('novelId') novelId?: string, @Query('characterId') characterId?: string) {
    const moments = await this.momentsService.getMoments(novelId, characterId)
    return { code: 200, msg: 'success', data: moments }
  }

  @Post()
  async createMoment(@Body() body: { characterId: string; novelId: string; content: string; imageUrl?: string }) {
    const moment = await this.momentsService.createMoment(body.characterId, body.novelId, body.content, body.imageUrl)
    return { code: 200, msg: 'success', data: moment }
  }

  @Post(':id/like')
  async likeMoment(@Param('id') id: string, @Body() body: { characterId: string }) {
    const result = await this.momentsService.likeMoment(id, body.characterId)
    return { code: 200, msg: 'success', data: result }
  }

  @Post(':id/comment')
  async commentMoment(@Param('id') id: string, @Body() body: { characterId: string; content: string }) {
    const comment = await this.momentsService.commentMoment(id, body.characterId, body.content)
    return { code: 200, msg: 'success', data: comment }
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    const comments = await this.momentsService.getComments(id)
    return { code: 200, msg: 'success', data: comments }
  }

  @Post('background')
  async setBackground(@Body() body: { novelId: string; imageUrl: string }) {
    const result = await this.momentsService.setBackground(body.novelId, body.imageUrl)
    return { code: 200, msg: 'success', data: result }
  }

  @Get('background')
  async getBackground(@Query('novelId') novelId: string) {
    const background = await this.momentsService.getBackground(novelId)
    return { code: 200, msg: 'success', data: background }
  }
}
