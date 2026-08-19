import { Module } from '@nestjs/common';
import { PortraitController } from './portrait.controller';
import { PortraitService } from './portrait.service';
import { UploadModule } from '@/upload/upload.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [UploadModule, UsersModule],
  controllers: [PortraitController],
  providers: [PortraitService],
})
export class PortraitModule {}
