import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, VideoGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import axios from 'axios';
import { UploadService } from '@/upload/upload.service';
import { UsersService } from '@/users/users.service';

// 开发者 UID 白名单（3D 互动免积分）
const DEVELOPER_UIDS = ['UMSZWBAF7'];
const PORTRAIT_COST = 300; // 生成立绘消耗积分
const INTERACT_COST = 100; // 每次互动消耗积分
const VIDEO_MODEL = 'doubao-seedance-2-0-260128';
const LLM_MODEL = 'doubao-seed-2-0-mini-260215';

interface CharacterRow {
  id: string;
  name: string;
  persona: string | null;
  background: string | null;
  portrait_prompt: string | null;
  portrait_key: string | null;
  portrait_frame_key: string | null;
}

@Injectable()
export class PortraitService {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  /** 查询角色立绘状态 */
  async getPortrait(characterId: string): Promise<{
    character_id: string;
    character_name: string;
    has_portrait: boolean;
    portrait_url: string | null;
    portrait_frame_url: string | null;
    portrait_prompt: string | null;
  }> {
    const character = await this.getCharacter(characterId);
    return {
      character_id: character.id,
      character_name: character.name,
      has_portrait: !!character.portrait_key,
      portrait_url: character.portrait_key
        ? await this.uploadService.getPresignedUrl(character.portrait_key)
        : null,
      portrait_frame_url: character.portrait_frame_key
        ? await this.uploadService.getPresignedUrl(character.portrait_frame_key)
        : null,
      portrait_prompt: character.portrait_prompt,
    };
  }

  /** 生成立绘：LLM 转译人设 → Seedance 生成 3D 立绘视频（含末帧） */
  async generatePortrait(characterId: string, headers: Record<string, string>) {
    const character = await this.getCharacter(characterId);

    if (!character.persona && !character.background) {
      throw new BadRequestException('请先在角色详情中填写人设或背景设定，再生成 3D 立绘');
    }

    // 1. LLM 将用户填写的人设转译为专业视频生成提示词
    const prompt = await this.buildPortraitPrompt(character);

    // 2. Seedance 生成立绘视频（竖屏 9:16，带末帧用于后续互动）
    const videoClient = new VideoGenerationClient(
      new Config(),
      HeaderUtils.extractForwardHeaders(headers),
    );
    const result = await videoClient.videoGeneration(
      [{ type: 'text', text: prompt }],
      {
        model: VIDEO_MODEL,
        ratio: '9:16',
        duration: 5,
        returnLastFrame: true,
      },
    );

    if (!result?.videoUrl) {
      throw new BadRequestException('立绘视频生成失败，请稍后重试');
    }

    // 3. 下载视频与末帧，转存到对象存储（长期可用）
    const videoBuffer = await this.downloadFile(result.videoUrl);
    const portraitSave = await this.uploadService.uploadBuffer(
      videoBuffer,
      `uploads/portraits/${Date.now()}_${this.randomId()}.mp4`,
      'video/mp4',
    );

    let frameKey: string | null = null;
    if (result.lastFrameUrl) {
      const frameBuffer = await this.downloadFile(result.lastFrameUrl);
      const frameSave = await this.uploadService.uploadBuffer(
        frameBuffer,
        `uploads/portraits/${Date.now()}_${this.randomId()}.jpg`,
        'image/jpeg',
      );
      frameKey = frameSave.key;
    }

    // 4. 扣积分（开发者免费）
    const credit = await this.chargeCredits(PORTRAIT_COST, '生成 3D 立绘');

    // 5. 保存到角色
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('characters')
      .update({
        portrait_prompt: prompt,
        portrait_key: portraitSave.key,
        portrait_frame_key: frameKey,
      })
      .eq('id', characterId);

    if (error) throw new BadRequestException(`立绘保存失败: ${error.message}`);

    return {
      character_id: characterId,
      portrait_url: portraitSave.url,
      portrait_prompt: prompt,
      credits_left: credit.credits,
      charged: credit.charged,
    };
  }

  /** 3D 互动：LLM 生成回复与动作 → Seedance 生成反应视频 */
  async interact(
    characterId: string,
    message: string,
    history: Array<{ role: string; content: string }>,
    headers: Record<string, string>,
  ) {
    if (!message || !message.trim()) {
      throw new BadRequestException('消息内容不能为空');
    }

    const character = await this.getCharacter(characterId);
    if (!character.portrait_frame_key) {
      throw new BadRequestException('请先生成 3D 立绘，再进行互动');
    }

    const frameUrl = await this.uploadService.getPresignedUrl(character.portrait_frame_key);

    // 1. LLM 生成回复 + 动作提示词（JSON 输出）
    const { reply, motionPrompt } = await this.buildInteraction(character, message, history || []);

    // 2. Seedance 基于末帧生成反应视频（图生视频：首帧 + 动作提示词）
    const videoClient = new VideoGenerationClient(
      new Config(),
      HeaderUtils.extractForwardHeaders(headers),
    );
    const result = await videoClient.videoGeneration(
      [
        { type: 'image_url', image_url: { url: frameUrl }, role: 'first_frame' },
        { type: 'text', text: motionPrompt },
      ],
      {
        model: VIDEO_MODEL,
        ratio: '9:16',
        duration: 5,
      },
    );

    if (!result?.videoUrl) {
      throw new BadRequestException('反应视频生成失败，请稍后重试');
    }

    // 3. 转存视频到对象存储
    const videoBuffer = await this.downloadFile(result.videoUrl);
    const videoSave = await this.uploadService.uploadBuffer(
      videoBuffer,
      `uploads/interactions/${Date.now()}_${this.randomId()}.mp4`,
      'video/mp4',
    );

    // 4. 扣积分（开发者免费）
    const credit = await this.chargeCredits(INTERACT_COST, '3D 互动');

    return {
      reply,
      video_url: videoSave.url,
      motion_prompt: motionPrompt,
      credits_left: credit.credits,
      charged: credit.charged,
    };
  }

