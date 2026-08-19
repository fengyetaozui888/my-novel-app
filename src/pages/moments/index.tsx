import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle } from 'lucide-react-taro'

interface Moment {
  id: string
  characterId: string
  characterName: string
  characterAvatar: string
  content: string
  imageUrl?: string
  createdAt: string
  likes: number
  comments: number
  isLiked: boolean
}

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string>('')

  useEffect(() => {
    loadMoments()
    loadBackground()
  }, [])

  const loadMoments = async () => {
    try {
      setLoading(true)
      const res = await Network.request({
        url: '/api/moments',
        method: 'GET'
      })
      console.log('Moments response:', res.data)
      if (res.data?.code === 200 && res.data?.data) {
        setMoments(res.data.data)
      } else {
        // 示例数据
        setMoments([
          {
            id: '1',
            characterId: 'char-1',
            characterName: '贾宝玉',
            characterAvatar: '',
            content: '今日在园中赏花，见黛玉独自葬花，心中不忍。这世间美好的事物，为何总是转瞬即逝？',
            imageUrl: '',
            createdAt: '2小时前',
            likes: 12,
            comments: 5,
            isLiked: false
          },
          {
            id: '2',
            characterId: 'char-2',
            characterName: '林黛玉',
            characterAvatar: '',
            content: '花谢花飞花满天，红消香断有谁怜？',
            imageUrl: '',
            createdAt: '3小时前',
            likes: 28,
            comments: 8,
            isLiked: true
          }
        ])
      }
    } catch (error) {
      console.error('Failed to load moments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBackground = async () => {
    try {
      const res = await Network.request({
        url: '/api/moments/background',
        method: 'GET'
      })
      if (res.data?.code === 200 && res.data?.data?.url) {
        setBackgroundImage(res.data.data.url)
      }
    } catch (error) {
      console.error('Failed to load background:', error)
    }
  }

  const handleLike = async (momentId: string) => {
    try {
      await Network.request({
        url: `/api/moments/${momentId}/like`,
        method: 'POST'
      })
      setMoments(moments.map(m => 
        m.id === momentId 
          ? { ...m, isLiked: !m.isLiked, likes: m.isLiked ? m.likes - 1 : m.likes + 1 }
          : m
      ))
    } catch (error) {
      console.error('Failed to like moment:', error)
    }
  }

  const handleComment = (_momentId: string) => {
    Taro.showToast({
      title: '评论功能开发中',
      icon: 'none'
    })
  }

  const handleChangeBackground = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      const tempFilePath = res.tempFilePaths[0]
      
      const uploadRes = await Network.uploadFile({
        url: '/api/moments/background',
        filePath: tempFilePath,
        name: 'file'
      })
      
      console.log('Upload response:', uploadRes)
      
      if (uploadRes.data) {
        const data = JSON.parse(uploadRes.data)
        if (data.url) {
          setBackgroundImage(data.url)
          Taro.showToast({
            title: '背景设置成功',
            icon: 'success'
          })
        }
      }
    } catch (error) {
      console.error('Failed to change background:', error)
      Taro.showToast({
        title: '设置失败',
        icon: 'error'
      })
    }
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* Header with background */}
      <View className="relative h-48 overflow-hidden">
        {backgroundImage ? (
          <Image
            src={backgroundImage}
            className="absolute inset-0 w-full h-full"
            mode="aspectFill"
          />
        ) : (
          <View
            className="absolute inset-0 w-full h-full"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          />
        )}
        <View className="absolute inset-0 bg-black bg-opacity-30" />
        
        {/* Header content */}
        <View className="relative h-full flex flex-col justify-end p-4">
          <Text className="text-white text-xl font-bold mb-2">朋友圈</Text>
          <Text className="text-white text-opacity-80 text-sm">查看角色们的日常动态</Text>
        </View>

        {/* Change background button */}
        <View
          className="absolute top-4 right-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-2"
          onClick={handleChangeBackground}
        >
          <Text className="text-white text-xs px-2">换背景</Text>
        </View>
      </View>

      {/* Moments list */}
      <ScrollView scrollY className="h-full" style={{ height: 'calc(100vh - 12rem)' }}>
        <View className="p-4 space-y-4">
          {moments.map((moment) => (
            <Card key={moment.id} className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-4">
                {/* Header */}
                <View className="flex items-center gap-3 mb-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={moment.characterAvatar} />
                    <AvatarFallback>{moment.characterName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">{moment.characterName}</Text>
                    <Text className="text-xs text-gray-500">{moment.createdAt}</Text>
                  </View>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MessageCircle size={16} color="#9ca3af" />
                  </Button>
                </View>

                {/* Content */}
                <Text className="text-gray-800 text-sm leading-relaxed mb-3 block">
                  {moment.content}
                </Text>

                {/* Image */}
                {moment.imageUrl && (
                  <Image
                    src={moment.imageUrl}
                    className="w-full h-48 rounded-lg mb-3"
                    mode="aspectFill"
                  />
                )}

                {/* Actions */}
                <View className="flex items-center gap-4 pt-3 border-t border-gray-100">
                  <View
                    className="flex items-center gap-1"
                    onClick={() => handleLike(moment.id)}
                  >
                    <Heart
                      size={18}
                      color={moment.isLiked ? '#ec4899' : '#9ca3af'}
                    />
                    <Text className="text-xs text-gray-600">{moment.likes}</Text>
                  </View>
                  <View
                    className="flex items-center gap-1"
                    onClick={() => handleComment(moment.id)}
                  >
                    <MessageCircle size={18} color="#9ca3af" />
                    <Text className="text-xs text-gray-600">{moment.comments}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}

          {moments.length === 0 && !loading && (
            <View className="flex flex-col items-center justify-center py-20">
              <Text className="text-gray-400 text-sm">暂无动态</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
