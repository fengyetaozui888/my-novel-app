import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class NovelsService {
  private get client() {
    return getSupabaseClient();
  }

  async findAll() {
    const { data, error } = await this.client
      .from('novels')
      .select('id, name, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询小说列表失败: ${error.message}`);
    return data || [];
  }

  async create(name: string) {
    const { data, error } = await this.client
      .from('novels')
      .insert({ name })
      .select()
      .single();
    if (error) throw new Error(`创建小说失败: ${error.message}`);
    return data;
  }

  async update(id: string, updates: { name?: string }) {
    const { data, error } = await this.client
      .from('novels')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新小说失败: ${error.message}`);
    return data;
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