  /** LLM：将用户填写的人设转译为红果短剧爆款仙侠风 3D 立绘提示词 */
  private async buildPortraitPrompt(character: CharacterRow): Promise<string> {
    const llm = new LLMClient(new Config());
    const systemPrompt = `你是一位顶尖的 AI 视频生成提示词工程师，专精于"红果短剧爆款仙侠剧"风格的 3D 人物立绘提示词撰写。
用户会提供小说角色的设定信息（人设、背景、外貌穿着等），这些信息是给"人"看的，不能直接喂给视频生成模型。
你的任务：把用户的自然语言描述转译成视频生成模型听得懂的专业提示词。

要求：
1. 输出一段连贯的中文提示词（200-400字），不要输出任何解释、标题或多余内容
2. 风格锚定：3D 渲染、仙侠剧质感、红果短剧爆款仙侠审美、精致面容、电影级打光、竖屏立绘构图
3. 必须包含：性别年龄感、五官气质、发型发色、服装材质与配色、配饰、站姿（看板娘式面对镜头）、背景氛围
4. 动作限定：轻微待机动作（呼吸感、发丝微动、衣袂轻扬），不要大动作
5. 用户没写的外貌细节，根据人设气质合理补全（保持角色调性）
6. 提示词中不出现角色姓名，只用外观描述`;

    const userPrompt = `角色名：${character.name}
人设：${character.persona || '（未填写）'}
背景：${character.background || '（未填写）'}

请转译为 Seedance 视频生成提示词：`;

    const response = await llm.invoke(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: LLM_MODEL, temperature: 0.7 },
    );

    const prompt = (response?.content || '').trim();
    if (!prompt) throw new BadRequestException('提示词生成失败，请稍后重试');
    return prompt;
  }

  /** LLM：生成交互回复与动作提示词 */
  private async buildInteraction(
    character: CharacterRow,
    message: string,
    history: Array<{ role: string; content: string }>,
  ): Promise<{ reply: string; motionPrompt: string }> {
    const llm = new LLMClient(new Config());

    const systemPrompt = `你正在扮演小说角色「${character.name}」，同时需要为视频生成模型输出动作提示词。

角色设定：
人设：${character.persona || '（未填写）'}
背景：${character.background || '（未填写）'}

用户对你说了话，你需要输出一个 JSON 对象（只输出 JSON，不要其他内容）：
{
  "reply": "以角色身份、符合人设语气的回复（100字以内）",
  "motion_prompt": "英文视频动作提示词，描述该角色此时的表情与动作。必须保持人物外观不变（参考：${character.portrait_prompt || '3D 仙侠剧风格立绘'}），只描述表情变化、头部动作、手势、身体微动作。例如：slight smile, eyes soften, gently nods head, hand reaches toward camera 等。50词以内"
}

注意：motion_prompt 用英文，聚焦表情和肢体动作，保持立绘人物外观一致性。`;

    const historyText = (history || [])
      .slice(-6)
      .map((m) => `${m.role === 'assistant' ? character.name : '用户'}: ${m.content}`)
      .join('\n');

    const userPrompt = historyText
      ? `之前的对话：\n${historyText}\n\n用户说：${message}`
      : `用户说：${message}`;

    const response = await llm.invoke(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { model: LLM_MODEL, temperature: 0.8 },
    );

    const content = (response?.content || '').trim();
    try {
      // 提取 JSON（容错：可能带 markdown 代码块）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      const reply = (parsed.reply || '').trim();
      const motionPrompt = (parsed.motion_prompt || 'subtle breathing, gentle smile').trim();
      if (!reply) throw new Error('empty reply');
      return { reply, motionPrompt };
    } catch {
      // JSON 解析失败时降级：整个回复作为文本
      return {
        reply: content || '……',
        motionPrompt: 'subtle breathing, gentle expression, slight head tilt',
      };
    }
  }

  /** 扣积分：开发者白名单免费 */
  private async chargeCredits(cost: number, action: string): Promise<{ credits: number; charged: boolean }> {
    const profile = await this.usersService.getProfile();
    if (DEVELOPER_UIDS.includes(profile.uid)) {
      return { credits: profile.credits, charged: false };
    }
    if (profile.credits < cost) {
      throw new BadRequestException(`积分不足，${action}需要 ${cost} 积分，当前剩余 ${profile.credits}，请前往「我的」页面充值`);
    }
    const credits = await this.usersService.deductCredits(cost);
    return { credits, charged: true };
  }

  private async getCharacter(characterId: string): Promise<CharacterRow> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, persona, background, portrait_prompt, portrait_key, portrait_frame_key')
      .eq('id', characterId)
      .single();

    if (error || !data) throw new NotFoundException('角色不存在');
    return data as CharacterRow;
  }

  private async downloadFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
    return Buffer.from(response.data);
  }

  private randomId(): string {
    return Math.random().toString(36).substring(2, 8);
  }
}
