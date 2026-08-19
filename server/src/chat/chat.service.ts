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
