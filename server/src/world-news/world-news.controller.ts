import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
} from '@nestjs/common';
import { WorldNewsService } from './world-news.service';

@Controller('world-news')
export class WorldNewsController {
  constructor(private readonly worldNewsService: WorldNewsService) {}

  /** 讯息列表（最新在前） */
  @Get(':novelId')
  @HttpCode(200)
  async list(@Param('novelId') novelId: string) {
    const data = await this.worldNewsService.listNews(novelId);
    return { code: 200, msg: 'success', data };
  }

  /** 刷新状态（今日是否已刷） */
  @Get(':novelId/state')
  @HttpCode(200)
  async state(@Param('novelId') novelId: string) {
    const data = await this.worldNewsService.getRefreshState(novelId);
    return { code: 200, msg: 'success', data };
  }

  /** 手动刷新（每日限一次） */
  @Post(':novelId/refresh')
  @HttpCode(200)
  async refresh(@Param('novelId') novelId: string) {
    const data = await this.worldNewsService.refresh(novelId);
    return { code: 200, msg: 'success', data };
  }
}
