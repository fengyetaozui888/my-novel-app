import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { Textarea } from '@/components/ui/textarea';
import Taro, { useRouter } from '@tarojs/taro';
import { Network } from '@/network';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader, Check } from 'lucide-react-taro';

const SCORE_THRESHOLD = 60;

export default function WorldInfoPage() {
  const router = useRouter();
  const novelId = router.params.id || '';
  const novelName = router.params.name || '这个世界';

  const [worldInfo, setWorldInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [canGenerate, setCanGenerate] = useState(false);
  const [showResult, setShowResult] = useState(false);


  // Load existing world info
  useEffect(() => {
    if (novelId) {
      Network.request({ url: `/api/novels/${novelId}` })
        .then((res: any) => {
          const novel = res.data?.data;
          if (novel) {
            setWorldInfo(novel.world_info || '');
            if (novel.world_score != null) {
              setScore(novel.world_score);
              setCanGenerate(novel.world_score >= SCORE_THRESHOLD);
            }
          }
        })
        .catch(() => {});
    }
  }, [novelId]);

  const handleSave = async () => {
    if (!worldInfo.trim()) {
      Taro.showToast({ title: '请先填写世界信息', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      await Network.request({
        url: `/api/novels/${novelId}/world-info`,
        method: 'POST',
        data: { world_info: worldInfo },
      });
      Taro.showToast({ title: '保存成功', icon: 'success' });
    } catch (e) {
      Taro.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluate = async () => {
    if (!worldInfo.trim()) {
      Taro.showToast({ title: '请先填写世界信息', icon: 'none' });
      return;
    }
    setEvaluating(true);
    try {
      const res: any = await Network.request({
        url: `/api/novels/${novelId}/evaluate`,
        method: 'POST',
      });
      const data = res.data?.data;
      if (data) {
        setScore(data.score);
        setFeedback(data.feedback || '');
        setCanGenerate(data.canGenerate || false);
        setShowResult(true);
      }
    } catch (e) {
      Taro.showToast({ title: '评分失败', icon: 'error' });
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveAndEvaluate = async () => {
    if (!worldInfo.trim()) {
      Taro.showToast({ title: '请先填写世界信息', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      await Network.request({
        url: `/api/novels/${novelId}/world-info`,
        method: 'POST',
        data: { world_info: worldInfo },
      });
      setEvaluating(true);
      const res: any = await Network.request({
        url: `/api/novels/${novelId}/evaluate`,
        method: 'POST',
      });
      const data = res.data?.data;
      if (data) {
        setScore(data.score);
        setFeedback(data.feedback || '');
        setCanGenerate(data.canGenerate || false);
        setShowResult(true);
      }
    } catch (e) {
      Taro.showToast({ title: '操作失败', icon: 'error' });
    } finally {
      setSaving(false);
      setEvaluating(false);
    }
  };

  return (
    <View className="min-h-screen bg-stone-50">
      {/* Header */}
      <View className="bg-white border-b border-stone-200 px-4 py-3">
        <Text className="block text-lg font-semibold text-stone-800">世界信息</Text>
        <Text className="block text-xs text-stone-500 mt-1">{novelName}</Text>
      </View>

      <ScrollView scrollY className="h-[calc(100vh-140px)]">
        <View className="p-4 space-y-4">
          {/* Score Badge */}
          {score != null && (
            <Card className={canGenerate ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}>
              <CardContent className="p-3 flex items-center gap-2">
                {canGenerate ? (
                  <Check size={20} color="#16a34a" />
                ) : (
                  <Loader size={20} color="#d97706" />
                )}
                <View className="flex-1">
                  <Text className="block text-sm font-medium">
                    {canGenerate ? '世界信息充足，可生成日常' : '世界信息不足'}
                  </Text>
                  <Text className="block text-xs text-stone-600 mt-1">评分：{score} / 100</Text>
                </View>
              </CardContent>
            </Card>
          )}

          {/* Input */}
          <Card>
            <CardContent className="p-4">
              <Text className="block text-sm font-medium text-stone-700 mb-2">
                填写世界信息（势力、地图、世界观、修炼体系等）
              </Text>
              <View className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                <Textarea
                  className="w-full bg-transparent text-sm text-stone-800"
                  style={{ minHeight: '200px', width: '100%' }}
                  placeholder={`例如：
- 世界观：灵气复苏的现代都市，人类开始觉醒异能
- 势力：华夏异能局、暗影组织、自由觉醒者联盟
- 地图：主要城市有北京、上海、深圳，各有异能基地
- 修炼体系：觉醒等级 F→E→D→C→B→A→S，每级分初/中/后期
- 特殊设定：秘境每月初一开启，天材地宝可拍卖`}
                  value={worldInfo}
                  onInput={(e) => setWorldInfo(e.detail.value)}
                  maxlength={2000}
                />
              </View>
              <Text className="block text-xs text-stone-400 mt-2">{worldInfo.length} / 2000</Text>
            </CardContent>
          </Card>

          {/* Buttons */}
          <View className="space-y-2">
            <Button
              className="w-full bg-rose-500 text-white"
              disabled={saving || evaluating || !worldInfo.trim()}
              onClick={handleSaveAndEvaluate}
            >
              {saving || evaluating ? (
                <View className="flex items-center justify-center gap-2">
                  <Loader size={16} color="#f43f5e" className="animate-spin" />
                  <Text className="block text-sm">
                    {saving ? '保存中...' : evaluating ? 'AI 评分中...' : '处理中'}
                  </Text>
                </View>
              ) : (
                <Text className="block text-sm">保存并评分</Text>
              )}
            </Button>

            <View className="flex gap-2">
              <Button
                className="flex-1 bg-stone-200 text-stone-700"
                disabled={saving || evaluating || !worldInfo.trim()}
                onClick={handleSave}
              >
                <Text className="block text-sm">{saving ? '保存中...' : '仅保存'}</Text>
              </Button>
              <Button
                className="flex-1 bg-blue-500 text-white"
                disabled={saving || evaluating || !worldInfo.trim()}
                onClick={handleEvaluate}
              >
                <Text className="block text-sm">{evaluating ? '评分中...' : '仅评分'}</Text>
              </Button>
            </View>
          </View>

          {/* Tips */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <Text className="block text-xs text-blue-700">
                <Text className="block font-medium mb-1">💡 评分标准（60分达标）：</Text>
                <Text className="block">• 世界观/背景设定完整度</Text>
                <Text className="block">• 势力/组织信息</Text>
                <Text className="block">• 地理/地图信息</Text>
                <Text className="block">• 修炼/力量体系</Text>
                <Text className="block">• 时代特征与特殊设定</Text>
              </Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      {/* Result Modal */}
      {showResult && score != null && (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowResult(false)}
        >
          <View
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <View className="flex items-center gap-3 mb-4">
              {canGenerate ? (
                <Check size={32} color="#16a34a" />
              ) : (
                <Loader size={32} color="#d97706" />
              )}
              <View className="flex-1">
                <Text className="block text-lg font-semibold">
                  {canGenerate ? '评分通过' : '评分未达标'}
                </Text>
                <Text className="block text-sm text-stone-500">{score} / 100 分</Text>
              </View>
            </View>

            {feedback && (
              <View className="bg-stone-50 rounded-lg p-3 mb-4">
                <Text className="block text-sm text-stone-700">{feedback}</Text>
              </View>
            )}

            <View className="space-y-2">
              <Button
                className="w-full bg-rose-500 text-white"
                onClick={() => setShowResult(false)}
              >
                <Text className="block text-sm">确定</Text>
              </Button>
              {!canGenerate && (
                <Button
                  className="w-full bg-stone-200 text-stone-700"
                  onClick={() => setShowResult(false)}
                >
                  <Text className="block text-sm">继续完善</Text>
                </Button>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Evaluating Modal */}
      {evaluating && (
        <View className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="flex flex-col items-center gap-3">
              <Loader size={40} color="#f43f5e" className="animate-spin" />
              <Text className="block text-base font-medium text-stone-800">正在进行评分......</Text>
              <Text className="block text-xs text-stone-500">AI 正在评估世界信息完整度</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
