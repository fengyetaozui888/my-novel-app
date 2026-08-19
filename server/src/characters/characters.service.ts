import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { UploadService } from '@/upload/upload.service';

@Injectable()
export class CharactersService {
  constructor(private readonly uploadService: UploadService) {}

  private get client() {
    return getSupabaseClient();
  }

  private async enrichWithUrls(character: Record<string, unknown>) {
    let avatar_url: string | null = null;
    let portrait_url: string | null = null;
    if (character.avatar_key) {
      try {
        avatar_url = await this.uploadService.getPresignedUrl(character.avatar_key as string);
      } catch {
        avatar_url = null;
      }
    }
    if (character.portrait_key) {
      try {
        portrait_url = await this.uploadService.getPresignedUrl(character.portrait_key as string);
      } catch {
        portrait_url = null;
      }
    }
    return { ...character, avatar_url, portrait_url };
  }

  async findByNovelId(novelId: string) {
    const { data, error } = await this.client
      .from('characters')
      .select('id, novel_id, name, category, gender, tagline, avatar_key, portrait_key, portrait_crop_offset, persona, background, biography, principles, examples, created_at, updated_at')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询角色列表失败: ${error.message}`);

    const characters = await Promise.all(
      (data || []).map((c) => this.enrichWithUrls(c as unknown as Record<string, unknown>)),
    );
    return characters;
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from('characters')
      .select('id, novel_id, name, category, gender, tagline, avatar_key, portrait_key, portrait_crop_offset, persona, background, biography, principles, examples, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`查询角色详情失败: ${error.message}`);
    if (!data) return null;
    return this.enrichWithUrls(data as unknown as Record<string, unknown>);
  }

  async create(params: {
    novel_id: string;
    name: string;
    category: string;
  }) {
    const { data, error } = await this.client
      .from('characters')
      .insert(params)
      .select()
      .single();
    if (error) throw new Error(`创建角色失败: ${error.message}`);
    return { ...data, avatar_url: null };
  }

  async update(
    id: string,
    updates: {
      name?: string;
      gender?: string;
      tagline?: string;
      avatar_key?: string | null;
      portrait_key?: string | null;
      portrait_crop_offset?: number;
      persona?: string;
      background?: string;
      biography?: string;
      principles?: string;
      examples?: string;
    },
  ) {
    const { data, error } = await this.client
      .from('characters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新角色失败: ${error.message}`);
    return this.enrichWithUrls(data as unknown as Record<string, unknown>);
  }

  async remove(id: string) {
    const { error } = await this.client
      .from('characters')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`删除角色失败: ${error.message}`);
    return { success: true };
  }
}
