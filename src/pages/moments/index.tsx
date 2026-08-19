import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Heart, MessageCircle, Camera, ImagePlus, Plus, X } from 'lucide-react-taro'

interface Comment {
  id: string
  characterName: string
  authorType: string
  content: string
  createdAt: string
  characterId?: string | null
}

interface Moment {
  id: string
  characterName: string
  characterAvatar: string
  authorType: string
  content: string
  imageUrl?: string
  createdAt: string
  likes: number
  isLiked: boolean
  likerNames: string[]
  likers?: { name: string; characterId: string | null }[]
  commentList: Comment[]
}

/** 后端 snake_case → 前端结构 */
const mapMoment = (m: any): Moment => ({
  id: m.id,
  characterName: m.author_type === 'user' ? (m.author_name || '我') : (m.character?.name || m.author_name || ''),
  characterAvatar: m.character?.avatar_url || '',
  authorType: m.author_type,
  content: m.content,
  imageUrl: m.image_url || undefined,
  createdAt: m.created_at,
  likes: m.likes_count ?? 0,
  isLiked: !!m.is_liked,
  likerNames: Array.isArray(m.liker_names) ? m.liker_names : [],
  likers: Array.isArray(m.likers) ? m.likers.map((l: any) => ({ name: l.name, characterId: l.character_id || null })) : [],
  commentList: Array.isArray(m.comments) ? m.comments.map((c: any) => ({
    id: c.id,
    characterName: c.author_type === 'user' ? (c.author_name || '我') : (c.author_name || ''),
    authorType: c.author_type,
    content: c.content,
    createdAt: c.created_at,
    characterId: c.character_id || null,
  })) : [],
})

