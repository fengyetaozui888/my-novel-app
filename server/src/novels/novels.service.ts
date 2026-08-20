import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { UploadService } from '@/upload/upload.service';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

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

  async updateWorldInfo(id: string, world_info: string) {
    const { data, error } = await this.client
      .from('novels')
      .update({ world_info, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, world_info, world_score')
      .single();
    if (error) throw new Error(`保存世界信息失败: ${error.message}`);
    return data;
  }

  async evaluateWorld(id: string) {
    const { data: novel, error: novelError } = await this.client
      .from('novels')
      .select('id, name, era, world_info')
      .eq('id', id)
      .single();
    if (novelError || !novel) throw new Error('小说不存在');

    const { data: characters } = await this.client
      .from('characters')
      .select('name, category, persona')
      .eq('novel_id', id);

    const { data: relationships } = await this.client
      .from('relationships')
      .select('from_character_id, to_character_id, relation_type')
      .eq('novel_id', id);

    const charList = (characters || []).map(c => `${c.name}(${c.category}): ${c.persona || ''}`).join('\n');
    const relList = (relationships || []).map(r => `${r.from_character_id} ⇄ ${r.to_character_id}: ${r.relation_type}`).join('\n');

    const prompt = `你是一个小说世界设定评估专家。请评估以下小说的世界信息是否足够支撑生成真实可信的【${novel.era === 'modern' ? '世界日常' : '奇闻轶事'}】内容。

【小说名】${novel.name}
【时代】${novel.era === 'modern' ? '现代' : '古代'}

【用户填写的世界信息】
${novel.world_info || '（未填写）'}

【已有角色】
${charList || '（无）'}

【已有关系】
${relList || '（无）'}

请从以下维度评估（每项 0-20 分，总分 100）：
1. 世界观/背景设定完整度
2. 势力/组织信息
3. 地理/地图信息
4. 修炼/力量体系（现代可替换为科技/社会体系）
5. 时代特征/日常细节

请严格以 JSON 格式返回（不要任何其他文字）：
{"score": 数字, "feedback": "具体反馈（指出不足和优点）", "canGenerate": 布尔值}

canGenerate 为 true 的条件：score >= 60 且至少 3 个维度有实质内容。`;

    const config = new Config();
    const llmClient = new LLMClient(config);

    try {
      const response = await llmClient.invoke([
        { role: 'system', content: '你是小说世界设定评估专家，只返回 JSON。' },
        { role: 'user', content: prompt },

      ], { temperature: 0.3 });
      const content = (response as any).content || response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('LLM 返回格式错误');

      const result = JSON.parse(jsonMatch[0]);
      const score = Math.max(0, Math.min(100, result.score || 0));
      const canGenerate = score >= 60 && result.canGenerate !== false;

      await this.client
        .from('novels')
        .update({ world_score: score, updated_at: new Date().toISOString() })
        .eq('id', id);

      return { score, feedback: result.feedback || '', canGenerate };
    } catch (e) {
      throw new Error(`评分失败: ${e.message}`);
    }
  }
}
