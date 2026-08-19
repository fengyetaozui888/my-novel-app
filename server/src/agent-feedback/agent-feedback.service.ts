import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const LLM_MODEL = 'doubao-seed-2-0-mini-260215';

@Injectable()
export class AgentFeedbackService {
  private client = getSupabaseClient();

  /** 列出某本书下的反馈历史（含角色名） */
  async listFeedback(novelId: string) {
    const { data, error } = await this.client
      .from('agent_feedback')
      .select('id, character_id, feedback_text, optimization, status, created_at, characters(name)')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    return (data || []).map((row: any) => ({
      id: row.id,
      character_id: row.character_id,
      character_name: row.characters?.name || null,
      feedback_text: row.feedback_text,
      optimization: row.optimization,
      status: row.status,
      created_at: row.created_at,
    }));
  }

  /**
   * 提交反馈并优化角色模拟：
   * 1. LLM 分析反馈，产出可执行的行为修正准则
   * 2. 修正准则追加进角色 principles（对话系统提示词自动生效）
   */
  async submitFeedback(params: {
    novelId: string;
    characterId?: string;
    feedbackText: string;
  }) {
    const { novelId, feedbackText } = params;
    const characterId = params.characterId || null;

    let character: any = null;
    let principlePatch = '';
    let optimizationNote = '已记录反馈';

    if (characterId) {
      const { data, error } = await this.client
        .from('characters')
        .select('id, name, persona, background, principles, tagline')
        .eq('id', characterId)
        .single();
      if (!error) character = data;
    }

    if (character) {
      const llmClient = new LLMClient(new Config());
      const prompt = `你是一个角色扮演 AI 的行为审计员。用户反馈角色"${character.name}"做出了不符合人设的行为，请根据反馈产出一条简短的行为修正准则（50字以内、祈使句、可直接执行），用于追加到该角色的行为准则中，使其后续模拟更贴合人设。

角色现有人设：
${character.persona ? `人设定位：${character.persona}` : ''}
${character.background ? `背景故事：${character.background}` : ''}
${character.tagline ? `一句话简介：${character.tagline}` : ''}
${character.principles ? `现有行为准则：${character.principles}` : ''}

用户反馈：
${feedbackText}

只输出修正准则本身，不要任何解释或格式。`;

      try {
        const response = await llmClient.invoke(
          [{ role: 'user' as const, content: prompt }],
          { model: LLM_MODEL, temperature: 0.3 },
        );
        principlePatch = (response?.content || '').trim().replace(/^["'「」]|["'「」]$/g, '');
      } catch (e) {
        principlePatch = '';
      }

      if (principlePatch) {
        const merged = character.principles
          ? `${character.principles}\n- ${principlePatch}`
          : `- ${principlePatch}`;
        const { error: updateError } = await this.client
          .from('characters')
          .update({ principles: merged })
          .eq('id', characterId);
        if (!updateError) {
          optimizationNote = `已优化：${principlePatch}`;
        }
      }
    }

    const { data, error } = await this.client
      .from('agent_feedback')
      .insert({
        novel_id: novelId,
        character_id: characterId,
        feedback_text: feedbackText,
        optimization: optimizationNote,
        status: principlePatch ? 'applied' : 'recorded',
      })
      .select('id, feedback_text, optimization, status, created_at')
      .single();

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return { ...data, character_name: character?.name || null };
  }
}
