import { useState, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { View, Text, ScrollView } from '@tarojs/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageSquareWarning, WandSparkles, ChevronDown, User } from 'lucide-react-taro'

interface CharacterOption {
  id: string
  name: string
}

interface FeedbackRecord {
  id: string
  characterName?: string
  feedbackText: string
  optimization?: string
  status: string
  createdAt?: string
}

export default function AgentFeedbackPage() {
  const [characters, setCharacters] = useState<CharacterOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [records, setRecords] = useState<FeedbackRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [novelId, setNovelId] = useState('')

  const loadData = useCallback(async () => {
    try {
      const novelsRes = await Network.request({ url: '/api/novels', method: 'GET' })
      const novels = (novelsRes.data as any)?.data ?? []
      const current = novels[0]
      if (!current) return
      setNovelId(current.id)
      const charsRes = await Network.request({
        url: `/api/characters?novelId=${current.id}`,
        method: 'GET',
      })
      const chars = ((charsRes.data as any)?.data ?? []).map((c: any) => ({
        id: c.id,
        name: c.characterName || c.name,
      }))
      setCharacters(chars)
      const fbRes = await Network.request({
        url: `/api/agent-feedback?novelId=${current.id}`,
        method: 'GET',
      })
      const list = (fbRes.data as any)?.data ?? []
      setRecords(Array.isArray(list) ? list : [])
    } catch (e) {
      console.log('agent-feedback load failed', e)
    }
  }, [])

  useDidShow(() => { loadData() })

  const selectedName = characters.find(c => c.id === selectedId)?.name

  const submit = useCallback(async () => {
    if (!selectedId) {
      Taro.showToast({ title: '请先选择角色', icon: 'none' })
      return
    }
    if (!feedbackText.trim()) {
      Taro.showToast({ title: '请描述不符合人设的行为', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const res = await Network.request({
        url: '/api/agent-feedback',
        method: 'POST',
        data: { characterId: selectedId, novelId, feedbackText: feedbackText.trim() },
      })
      console.log('[agent-feedback] submit response:', (res.data as any))
      const payload = (res.data as any)?.data
      if (payload) {
        setRecords(prev => [
          { ...payload, characterName: selectedName },
          ...prev,
        ])
        setFeedbackText('')
        Taro.showToast({ title: '已优化角色模拟', icon: 'success' })
      } else {
        Taro.showToast({ title: (res.data as any)?.message || '提交失败', icon: 'none' })
      }
    } catch (e) {
      console.log('[agent-feedback] submit error', e)
      Taro.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }, [selectedId, selectedName, feedbackText, novelId])

  return (
    <ScrollView className="bg-pink-50 bg-opacity-60" style={{ height: '100vh' }} scrollY>
      <View className="p-4 pb-10">
        <Card className="mb-4 border-pink-100">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-2">
              <MessageSquareWarning size={18} color="#ec4899" />
              <Text className="block text-base font-semibold text-gray-800">agent反馈</Text>
            </View>
            <Text className="block text-sm text-gray-500 leading-6">
              当角色做出了「不符合人设」的行为时，在这里告诉我们。AI 会根据反馈生成行为准则，优化该角色后续的模拟对话与朋友圈表现。
            </Text>
          </CardContent>
        </Card>

        <Card className="mb-4 border-pink-100">
          <CardContent className="p-4">
            <Text className="block text-sm font-medium text-gray-700 mb-2">选择角色</Text>
            <View
              className="flex items-center justify-between bg-pink-50 rounded-xl px-4 py-3"
              onClick={() => setShowPicker(v => !v)}
            >
              <View className="flex items-center gap-2">
                <User size={16} color="#ec4899" />
                <Text className={`text-sm ${selectedName ? 'text-gray-700' : 'text-gray-400'}`}>
                  {selectedName || '点击选择要反馈的角色'}
                </Text>
              </View>
              <ChevronDown size={16} color="#9ca3af" className={showPicker ? 'rotate-180' : ''} />
            </View>
            {showPicker && (
              <View className="mt-2 bg-pink-50 rounded-xl overflow-hidden">
                {characters.length === 0 && (
                  <Text className="block text-sm text-gray-400 p-3 text-center">暂无可选角色</Text>
                )}
                {characters.map(c => (
                  <View
                    key={c.id}
                    className="px-4 py-3 border-b border-pink-100 last:border-b-0"
                    onClick={() => { setSelectedId(c.id); setShowPicker(false) }}
                  >
                    <Text className={`text-sm ${c.id === selectedId ? 'text-pink-600 font-medium' : 'text-gray-600'}`}>
                      {c.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="mt-4">
              <Text className="block text-sm font-medium text-gray-700 mb-2">不符合人设的行为</Text>
              <View className="bg-pink-50 rounded-xl p-3">
                <Textarea
                  value={feedbackText}
                  onInput={e => setFeedbackText(String(e.detail.value))}
                  placeholder="例如：虞寻歌居然对陌生人毕恭毕敬，她本是不惧规矩的盗神…"
                  maxlength={500}
                  className="h-24 border-none ring-0 ring-offset-0 focus-within:ring-0 focus-within:ring-offset-0 focus-within:border-transparent"
                />
              </View>
            </View>

            <Button
              className="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl"
              onClick={submit}
              disabled={submitting}
            >
              <Text className="text-white">{submitting ? '正在优化…' : '提交反馈并优化'}</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="flex items-center gap-2 mb-2 px-1">
          <WandSparkles size={16} color="#ec4899" />
          <Text className="block text-sm font-medium text-gray-700">优化记录</Text>
          {records.length > 0 && <Badge variant="secondary" className="bg-pink-100 text-pink-600">{records.length}</Badge>}
        </View>

        {records.length === 0 && (
          <Card className="border-pink-100">
            <CardContent className="p-8">
              <Text className="block text-sm text-gray-400 text-center">暂无反馈记录</Text>
            </CardContent>
          </Card>
        )}

        {records.map(r => (
          <Card key={r.id} className="mb-3 border-pink-100">
            <CardContent className="p-4">
              <View className="flex items-center justify-between mb-2">
                <View className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-pink-100 text-pink-600">
                    {r.characterName || '角色'}
                  </Badge>
                  {r.status === 'applied' && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-600">已优化</Badge>
                  )}
                </View>
              </View>
              <Text className="block text-sm text-gray-700 leading-6 mb-2">{r.feedbackText}</Text>
              {r.optimization && (
                <>
                  <Separator className="my-2 bg-pink-100" />
                  <View className="flex items-start gap-1">
                    <WandSparkles size={14} color="#ec4899" className="mt-1" />
                    <Text className="flex-1 text-sm text-gray-500 leading-6">{r.optimization}</Text>
                  </View>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </View>
    </ScrollView>
  )
}
