import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

@Injectable()
export class ChatService {
  private get client() {
    return getSupabaseClient();
  }

  async getAffinity(userId: string, characterId: string): Promise<{ value: number; level: string }> {
    const { data, error } = await this.client
      .from('affinity')
      .select('value, level')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle();
    
    if (error || !data) {
      return { value: 50, level: 'stranger' };
    }
    return { value: data.value, level: data.level };
  }

  async updateAffinity(userId: string, characterId: string, delta: number): Promise<void> {
    const { data: existing } = await this.client
      .from('affinity')
      .select('value')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle();

    const newValue = Math.max(0, Math.min(100, (existing?.value || 50) + delta));
    let newLevel = 'stranger';
    if (newValue >= 90) newLevel = 'soulmate';
    else if (newValue >= 70) newLevel = 'intimate';
    else if (newValue >= 50) newLevel = 'friend';
    else if (newValue >= 30) newLevel = 'acquaintance';
    else if (newValue >= 10) newLevel = 'unfamiliar';

    await this.client
      .from('affinity')
      .upsert({
        user_id: userId,
        character_id: characterId,
        value: newValue,
        level: newLevel,
        updated_at: new Date().toISOString(),
      });
  }

  /** 单用户模式：取 users 表中的唯一用户 id */
  private async getDefaultUserId(): Promise<string> {
    const { data, error } = await this.client
      .from('users')
      .select('id')
      .limit(1);
    if (error || !data || data.length === 0) {
      return 'anonymous';
    }
    return data[0].id;
  }

  /** 获取"我"在该角色眼中的专属人设 */
  private async getUserPersona(userId: string, characterId: string): Promise<string | undefined> {
    const { data } = await this.client
      .from('affinity')
      .select('user_persona')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle();
    return data?.user_persona || undefined;
  }

  async getCharacterWithNovel(characterId: string) {    const { data: character, error: charError } = await this.client
      .from('characters')
      .select('id, name, category, persona, background, biography, principles, examples, novel_id')
      .eq('id', characterId)
      .maybeSingle();
    if (charError) throw new Error(`查询角色失败: ${charError.message}`);
    if (!character) throw new Error('角色不存在');

    const { data: novel, error: novelError } = await this.client
      .from('novels')
      .select('id, name')
      .eq('id', character.novel_id)
      .maybeSingle();
    if (novelError) throw new Error(`查询小说失败: ${novelError.message}`);

    return { character, novel };
  }

  buildSystemPrompt(character: any, novelName: string, speaker?: any, relationType?: string, affinityInfo?: { value: number; level: string }, userPersona?: string): string {
    const parts: string[] = [];

    parts.push(`你现在正在进行角色扮演。你需要完全沉浸在以下角色中，以该角色的身份、语气、性格来回应对话。`);
    parts.push(`\n你来自小说《${novelName}》。`);
    parts.push(`\n角色名称：${character.name}`);
    parts.push(`角色分类：${character.category === 'protagonist' ? '主角' : character.category === 'supporting' ? '重要配角' : '不重要角色'}`);

    // 如果有对话者（speaker），注入认知
    if (speaker) {
      parts.push(`\n【当前对话者认知】`);
      parts.push(`现在正在和你对话的是「${speaker.name}」。`);
      if (relationType) {
        parts.push(`「${speaker.name}」与你的关系是：${relationType}。`);
      }
      if (speaker.persona) {
        parts.push(`「${speaker.name}」的人设：${speaker.persona}`);
      }
      parts.push(`\n请根据你对「${speaker.name}」的认知和关系来回应，表现出符合这种关系的反应和态度。`);
    } else {
      parts.push(`\n【当前对话者认知】`);
      parts.push(`现在正在和你对话的是用户「我」（非小说中的角色）。`);
      if (userPersona) {
        parts.push(`在你眼中，这位「我」的身份是：${userPersona}`);
        parts.push(`请基于这一认知来理解「我」的言行（「我」说话的内容、视角都符合这个身份），并按照你自己的性格自然地与「我」互动。`);
      }
      if (affinityInfo) {
        const v = affinityInfo.value;
        const levelNames: Record<number, string> = {
          90: '灵魂知己', 70: '亲密好友', 50: '好朋友', 30: '普通朋友', 10: '不太熟', 0: '陌生人',
        };
        let levelLabel = '陌生人';
        for (const th of [90, 70, 50, 30, 10, 0]) {
          if (v >= th) { levelLabel = levelNames[th]; break; }
        }
        parts.push(`\n【亲密度系统】`);
        parts.push(`你与「我」的亲密度：${v}/100（${levelLabel}）`);
        parts.push(`请根据亲密度调整对话态度：`);
        parts.push(`- 陌生人（0-9）：保持距离，礼貌但冷淡`);
        parts.push(`- 不太熟（10-29）：略显生疏，但愿意交流`);
        parts.push(`- 普通朋友（30-49）：正常交流，态度友好`);
        parts.push(`- 好朋友（50-69）：热情友好，愿意分享`);
        parts.push(`- 亲密好友（70-89）：亲密无间，可以开玩笑`);
        parts.push(`- 灵魂知己（90-100）：心有灵犀，深度理解`);
      } else {
        parts.push(`请以你对待陌生人的方式来回应。`);
      }
    }

    if (character.persona) {
      parts.push(`\n【人设定位】\n${character.persona}`);
    }
    if (character.background) {
      parts.push(`\n【背景故事】\n${character.background}`);
    }
    if (character.biography) {
      parts.push(`\n【小传】\n${character.biography}`);
    }
    if (character.principles) {
      parts.push(`\n【行事准则】\n${character.principles}`);
    }
    if (character.examples) {
      parts.push(`\n【具体事例】\n${character.examples}`);
    }

    parts.push(`\n【重要要求】`);
    parts.push(`1. 始终保持角色一致性，不要跳出角色`);
    parts.push(`2. 用角色的语气和风格说话`);
    parts.push(`3. 根据角色的背景、性格和与对话者的关系来回应`);
    parts.push(`4. 回复要自然、生动，像真实的人物对话`);
    parts.push(`5. 如果对话者问到角色设定之外的内容，以角色的视角合理推断回答`);

    return parts.join('\n');
  }

