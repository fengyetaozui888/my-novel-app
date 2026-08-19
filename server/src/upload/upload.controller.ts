import {
  Controller,
  Post,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { code: 400, msg: '未接收到文件', data: null };
    }
    const result = await this.uploadService.uploadFile(file);
    return { code: 200, msg: 'success', data: result };
  }

  @Get('url')
  @HttpCode(200)
  async getPresignedUrl(@Query('key') key: string) {
    if (!key) {
      return { code: 400, msg: '缺少 key 参数', data: null };
    }
    const url = await this.uploadService.getPresignedUrl(key);
    return { code: 200, msg: 'success', data: { url } };
  }
}
