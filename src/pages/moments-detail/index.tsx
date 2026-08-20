import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import { Heart, MessageCircle } from 'lucide-react-taro'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Network } from '@/network'

interface CommentItem {
  id: string
  characterName: string
  characterId: string | null
  content: string
}

interface Moment {
  id: string
  characterId: string
  characterName: string
  characterAvatar: string
  content: string
  imageUrl: string | null
  likes: number
  isLiked: boolean
  likerNames: string[]
  likers: { name: string; characterId: string | null }[]
  commentList: CommentItem[]
  createdAt: string
}

interface CommentDTO {
  id: string
  character_id?: string
  character_name?: string
  content?: string
}

function mapComment(c: CommentDTO): CommentItem {
  return {
    id: c.id,
    characterId: c.character_id ?? null,
    characterName: c.character_name ?? '未知',
    content: c.content ?? ''
  }
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  if (y === now.getFullYear()) return `${m}月${day}日`
  return `${y}年${m}月${day}日`
}

export default function MomentsDetail() {
  const router = useRouter()
  const characterIdParam = router.params.characterId || ''
  const novelIdParam = router.params.novelId || ''
  const nameParam = router.params.name || ''

  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [characterName, setCharacterName] = useState('')
  const [backgroundImage, setBackgroundImage] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [expandedMomentId, setExpandedMomentId] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    if (!characterIdParam) {
      Taro.showToast({ title: '参数缺失', icon: 'error' })
      return
    }
    // 如果从路由参数中获取到角色名，直接使用
    if (nameParam) {
      setCharacterName(nameParam)
      Taro.setNavigationBarTitle({ title: `${nameParam}的朋友圈` })
    }
    // 加载指定角色的朋友圈 + 世界背景图
    Promise.all([
      Network.request({
        url: `/api/moments?characterId=${characterIdParam}`,
        method: 'GET'
      }),
      novelIdParam ? Network.request({
        url: `/api/moments/background?novelId=${novelIdParam}`,
        method: 'GET'
      }).catch(() => null) : Promise.resolve(null)
    ]).then(([momentsRes, bgRes]) => {
      console.log('Moments detail response:', momentsRes.data)
      if (momentsRes.data?.code === 200 && Array.isArray(momentsRes.data.data)) {
        const list: Moment[] = momentsRes.data.data.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          characterId: m.character_id as string,
          characterName: m.character_name as string,
          characterAvatar: m.character_avatar as string,
          content: m.content as string,
          imageUrl: m.image_url as string | null,
          likes: m.likes as number,
          isLiked: m.is_liked as boolean,
          likerNames: (m.liker_names as string[]) || [],
          likers: (m.likers as { name: string; characterId: string | null }[]) || [],
          commentList: [],
          createdAt: m.created_at as string
        }))
        setMoments(list)
        // 如果路由参数中没有角色名，从朋友圈列表中获取
        if (!nameParam && list.length > 0) {
          setCharacterName(list[0].characterName)
          Taro.setNavigationBarTitle({ title: `${list[0].characterName}的朋友圈` })
        }
      }
      // 如果朋友圈为空且路由参数中没有角色名，单独获取角色名
      if (!nameParam && momentsRes.data?.code === 200 && (!momentsRes.data.data || momentsRes.data.data.length === 0)) {
        Network.request({
          url: `/api/characters/${characterIdParam}`,
          method: 'GET'
        }).then(charRes => {
          console.log('Character info response:', charRes.data)
          if (charRes.data?.code === 200 && charRes.data?.data) {
            const charName = charRes.data.data.name || charRes.data.data.characterName
            if (charName) {
              setCharacterName(charName)
              Taro.setNavigationBarTitle({ title: `${charName}的朋友圈` })
            }
          }
        }).catch(err => console.error('Failed to load character:', err))
      }
      if (bgRes?.data?.code === 200 && bgRes.data?.data?.image_url) {
        setBackgroundImage(bgRes.data.data.image_url)
      }
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load moments:', err)
      setLoading(false)
    })
  }, [characterIdParam, novelIdParam])

  const handleLike = async (momentId: string) => {
    try {
      const res = await Network.request({
        url: `/api/moments/${momentId}/like`,
        method: 'POST',
        data: {}
      })
      const liked = res.data?.data?.liked
      setMoments(prev => prev.map(m =>
        m.id === momentId
          ? {
              ...m,
              isLiked: liked,
              likes: liked ? m.likes + 1 : Math.max(0, m.likes - 1),
              likerNames: liked
                ? (m.likerNames.includes('我') ? m.likerNames : [...m.likerNames, '我'])
                : m.likerNames.filter(n => n !== '我')
            }
          : m
      ))
    } catch (error) {
      console.error('Failed to like moment:', error)
    }
  }

  const openInputBar = (momentId: string) => {
    setExpandedMomentId(momentId)
    setShowCommentInput(true)
    setCommentText('')
    Network.request({
      url: `/api/moments/${momentId}/comments`,
      method: 'GET'
    }).then(res => {
      if (res.data?.code === 200 && Array.isArray(res.data.data)) {
        setMoments(prev => prev.map(m =>
          m.id === momentId ? { ...m, commentList: res.data.data.map(mapComment) } : m
        ))
      }
    }).catch(() => {})
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !expandedMomentId) return
    try {
      setSubmittingComment(true)
      const res = await Network.request({
        url: `/api/moments/${expandedMomentId}/comment`,
        method: 'POST',
        data: { content: commentText }
      })
      console.log('Comment response:', res.data)
      if (res.data?.code === 200) {
        const commentsRes = await Network.request({
          url: `/api/moments/${expandedMomentId}/comments`,
          method: 'GET'
        })
        if (commentsRes.data?.code === 200 && Array.isArray(commentsRes.data.data)) {
          setMoments(prev => prev.map(m =>
            m.id === expandedMomentId ? { ...m, commentList: commentsRes.data.data.map(mapComment) } : m
          ))
        }
        setShowCommentInput(false)
        setCommentText('')
        Taro.showToast({ title: '评论成功', icon: 'success' })
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
      Taro.showToast({ title: '评论失败', icon: 'error' })
    } finally {
      setSubmittingComment(false)
    }
  }

  const displayName = characterName || '角色'

  return (
    <View className="bg-pink-50" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <ScrollView scrollY style={{ flex: '1 1 0%', height: '100%' }}>
        {/* 顶部背景区 */}
        <View className="relative h-56 overflow-hidden">
          {backgroundImage ? (
            <Image
              src={backgroundImage}
              className="absolute inset-0 w-full h-full"
              mode="aspectFill"
            />
          ) : (
            <View
              className="absolute inset-0 w-full h-full"
              style={{ background: 'linear-gradient(160deg, #fce4ec 0%, #f8bbd0 40%, #f48fb1 100%)' }}
            />
          )}

          {/* 头部内容 */}
          <View className="relative h-full flex flex-col justify-end px-4 pb-4">
            <Text className="text-white text-xl font-bold mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>{displayName}的朋友圈</Text>
            <Text className="text-white text-sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>TA 发布过的动态</Text>
          </View>
        </View>

        <View className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && (
            <View className="flex items-center justify-center py-12">
              <Text className="text-sm text-gray-400">加载中...</Text>
            </View>
          )}

          {!loading && moments.length === 0 && (
            <View className="flex flex-col items-center justify-center py-12">
              <Text className="text-sm text-gray-400">TA 还没有发布过动态</Text>
            </View>
          )}

          {moments.map((moment) => (
            <View key={moment.id} className="bg-white rounded-xl shadow-sm p-4">
              {/* 头像 + 名字 */}
              <View style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={moment.characterAvatar} />
                  <AvatarFallback>{moment.characterName.charAt(0)}</AvatarFallback>
                </Avatar>
                <View className="flex-1">
                  <Text className="block font-semibold text-sm" style={{ color: '#17323c' }}>{moment.characterName}</Text>
                  <Text className="block text-xs text-gray-400 mt-2">{formatTime(moment.createdAt)}</Text>
                </View>
              </View>

              {/* 内容 */}
              <Text className="block text-gray-800 text-sm leading-relaxed mt-3 mb-2">
                {moment.content}
              </Text>

              {/* 图片 */}
              {moment.imageUrl && (
                <Image
                  src={moment.imageUrl}
                  className="w-full h-48 rounded-lg mb-2"
                  mode="aspectFill"
                />
              )}

              {/* 微信风格：点赞名字 + 评论直显 */}
              {(moment.likes > 0 || (moment.commentList && moment.commentList.length > 0)) && (
                <View className="bg-gray-100 rounded-lg p-3 mt-2" style={{ rowGap: '10px', display: 'flex', flexDirection: 'column' }}>
                  {moment.likes > 0 && (
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '5px' }}>
                      <Heart size={14} color="#ec4899" filled style={{ marginTop: '3px' }} />
                      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                        {(moment.likers && moment.likers.length > 0 ? moment.likers : moment.likerNames.map(n => ({ name: n, characterId: null }))).map((l, i, arr) => (
                          <View key={i} style={{ display: 'flex', flexDirection: 'row' }}>
                            <View
                              style={{ display: 'inline-block' }}
                              onClick={(e) => { e.stopPropagation && e.stopPropagation(); if (l.characterId) { Taro.navigateTo({ url: `/pages/moments-detail/index?characterId=${l.characterId}&novelId=${novelIdParam}` }) } }}
                            >
                              <Text className="text-sm leading-7" style={{ color: '#576b95' }}>
                                {l.name}
                              </Text>
                            </View>
                            {i < arr.length - 1 && <Text className="text-sm leading-7" style={{ color: '#576b95' }}>，</Text>}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {moment.commentList && moment.commentList.map((comment) => (
                    <View key={comment.id} onClick={() => openInputBar(moment.id)}>
                      <View
                        style={{ display: 'inline-block' }}
                        onClick={(e) => { e.stopPropagation && e.stopPropagation(); if (comment.characterId) { Taro.navigateTo({ url: `/pages/moments-detail/index?characterId=${comment.characterId}&novelId=${novelIdParam}` }) } }}
                      >
                        <Text className="text-sm leading-7" style={{ color: '#576b95' }}>
                          {comment.characterName}：
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-700 leading-7">{comment.content}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 操作栏（微信：右下角两个小图标） */}
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: '20px', marginTop: '10px' }}>
                <View
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
                  onClick={() => handleLike(moment.id)}
                >
                  <Heart size={18} color={moment.isLiked ? '#ec4899' : '#9ca3af'} filled={moment.isLiked} />
                  <Text className="text-xs text-gray-500">{moment.likes > 0 ? moment.likes : '赞'}</Text>
                </View>
                <View
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
                  onClick={() => openInputBar(moment.id)}
                >
                  <MessageCircle size={18} color="#9ca3af" />
                  <Text className="text-xs text-gray-500">{moment.commentList.length > 0 ? moment.commentList.length : '评论'}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 底部评论输入栏（微信朋友圈样式） */}
      {showCommentInput && (
        <View
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTop: '1px solid #e5e5e5', padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', zIndex: 100 }}
        >
          <Input
            style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: '18px', padding: '8px 14px', fontSize: '14px' }}
            placeholder="评论..."
            value={commentText}
            onInput={e => setCommentText(e.detail.value)}
            focus
            confirmType="send"
            onConfirm={() => handleSubmitComment()}
          />
          <Text
            className="text-sm"
            style={{ color: commentText.trim() ? '#ec4899' : '#c0c4cc', flexShrink: 0, padding: '4px' }}
            onClick={() => { if (commentText.trim() && !submittingComment) handleSubmitComment() }}
          >
            发送
          </Text>
        </View>
      )}
    </View>
  )
}
