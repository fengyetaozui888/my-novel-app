import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

@Injectable()
export class WorldNewsService {
  private llmClient = new LLMClient();

  /** 查询世界讯息列表（最新在前） */
  async listNews(novelId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('world_news')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  /** 获取世界元信息 */
  private async getNovel(novelId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('novels')
      .select('id, name, era, news_refreshed_date, world_score')
      .eq('id', novelId)
      .single();
    if (error || !data) throw new Error('世界不存在');
    return data;
  }

  /** 获取世界内角色名列表（讯息更贴合世界观） */
  private async getCharacterNames(novelId: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('characters')
      .select('name')
      .eq('novel_id', novelId);
    return (data || []).map((c: { name: string }) => c.name);
  }

  /** 今日是否已刷新 */
  async getRefreshState(novelId: string) {
    const novel = await this.getNovel(novelId);
    const today = this.todayStr();
    return {
      refreshedToday: novel.news_refreshed_date === today,
      lastRefreshedDate: novel.news_refreshed_date || null,
      era: novel.era,
      canGenerateNews: !!(novel.world_score && novel.world_score >= 60),
      worldScore: novel.world_score || null,
    };
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * 手动刷新：每个世界每天仅一次，随机生成 1-3 条新讯息插入顶部
   */
  async refresh(novelId: string) {
    const novel = await this.getNovel(novelId);
    const today = this.todayStr();

    if (novel.news_refreshed_date === today) {
      return { refreshed: false, reason: '今日已刷新，明天再来吧', news: [] };
    }

    // 检查世界信息评分是否达标
    if (!novel.world_score || novel.world_score < 60) {
      return {
        refreshed: false,
        reason: '世界信息不足，请先完善世界信息（势力、地图、世界观等）并评分达到60分以上',
        news: [],
      };
    }

    const era = novel.era === 'modern' ? 'modern' : 'ancient';
    const moduleTitle = era === 'modern' ? '世界日常' : '奇闻轶事';
    const characterNames = await this.getCharacterNames(novelId);
    const namesHint = characterNames.length
      ? `本世界已知人物：${characterNames.slice(0, 20).join('、')}`
      : '本世界暂无已知人物';

    const prompt = `你是一个网文世界的讯息推送官，负责为一个小说世界生成日常小道消息。

世界设定：
- 世界名：${novel.name}
- 时代：${era === 'modern' ? '现代' : '古代'}
- ${namesHint}

要求：
1. 随机生成 1-3 条本世界的趣事/八卦/情报（具体条数你自己定，1到3条之间随机）。
2. 内容必须贴合世界题材与时代特征：
   - 古代世界：修真界八卦、江湖轶事、朝廷动向、奇珍异宝传闻等
   - 现代世界：娱乐圈八卦、社会趣闻、题材专属动向（如灵气复苏类：某某突破境界、某地出现秘境、天材地宝拍出天价；末世类：基地大事、物资动向；全民求生类：资源点刷新、排行榜更新、势力动向等）
3. 每条讯息 30-80 字，口语化、有细节、像小道消息，可以出现已知人物的名字（用作料，不要毁人设）。
4. 严格输出 JSON 数组，不要任何其他文字，如：["讯息1","讯息2"]`;

    let contents: string[] = [];
    try {
      const llmResponse = (await this.llmClient.invoke(
        [
          { role: 'system', content: '你只输出 JSON 数组，不输出任何解释。' },
          { role: 'user', content: prompt },
        ] as any,
        { temperature: 1.1 },
      )) as any;
      const raw: string = llmResponse?.content || '';
      console.log(`[world-news] LLM原始输出: ${raw?.slice(0, 200)}`);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) {
          contents = arr
            .filter((x) => typeof x === 'string' && x.trim())
            .map((x) => x.trim())
            .slice(0, 3);
        }
      }
    } catch (e) {
      console.error('[world-news] LLM生成失败，使用兜底模板', e);
    }

    // 兜底模板（LLM 不可用时）
    if (contents.length === 0) {
      const fallbacks =
        era === 'modern'
          ? [
              `【${novel.name}·街头巷尾】听说市中心那家网红店又排队三小时，队伍里居然混进了几个戴墨镜的圈内人。`,
              `【${novel.name}·圈内情报】某位榜上有名的大佬近日行踪成谜，知情人透露"在闭关搞大事"。`,
              `【${novel.name}·今日份瓜】排行榜悄悄更新了，前十里有两个新面孔，老人都坐不住了。`,
            ]
          : [
              `【${novel.name}·市井传闻】城南当铺昨日收了一件来路不明的古玉，掌柜的连夜请人掌眼。`,
              `【${novel.name}·江湖风声】听闻北边有位剑客单挑了三大门派不落下风，江湖哗然。`,
              `【${novel.name}·秘闻】宫里昨夜灯火通明，今晨便有快马出城，去向不明。`,
            ];
      const count = 1 + Math.floor(Math.random() * 3);
      contents = fallbacks.slice(0, count);
    }

    // 插入新讯息（最新在最前）
    const supabase = getSupabaseClient();
    const rows = contents.map((content) => ({ novel_id: novelId, content }));
    const { data, error } = await supabase
      .from('world_news')
      .insert(rows)
      .select();
    if (error) throw new Error(error.message);

    // 标记今日已刷新
    await supabase
      .from('novels')
      .update({ news_refreshed_date: today })
      .eq('id', novelId);

    console.log(`[world-news] 世界 ${novel.name}(${moduleTitle}) 刷新 ${data.length} 条`);
    return { refreshed: true, reason: 'ok', news: data };
  }
}
