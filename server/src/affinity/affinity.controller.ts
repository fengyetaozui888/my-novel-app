import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { AffinityService } from './affinity.service'

@Controller('affinity')
export class AffinityController {
  constructor(private readonly affinityService: AffinityService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAffinity(@Body() body: { userId: string; characterId: string }) {
    const result = await this.affinityService.getAffinity(body.userId, body.characterId)
    return {
      code: 200,
      msg: 'success',
      data: result,
    }
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  async updateAffinity(
    @Body() body: { userId: string; characterId: string; delta: number },
  ) {
    const result = await this.affinityService.updateAffinity(
      body.userId,
      body.characterId,
      body.delta,
    )
    return {
      code: 200,
      msg: 'success',
      data: result,
    }
  }
}
