import { Controller, Get, Post, Body, Param, HttpCode, Req } from '@nestjs/common';
import { Request } from 'express';
import { PortraitService } from './portrait.service';

@Controller('portrait')
export class PortraitController {
  constructor(private readonly portraitService: PortraitService) {}

  /** 查询角色立绘状态 */
  @Get(':characterId')
  async getPortrait(@Param('characterId') characterId: string) {
    const data = await this.portraitService.getPortrait(characterId);
    return { code: 200, msg: 'success', data };
  }

  /** 生成 3D 立绘（消耗 300 积分，开发者免费） */
  @Post('generate')
  @HttpCode(200)
  async generatePortrait(
    @Body() body: { characterId: string },
    @Req() req: Request,
  ) {
    const data = await this.portraitService.generatePortrait(
      body.characterId,
      req.headers as Record<string, string>,
    );
    return { code: 200, msg: 'success', data };
  }

  /** 3D 互动：回复 + 反应视频（消耗 100 积分，开发者免费） */
  @Post('interact')
  @HttpCode(200)
  async interact(
    @Body() body: {
      characterId: string;
      message: string;
      history?: Array<{ role: string; content: string }>;
    },
    @Req() req: Request,
  ) {
    const data = await this.portraitService.interact(
      body.characterId,
      body.message,
      body.history ?? [],
      req.headers as Record<string, string>,
    );
    return { code: 200, msg: 'success', data };
  }

  /** 人设图生成：LLM 转译提示词 + 图像生成 AI（消耗 150 积分，开发者免费） */
  @Post('generate-image')
  @HttpCode(200)
  async generateCharacterImage(
    @Body() body: { characterId: string; description?: string },
    @Req() req: Request,
  ) {
    const data = await this.portraitService.generateCharacterImage(
      body.characterId,
      body.description || '',
      req.headers as Record<string, string>,
    );
    return { code: 200, msg: 'success', data };
  }
}