const mapComment = (c: any): Comment => ({
  id: `${c.created_at}-${Math.random().toString(36).slice(2, 7)}`,
  characterName: c.author_type === 'user' ? (c.author_name || '我') : (c.character?.name || c.author_name || ''),
  authorType: c.author_type,
  content: c.content,
  createdAt: c.created_at,
  characterId: c.character?.id || c.character_id || null,
})

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function MomentsPage() {
  const router = useRouter()
  const characterIdParam = router.params.characterId || ''
  const [novelId, setNovelId] = useState('')
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string>('')
  const [expandedMomentId, setExpandedMomentId] = useState<string>('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [publishText, setPublishText] = useState('')
  const [publishImage, setPublishImage] = useState('')
  const [submittingPublish, setSubmittingPublish] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    initContext()
  }, [])

  /** 获取小说上下文：优先从参数，否则取第一本小说 */
  const initContext = async () => {
    let nid = ''
    try {
      const res = await Network.request({ url: '/api/novels', method: 'GET' })
      const list = res.data?.data
      nid = Array.isArray(list) && list.length > 0 ? list[0].id : ''
    } catch (error) {
      console.error('Failed to load novels:', error)
    }
    setNovelId(nid)
    if (nid) {
      loadMoments(nid)
      loadBackground(nid)
    }
  }

  const loadMoments = async (nid?: string) => {
    const id = nid || novelId
    if (!id) return
    try {
      setLoading(true)
      const res = await Network.request({
        url: `/api/moments?novelId=${id}${characterIdParam ? `&characterId=${characterIdParam}` : ''}`,
        method: 'GET'
      })
      console.log('Moments response:', res.data)
      if (res.data?.code === 200 && Array.isArray(res.data.data)) {
        setMoments(res.data.data.map(mapMoment))
      } else {
        setMoments([])
      }
    } catch (error) {
      console.error('Failed to load moments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBackground = async (nid?: string) => {
    const id = nid || novelId
    if (!id) return
    try {
      const res = await Network.request({
        url: `/api/moments/background?novelId=${id}`,
        method: 'GET'
      })
      if (res.data?.code === 200 && res.data?.data?.image_url) {
        setBackgroundImage(res.data.data.image_url)
      }
    } catch (error) {
      console.error('Failed to load background:', error)
    }
  }

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

  // 微信风格：点评论图标直接唤起输入框（评论内容始终直显，无需展开）
  const toggleComments = (momentId: string) => {
    openInputBar(momentId)
  }

  const openInputBar = (momentId: string) => {
    setExpandedMomentId(momentId)
    setShowCommentInput(true)
    setCommentText('')
    // 同时拉取评论
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
      // 不传 characterId：以"我"的身份评论
      const res = await Network.request({
        url: `/api/moments/${expandedMomentId}/comment`,
        method: 'POST',
        data: { content: commentText }
      })
      console.log('Comment response:', res.data)

      if (res.data?.code === 200) {
        // 重新加载评论（角色回复是异步生成的，稍后可再次展开刷新）
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

  // 以"我"的身份发布朋友圈
  const handleChoosePublishImage = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      setPublishImage(res.tempFilePaths[0])
    } catch (error) {
      console.error('Failed to choose image:', error)
    }
  }

  const handlePublish = async () => {
    if (!publishText.trim() || !novelId) return

    try {
      setSubmittingPublish(true)
      let imageUrl = ''
      if (publishImage) {
        const uploadRes = await Network.uploadFile({
          url: '/api/upload',
          filePath: publishImage,
          name: 'file'
        })
        if (uploadRes.data) {
          const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
          imageUrl = data?.data?.url || data?.url || ''
        }
      }

      const res = await Network.request({
        url: '/api/moments/user',
        method: 'POST',
        data: { novelId, content: publishText, imageUrl }
      })
      console.log('Publish response:', res.data)

      if (res.data?.code === 200) {
        setShowPublish(false)
        setPublishText('')
        setPublishImage('')
        await loadMoments()
        Taro.showToast({ title: '发布成功', icon: 'success' })
      }
    } catch (error) {
      console.error('Failed to publish:', error)
      Taro.showToast({ title: '发布失败', icon: 'error' })
    } finally {
      setSubmittingPublish(false)
    }
  }

  const handleChangeBackground = async () => {
    if (!novelId) return
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      const tempFilePath = res.tempFilePaths[0]

      // 先上传拿 URL，再保存为朋友圈背景
      const uploadRes = await Network.uploadFile({
        url: '/api/upload',
        filePath: tempFilePath,
        name: 'file'
      })
      if (!uploadRes.data) return
      const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
      const url = data?.data?.url || data?.url
      if (!url) return

      const saveRes = await Network.request({
        url: '/api/moments/background',
        method: 'POST',
        data: { novelId, imageUrl: url }
      })
      if (saveRes.data?.code === 200) {
        setBackgroundImage(url)
        Taro.showToast({ title: '背景设置成功', icon: 'success' })
      }
    } catch (error) {
      console.error('Failed to change background:', error)
      Taro.showToast({ title: '设置失败', icon: 'error' })
    }
  }

  const isUserMoment = (m: Moment) => m.authorType === 'user'

  return (
    <View className="bg-pink-50" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 整页滚动：背景与标题随内容一起上滑（微信朋友圈式） */}
      <ScrollView
        scrollY
        style={{ flex: '1 1 0%', height: '100%' }}
        onScroll={(e) => {
          const scrollTop = e.detail?.scrollTop ?? 0
          setScrolled(scrollTop > 100)
        }}
      >
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
          <Text className="text-white text-xl font-bold mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>{characterIdParam && moments.length > 0 ? `${moments[0].characterName}的朋友圈` : '朋友圈'}</Text>
          <Text className="text-white text-sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>{characterIdParam ? 'TA 发布过的动态' : '角色们的日常动态'}</Text>
        </View>

      </View>

        <View className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {moments.map((moment) => (
            <Card key={moment.id} className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-4">
                {/* 头像 + 名字（微信结构：无右上角气泡） */}
                <View style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={moment.characterAvatar} />
                    <AvatarFallback>{moment.characterName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="block font-semibold text-sm" style={{ color: '#17323c' }}>{moment.characterName}</Text>
                    {/* 时间与名字拉开距离 */}
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

                {/* 微信风格：点赞名字 + 评论直显，行距加大 */}
                {(moment.likes > 0 || (moment.commentList && moment.commentList.length > 0)) && (
                  <View className="bg-gray-100 rounded-lg p-3 mt-2" style={{ rowGap: '10px', display: 'flex', flexDirection: 'column' }}>
                    {moment.likes > 0 && (
                      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '5px' }}>
                        <Heart size={14} color="#ec4899" filled style={{ marginTop: '3px' }} />
                        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                          {(moment.likers && moment.likers.length > 0 ? moment.likers : moment.likerNames.map(n => ({ name: n, characterId: null }))).map((l, i, arr) => (
                            <View key={i} style={{ display: 'flex', flexDirection: 'row' }}>
                              <Text
                                className="text-sm leading-7"
                                style={{ color: '#576b95' }}
                                onClick={(e) => { e.stopPropagation && e.stopPropagation(); if (l.characterId) { Taro.navigateTo({ url: `/pages/moments/index?characterId=${l.characterId}` }) } }}
                              >
                                {l.name}
                              </Text>
                              {i < arr.length - 1 && <Text className="text-sm leading-7" style={{ color: '#576b95' }}>，</Text>}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    {moment.commentList && moment.commentList.map((comment) => (
                      <View key={comment.id} onClick={() => !isUserMoment(moment) && openInputBar(moment.id)}>
                        <Text
                          className="text-sm leading-7"
                          style={{ color: '#576b95' }}
                          onClick={(e) => { e.stopPropagation && e.stopPropagation(); if (comment.characterId) { Taro.navigateTo({ url: `/pages/moments/index?characterId=${comment.characterId}` }) } }}
                        >
                          {comment.characterName}：
                        </Text>
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
                    onClick={() => toggleComments(moment.id)}
                  >
                    <MessageCircle size={18} color="#9ca3af" />
                    <Text className="text-xs text-gray-500">评论</Text>
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

      {/* 悬浮按钮：照相机滚动时隐藏，加号固定在右下角 */}
      {!scrolled && (
        <View
          style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 50, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: '9999px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          onClick={handleChangeBackground}
        >
          <Camera size={18} color="#8a8a8a" />
        </View>
      )}
      <View
        style={{ position: 'fixed', bottom: '60px', right: '16px', zIndex: 50, backgroundColor: '#ffffff', borderRadius: '9999px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setShowPublish(true)}
      >
        <Plus size={24} color="#e91e63" strokeWidth={2.5} />
      </View>

      {/* 微信风格评论输入栏：底部固定弹出的单行输入 */}
      {showCommentInput && (
        <View
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            backgroundColor: '#ffffff',
            borderTop: '1px solid #f3f4f6',
            padding: '10px 12px',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <View className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
            <Input
              className="w-full bg-transparent"
              placeholder="评论..."
              value={commentText}
              focus
              onInput={(e) => setCommentText(e.detail.value)}
            />
          </View>
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={submittingComment || !commentText.trim()}
            className="bg-pink-500 text-white rounded-lg"
          >
            <Text className="text-white text-sm">{submittingComment ? '...' : '发送'}</Text>
          </Button>
          <View onClick={() => setShowCommentInput(false)}>
            <X size={20} color="#9ca3af" />
          </View>
        </View>
      )}

      {/* 发布朋友圈弹窗（以"我"的身份） */}
      {showPublish && (
        <View
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px'
          }}
        >
          <View className="bg-white rounded-2xl w-full p-5">
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <Text className="text-base font-semibold text-gray-900">发表朋友圈</Text>
              <View onClick={() => setShowPublish(false)}>
                <X size={20} color="#9ca3af" />
              </View>
            </View>

            <View className="bg-pink-50 rounded-xl p-3 mb-3">
              <Textarea
                className="w-full h-24 border-none ring-0 focus-within:ring-0"
                style={{ backgroundColor: 'transparent' }}
                placeholder="这一刻的想法..."
                value={publishText}
                maxlength={500}
                onInput={(e) => setPublishText(e.detail.value)}
              />
            </View>

            {publishImage ? (
              <View className="relative mb-3">
                <Image src={publishImage} className="w-full h-40 rounded-xl" mode="aspectFill" />
                <View
                  style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: 4 }}
                  onClick={() => setPublishImage('')}
                >
                  <X size={14} color="#ffffff" />
                </View>
              </View>
            ) : (
              <View
                className="flex flex-col items-center justify-center border border-dashed border-pink-200 rounded-xl py-6 mb-3"
                onClick={handleChoosePublishImage}
              >
                <ImagePlus size={24} color="#f48fb1" />
                <Text className="text-xs text-pink-300 mt-2">添加图片（可选）</Text>
              </View>
            )}

            <Button
              className="w-full bg-pink-500 text-white rounded-xl"
              disabled={submittingPublish || !publishText.trim()}
              onClick={handlePublish}
            >
              <Text className="text-white">{submittingPublish ? '发布中...' : '发布'}</Text>
            </Button>
            <Text className="block text-xs text-gray-400 text-center mt-3">
              发布后，与「我」有亲密度的角色可能会前来评论
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
