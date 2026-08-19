import { Injectable, Logger } from '@nestjs/common';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '../storage/database/supabase-client';

const HELP_SYSTEM_PROMPT = `你是「人设工坊」小程序的官方使用说明答疑助手，名字叫"小坊"。

你的职责：耐心、友好地为用户解答关于小程序功能和使用方法的问题。

「人设工坊」小程序功能清单（v1.3.0）：
1. 小世界：首页可创建多个"世界"（原小说），每个世界独立管理角色
2. 角色卡：添加角色（姓名、性别、身份定位、性格、说话风格、人设补充），支持从12张初始立绘中选择（3女3男，各有古/现两套装扮），可自定义立绘显示区域（脸部/上半身/全身）
3. 对话模拟：与角色一对一对话，角色会根据人设和亲密度回应；亲密度随对话提升，影响角色态度
4. 亲密度图鉴：查看所有角色的亲密度卡牌（主角/重要配角/不重要角色分组）；卡牌上可编辑"我"在该角色眼中的专属人设（每个角色独立），修改人设后获得一次亲密度调整机会
5. 朋友圈：角色们会自动发日常动态、互相点赞评论；用户也可以发布动态，角色会回复；点击蓝名可跳转角色个人朋友圈；支持更换背景
6. 时空咖啡厅：跨世界的角色共享一面便利贴墙，写下愿望、随笔、笑话，成为跨世界笔友
7. 小说图谱：自动分析角色关系并生成可视化关系图
8. Agent 反馈：角色行为不符合人设时提交反馈，系统自动生成行为准则优化模拟
9. 使用说明：本功能，随时查看功能介绍和常见问题

回答要求：
- 语气亲切可爱，善用简单比喻
- 回答简洁，一次只解决一个问题
- 涉及操作步骤时用编号列表
- 如果用户的问题与小程序功能/使用方法完全无关（如闲聊、问作业、问编程），请在回答开头加上【无法回答】标记，然后礼貌说明你只能解答小程序使用问题
- 如果不确定答案，不要编造，同样以【无法回答】开头并说明`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class HelpAskService {
  private readonly logger = new Logger(HelpAskService.name);

  async ask(question: string, history: ChatMessage[] = []) {
    const config = new Config();
    const llmClient = new LLMClient(config);

    const messages = [
      { role: 'system' as const, content: HELP_SYSTEM_PROMPT },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: question },
    ];

    const response = await llmClient.invoke(messages, {
      temperature: 0.7,
    });

    const answer = response.content?.trim() || '抱歉，我暂时没能理解你的问题，请换个说法再试一次~';

    // 无法回答的问题记录下来，攒够10条反馈给开发者
    if (answer.startsWith('【无法回答】')) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('help_unanswered').insert({
          question,
          answer: answer.replace('【无法回答】', '').trim(),
        });
      } catch (err) {
        this.logger.warn('记录未回答问题失败', err);
      }
    }

    return { answer, unanswerable: answer.startsWith('【无法回答】') };
  }

  async getUnanswered() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('help_unanswered')
      .select('*')
      .eq('notified', false)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.warn('查询未回答问题失败', error.message);
      return { total: 0, batchReady: false, items: [] };
    }

    return {
      total: data.length,
      batchReady: data.length >= 10,
      items: data,
    };
  }
}
