import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import { Network } from '@/network'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Heart } from 'lucide-react-taro'

interface CharacterItem {
  id: string
  name: string
  gender: string
  tagline: string | null
  avatar_url: string | null
  category: string
  affinity?: number
  affinityLevel?: string
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

function CharacterCard({ char }: { char: CharacterItem }) {
  const affinity = char.affinity ?? 50
  return (
    <View className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ width: '46%' }}>
      {/* 立绘 / 剪影区域：竖向长方形 */}
      <View className="relative flex items-center justify-center" style={{ height: 180, backgroundColor: '#fdf2f6' }}>
        {char.avatar_url ? (
          <Image src={char.avatar_url} className="w-full h-full" mode="aspectFill" />
        ) : (
          <View className="flex flex-col items-center justify-center">
            {char.gender === 'male' ? (
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
      </View>
      {/* 信息区域 */}
      <View className="px-3 py-2">
        <Text className="block text-sm font-semibold text-gray-900">{char.name}</Text>
        <View className="flex items-center mt-1" style={{ gap: 4 }}>
          <AffinityHeart value={affinity} />
          <Text className="text-xs text-rose-500 font-semibold">{affinity}</Text>
          <Text className="text-xs text-gray-400">/100</Text>
        </View>
        <Text className="block text-xs text-gray-400 mt-1">{LEVEL_LABEL[char.affinityLevel ?? 'stranger']}</Text>
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

  const loadData = async () => {
    try {
      const res = await Network.request({
        url: `/api/affinity/book?novelId=${novelId}`,
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
        {list.map((c) => (
          <CharacterCard key={c.id} char={c} />
        ))}
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
    </View>
  )
}
