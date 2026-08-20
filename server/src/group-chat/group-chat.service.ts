import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { UploadService } from '@/upload/upload.service';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

@Injectable()
export class GroupChatService {
  constructor(private readonly uploadService: UploadService) {}

  private get client() {
    return getSupabaseClient();
  }

  /** 解析 member_ids JSON 字符串 */
  private parseMemberIds(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  /** 群聊成员信息（含头像） */
  private async getMembers(memberIds: string[]) {
    if (memberIds.length === 0) return [];
    const { data, error } = await this.client
      .from('characters')
      .select('id, name, category, persona, background, biography, principles, examples, avatar_key')
      .in('id', memberIds);
    if (error) throw new Error(`查询群成员失败: ${error.message}`);
    return data || [];
  }

  /** 为成员补充头像 URL */
  private async enrichMemberAvatar(member: any) {
    let avatar_url: string | null = null;
    if (member.avatar_key) {
      try {
        avatar_url = await this.uploadService.getPresignedUrl(member.avatar_key);
      } catch {
        avatar_url = null;
      }
    }
    return { ...member, avatar_url };
  }

  /** 创建群聊 */
  async create(params: { novel_id: string; name: string; member_ids: string[] }) {
    if (!params.name?.trim()) throw new Error('群聊名称不能为空');
    if (!params.member_ids || params.member_ids.length === 0) throw new Error('请至少选择一名角色');

    const { data, error } = await this.client
      .from('group_chats')
      .insert({
        novel_id: params.novel_id,
        name: params.name.trim(),
        member_ids: JSON.stringify(params.member_ids),
      })
      .select()
      .single();
    if (error) throw new Error(`创建群聊失败: ${error.message}`);
    return { ...data, member_ids: this.parseMemberIds(data.member_ids) };
  }

  /** 查询小说下的群聊列表（附带成员简要信息） */
  async findByNovelId(novelId: string) {
    const { data, error } = await this.client
      .from('group_chats')
      .select('id, novel_id, name, member_ids, created_at, updated_at')
      .eq('novel_id', novelId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`查询群聊列表失败: ${error.message}`);

    const result: {
      id: string;
      novel_id: string;
      name: string;
      member_count: number;
      members: { id: string; name: string; avatar_key: string | null }[];
      created_at: string;
      updated_at: string;
    }[] = [];
    for (const g of data || []) {
      const memberIds = this.parseMemberIds(g.member_ids);
      const members = await this.getMembers(memberIds);
      result.push({
        id: g.id,
        novel_id: g.novel_id,
        name: g.name,
        member_count: members.length,
        members: members.slice(0, 9).map((m: any) => ({ id: m.id, name: m.name, avatar_key: m.avatar_key })),
        created_at: g.created_at,
        updated_at: g.updated_at,
      });
    }
    return result;
  }

  /** 群聊详情（含完整成员信息与头像） */
  async findById(id: string) {
    const { data, error } = await this.client
      .from('group_chats')
      .select('id, novel_id, name, member_ids, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`查询群聊失败: ${error.message}`);
    if (!data) return null;

    const memberIds = this.parseMemberIds(data.member_ids);
    const members = await Promise.all(
      (await this.getMembers(memberIds)).map((m: any) => this.enrichMemberAvatar(m)),
    );

    // 最近一条消息作为预览
    const { data: lastMsg } = await this.client
      .from('group_messages')
      .select('content, sender_name, created_at')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      id: data.id,
      novel_id: data.novel_id,
      name: data.name,
      members,
      last_message: lastMsg && lastMsg.length > 0 ? lastMsg[0] : null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /** 删除群聊 */
  async remove(id: string) {
    const { error } = await this.client.from('group_chats').delete().eq('id', id);
    if (error) throw new Error(`删除群聊失败: ${error.message}`);
    return { success: true };
  }

  /** 获取群聊消息列表 */
  async getMessages(groupId: string) {
    const { data, error } = await this.client
      .from('group_messages')
      .select('id, group_id, role, character_id, sender_name, content, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw new Error(`查询群聊消息失败: ${error.message}`);
    return data || [];
  }

  /** 构建群聊 System Prompt */
  private buildGroupSystemPrompt(
    novelName: string,
    groupName: string,
    members: any[],
  ): string {
    const parts: string[] = [];
    parts.push(`你是一个多人群聊模拟引擎。现在模拟小说《${novelName}》中的角色们在群聊「${groupName}」中的互动。`);
    parts.push(`\n【群聊成员】`);
    parts.push(`1. 「我」（用户）：群聊的发起者，非小说中的角色。`);
    members.forEach((m: any, i: number) => {
      const idx = i + 2;
      const catLabel = m.category === 'protagonist' ? '主角' : m.category === 'supporting' ? '重要配角' : '不重要角色';
      parts.push(`${idx}. 「${m.name}」（${catLabel}）`);
      if (m.persona) parts.push(`   人设：${m.persona}`);
      if (m.background) parts.push(`   背景：${m.background}`);
      if (m.biography) parts.push(`   小传：${m.biography}`);
      if (m.principles) parts.push(`   行事准则：${m.principles}`);
      if (m.examples) parts.push(`   具体事例：${m.examples}`);
    });

    parts.push(`\n【互动规则】`);
    parts.push(`1. 「我」刚在群里发了一条消息。请模拟群成员们对这条消息的反应。`);
    parts.push(`2. 每个角色根据自己的人设独立决定是否参与本轮发言：不感兴趣、性格冷淡或没看到的角色可以完全沉默，不要强行让所有人说话。`);
    parts.push(`3. 角色可以 @其他角色名 或 @我 发起互动、追问、吐槽。被@的角色可以回应，也可以置之不理，或者因为真的很忙而没看到——完全由角色人设决定。`);
    parts.push(`4. 角色之间可以互相接话、插科打诨、抬杠争论，模拟真实群聊的节奏和氛围。`);
    parts.push(`5. 本轮生成 1 至 6 条消息，按对话逻辑自然排序。每条消息要短小口语化，符合微信群聊风格。`);
    parts.push(`6. 始终保持角色一致性，用各角色自己的语气和风格说话，不要跳出角色。`);

    parts.push(`\n【输出格式（严格遵守）】`);
    parts.push(`每条消息单独一行，格式为：【角色名】消息内容`);
    parts.push(`只输出角色名和消息内容，不要输出任何旁白、动作描述、解释或序号。`);
    parts.push(`沉默的角色不要输出。`);

    return parts.join('\n');
  }

  /** 调用扣子 Bot API（非流式 + 轮询） */
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

    const additionalMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      content_type: 'text',
    }));

    console.log('[GroupChat] 调用 Bot API, bot_id:', botId, ', 消息数:', additionalMessages.length);

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
    if (chatResult.code !== 0) {
      throw new Error(`扣子 Bot 对话创建失败: ${chatResult.msg}`);
    }

    const conversationId = chatResult.data.conversation_id;
    const chatId = chatResult.data.id;

    const terminalStatuses = ['completed', 'failed', 'canceled'];
    let retrieveResult: any;

    for (let i = 0; i < 90; i++) {
      const params = new URLSearchParams({
        conversation_id: conversationId,
        chat_id: chatId,
      });
      const retrieveResponse = await fetch(`${baseUrl}/v3/chat/retrieve?${params}`, { headers });
      retrieveResult = await retrieveResponse.json();
      if (terminalStatuses.includes(retrieveResult.data?.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (retrieveResult?.data?.status !== 'completed') {
      throw new Error(`扣子 Bot 对话未完成: ${retrieveResult?.data?.status}`);
    }

    const messageParams = new URLSearchParams({ conversation_id: conversationId, chat_id: chatId });
    const messageResponse = await fetch(`${baseUrl}/v3/chat/message/list?${messageParams}`, { headers });
    const messageResult = await messageResponse.json();

    const assistantMessages = messageResult.data?.filter(
      (m: any) => m.role === 'assistant' && m.type === 'answer',
    ) || [];

    if (assistantMessages.length === 0) {
      return '';
    }
    return assistantMessages[assistantMessages.length - 1].content || '';
  }

  /** 解析 AI 输出为结构化消息 */
  private parseBotReply(reply: string, members: any[]): { character_id: string; sender_name: string; content: string }[] {
    const result: { character_id: string; sender_name: string; content: string }[] = [];
    const nameMap = new Map<string, string>();
    members.forEach((m: any) => {
      nameMap.set(m.name, m.id);
      // 去掉可能的空格差异
      nameMap.set(m.name.replace(/\s+/g, ''), m.id);
    });

    const lines = reply.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^【(.+?)】(.*)$/);
      if (!match) continue;
      const name = match[1].trim();
      const content = match[2].trim();
      if (!content) continue;
      const charId = nameMap.get(name) || nameMap.get(name.replace(/\s+/g, ''));
      if (!charId) continue; // 非群成员，忽略
      result.push({ character_id: charId, sender_name: name, content });
    }
    return result;
  }

  /** 群聊互动：用户发消息 → 保存 → AI 模拟多角色回复 */
  async simulate(params: { groupId: string; message: string }) {
    const { data: group, error } = await this.client
      .from('group_chats')
      .select('id, novel_id, name, member_ids')
      .eq('id', params.groupId)
      .maybeSingle();
    if (error || !group) throw new Error('群聊不存在');

    const { data: novel } = await this.client
      .from('novels')
      .select('id, name')
      .eq('id', group.novel_id)
      .maybeSingle();

    const memberIds = this.parseMemberIds(group.member_ids);
    const members = await this.getMembers(memberIds);
    if (members.length === 0) throw new Error('群聊没有成员');

    // 1. 保存用户消息
    const { data: userMsg, error: msgError } = await this.client
      .from('group_messages')
      .insert({
        group_id: params.groupId,
        role: 'user',
        sender_name: '我',
        content: params.message,
      })
      .select()
      .single();
    if (msgError) throw new Error(`保存用户消息失败: ${msgError.message}`);

    // 2. 拉取最近上下文（含刚插入的用户消息）
    const { data: history } = await this.client
      .from('group_messages')
      .select('role, sender_name, content')
      .eq('group_id', params.groupId)
      .order('created_at', { ascending: true })
      .limit(60);

    const systemPrompt = this.buildGroupSystemPrompt(novel?.name || '未知小说', group.name, members);
    const messages: { role: string; content: string }[] = [{ role: 'system', content: systemPrompt }];

    // 将群聊历史转换为对话消息（合并为 user 消息串，让 Bot 理解上下文）
    if (history && history.length > 1) {
      const historyLines = history
        .slice(0, -1) // 除最后一条（当前用户消息）外
        .map((h) => `${h.role === 'user' ? '【我】' : `【${h.sender_name}】`}${h.content}`)
        .join('\n');
      if (historyLines) {
        messages.push({ role: 'user', content: `【以下是群聊历史记录】\n${historyLines}` });
        messages.push({ role: 'assistant', content: '好的，我已了解群聊的历史记录和各成员的发言风格。' });
      }
    }

    messages.push({ role: 'user', content: params.message });

    // 3. 调用 Bot（失败时降级到 LLMClient）
    const BOT_ID = '7675587755577458722';
    let characterMessages: { character_id: string; sender_name: string; content: string }[] = [];
    try {
      let reply: string;
      try {
        reply = await this.callCozeBot(BOT_ID, `group_${params.groupId}`, messages);
      } catch (botErr) {
        // Bot 未发布或调用失败时，降级到 LLMClient（提示词相同）
        console.warn('[GroupChat] Bot 调用失败，降级到 LLMClient:', (botErr as Error).message);
        const config = new Config();
        const llmClient = new LLMClient(config);
        const llmResponse = await llmClient.invoke(messages as any, { temperature: 0.8 });
        reply = llmResponse.content || '';
      }
      console.log('[GroupChat] Bot 原始回复:', reply);
      characterMessages = this.parseBotReply(reply, members);
    } catch (e) {
      console.error('[GroupChat] AI 调用失败:', e);
      throw e;
    }

    // 4. 保存角色消息
    if (characterMessages.length > 0) {
      const rows = characterMessages.map((m) => ({
        group_id: params.groupId,
        role: 'character',
        character_id: m.character_id,
        sender_name: m.sender_name,
        content: m.content,
      }));
      const { data: savedMsgs, error: saveError } = await this.client
        .from('group_messages')
        .insert(rows)
        .select();
      if (saveError) throw new Error(`保存角色消息失败: ${saveError.message}`);

      // 更新群聊 updated_at
      await this.client
        .from('group_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', params.groupId);

      return { user_message: userMsg, character_messages: savedMsgs };
    }

    return { user_message: userMsg, character_messages: [] };
  }
}
