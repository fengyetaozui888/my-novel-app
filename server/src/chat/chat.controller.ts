import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('simulate')
  @HttpCode(200)
  async simulate(
    @Body()
    body: {
      characterId: string;
      message: string;
      history?: { role: string; content: string }[];
    },
  ) {
    const data = await this.chatService.simulate(body);
    return { code: 200, msg: 'success', data };
  }
}
