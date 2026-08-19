import { Injectable, NotFoundException } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class RelationshipsService {
  private get db() {
    return getSupabaseClient();
  }

  async findByNovelId(novelId: string) {
    const { data, error } = await this.db
      .from('relationships')
      .select('*')
      .eq('novel_id', novelId);

    if (error) throw error;
    return data || [];
  }

  async findByCharacterId(characterId: string) {
    const { data, error } = await this.db
      .from('relationships')
      .select('*')
      .or(`from_character_id.eq.${characterId},to_character_id.eq.${characterId}`);

    if (error) throw error;
    return data || [];
  }

  async create(data: {
    novel_id: string;
    from_character_id: string;
    to_character_id: string;
    relation_type?: string;
    description?: string;
  }) {
    // Verify both characters exist and belong to the same novel
    const { data: fromChar, error: fromError } = await this.db
      .from('characters')
      .select('id, novel_id')
      .eq('id', data.from_character_id)
      .maybeSingle();

    if (fromError) throw fromError;
    if (!fromChar) throw new NotFoundException('源角色不存在');

    const { data: toChar, error: toError } = await this.db
      .from('characters')
      .select('id, novel_id')
      .eq('id', data.to_character_id)
      .maybeSingle();

    if (toError) throw toError;
    if (!toChar) throw new NotFoundException('目标角色不存在');

    if (fromChar.novel_id !== data.novel_id || toChar.novel_id !== data.novel_id) {
      throw new NotFoundException('角色不属于该小说');
    }

    const { data: newRel, error } = await this.db
      .from('relationships')
      .insert({
        novel_id: data.novel_id,
        from_character_id: data.from_character_id,
        to_character_id: data.to_character_id,
        relation_type: data.relation_type || 'acquaintance',
        description: data.description,
      })
      .select()
      .single();

    if (error) throw error;
    return newRel;
  }

  async update(id: string, data: { relation_type?: string; description?: string }) {
    const updateData: any = {};
    if (data.relation_type !== undefined) updateData.relation_type = data.relation_type;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: updated, error } = await this.db
      .from('relationships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new NotFoundException('关系不存在');
    return updated;
  }

  async remove(id: string) {
    const { error } = await this.db
      .from('relationships')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}
