import { Controller, Get, Post, Body, Param, HttpCode } from '@nestjs/common'
import { AffinityService } from './affinity.service'

@Controller('affinity')
export class AffinityController {
  constructor(private readonly affinityService: AffinityService) {}

  /** 亲密度图鉴：某小说下所有角色的亲密度 */
  @Get('book/:novelId')
  async getBook(@Param('novelId') novelId: string) {
    const data = await this.affinityService.getBook(novelId)
    return { code: 200, msg: 'success', data }
  }

  /** 获取某角色与用户的亲密度 */
  @Get(':characterId')
  async getAffinity(@Param('characterId') characterId: string) {
    const data = await this.affinityService.getAffinity(characterId)
    return { code: 200, msg: 'success', data }
  }

  /** 手动调整亲密度（调试用） */
  @Post(':characterId/adjust')
  @HttpCode(200)
  async adjust(
    @Param('characterId') characterId: string,
    @Body() body: { delta: number }
  ) {
    const data = await this.affinityService.adjustAffinity(characterId, body.delta ?? 0)
    return { code: 200, msg: 'success', data }
  }

  /** 更新"我"在该角色眼中的专属人设（更改后获得一次修改亲密度的机会） */
  @Post(':characterId/persona')
  @HttpCode(200)
  async updatePersona(
    @Param('characterId') characterId: string,
    @Body() body: { persona: string }
  ) {
    const data = await this.affinityService.updateUserPersona(characterId, body.persona ?? '')
    return { code: 200, msg: 'success', data }
  }

  /** 使用一次性机会直接修改亲密度 */
  @Post(':characterId/set')
  @HttpCode(200)
  async setAffinity(
    @Param('characterId') characterId: string,
    @Body() body: { value: number }
  ) {
    const data = await this.affinityService.setAffinityByOpportunity(characterId, body.value)
    return { code: 200, msg: 'success', data }
  }
}
