import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MemoriesModule } from '@/memories/memories.module';

@Module({
  imports: [MemoriesModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
