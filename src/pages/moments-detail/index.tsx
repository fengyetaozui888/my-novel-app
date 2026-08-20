import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Heart, MessageCircle } from 'lucide-react-taro'

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

export default function MomentsDetailPage() {
  const router = useRouter()
  const characterIdParam = router.params.characterId || ''
  const [novelId, setNovelId] = useState('')
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string>('')
  const [characterName, setCharacterName] = useState('')

  useEffect(() => {
    initContext()
  }, [])

  /** 动态设置导航栏标题 */
  useEffect(() => {
    const title = characterName ? `${characterName}的朋友圈` : '朋友圈'
    if (typeof Taro.setNavigationBarTitle === 'function') {
      Taro.setNavigationBarTitle({ title })
    }
  }, [characterName])

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
      console.log('Moments detail response:', res.data)
      if (res.data?.code === 200 && Array.isArray(res.data.data)) {
        const mapped = res.data.data.map(mapMoment)
        setMoments(mapped)
        // 提取角色名用于导航栏标题
        if (characterIdParam && mapped.length > 0) {
          setCharacterName(mapped[0].characterName)
        }
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

  const openMomentDetail = (momentId: string) => {
    Taro.navigateTo({
      url: `/pages/moment-detail/index?id=${momentId}&novelId=${novelId}`
    })
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* 顶部封面 */}
      <View style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
        {backgroundImage ? (
          <Image src={backgroundImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <View style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fbc2eb 0%, #f8a5c2 100%)' }} />
        )}
      </View>

      {/* 内容区域 */}
      <View style={{ padding: '16px' }}>
        {loading ? (
          <View style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <Text>加载中...</Text>
          </View>
        ) : moments.length === 0 ? (
          <View style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <Text>暂无动态</Text>
          </View>
        ) : (
          moments.map(moment => (
            <Card key={moment.id} style={{ marginBottom: '16px' }} onClick={() => openMomentDetail(moment.id)}>
              <CardContent style={{ padding: '16px' }}>
                {/* 头部：角色信息 */}
                <View style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <Avatar style={{ width: '40px', height: '40px', marginRight: '12px' }}>
                    {moment.characterAvatar ? (
                      <AvatarImage src={moment.characterAvatar} />
                    ) : (
                      <AvatarFallback>{moment.characterName.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{moment.characterName}</Text>
                    <Text style={{ fontSize: '12px', color: '#999' }}>{formatTime(moment.createdAt)}</Text>
                  </View>
                </View>

                {/* 内容 */}
                <Text style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', marginBottom: '12px' }}>{moment.content}</Text>

                {/* 图片 */}
                {moment.imageUrl && (
                  <Image src={moment.imageUrl} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
                )}

                {/* 底部：点赞和评论 */}
                <View style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                  <View
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleLike(moment.id) }}
                  >
                    <Heart size={16} color={moment.isLiked ? '#e91e63' : '#999'} />
                    <Text style={{ fontSize: '12px', color: moment.isLiked ? '#e91e63' : '#999' }}>{moment.likes}</Text>
                  </View>
                  <View style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageCircle size={16} color="#999" />
                    <Text style={{ fontSize: '12px', color: '#999' }}>{moment.commentList.length}</Text>
                  </View>
                </View>

                {/* 点赞者列表 */}
                {moment.likerNames.length > 0 && (
                  <View style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <Text style={{ fontSize: '12px', color: '#666' }}>
                      {moment.likerNames.join('、')} 赞了
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </View>
    </View>
  )
}
