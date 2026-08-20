import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { CharactersService } from './characters.service';

@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  @HttpCode(200)
  async findByNovelId(@Query('novel_id') novelId: string) {
    const data = await this.charactersService.findByNovelId(novelId);
    return { code: 200, msg: 'success', data };
  }

  @Get(':id')
  @HttpCode(200)
  async findById(@Param('id') id: string) {
    const data = await this.charactersService.findById(id);
    return { code: 200, msg: 'success', data };
  }

  @Post()
  @HttpCode(200)
  async create(
    @Body() body: { novel_id: string; name: string; category: string },
  ) {
    const data = await this.charactersService.create(body);
    return { code: 200, msg: 'success', data };
  }

  @Put(':id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      avatar_key?: string | null;
      portrait_key?: string | null;
      portrait_crop_offset?: number;
      status?: string;
      persona?: string;
      background?: string;
      biography?: string;
      principles?: string;
      examples?: string;
    },
  ) {
    const data = await this.charactersService.update(id, body);
    return { code: 200, msg: 'success', data };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    const data = await this.charactersService.remove(id);
    return { code: 200, msg: 'success', data };
  }
}
