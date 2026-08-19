import { Module } from '@nestjs/common';
import { NovelsController } from './novels.controller';
import { NovelsService } from './novels.service';
import { UploadModule } from '@/upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [NovelsController],
  providers: [NovelsService],
  exports: [NovelsService],
})
export class NovelsModule {}
