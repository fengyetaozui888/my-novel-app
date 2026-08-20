import { Module } from '@nestjs/common';
import { WorldNewsController } from './world-news.controller';
import { WorldNewsService } from './world-news.service';

@Module({
  controllers: [WorldNewsController],
  providers: [WorldNewsService],
})
export class WorldNewsModule {}
