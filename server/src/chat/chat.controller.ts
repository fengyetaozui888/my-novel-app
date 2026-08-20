import { Controller, Post, Get, Body, Query, HttpCode, Param } from '@nestjs/common';
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
      speakerId?: string; // 对话者角色ID（可选）
      message: string;
      history?: { role: string; content: string }[];
    },
  ) {
    const data = await this.chatService.simulate(body);
    return { code: 200, msg: 'success', data };
  }

  @Get('graph')
  async generateGraph(@Query('novel_id') novelId: string) {
    const data = await this.chatService.generateNovelGraph(novelId);
    return { code: 200, msg: 'success', data };
  }

  @Post('pin')
  async updatePinStatus(@Body() body: { characterId: string; isPinned: boolean }) {
    const { characterId, isPinned } = body;
    const result = await this.chatService.updatePinStatus(characterId, isPinned);
    return { code: 200, msg: 'success', data: result };
  }

  @Get('pin/:characterId')
  async getPinStatus(@Param('characterId') characterId: string) {
    const isPinned = await this.chatService.getPinStatus(characterId);
    return { code: 200, msg: 'success', data: { isPinned } };
  }
}
