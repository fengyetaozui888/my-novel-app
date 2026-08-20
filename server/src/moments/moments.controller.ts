import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { MomentsService } from './moments.service'

@Controller('moments')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @Get()
  async getMoments(@Query('novelId') novelId?: string, @Query('characterId') characterId?: string) {
    const moments = await this.momentsService.getMoments(novelId || '', characterId)
    return { code: 200, msg: 'success', data: moments }
  }

  @Post()
  async createMoment(@Body() body: { characterId: string; novelId: string; content: string; imageUrl?: string }) {
    const moment = await this.momentsService.createMoment({
      characterId: body.characterId,
      novelId: body.novelId,
      content: body.content,
      imageUrl: body.imageUrl ?? '',
    })
    return { code: 200, msg: 'success', data: moment }
  }

  /** 用户以"我自己"的身份发布朋友圈，角色会按亲密度回复 */
  @Post('user')
  async createUserMoment(@Body() body: { uid?: string; novelId: string; content: string; imageUrl?: string }) {
    const moment = await this.momentsService.createUserMoment({
      uid: body.uid,
      novelId: body.novelId,
      content: body.content,
      imageUrl: body.imageUrl,
    })
    return { code: 200, msg: 'success', data: moment }
  }

  @Post(':id/like')
  async likeMoment(@Param('id') id: string, @Body() body: { characterId?: string }) {
    const result = await this.momentsService.toggleLikeMoment(id, body.characterId)
    return { code: 200, msg: 'success', data: result }
  }

  @Post(':id/comment')
  async commentMoment(
    @Param('id') id: string,
    @Body() body: { characterId?: string; content: string; uid?: string },
  ) {
    const comment = await this.momentsService.commentMoment(
      id,
      body.characterId || null,
      body.content,
      body.uid,
    )
    return { code: 200, msg: 'success', data: comment }
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    const comments = await this.momentsService.getMomentComments(id)
    return { code: 200, msg: 'success', data: comments }
  }

  @Post('background')
  async setBackground(@Body() body: { novelId: string; imageUrl: string }) {
    const result = await this.momentsService.setMomentBackground(body.novelId, body.imageUrl)
    return { code: 200, msg: 'success', data: result }
  }

  @Get('background')
  async getBackground(@Query('novelId') novelId: string) {
    const background = await this.momentsService.getMomentBackground(novelId)
    return { code: 200, msg: 'success', data: background }
  }

  @Post('generate')
  async generateMoment(@Body() body: { characterId: string; novelId: string }) {
    const content = await this.momentsService.generateMomentContent(body.characterId, body.novelId)
    return { code: 200, msg: 'success', data: { content } }
  }

  @Post('refresh')
  async refreshMoments(@Body() body: { novelId: string }) {
    const result = await this.momentsService.refreshMoments(body.novelId)
    return { code: 200, msg: 'success', data: result }
  }
}
