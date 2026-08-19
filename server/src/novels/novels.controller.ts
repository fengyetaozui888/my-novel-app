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
  async create(@Body() body: { name: string }) {
    const data = await this.novelsService.create(body.name);
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
}
