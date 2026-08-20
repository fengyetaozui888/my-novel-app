import { Module } from '@nestjs/common';
import { GroupChatController } from './group-chat.controller';
import { GroupChatService } from './group-chat.service';
import { UploadModule } from '@/upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [GroupChatController],
  providers: [GroupChatService],
})
export class GroupChatModule {}
