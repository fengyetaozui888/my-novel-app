import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';

@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Get()
  async findByNovelId(@Query('novel_id') novelId: string) {
    const data = await this.relationshipsService.findByNovelId(novelId);
    return { code: 200, msg: 'success', data };
  }

  @Get('character/:id')
  async findByCharacterId(@Param('id') id: string) {
    const data = await this.relationshipsService.findByCharacterId(id);
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(200)
  async create(
    @Body() body: { novel_id: string; from_character_id: string; to_character_id: string; relation_type?: string; description?: string }
  ) {
    const data = await this.relationshipsService.create(body);
    return { code: 200, msg: 'success', data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { relation_type?: string; description?: string }) {
    const data = await this.relationshipsService.update(id, body);
    return { code: 200, msg: 'success', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.relationshipsService.remove(id);
    return { code: 200, msg: 'success', data };
  }
}
