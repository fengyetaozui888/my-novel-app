import { useState, useCallback } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Newspaper, ScrollText, Sparkles, Clock, Settings } from 'lucide-react-taro'

interface NewsItem {
  id: string
  content: string
  created_at: string
}

interface NovelInfo {
  id: string
  name: string
  era: string | null
}

export default function WorldNewsPage() {
  const [novelId, setNovelId] = useState('')
  const [novel, setNovel] = useState<NovelInfo | null>(null)
  const [newsList, setNewsList] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(true)
  const [isAncient, setIsAncient] = useState(false)

  useLoad((params) => {
    const id = params?.novelId || params?.id || ''
    setNovelId(id)
    if (id) {
      fetchNovel(id)
      fetchNews(id)
      fetchState(id)
    }
  })

  const fetchNovel = async (id: string) => {
    try {
      const res = await Network.request({ url: `/api/novels/${id}` })
      console.log('[world-news] novel:', res.data)
      const d = res.data?.data || res.data
      if (d) {
        setNovel(d)
        setIsAncient(d.era !== 'modern')
      }
    } catch (e) {
      console.error('[world-news] fetchNovel error:', e)
    }
  }

  const fetchNews = useCallback(async (id: string) => {
    try {
      const res = await Network.request({ url: `/api/world-news/${id}` })
      console.log('[world-news] list:', res.data)
      const d = res.data?.data || []
      setNewsList(Array.isArray(d) ? d : [])
    } catch (e) {
      console.error('[world-news] fetchNews error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchState = async (id: string) => {
    try {
      const res = await Network.request({ url: `/api/world-news/${id}/state` })
      console.log('[world-news] state:', res.data)
      const d = res.data?.data || {}
      setCanRefresh(d.refreshedToday !== true)
    } catch (e) {
      console.error('[world-news] fetchState error:', e)
    }
  }

  const handleRefresh = async () => {
    if (!novelId || refreshing) return
    setRefreshing(true)
    try {
      const res = await Network.request({
        url: `/api/world-news/${novelId}/refresh`,
        method: 'POST',
      })
      console.log('[world-news] refresh:', res.data)
      const data = res.data?.data || {}
      if (data.refreshed === false) {
        Taro.showToast({ title: isAncient ? '今日轶事已更新过啦' : '今日日常已更新过啦', icon: 'none' })
        setCanRefresh(false)
      } else {
        const news = data.news || []
        setNewsList((prev) => [...news, ...prev])
        setCanRefresh(false)
        Taro.showToast({ title: `更新了 ${news.length} 条新讯息`, icon: 'none' })
      }
    } catch (e) {
      console.error('[world-news] refresh error:', e)
      Taro.showToast({ title: '刷新失败，请稍后再试', icon: 'none' })
    } finally {
      setRefreshing(false)
    }
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return ''
    }
  }

  const pageTitle = isAncient ? '奇闻轶事' : '世界日常'
  const pageDesc = isAncient ? '本世界的奇闻轶事与坊间传闻' : '本世界的日常动态与新鲜资讯'

  return (
    <View className="min-h-screen bg-gradient-to-b from-orange-50 via-pink-50 to-purple-50 pb-8">
      {/* 顶部标题区 */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex flex-row items-center gap-2">
          <View className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-md">
            {isAncient ? <ScrollText size={20} color="#fff" /> : <Newspaper size={20} color="#fff" />}
          </View>
          <View className="flex-1">
            <Text className="block text-xl font-bold text-gray-800">{pageTitle}</Text>
            <Text className="block text-xs text-gray-500 mt-1">{novel?.name || ''} · {pageDesc}</Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (novelId) {
                Taro.navigateTo({ url: `/pages/world-info/index?id=${novelId}` })
              }
            }}
            className="w-10 h-10 rounded-full bg-white bg-opacity-60 flex items-center justify-center"
          >
            <Settings size={18} color="#666" />
          </Button>
        </View>
      </View>

      {/* 刷新按钮区 */}
      <View className="px-4 pb-4">
        <View className={`rounded-2xl p-3 flex flex-row items-center gap-3 ${canRefresh ? 'bg-white bg-opacity-80' : 'bg-gray-100'} shadow-sm`}>
          <View className={`w-9 h-9 rounded-full flex items-center justify-center ${canRefresh ? 'bg-gradient-to-br from-pink-500 to-rose-500' : 'bg-gray-300'}`}>
            <RefreshCw size={18} color="#fff" className={refreshing ? 'animate-spin' : ''} />
          </View>
          <View className="flex-1">
            <Text className={`block text-sm font-semibold ${canRefresh ? 'text-gray-800' : 'text-gray-400'}`}>
              {refreshing ? '正在为你打探消息...' : canRefresh ? (isAncient ? '今日还没听过新轶事' : '今日还没看过新动态') : (isAncient ? '今日轶事已更新完毕' : '今日动态已更新完毕')}
            </Text>
            <Text className="block text-xs text-gray-400 mt-1">每天只能刷新一次，每次随机 1-3 条</Text>
          </View>
          <Button
            size="sm"
            disabled={!canRefresh || refreshing}
            onClick={handleRefresh}
            className={canRefresh && !refreshing ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full px-4' : 'bg-gray-300 text-gray-500 rounded-full px-4'}
          >
            <Text>{refreshing ? '打探中' : '刷新'}</Text>
          </Button>
        </View>
      </View>

      {/* 讯息列表 */}
      <ScrollView scrollY className="px-4" style={{ height: 'calc(100vh - 260px)' }}>
        {loading ? (
          <View className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </View>
        ) : newsList.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <View className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
              <Sparkles size={28} color="#fb923c" />
            </View>
            <Text className="block text-sm text-gray-500 text-center">还没有任何{pageTitle}{'\n'}点击上方刷新按钮打探第一条消息吧</Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3 pb-6">
            {newsList.map((item, idx) => (
              <View key={item.id} className="bg-white bg-opacity-90 rounded-2xl p-4 shadow-sm">
                <View className="flex flex-row items-start gap-3">
                  <View className="flex flex-col items-center">
                    <View className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                      <Text className="text-xs font-bold text-white">#{newsList.length - idx}</Text>
                    </View>
                    {idx < newsList.length - 1 && <View className="w-1 flex-1 bg-orange-200 mt-1" />}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="block text-sm text-gray-700 leading-6">{item.content}</Text>
                    <View className="flex flex-row items-center gap-1 mt-2">
                      <Clock size={11} color="#9ca3af" />
                      <Text className="text-xs text-gray-400">{formatTime(item.created_at)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
