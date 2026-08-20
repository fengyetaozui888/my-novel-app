import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { UploadService } from '@/upload/upload.service';

@Injectable()
export class NovelsService {
  constructor(private readonly uploadService: UploadService) {}

  private get client() {
    return getSupabaseClient();
  }

  async findAll() {
    const { data, error } = await this.client
      .from('novels')
      .select('id, name, era, news_refreshed_date, cover_key, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询小说列表失败: ${error.message}`);

    // Generate presigned URLs for cover images
    const novelsWithUrls = await Promise.all(
      (data || []).map(async (novel) => {
        let cover_url: string | null = null;
        if (novel.cover_key) {
          try {
            cover_url = await this.uploadService.getPresignedUrl(novel.cover_key);
          } catch {
            cover_url = null;
          }
        }
        return { ...novel, cover_url };
      }),
    );

    return novelsWithUrls;
  }

  async create(name: string, era?: string) {
    const { data, error } = await this.client
      .from('novels')
      .insert({ name, era: era || 'ancient' })
      .select()
      .single();
    if (error) throw new Error(`创建小说失败: ${error.message}`);
    return { ...data, cover_url: null };
  }

  async update(id: string, updates: { name?: string; cover_key?: string | null }) {
    const { data, error } = await this.client
      .from('novels')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新小说失败: ${error.message}`);

    let cover_url: string | null = null;
    if (data?.cover_key) {
      try {
        cover_url = await this.uploadService.getPresignedUrl(data.cover_key);
      } catch {
        cover_url = null;
      }
    }
    return { ...data, cover_url };
  }

  async remove(id: string) {
    const { error } = await this.client
      .from('novels')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`删除小说失败: ${error.message}`);
    return { success: true };
  }
}
