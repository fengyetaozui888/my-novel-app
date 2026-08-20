import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import { NovelsService } from './novels.service';

@Controller('novels')
export class NovelsController {
  constructor(private readonly novelsService: NovelsService) {}

  @Get()
  @HttpCode(200)
  async findAll() {
    const data = await this.novelsService.findAll();
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: { name: string; era?: string }) {
    const data = await this.novelsService.create(body.name, body.era);
    return { code: 200, msg: 'success', data };
  }

  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string) {
    const data = await this.novelsService.findOne(id);
    return { code: 200, msg: 'success', data };
  }

  @Put(':id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; cover_key?: string | null },
  ) {
    const data = await this.novelsService.update(id, body);
    return { code: 200, msg: 'success', data };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    const data = await this.novelsService.remove(id);
    return { code: 200, msg: 'success', data };
  }

  @Put(':id/world-info')
  @HttpCode(200)
  async updateWorldInfo(
    @Param('id') id: string,
    @Body() body: { world_info: string },
  ) {
    const data = await this.novelsService.updateWorldInfo(id, body.world_info);
    return { code: 200, msg: 'success', data };
  }

  @Put(':id/world-nickname')
  @HttpCode(200)
  async updateWorldNickname(
    @Param('id') id: string,
    @Body() body: { world_nickname: string },
  ) {
    const data = await this.novelsService.updateWorldNickname(id, body.world_nickname);
    return { code: 200, msg: 'success', data };
  }

  @Put(':id/category-names')
  @HttpCode(200)
  async updateCategoryNames(
    @Param('id') id: string,
    @Body() body: { category_names: Record<string, string> },
  ) {
    const data = await this.novelsService.updateCategoryNames(id, body.category_names);
    return { code: 200, msg: 'success', data };
  }

  @Put(':id/toggle-pin')
  @HttpCode(200)
  async togglePin(@Param('id') id: string) {
    const data = await this.novelsService.togglePin(id);
    return { code: 200, msg: 'success', data };
  }
}
