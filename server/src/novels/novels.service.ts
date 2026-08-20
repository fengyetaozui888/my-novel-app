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
      .select('id, name, era, world_info, world_nickname, news_refreshed_date, cover_key, created_at, updated_at')
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

  async findOne(id: string) {
    const { data, error } = await this.client
      .from('novels')
      .select('id, name, era, world_info, world_nickname, category_names, news_refreshed_date, cover_key, created_at, updated_at')
      .eq('id', id)
      .single();
    if (error) throw new Error(`获取小说详情失败: ${error.message}`);
    return data;
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

  async update(id: string, updates: { name?: string; cover_key?: string | null; era?: 'ancient' | 'modern' }) {
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

  async updateWorldInfo(id: string, world_info: string) {
    const { data, error } = await this.client
      .from('novels')
      .update({ world_info, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, world_info')
      .single();
    if (error) throw new Error(`保存世界信息失败: ${error.message}`);
    return data;
  }

  async updateWorldNickname(id: string, world_nickname: string) {
    const { data, error } = await this.client
      .from('novels')
      .update({ world_nickname, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, world_nickname')
      .single();
    if (error) throw new Error(`保存世界昵称失败: ${error.message}`);
    return data;
  }

  async updateCategoryNames(id: string, category_names: Record<string, string>) {
    const { data, error } = await this.client
      .from('novels')
      .update({ category_names: JSON.stringify(category_names), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, category_names')
      .single();
    if (error) throw new Error(`保存分类名称失败: ${error.message}`);
    return data;
  }

  async updateSectionTitles(id: string, section_titles: Record<string, string>) {
    const { data, error } = await this.client
      .from('novels')
      .update({ section_titles: JSON.stringify(section_titles), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, section_titles')
      .single();
    if (error) throw new Error(`保存分区标题失败: ${error.message}`);
    return data;
  }

  async togglePin(id: string) {
    const { data: novel, error: fetchError } = await this.client
      .from('novels')
      .select('is_pinned')
      .eq('id', id)
      .single();
    if (fetchError) throw new Error(`获取小说信息失败: ${fetchError.message}`);

    const newPinned = !novel.is_pinned;
    const { data, error } = await this.client
      .from('novels')
      .update({ is_pinned: newPinned, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, is_pinned')
      .single();
    if (error) throw new Error(`切换置顶状态失败: ${error.message}`);
    return data;
  }
}
