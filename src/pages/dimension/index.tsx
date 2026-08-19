import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import { Network } from '@/network'
import { Sparkles, RotateCcw } from 'lucide-react-taro'

interface Character {
  id: string
  novelId: string
  characterName: string
  category: string
  avatarUrl?: string
  portraitUrl?: string
  gender?: string
  tagline?: string
}

export default function DimensionIndex() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCharacters()
  }, [])

  const loadCharacters = async () => {
    try {
      setLoading(true)
      const res = await Network.request({
        url: '/api/characters',
        method: 'GET'
      })
      console.log('Characters response:', res.data)
      if (res.data?.code === 200 && res.data?.data) {
        setCharacters(res.data.data)
      }
    } catch (error) {
      console.error('Failed to load characters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (character: Character) => {
    if (character.portraitUrl) {
      Taro.navigateTo({
        url: `/pages/interact/index?characterId=${character.id}`
      })
    } else {
      Taro.showToast({
        title: '该角色暂无立绘',
        icon: 'none'
      })
    }
  }

  const renderSilhouette = (gender?: string) => {
    if (gender === 'male') {
      // 男性阴影：短发轮廓
      return (
        <View className="flex items-center justify-center h-full">
          <View className="relative w-24 h-32">
            {/* 头部 */}
            <View className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gray-400 opacity-30" />
            {/* 短发 */}
            <View className="absolute top-0 left-1/2 -translate-x-1/2 w-18 h-8 rounded-t-full bg-gray-400 opacity-30" />
            {/* 身体 */}
            <View className="absolute top-14 left-1/2 -translate-x-1/2 w-20 h-20 rounded-t-3xl bg-gray-400 opacity-30" />
          </View>
        </View>
      )
    } else {
      // 女性阴影：长发轮廓
      return (
        <View className="flex items-center justify-center h-full">
          <View className="relative w-24 h-32">
            {/* 头部 */}
            <View className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gray-400 opacity-30" />
            {/* 长发 */}
            <View className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-12 rounded-t-full bg-gray-400 opacity-30" />
            <View className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-16 bg-gray-400 opacity-30" />
            {/* 身体 */}
            <View className="absolute top-14 left-1/2 -translate-x-1/2 w-20 h-20 rounded-t-3xl bg-gray-400 opacity-30" />
          </View>
        </View>
      )
    }
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <Text className="text-gray-500">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <View className="pt-12 pb-6 px-6">
        <View className="flex items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-800">次元世界</Text>
          <RotateCcw size={20} color="#9ca3af" onClick={loadCharacters} />
        </View>
        <Text className="block text-sm text-gray-500">点击立绘卡牌进入3D互动</Text>
      </View>

      {/* Character Cards Grid */}
      <ScrollView scrollY className="h-[calc(100vh-200px)] px-6">
        <View className="grid grid-cols-2 gap-4 pb-20">
          {characters.map((char) => (
            <View
              key={char.id}
              className="relative rounded-2xl overflow-hidden shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                aspectRatio: '3/4'
              }}
              onClick={() => handleCardClick(char)}
            >
              {/* 装饰性光晕 */}
              <View className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white opacity-10 blur-xl" />
              <View className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-pink-300 opacity-20 blur-lg" />

              {/* 立绘区域 */}
              <View className="relative h-3/5 flex items-center justify-center">
                {char.portraitUrl ? (
                  <Image
                    src={char.portraitUrl}
                    className="w-full h-full object-cover"
                    mode="aspectFill"
                  />
                ) : (
                  <View className="w-full h-full flex items-center justify-center bg-black bg-opacity-20">
                    {renderSilhouette(char.gender)}
                  </View>
                )}
              </View>

              {/* 角色信息 */}
              <View className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                <Text className="block text-white font-semibold text-base mb-1">
                  {char.characterName}
                </Text>
                {char.tagline && (
                  <Text className="block text-gray-300 text-xs line-clamp-2">
                    {char.tagline}
                  </Text>
                )}
              </View>

              {/* 稀有度标识 */}
              <View className="absolute top-3 right-3">
                <Sparkles size={16} color="#fbbf24" />
              </View>
            </View>
          ))}
        </View>

        {characters.length === 0 && (
          <View className="flex flex-col items-center justify-center py-20">
            <Text className="text-gray-500 text-base mb-2">暂无角色</Text>
            <Text className="text-gray-400 text-sm">先去创建角色并生成立绘吧~</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