  /** 调用扣子 Bot API 进行对话 */
  private async callCozeBot(
    botId: string,
    userId: string,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const token = process.env.COZE_WORKLOAD_API_TOKEN;
    const baseUrl = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';

    if (!token) {
      throw new Error('COZE_WORKLOAD_API_TOKEN 未配置');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 构造 additional_messages：system prompt + 历史 + 当前消息
    const additionalMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      content_type: 'text',
    }));

    console.log('[CozeBot] 调用 Bot API, bot_id:', botId, ', user_id:', userId, ', 消息数:', additionalMessages.length);

    // Step 1: 创建对话
    const chatResponse = await fetch(`${baseUrl}/v3/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bot_id: botId,
        user_id: userId,
        stream: false,
        additional_messages: additionalMessages,
        auto_save_history: true,
      }),
    });

    const chatResult = await chatResponse.json();
    console.log('[CozeBot] 对话创建结果:', JSON.stringify(chatResult));

    if (chatResult.code !== 0) {
      throw new Error(`扣子 Bot 对话创建失败: ${chatResult.msg}`);
    }

    const conversationId = chatResult.data.conversation_id;
    const chatId = chatResult.data.id;

    // Step 2: 轮询等待对话完成
    const terminalStatuses = ['completed', 'failed', 'canceled'];
    let retrieveResult: any;

    for (let i = 0; i < 60; i++) {
      const params = new URLSearchParams({
        conversation_id: conversationId,
        chat_id: chatId,
      });

      const retrieveResponse = await fetch(
        `${baseUrl}/v3/chat/retrieve?${params}`,
        { headers },
      );

      retrieveResult = await retrieveResponse.json();
      if (terminalStatuses.includes(retrieveResult.data?.status)) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (retrieveResult?.data?.status !== 'completed') {
      throw new Error(`扣子 Bot 对话未完成: ${retrieveResult?.data?.status}`);
    }

    // Step 3: 获取回复消息
    const messageParams = new URLSearchParams({
      conversation_id: conversationId,
      chat_id: chatId,
    });

    const messageResponse = await fetch(
      `${baseUrl}/v3/chat/message/list?${messageParams}`,
      { headers },
    );

    const messageResult = await messageResponse.json();
    console.log('[CozeBot] 消息结果:', JSON.stringify(messageResult));

    // 找到 assistant 的最后一条消息
    const assistantMessages = messageResult.data?.filter(
      (m: any) => m.role === 'assistant' && m.type === 'answer',
    ) || [];

    if (assistantMessages.length === 0) {
      return '（Bot 未返回内容）';
    }

    // 取最后一条 assistant 消息
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    return lastMessage.content || '（Bot 返回空内容）';
  }

  async simulate(params: {
    characterId: string;
    speakerId?: string; // 对话者角色ID（可选）
    userId?: string; // 用户ID（用于亲密度系统）
    message: string;
    history?: { role: string; content: string }[];
  }) {
    const { character, novel } = await this.getCharacterWithNovel(params.characterId);
    const novelName = novel?.name || '未知小说';

    // 获取对话者信息和关系类型
    let speaker: any = null;
    let relationType: string | undefined;

    if (params.speakerId) {
      const { data: speakerChar, error: speakerError } = await this.client
        .from('characters')
        .select('id, name, persona')
        .eq('id', params.speakerId)
        .maybeSingle();
      if (!speakerError && speakerChar) {
        speaker = speakerChar;
      }

      // 获取关系类型
      const { data: relation } = await this.client
        .from('relationships')
        .select('relation_type')
        .eq('novel_id', character.novel_id)
        .eq('from_character_id', params.speakerId)
        .eq('to_character_id', params.characterId)
        .maybeSingle();
      if (relation) {
        relationType = relation.relation_type;
      }
    }

    // 获取亲密度与"我"的专属人设（仅当以用户身份对话时）
    let affinityInfo = { value: 50, level: 'stranger' };
    let userPersona: string | undefined;
    if (!params.speakerId) {
      // 单用户模式：前端未传 userId 时自动补齐，保证亲密度系统在"我自己"对话时生效
      if (!params.userId) {
        params.userId = await this.getDefaultUserId();
      }
      affinityInfo = await this.getAffinity(params.userId, params.characterId);
      userPersona = await this.getUserPersona(params.userId, params.characterId);
    }

    const systemPrompt = this.buildSystemPrompt(character, novelName, speaker, relationType, affinityInfo, userPersona);

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add history
    if (params.history && params.history.length > 0) {
      for (const msg of params.history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', content: params.message });

    // 调用扣子 Bot API
    const BOT_ID = '7675587755577458722';
    const userId = params.userId || 'default_user';
    const content = await this.callCozeBot(BOT_ID, userId, messages);

    // 更新亲密度（仅当以用户身份对话时）
    if (params.userId && !params.speakerId) {
      // 简单逻辑：每次对话 +1 亲密度
      await this.updateAffinity(params.userId, params.characterId, 1);
    }

    return { content };
  }

  async generateNovelGraph(novelId: string) {
    // Get all characters in the novel
    const { data: characters, error: charError } = await this.client
      .from('characters')
      .select('id, name, category, persona, background')
      .eq('novel_id', novelId);

    if (charError) throw new Error(`查询角色失败: ${charError.message}`);
    if (!characters || characters.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Get existing relationships
    const { data: relationships, error: relError } = await this.client
      .from('relationships')
      .select('from_character_id, to_character_id, relation_type, description')
      .eq('novel_id', novelId);

    if (relError) throw new Error(`查询关系失败: ${relError.message}`);

    // Build prompt for LLM to analyze and generate graph
    const charInfo = characters.map(c => {
      let info = `角色名: ${c.name}, 分类: ${c.category === 'protagonist' ? '主角' : c.category === 'supporting' ? '重要配角' : '不重要角色'}`;
      if (c.persona) info += `, 人设: ${c.persona.substring(0, 100)}`;
      if (c.background) info += `, 背景: ${c.background.substring(0, 100)}`;
      return info;
    }).join('\n');

    const existingRels = relationships?.map(r => {
      const fromChar = characters.find(c => c.id === r.from_character_id);
      const toChar = characters.find(c => c.id === r.to_character_id);
      return `${fromChar?.name || '未知'} -> ${toChar?.name || '未知'}: ${r.relation_type} (${r.description || '无描述'})`;
    }).join('\n') || '无';

    const systemPrompt = `你是一个小说人物关系分析专家。请根据以下小说角色信息和已有关系，分析并生成完整的人物关系图谱。

【小说角色列表】
${charInfo}

【已有关系】
${existingRels}

请分析所有角色之间的潜在关系，生成一个 JSON 格式的关系图谱。要求：
1. 包含所有角色作为节点
2. 分析角色之间可能存在的关系（如：师徒、恋人、敌人、亲人、朋友、主仆等）
3. 每条边包含 from（起点角色名）、to（终点角色名）、relation（关系类型）、description（关系描述）

返回格式：
{
  "nodes": [{"id": "角色id", "name": "角色名"}],
  "edges": [{"from": "角色名", "to": "角色名", "relation": "关系类型", "description": "关系描述"}]
}

只返回 JSON，不要其他内容。`;

    const config = new Config();
    const llmClient = new LLMClient(config);

    const response = await llmClient.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请生成这部小说的完整人物关系图谱' },
    ], {
      temperature: 0.7,
    });

    // Parse the response
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const graph = JSON.parse(jsonMatch[0]);
        // Map character names to IDs
        const charNameToId = new Map(characters.map(c => [c.name, c.id]));
        
        const nodes = characters.map(c => ({
          id: c.id,
          name: c.name,
          category: c.category,
        }));

        const edges = (graph.edges || []).map((e: any) => ({
          from: charNameToId.get(e.from) || e.from,
          to: charNameToId.get(e.to) || e.to,
          fromName: e.from,
          toName: e.to,
          relation: e.relation || 'unknown',
          description: e.description || '',
        }));

        return { nodes, edges };
      }
    } catch (e) {
      console.error('Failed to parse LLM response:', e);
    }

    // Fallback: return basic graph with characters as nodes and existing relationships as edges
    const nodes = characters.map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
    }));

    const edges = (relationships || []).map(r => {
      const fromChar = characters.find(c => c.id === r.from_character_id);
      const toChar = characters.find(c => c.id === r.to_character_id);
      return {
        from: r.from_character_id,
        to: r.to_character_id,
        fromName: fromChar?.name || '未知',
        toName: toChar?.name || '未知',
        relation: r.relation_type,
        description: r.description || '',
      };
    });

    return { nodes, edges };
  }
}
