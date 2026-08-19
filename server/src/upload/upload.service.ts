import { Injectable } from '@nestjs/common';
import { S3Storage } from 'coze-coding-dev-sdk';

@Injectable()
export class UploadService {
  private get storage() {
    return new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<{ key: string; url: string }> {
    let buffer: Buffer;
    if (file.path) {
      const fs = await import('fs');
      buffer = await fs.promises.readFile(file.path);
    } else if (file.buffer) {
      buffer = file.buffer;
    } else {
      throw new Error('无法获取文件内容');
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const key = await this.storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.mimetype,
    });

    const url = await this.storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 365, // 1 year
    });

    return { key, url };
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    const storedKey = await this.storage.uploadFile({
      fileContent: buffer,
      fileName: key,
      contentType,
    });
    const url = await this.storage.generatePresignedUrl({
      key: storedKey,
      expireTime: 86400 * 365,
    });
    return { key: storedKey, url };
  }

  async getPresignedUrl(key: string): Promise<string> {
    return this.storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 365,
    });
  }
}
