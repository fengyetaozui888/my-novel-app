import { Controller, Post, Get, Body, HttpCode } from '@nestjs/common';
import { HelpAskService } from './help-ask.service';

@Controller('help')
export class HelpAskController {
  constructor(private readonly helpAskService: HelpAskService) {}

  @Post('ask')
  @HttpCode(200)
  async ask(
    @Body() body: { question: string; history?: { role: 'user' | 'assistant'; content: string }[] },
  ) {
    if (!body?.question?.trim()) {
      return { code: 400, msg: '问题不能为空', data: null };
    }
    const data = await this.helpAskService.ask(body.question.trim(), body.history || []);
    return { code: 200, msg: 'success', data };
  }

  @Get('unanswered')
  @HttpCode(200)
  async getUnanswered() {
    const data = await this.helpAskService.getUnanswered();
    return { code: 200, msg: 'success', data };
  }
}
