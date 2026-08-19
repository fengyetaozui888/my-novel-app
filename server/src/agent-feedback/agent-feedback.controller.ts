import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AgentFeedbackService } from './agent-feedback.service';

@Controller('agent-feedback')
export class AgentFeedbackController {
  constructor(private readonly agentFeedbackService: AgentFeedbackService) {}

  /** 反馈历史 */
  @Get()
  async list(@Query('novelId') novelId: string) {
    if (!novelId) {
      return { code: 400, msg: 'novelId is required', data: null };
    }
    const data = await this.agentFeedbackService.listFeedback(novelId);
    return { code: 200, msg: 'success', data };
  }

  /** 提交反馈并触发角色模拟优化 */
  @Post()
  @HttpCode(HttpStatus.OK)
  async submit(
    @Body()
    body: { novelId: string; characterId?: string; feedbackText: string },
  ) {
    if (!body.novelId || !body.feedbackText?.trim()) {
      return { code: 400, msg: 'novelId 和 feedbackText 不能为空', data: null };
    }
    const data = await this.agentFeedbackService.submitFeedback({
      novelId: body.novelId,
      characterId: body.characterId,
      feedbackText: body.feedbackText.trim(),
    });
    return { code: 200, msg: 'success', data };
  }
}
