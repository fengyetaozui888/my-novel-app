import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common'
import { MemoriesService } from './memories.service'

@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  /**
   * 获取角色的关键记忆
   */
  @Get('character/:characterId')
  async getCharacterMemories(
    @Param('characterId') characterId: string,
    @Query('limit') limit?: string,
    @Query('minImportance') minImportance?: string,
  ) {
    const memories = await this.memoriesService.getCharacterMemories(
      characterId,
      limit ? parseInt(limit) : 10,
      minImportance ? parseFloat(minImportance) : 0.7,
    )
    return { code: 200, msg: 'success', data: memories }
  }

  /**
   * 获取世界的记忆
   */
  @Get('world/:novelId')
  async getWorldMemories(
    @Param('novelId') novelId: string,
    @Query('limit') limit?: string,
  ) {
    const memories = await this.memoriesService.getWorldMemories(
      novelId,
      limit ? parseInt(limit) : 5,
    )
    return { code: 200, msg: 'success', data: memories }
  }

  /**
   * 手动添加记忆
   */
  @Post()
  async createMemory(
    @Body()
    body: {
      novel_id: string
      character_id?: string
      type: 'fact' | 'relationship' | 'event' | 'preference'
      content: string
      importance: number
    },
  ) {
    const memory = await this.memoriesService.createMemory(body)
    return { code: 200, msg: 'success', data: memory }
  }

  /**
   * 清理角色的旧记忆
   */
  @Delete('character/:characterId/prune')
  async pruneMemories(
    @Param('characterId') characterId: string,
    @Query('keepCount') keepCount?: string,
  ) {
    const deleted = await this.memoriesService.pruneMemories(
      characterId,
      keepCount ? parseInt(keepCount) : 50,
    )
    return { code: 200, msg: 'success', data: { deleted } }
  }

  /**
   * 删除单条记忆
   */
  @Delete(':id')
  async deleteMemory(@Param('id') id: string) {
    await this.memoriesService.deleteMemory(parseInt(id))
    return { code: 200, msg: 'success' }
  }
}
