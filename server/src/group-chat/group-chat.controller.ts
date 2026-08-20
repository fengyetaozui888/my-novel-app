import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { GroupChatService } from './group-chat.service';

@Controller('group-chats')
export class GroupChatController {
  constructor(private readonly groupChatService: GroupChatService) {}

  @Post()
  @HttpCode(200)
  async create(
    @Body() body: { novel_id: string; name: string; member_ids: string[] },
  ) {
    const data = await this.groupChatService.create(body);
    return { code: 200, msg: 'success', data };
  }

  @Get()
  @HttpCode(200)
  async findByNovelId(@Query('novel_id') novelId: string) {
    const data = await this.groupChatService.findByNovelId(novelId);
    return { code: 200, msg: 'success', data };
  }

  @Get(':id')
  @HttpCode(200)
  async findById(@Param('id') id: string) {
    const data = await this.groupChatService.findById(id);
    return { code: 200, msg: 'success', data };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    const data = await this.groupChatService.remove(id);
    return { code: 200, msg: 'success', data };
  }

  @Get(':id/messages')
  @HttpCode(200)
  async getMessages(@Param('id') id: string) {
    const data = await this.groupChatService.getMessages(id);
    return { code: 200, msg: 'success', data };
  }

  @Post(':id/simulate')
  @HttpCode(200)
  async simulate(
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    const data = await this.groupChatService.simulate({
      groupId: id,
      message: body.message,
    });
    return { code: 200, msg: 'success', data };
  }
}
