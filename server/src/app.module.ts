import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { NovelsModule } from '@/novels/novels.module';
import { CharactersModule } from '@/characters/characters.module';
import { ChatModule } from '@/chat/chat.module';
import { UploadModule } from '@/upload/upload.module';
import { UsersModule } from '@/users/users.module';
import { RelationshipsModule } from '@/relationships/relationships.module';

@Module({
  imports: [NovelsModule, CharactersModule, ChatModule, UploadModule, UsersModule, RelationshipsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
