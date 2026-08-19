import { useState, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Coffee, Plus, MessageCircle } from 'lucide-react-taro'

interface CafeMessage {
  id: number
  character_id: string
  character_name: string
  novel_id: string
  novel_name: string | null
  content: string
  created_at: string
}

interface Character {
  id: string
  name: string
  novel_id: string
  novel_name?: string
}

const COLORS = [
  'bg-amber-100 border-amber-200',
  'bg-pink-100 border-pink-200',
  'bg-blue-100 border-blue-200',
  'bg-green-100 border-green-200',
  'bg-purple-100 border-purple-200',
  'bg-yellow-100 border-yellow-200',
  'bg-rose-100 border-rose-200',
  'bg-teal-100 border-teal-200',
]

const CafePage = () => {
  const [messages, setMessages] = useState<CafeMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [showWriteDialog, setShowWriteDialog] = useState(false)
  const [showCharactersDialog, setShowCharactersDialog] = useState(false)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const res = await Network.request({ url: '/api/cafe/messages' })
      console.log('fetchCafeMessages response:', res.data)
      const data = res.data?.data || res.data || []
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchCafeMessages error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await Network.request({ url: '/api/characters' })
      console.log('fetchCharacters response:', res.data)
      const data = res.data?.data || res.data || []
      setCharacters(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchCharacters error:', err)
    }
  }, [])

  useDidShow(() => {
    fetchMessages()
  })

  const handleWrite = () => {
    fetchCharacters()
    setShowWriteDialog(true)
  }

  const handleSelectCharacter = (char: Character) => {
    setSelectedCharacter(char)
    setShowCharactersDialog(false)
  }

  const handleSubmit = async () => {
    if (!content.trim() || !selectedCharacter) return
    try {
      setSubmitting(true)
      await Network.request({
        url: '/api/cafe/messages',
        method: 'POST',
        data: {
          character_id: selectedCharacter.id,
          character_name: selectedCharacter.name,
          novel_id: selectedCharacter.novel_id,
          novel_name: selectedCharacter.novel_name || '',
          content: content.trim(),
        },
      })
      setContent('')
      setSelectedCharacter(null)
      setShowWriteDialog(false)
      fetchMessages()
    } catch (err) {
      console.error('submitCafeMessage error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <View className="min-h-screen bg-amber-50">
      {/* Header */}
      <View className="bg-gradient-to-b from-amber-100 to-amber-50 px-4 pt-6 pb-4">
        <View className="flex items-center gap-3 mb-2">
          <Coffee size={28} color="#92400e" />
          <View>
            <Text className="block text-xl font-bold text-amber-900">时空咖啡厅</Text>
            <Text className="block text-sm text-amber-600 mt-1">
              不同世界的角色在此相遇，留下你的文字吧
            </Text>
          </View>
        </View>
      </View>

      {/* Sticky Note Wall */}
      <ScrollView scrollY className="h-[calc(100vh-200px)] px-4 pb-24">
        {loading ? (
          <View className="flex flex-col gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </View>
        ) : messages.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Coffee size={48} color="#d97706" />
            <Text className="block text-gray-400 text-base mt-4 text-center">
              便利贴墙还是空的{'\n'}成为第一个留下文字的人吧
            </Text>
          </View>
        ) : (
          <View className="flex flex-col gap-4 mt-4">
            {messages.map((msg, index) => (
              <View
                key={msg.id}
                className={`rounded-xl border-2 p-4 shadow-sm ${COLORS[index % COLORS.length]}`}
                style={{ transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (0.5 + (index % 3) * 0.3)}deg)` }}
              >
                <View className="flex items-center gap-2 mb-2">
                  <MessageCircle size={14} color="#78350f" />
                  <Text className="block text-sm font-bold text-amber-900">{msg.character_name}</Text>
                  {msg.novel_name && (
                    <Text className="block text-xs text-amber-600">· {msg.novel_name}</Text>
                  )}
                </View>
                <Text className="block text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </Text>
                <Text className="block text-xs text-amber-500 mt-2 text-right">
                  {formatTime(msg.created_at)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Write Button - Fixed Bottom Right */}
      <View
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 100,
        }}
      >
        <Button
          size="sm"
          className="bg-amber-500 text-white rounded-full shadow-lg"
          style={{ padding: '12px' }}
          onClick={handleWrite}
        >
          <Plus size={24} color="#ffffff" />
        </Button>
      </View>

      {/* Write Dialog */}
      <Dialog open={showWriteDialog} onOpenChange={setShowWriteDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">写下你的留言</Text>
            </DialogTitle>
          </DialogHeader>

          {/* Character Selector */}
          <View className="mt-4">
            <Text className="block text-sm text-gray-500 mb-2">选择角色</Text>
            <View
              className="bg-stone-50 rounded-xl px-4 py-3 flex items-center justify-between"
              onClick={() => setShowCharactersDialog(true)}
            >
              {selectedCharacter ? (
                <Text className="block text-sm text-gray-900">{selectedCharacter.name}</Text>
              ) : (
                <Text className="block text-sm text-gray-400">请选择一个角色</Text>
              )}
            </View>
          </View>

          {/* Content */}
          <View className="mt-4">
            <View className="bg-amber-50 rounded-xl border-2 border-amber-200 overflow-hidden">
              <ScrollView
                scrollY
                className="p-4"
                style={{ maxHeight: '120px' }}
                onScroll={() => {
                  // 滚动时显示滚动条
                  const textarea = document.querySelector('textarea')
                  if (textarea) {
                    textarea.style.overflowY = 'scroll'
                    // 停止滚动2秒后隐藏滚动条
                    clearTimeout((textarea as any)._scrollTimer)
                    ;(textarea as any)._scrollTimer = setTimeout(() => {
                      textarea.style.overflowY = 'hidden'
                    }, 2000)
                  }
                }}
              >
                <Textarea
                  className="w-full bg-transparent border-none"
                  placeholder="写下你的愿望、随笔、笑话... 什么都可以~"
                  value={content}
                  onInput={(e) => setContent(e.detail.value)}
                  style={{ minHeight: '120px' }}
                />
              </ScrollView>
            </View>
          </View>

          {/* Submit */}
          <View className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowWriteDialog(false)
                setSelectedCharacter(null)
                setContent('')
              }}
            >
              <Text>取消</Text>
            </Button>
            <Button
              className="flex-1 bg-amber-500 text-white"
              disabled={!content.trim() || !selectedCharacter || submitting}
              onClick={handleSubmit}
            >
              <Text>{submitting ? '张贴中...' : '贴上墙'}</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Character Selection Dialog */}
      <Dialog open={showCharactersDialog} onOpenChange={setShowCharactersDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">选择角色</Text>
            </DialogTitle>
          </DialogHeader>
          <ScrollView scrollY className="max-h-64 mt-4">
            {characters.length === 0 ? (
              <Text className="block text-gray-400 text-sm text-center py-8">
                还没有角色，先去创建吧
              </Text>
            ) : (
              <View className="flex flex-col gap-2">
                {characters.map((char) => (
                  <View
                    key={char.id}
                    className="bg-stone-50 rounded-xl px-4 py-3 flex items-center justify-between"
                    onClick={() => handleSelectCharacter(char)}
                  >
                    <View>
                      <Text className="block text-sm font-medium text-gray-900">{char.name}</Text>
                      {char.novel_name && (
                        <Text className="block text-xs text-gray-400">{char.novel_name}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </DialogContent>
      </Dialog>
    </View>
  )
}

export default CafePage
