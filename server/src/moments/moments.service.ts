import { Injectable } from '@nestjs/common';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { UploadService } from '../upload/upload.service';

const LLM_MODEL = 'doubao-seed-2-0-mini-260215';

@Injectable()
export class MomentsService {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  private get client() {
    return getSupabaseClient();
  }

  /** LLM：根据角色人设生成朋友圈内容 */
  async generateMomentContent(
    characterId: string,
    novelId: string,
  ): Promise<string> {
    // 获取角色信息
    const { data: character, error } = await this.client
      .from('characters')
      .select('name, gender, persona, background, tagline')
      .eq('id', characterId)
      .single();

    if (error) throw new Error(`获取角色信息失败: ${error.message}`);

    // 获取小说信息
    const { data: novel } = await this.client
      .from('novels')
      .select('name')
      .eq('id', novelId)
      .single();

    // 获取角色关系
    const { data: relationships } = await this.client
      .from('relationships')
      .select('related_character_id, relation, related_character:characters!fk_related(name)')
      .eq('character_id', characterId);

    const characterName = character.name || '未知角色';
    const persona = character.persona;
    const background = character.background;
    const tagline = character.tagline;
    const gender = character.gender;

    const llmClient = new LLMClient(new Config());

    let relationContext = '';
    if (relationships && relationships.length > 0) {
      relationContext = '\n\n人物关系：\n' + relationships
        .map((r: any) => `- ${r.related_character?.name || '未知'}：${r.relation}`)
        .join('\n');
    }

    const prompt = `你是"${characterName}"，请根据以下人设信息，以第一人称写一条朋友圈动态（100字以内）。
要求：
- 符合人设性格和语气
- 可以是日常感悟、心情分享、或者与世界观相关的小故事
- 自然、真实、有个性
- 不要使用表情符号

人设信息：
${persona ? `人设定位：${persona}` : ''}
${background ? `背景故事：${background}` : ''}
${tagline ? `一句话简介：${tagline}` : ''}
性别：${gender || '未知'}
${relationContext}

请直接输出朋友圈内容，不要加引号或其他格式。`;

    const messages = [{ role: 'user' as const, content: prompt }];
    const response = await llmClient.invoke(
      messages,
      { model: LLM_MODEL, temperature: 0.7 },
    );

    return response?.content || `${characterName}发了一条朋友圈`;
  }

  async createMoment(params: {
    characterId: string;
    novelId: string;
    content: string;
    imageUrl?: string;
    visibility?: string;
    blockedCharacterIds?: string[];
  }) {
    const { data, error } = await this.client
      .from('moments')
      .insert({
        character_id: params.characterId,
        novel_id: params.novelId,
        content: params.content,
        image_url: params.imageUrl || null,
        visibility: params.visibility || 'public',
        blocked_character_ids: JSON.stringify(params.blockedCharacterIds || []),
      })
      .select()
      .single();

    if (error) throw new Error(`发布朋友圈失败: ${error.message}`);
    return data;
  }

  async getMoments(novelId: string, characterId?: string, page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from('moments')
      .select('*, character:characters(id, name, avatar_key)')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (characterId) {
      query = query.eq('character_id', characterId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`获取朋友圈失败: ${error.message}`);

    const moments = await Promise.all(
      (data || []).map(async (m) => {
        const moment = m as any;
        let avatar_url: string | null = null;
        if (moment.character?.avatar_key) {
          try {
            avatar_url = await this.uploadService.getPresignedUrl(moment.character.avatar_key);
          } catch {
            avatar_url = null;
          }
        }
        return {
          ...moment,
          character: {
            ...moment.character,
            avatar_url,
          },
        };
      }),
    );

    return moments;
  }

  async likeMoment(momentId: string, characterId: string) {
    const { data, error } = await this.client
      .from('moment_likes')
      .insert({ moment_id: momentId, character_id: characterId })
      .select()
      .single();

    if (error) throw new Error(`点赞失败: ${error.message}`);
    return data;
  }

  async unlikeMoment(momentId: string, characterId: string) {
    const { error } = await this.client
      .from('moment_likes')
      .delete()
      .eq('moment_id', momentId)
      .eq('character_id', characterId);

    if (error) throw new Error(`取消点赞失败: ${error.message}`);
    return true;
  }

  async getMomentLikes(momentId: string) {
    const { data, error } = await this.client
      .from('moment_likes')
      .select('character:characters(id, name, avatar_key)')
      .eq('moment_id', momentId);

    if (error) throw new Error(`获取点赞列表失败: ${error.message}`);
    return data || [];
  }

  async commentMoment(momentId: string, characterId: string, content: string) {
    const { data, error } = await this.client
      .from('moment_comments')
      .insert({
        moment_id: momentId,
        character_id: characterId,
        content,
      })
      .select()
      .single();

    if (error) throw new Error(`评论失败: ${error.message}`);
    return data;
  }

  async getMomentComments(momentId: string) {
    const { data, error } = await this.client
      .from('moment_comments')
      .select('character:characters(id, name, avatar_key), content, created_at')
      .eq('moment_id', momentId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`获取评论列表失败: ${error.message}`);

    const comments = await Promise.all(
      (data || []).map(async (c: any) => {
        let avatar_url: string | null = null;
        if (c.character?.avatar_key) {
          try {
            avatar_url = await this.uploadService.getPresignedUrl(c.character.avatar_key);
          } catch {
            avatar_url = null;
          }
        }
        return {
          ...c,
          character: {
            ...c.character,
            avatar_url,
          },
        };
      }),
    );

    return comments;
  }

  async setMomentBackground(novelId: string, imageUrl: string) {
    const { data, error } = await this.client
      .from('moment_backgrounds')
      .upsert({ novel_id: novelId, image_url: imageUrl }, { onConflict: 'novel_id' })
      .select()
      .single();

    if (error) throw new Error(`设置背景失败: ${error.message}`);
    return data;
  }

  async getMomentBackground(novelId: string) {
    const { data, error } = await this.client
      .from('moment_backgrounds')
      .select('image_url')
      .eq('novel_id', novelId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`获取背景失败: ${error.message}`);
    }
    return data;
  }
}
