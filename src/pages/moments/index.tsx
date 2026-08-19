import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart, MessageCircle, X } from 'lucide-react-taro'

interface Comment {
  id: string
  characterId: string
  characterName: string
  characterAvatar: string
  content: string
  createdAt: string
}

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
  commentList?: Comment[]
}

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string>('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [selectedMomentId, setSelectedMomentId] = useState<string>('')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentMoment, setCommentMoment] = useState<Moment | null>(null)

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
            isLiked: false,
            commentList: [
              {
                id: 'c1',
                characterId: 'char-2',
                characterName: '林黛玉',
                characterAvatar: '',
                content: '你既这么说，又何必来惹我伤心',
                createdAt: '1小时前'
              }
            ]
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
            isLiked: true,
            commentList: []
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

  const handleCommentClick = (momentId: string) => {
    const moment = moments.find(m => m.id === momentId)
    setSelectedMomentId(momentId)
    setCommentMoment(moment || null)
    setShowCommentInput(true)
    setCommentText('')
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return
    
    try {
      setSubmittingComment(true)
      const res = await Network.request({
        url: `/api/moments/${selectedMomentId}/comment`,
        method: 'POST',
        data: { content: commentText }
      })
      
      if (res.data?.code === 200) {
        // 刷新评论列表
        await loadMoments()
        setShowCommentInput(false)
        setCommentText('')
        Taro.showToast({
          title: '评论成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
      Taro.showToast({
        title: '评论失败',
        icon: 'error'
      })
    } finally {
      setSubmittingComment(false)
    }
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
            style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #fda085 100%)' }}
          />
        )}
        <View className="absolute inset-0 bg-black bg-opacity-20" />
        
        {/* Header content */}
        <View className="relative h-full flex flex-col justify-end p-4">
          <Text className="text-white text-xl font-bold mb-2">朋友圈</Text>
          <Text className="text-white text-opacity-80 text-sm">查看角色们的日常动态</Text>
        </View>

        {/* Change background button */}
        <View
          className="absolute top-4 right-4 bg-white bg-opacity-30 backdrop-blur-sm rounded-full px-3 py-2"
          onClick={handleChangeBackground}
        >
          <Text className="text-white text-xs">换背景</Text>
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

                {/* Comments preview */}
                {moment.commentList && moment.commentList.length > 0 && (
                  <View className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                    {moment.commentList.map((comment) => (
                      <View key={comment.id} className="flex gap-2">
                        <Text className="text-xs font-semibold text-gray-700">{comment.characterName}:</Text>
                        <Text className="text-xs text-gray-600 flex-1">{comment.content}</Text>
                      </View>
                    ))}
                  </View>
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
                    onClick={() => handleCommentClick(moment.id)}
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

      {/* Comment input modal */}
      {showCommentInput && (
        <View className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Show the moment content */}
          <View className="flex-1 overflow-auto p-4 pb-4">
            {commentMoment && (
              <Card className="bg-white rounded-xl shadow-sm">
                <CardContent className="p-4">
                  <View className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={commentMoment.characterAvatar} />
                      <AvatarFallback>{commentMoment.characterName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900">{commentMoment.characterName}</Text>
                      <Text className="text-xs text-gray-500">{commentMoment.createdAt}</Text>
                    </View>
                  </View>
                  <Text className="text-gray-800 text-sm leading-relaxed mb-3 block">
                    {commentMoment.content}
                  </Text>
                  {commentMoment.imageUrl && (
                    <Image
                      src={commentMoment.imageUrl}
                      className="w-full h-48 rounded-lg mb-3"
                      mode="aspectFill"
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </View>

          {/* Comment input at bottom */}
          <View className="bg-white rounded-t-2xl p-4 w-full border-t border-gray-200" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 60px)' }}>
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-semibold">发表评论</Text>
              <Button variant="ghost" size="icon" onClick={() => setShowCommentInput(false)}>
                <X size={20} color="#9ca3af" />
              </Button>
            </View>
            <View className="flex gap-2">
              <View className="flex-1 bg-gray-100 rounded-xl px-4 py-3">
                <Input
                  className="w-full bg-transparent"
                  placeholder="写下你的评论..."
                  value={commentText}
                  onInput={(e) => setCommentText(e.detail.value)}
                />
              </View>
              <Button
                onClick={handleSubmitComment}
                disabled={submittingComment || !commentText.trim()}
                className="bg-pink-500 text-white"
              >
                <Text>{submittingComment ? '发送中...' : '发送'}</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
