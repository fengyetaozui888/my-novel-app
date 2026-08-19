import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import { Network } from '@/network'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Heart, Drama } from 'lucide-react-taro'

interface CharacterItem {
  id: string
  name: string
  gender: string
  tagline: string | null
  portrait_url: string | null
  hasPortrait: boolean
  category: string
  affinity: number
  affinityLevel: string
  userPersona: string | null
  affinityEditAvailable: boolean
}

const LEVEL_LABEL: Record<string, string> = {
  stranger: '初识',
  acquaintance: '相识',
  friend: '朋友',
  close_friend: '密友',
  intimate: '知己',
}

/** 不规则爱心：按亲密度填充比例渲染（整心填充 + 填充层裁切） */
function AffinityHeart({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  const color = pct >= 80 ? '#e0407a' : pct >= 60 ? '#ec5f8f' : pct >= 40 ? '#f286ab' : pct >= 20 ? '#f7aec7' : '#fcd5e2'
  return (
    <View className="relative" style={{ width: 22, height: 20 }}>
      <Heart size={20} color="#f3d4de" filled={false} strokeWidth={2} className="absolute" style={{ left: 1, top: 0 }} />
      <View className="absolute overflow-hidden" style={{ width: `${pct}%`, height: 20, left: 1, top: 0 }}>
        <Heart size={20} color={color} filled strokeWidth={2} />
      </View>
    </View>
  )
}

export default function AffinityBook() {
  const router = useRouter()
  const novelId = router.params.novelId || ''
  const [tab, setTab] = useState('protagonist')
  const [characters, setCharacters] = useState<Record<string, CharacterItem[]>>({
    protagonist: [],
    supporting: [],
    minor: [],
  })
  const [loading, setLoading] = useState(true)

  // 人设编辑弹窗
  const [personaChar, setPersonaChar] = useState<CharacterItem | null>(null)
  const [personaText, setPersonaText] = useState('')
  const [savingPersona, setSavingPersona] = useState(false)

  // 亲密度修改弹窗（一次性机会）
  const [affinityChar, setAffinityChar] = useState<CharacterItem | null>(null)
  const [affinityDraft, setAffinityDraft] = useState(50)
  const [savingAffinity, setSavingAffinity] = useState(false)

  const loadData = async () => {
    try {
      const res = await Network.request({
        url: `/api/affinity/book/${novelId}`,
      })
      console.log('affinity book res:', res.data)
      const data = (res.data as { data?: Record<string, CharacterItem[]> })?.data
      if (data) {
        setCharacters({
          protagonist: data.protagonist || [],
          supporting: data.supporting || [],
          minor: data.minor || [],
        })
      }
    } catch (e) {
      console.error('load affinity book failed', e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (novelId) {
      void loadData()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId])

  /** 打开人设编辑 */
  const openPersona = (c: CharacterItem) => {
    setPersonaChar(c)
    setPersonaText(c.userPersona || '')
  }

  /** 保存人设 → 获得一次修改亲密度机会 */
  const savePersona = async () => {
    if (!personaChar) return
    const text = personaText.trim()
    if (!text) {
      Taro.showToast({ title: '先写一点人设吧~', icon: 'none' })
      return
    }
    setSavingPersona(true)
    try {
      const res = await Network.request({
        url: `/api/affinity/${personaChar.id}/persona`,
        method: 'POST',
        data: { persona: text },
      })
      console.log('save persona res:', res.data)
      setPersonaChar(null)
      Taro.showToast({ title: '人设已更新，获得一次修改亲密度的机会', icon: 'none', duration: 2000 })
      // 打开亲密度修改弹窗（此时角色亲密度未变）
      setAffinityChar(personaChar)
      setAffinityDraft(personaChar.affinity)
      void loadData()
    } catch (e) {
      console.error('save persona failed', e)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSavingPersona(false)
    }
  }

  /** 使用机会修改亲密度 */
  const confirmAffinity = async () => {
    if (!affinityChar) return
    setSavingAffinity(true)
    try {
      const res = await Network.request({
        url: `/api/affinity/${affinityChar.id}/set`,
        method: 'POST',
        data: { value: affinityDraft },
      })
      console.log('set affinity res:', res.data)
      setAffinityChar(null)
      Taro.showToast({ title: `亲密度已调整为 ${affinityDraft}`, icon: 'none' })
      void loadData()
    } catch (e) {
      console.error('set affinity failed', e)
      Taro.showToast({ title: '修改失败', icon: 'none' })
    } finally {
      setSavingAffinity(false)
    }
  }

  const renderCard = (c: CharacterItem) => {
    const affinity = c.affinity ?? 50
    return (
      <View key={c.id} className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ width: '46%' }}>
        {/* 立绘 / 剪影区域：竖向长方形 */}
        <View className="relative flex items-center justify-center" style={{ height: 180, backgroundColor: '#fdf2f6' }}>
          {c.portrait_url ? (
            <Image src={c.portrait_url} className="w-full h-full" mode="aspectFill" />
          ) : (
            <View className="flex flex-col items-center justify-center">
              {c.gender === 'male' ? (
                <View className="flex flex-col items-center">
                  <View className="rounded-full bg-gray-400 bg-opacity-30" style={{ width: 52, height: 52 }} />
                  <View className="rounded-t-lg bg-gray-400 bg-opacity-30" style={{ width: 76, height: 90, marginTop: -4 }} />
                </View>
              ) : (
                <View className="flex flex-col items-center">
                  <View className="rounded-full bg-gray-400 bg-opacity-30" style={{ width: 52, height: 52 }} />
                  <View className="rounded-t-lg bg-gray-400 bg-opacity-30" style={{ width: 96, height: 70, marginTop: -4 }} />
                  <View className="bg-gray-400 bg-opacity-30" style={{ width: 76, height: 26, marginTop: -4 }} />
                </View>
              )}
            </View>
          )}
          {/* 人设编辑按钮：戏剧面具 */}
          <View
            className="absolute flex items-center justify-center rounded-full"
            style={{ right: 8, top: 8, width: 30, height: 30, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
            onClick={() => openPersona(c)}
          >
            <Drama size={17} color="#c2185b" strokeWidth={2} />
          </View>
        </View>
        {/* 信息区域 */}
        <View className="px-3 py-2">
          <Text className="block text-sm font-semibold text-gray-900">{c.name}</Text>
          <View className="flex items-center mt-1" style={{ gap: 4 }}>
            <AffinityHeart value={affinity} />
            <Text className="text-xs text-rose-500 font-semibold">{affinity}</Text>
            <Text className="text-xs text-gray-400">/100</Text>
          </View>
          <Text className="block text-xs text-gray-400 mt-1">
            {LEVEL_LABEL[c.affinityLevel ?? 'stranger']}
            {c.affinityEditAvailable ? ' · 有修改机会' : ''}
          </Text>
          {c.userPersona ? (
            <Text className="block text-xs text-pink-400 mt-1" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              眼中的我：{c.userPersona}
            </Text>
          ) : null}
        </View>
      </View>
    )
  }

  const renderList = (list: CharacterItem[]) => {
    if (loading) {
      return (
        <View className="flex items-center justify-center py-16">
          <Text className="text-sm text-gray-400">加载中...</Text>
        </View>
      )
    }
    if (!list.length) {
      return (
        <View className="flex items-center justify-center py-16">
          <Text className="text-sm text-gray-400">暂无角色</Text>
        </View>
      )
    }
    return (
      <View className="flex flex-row flex-wrap justify-between px-4 py-4" style={{ gap: 16 }}>
        {list.map((c) => renderCard(c))}
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-pink-50 to-rose-50">
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <View className="pt-3 px-4 bg-white">
          <TabsList className="w-full bg-pink-100">
            <TabsTrigger value="protagonist" className="flex-1">
              <Text className="text-sm">主角</Text>
            </TabsTrigger>
            <TabsTrigger value="supporting" className="flex-1">
              <Text className="text-sm">重要配角</Text>
            </TabsTrigger>
            <TabsTrigger value="minor" className="flex-1">
              <Text className="text-sm">不重要角色</Text>
            </TabsTrigger>
          </TabsList>
        </View>

        <ScrollView scrollY className="mt-2" style={{ height: 'calc(100vh - 120px)' }}>
          <TabsContent value="protagonist">{renderList(characters.protagonist)}</TabsContent>
          <TabsContent value="supporting">{renderList(characters.supporting)}</TabsContent>
          <TabsContent value="minor">{renderList(characters.minor)}</TabsContent>
        </ScrollView>
      </Tabs>

      {/* 人设编辑弹窗 */}
      <Dialog open={!!personaChar} onOpenChange={(o) => !o && setPersonaChar(null)}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>我在「{personaChar?.name}」眼中是……</DialogTitle>
            <DialogDescription>每个角色眼中的「我」互不影响，角色会按你写的人设认知你</DialogDescription>
          </DialogHeader>
          <View className="bg-pink-50 rounded-2xl p-4">
            <Textarea
              style={{ width: '100%', minHeight: '100px', backgroundColor: 'transparent' }}
              placeholder="例如：来自未来的旅者，知晓这个世界的结局……"
              maxlength={200}
              value={personaText}
              onInput={(e) => setPersonaText(e.detail.value)}
            />
          </View>
          <Text className="block text-xs text-gray-400 mt-2">更改人设后将获得一次修改亲密度的机会</Text>
          <View className="flex flex-row gap-3 mt-3">
            <View className="flex-1">
              <Button variant="outline" className="w-full" onClick={() => setPersonaChar(null)}>
                <Text>取消</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button className="w-full" disabled={savingPersona} onClick={() => void savePersona()}>
                <Text>{savingPersona ? '保存中…' : '保存'}</Text>
              </Button>
            </View>
          </View>
        </DialogContent>
      </Dialog>

      {/* 亲密度修改弹窗（使用一次性机会） */}
      <Dialog open={!!affinityChar} onOpenChange={(o) => !o && setAffinityChar(null)}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>修改与「{affinityChar?.name}」的亲密度</DialogTitle>
            <DialogDescription>本次机会来自人设更改，仅可使用一次</DialogDescription>
          </DialogHeader>
          <View className="flex items-center justify-center mt-2" style={{ gap: 8 }}>
            <AffinityHeart value={affinityDraft} />
            <Text className="text-2xl font-bold text-rose-500">{affinityDraft}</Text>
            <Text className="text-sm text-gray-400">/100</Text>
          </View>
          <View className="px-2 mt-4">
            <Slider
              value={[affinityDraft]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setAffinityDraft(v?.[0] ?? affinityDraft)}
              trackClassName="bg-pink-100"
              rangeClassName="bg-rose-400"
              thumbClassName="bg-rose-500 border-white"
            />
          </View>
          <View className="flex flex-row gap-3 mt-4">
            <View className="flex-1">
              <Button variant="outline" className="w-full" onClick={() => setAffinityChar(null)}>
                <Text>跳过本次</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button className="w-full" disabled={savingAffinity} onClick={() => void confirmAffinity()}>
                <Text>{savingAffinity ? '修改中…' : '确认修改'}</Text>
              </Button>
            </View>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}
