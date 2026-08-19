import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class CharactersService {
  private get client() {
    return getSupabaseClient();
  }

  async findByNovelId(novelId: string) {
    const { data, error } = await this.client
      .from('characters')
      .select('id, novel_id, name, category, persona, background, biography, principles, examples, created_at, updated_at')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询角色列表失败: ${error.message}`);
    return data || [];
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from('characters')
      .select('id, novel_id, name, category, persona, background, biography, principles, examples, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`查询角色详情失败: ${error.message}`);
    return data;
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
    return data;
  }

  async update(id: string, updates: {
    name?: string;
    persona?: string;
    background?: string;
    biography?: string;
    principles?: string;
    examples?: string;
  }) {
    const { data, error } = await this.client
      .from('characters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新角色失败: ${error.message}`);
    return data;
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
