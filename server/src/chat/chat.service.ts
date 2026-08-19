import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

@Injectable()
export class ChatService {
  private get client() {
    return getSupabaseClient();
  }

  async getCharacterWithNovel(characterId: string) {
    const { data: character, error: charError } = await this.client
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

  buildSystemPrompt(character: any, novelName: string): string {
    const parts: string[] = [];

    parts.push(`你现在正在进行角色扮演。你需要完全沉浸在以下角色中，以该角色的身份、语气、性格来回应用户。`);
    parts.push(`\n你来自小说《${novelName}》。`);
    parts.push(`\n角色名称：${character.name}`);
    parts.push(`角色分类：${character.category === 'protagonist' ? '主角' : character.category === 'supporting' ? '重要配角' : '不重要角色'}`);

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
    parts.push(`3. 根据角色的背景和性格来回应`);
    parts.push(`4. 回复要自然、生动，像真实的人物对话`);
    parts.push(`5. 如果用户问到角色设定之外的内容，以角色的视角合理推断回答`);

    return parts.join('\n');
  }

  async simulate(params: {
    characterId: string;
    message: string;
    history?: { role: string; content: string }[];
  }) {
    const { character, novel } = await this.getCharacterWithNovel(params.characterId);
    const novelName = novel?.name || '未知小说';

    const systemPrompt = this.buildSystemPrompt(character, novelName);

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
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

    const config = new Config();
    const llmClient = new LLMClient(config);

    const response = await llmClient.invoke(messages, {
      temperature: 0.8,
    });

    return { content: response.content };
  }
}
