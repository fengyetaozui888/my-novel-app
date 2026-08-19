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

  /** 用户以"我"的身份发布朋友圈，并触发角色按亲密度回复 */
  async createUserMoment(params: {
    novelId: string;
    uid?: string;
    content: string;
    imageUrl?: string;
  }) {
    // 查用户昵称（uid 为空时使用默认用户）
    const userId = params.uid || (await this.getUserId());
    const { data: user } = await this.client
      .from('users')
      .select('nickname')
      .eq('id', userId)
      .maybeSingle();

    const { data, error } = await this.client
      .from('moments')
      .insert({
        character_id: null,
        novel_id: params.novelId,
        content: params.content,
        image_url: params.imageUrl || null,
        visibility: 'public',
        author_type: 'user',
        author_name: user?.nickname || '我',
      })
      .select()
      .single();

    if (error) throw new Error(`发布朋友圈失败: ${error.message}`);

    // 异步生成角色回复（不阻塞发布）
    this.generateUserMomentReplies(data.id, params.novelId, userId, params.content).catch(() => undefined);

    return data;
  }

  /** 根据亲密度生成角色对用户朋友圈的评论 */
  private async generateUserMomentReplies(
    momentId: string,
    novelId: string,
    uid: string,
    userContent: string,
  ) {
    // 取该小说下有立绘/有关系的主要角色（最多8个）
    const { data: characters } = await this.client
      .from('characters')
      .select('id, name, persona, tagline')
      .eq('novel_id', novelId)
      .limit(8);

    if (!characters || characters.length === 0) return;

    // 取这些角色与用户的亲密度
    const { data: affinities } = await this.client
      .from('affinity')
      .select('character_id, value')
      .eq('user_id', uid)
      .in('character_id', characters.map((c: any) => c.id));

    const affinityMap = new Map<string, number>(
      (affinities || []).map((a: any) => [a.character_id, a.value ?? 50]),
    );

    // 亲密度高的优先，选 1~3 个角色回复
    const sorted = characters
      .map((c: any) => ({ ...c, affinity: affinityMap.get(c.id) ?? 50 }))
      .sort((a: any, b: any) => b.affinity - a.affinity);
    const replyCount = Math.min(sorted.length, 1 + Math.floor(Math.random() * 3));
    const repliers = sorted.slice(0, replyCount);

    const llmClient = new LLMClient(new Config());

    for (const c of repliers) {
      const levelDesc =
        c.affinity >= 80 ? '挚友（对你十分亲近，语气亲昵热情）'
        : c.affinity >= 60 ? '好友（熟络自然，语气轻松）'
        : c.affinity >= 40 ? '普通朋友（友好但保持分寸）'
        : c.affinity >= 20 ? '泛泛之交（客气疏离）'
        : '陌生人（冷淡客气）';

      const prompt = `你是"${c.name}"（${c.persona || c.tagline || ''}）。用户（你的${levelDesc}，亲密度${c.affinity}/100）发了一条朋友圈：
"${userContent}"

请以该角色身份写一条评论（30字以内），语气必须符合当前亲密度：${levelDesc}。直接输出评论内容。`;

      try {
        const response = await llmClient.invoke(
          [{ role: 'user' as const, content: prompt }],
          { model: LLM_MODEL, temperature: 0.8 },
        );
        const reply = (response?.content || '').trim();
        if (reply) {
          await this.client.from('moment_comments').insert({
            moment_id: momentId,
            character_id: c.id,
            content: reply,
            author_type: 'character',
            author_name: c.name,
          });
        }
      } catch {
        // 单个角色回复失败忽略
      }
    }
  }

  /** 单用户模式：取 users 表中的第一个用户 id */
  private async getUserId(): Promise<string> {
    const { data } = await this.client
      .from('users')
      .select('id, nickname')
      .limit(1);
    if (!data || data.length === 0) return '';
    return (data[0] as any).id;
  }

  async getMoments(novelId: string, characterId?: string, page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const uid = await this.getUserId();

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

        // 聚合点赞数 / 评论数 / 当前用户是否已赞 / 点赞者名单 / 评论列表
        const [likesRes, commentsRes, { count: likesCount }, { count: commentsCount }] = await Promise.all([
          this.client.from('moment_likes').select('character_id, user_id, character:characters(name)').eq('moment_id', moment.id),
          this.client.from('moment_comments').select('id, author_type, author_name, content, created_at').eq('moment_id', moment.id).order('created_at', { ascending: true }),
          this.client.from('moment_likes').select('*', { count: 'exact', head: true }).eq('moment_id', moment.id),
          this.client.from('moment_comments').select('*', { count: 'exact', head: true }).eq('moment_id', moment.id),
        ]);
        const likerNames = (likesRes.data || []).map((l: any) =>
          l.character?.name || (l.user_id ? '我' : '未知')
        );
        const commentList = (commentsRes.data || []).map((c: any) => ({
          id: c.id,
          author_type: c.author_type,
          author_name: c.author_name,
          content: c.content,
          created_at: c.created_at,
        }));
        let isLiked = false;
        if (uid) {
          const { data: myLike } = await this.client
            .from('moment_likes')
            .select('id')
            .eq('moment_id', moment.id)
            .eq('user_id', uid)
            .maybeSingle();
          isLiked = !!myLike;
        }

        return {
          ...moment,
          likes_count: likesCount ?? 0,
          comments_count: commentsCount ?? 0,
          is_liked: isLiked,
          liker_names: likerNames,
          comments: commentList,
          character: {
            ...moment.character,
            avatar_url,
          },
        };
      }),
    );

    return moments;
  }

  /** 点赞/取消点赞（characterId 为空表示用户点赞） */
  async toggleLikeMoment(momentId: string, characterId?: string) {
    const uid = characterId ? null : await this.getUserId();

    const existing = await this.client
      .from('moment_likes')
      .select('id')
      .eq('moment_id', momentId);
    if (existing.error) throw new Error(`点赞查询失败: ${existing.error.message}`);

    const mine = (existing.data || []).find((l: any) =>
      characterId ? l.character_id === characterId : uid && l.user_id === uid,
    );

    if (mine) {
      const { error } = await this.client
        .from('moment_likes')
        .delete()
        .eq('id', (mine as any).id);
      if (error) throw new Error(`取消点赞失败: ${error.message}`);
      return { liked: false };
    }

    const { error } = await this.client.from('moment_likes').insert({
      moment_id: momentId,
      character_id: characterId || null,
      user_id: uid || null,
    });
    if (error) throw new Error(`点赞失败: ${error.message}`);
    return { liked: true };
  }

  async getMomentLikes(momentId: string) {
    const { data, error } = await this.client
      .from('moment_likes')
      .select('character:characters(id, name, avatar_key)')
      .eq('moment_id', momentId);

    if (error) throw new Error(`获取点赞列表失败: ${error.message}`);
    return data || [];
  }

  /** 评论：characterId 存在时以角色身份评论，否则以"我"（用户）的身份评论 */
  async commentMoment(
    momentId: string,
    characterId: string | null,
    content: string,
    uid?: string,
  ) {
    const userId = uid || (characterId ? '' : await this.getUserId());
    let authorName: string | null = null;
    if (userId) {
      const { data: user } = await this.client
        .from('users')
        .select('nickname')
        .eq('id', userId)
        .maybeSingle();
      authorName = user?.nickname || '我';
    }

    const { data, error } = await this.client
      .from('moment_comments')
      .insert({
        moment_id: momentId,
        character_id: characterId,
        content,
        author_type: userId ? 'user' : 'character',
        author_name: authorName,
      })
      .select()
      .single();

    if (error) throw new Error(`评论失败: ${error.message}`);

    // 用户评论角色的朋友圈时，让被评论的角色按亲密度回复（异步）
    if (userId) {
      const { data: moment } = await this.client
        .from('moments')
        .select('character_id, content')
        .eq('id', momentId)
        .maybeSingle();
      if (moment?.character_id) {
        this.generateCharacterReplyToUserComment(
          momentId,
          moment.character_id,
          userId,
          content,
        ).catch(() => undefined);
      }
    }

    return data;
  }

  /** 角色按亲密度回复用户的评论 */
  private async generateCharacterReplyToUserComment(
    momentId: string,
    characterId: string,
    uid: string,
    userComment: string,
  ) {
    const { data: character } = await this.client
      .from('characters')
      .select('id, name, persona, tagline')
      .eq('id', characterId)
      .maybeSingle();
    if (!character) return;

    const { data: affinity } = await this.client
      .from('affinity')
      .select('value')
      .eq('user_id', uid)
      .eq('character_id', characterId)
      .maybeSingle();

    const value = (affinity as any)?.value ?? 50;
    const levelDesc =
      value >= 80 ? '挚友（对你十分亲近，语气亲昵热情）'
      : value >= 60 ? '好友（熟络自然，语气轻松）'
      : value >= 40 ? '普通朋友（友好但保持分寸）'
      : value >= 20 ? '泛泛之交（客气疏离）'
      : '陌生人（冷淡客气）';

    const llmClient = new LLMClient(new Config());
    const prompt = `你是"${character.name}"（${character.persona || character.tagline || ''}）。用户（你的${levelDesc}，亲密度${value}/100）在你的朋友圈下评论了你：
"${userComment}"

请以该角色身份回复这条评论（30字以内），语气必须符合当前亲密度：${levelDesc}。直接输出回复内容。`;

    try {
      const response = await llmClient.invoke(
        [{ role: 'user' as const, content: prompt }],
        { model: LLM_MODEL, temperature: 0.8 },
      );
      const reply = (response?.content || '').trim();
      if (reply) {
        await this.client.from('moment_comments').insert({
          moment_id: momentId,
          character_id: characterId,
          content: reply,
          author_type: 'character',
          author_name: character.name,
        });
      }
    } catch {
      // 回复失败忽略
    }
  }

  async getMomentComments(momentId: string) {
    const { data, error } = await this.client
      .from('moment_comments')
      .select('character:characters(id, name, avatar_key), author_type, author_name, content, created_at')
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
