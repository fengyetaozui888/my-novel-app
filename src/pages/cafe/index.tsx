import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Coffee, Plus, MessageCircle, Users, Trash2, Search, ChevronDown, X } from 'lucide-react-taro'


interface CafeMessage {
  id: number
  character_id: string
  character_name: string
  novel_id: string
  novel_name: string | null
  content: string
  created_at: string
}

interface CafeInteraction {
  id: number
  character_a_id: string
  character_a_name: string
  character_b_id: string
  character_b_name: string
  novel_a_name: string | null
  novel_b_name: string | null
  content: string
  interaction_type: string
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
  const [interactions, setInteractions] = useState<CafeInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'wall' | 'interaction'>('wall')
  const [showWriteDialog, setShowWriteDialog] = useState(false)
  const [showCharactersDialog, setShowCharactersDialog] = useState(false)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  // 互动筛选：搜索关键字 / 指定角色
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterCharOpen, setFilterCharOpen] = useState(false)
  const [filterCharacter, setFilterCharacter] = useState<Character | null>(null)
  // 自绘滚动条：滚动时显示，停止 2 秒后消失（通过原生 scroll 事件监听 textarea）
  const [scrollbar, setScrollbar] = useState({ show: false, top: 0, height: 24 })
  const scrollHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaInstRef = useRef<any>(null)
  const textareaDomRef = useRef<any>(null)

  useEffect(() => {
    if (!showWriteDialog) return
    if (typeof document === 'undefined') return
    const timer = setTimeout(() => {
      const inst: any = textareaInstRef.current
      if (!inst) return
      let node: any = inst
      if (!(typeof HTMLTextAreaElement !== 'undefined' && inst instanceof HTMLTextAreaElement) && typeof inst.querySelector === 'function') {
        node = inst.querySelector('textarea') || inst
      }
      if (!node || typeof node.addEventListener !== 'function') return
      textareaDomRef.current = node
      const onScroll = () => {
        const h = node.clientHeight
        const sh = node.scrollHeight
        if (sh <= h) return
        const ratio = h / sh
        const barHeight = Math.max(24, ratio * h)
        const maxScroll = sh - h
        const barTop = maxScroll > 0 ? (node.scrollTop / maxScroll) * (h - barHeight) : 0
        setScrollbar({ show: true, top: barTop, height: barHeight })
        if (scrollHideTimer.current) clearTimeout(scrollHideTimer.current)
        scrollHideTimer.current = setTimeout(() => {
          setScrollbar((s) => ({ ...s, show: false }))
        }, 2000)
      }
      node.addEventListener('scroll', onScroll)
      node.__cafeOnScroll = onScroll
    }, 200)
    return () => {
      clearTimeout(timer)
      const node: any = textareaDomRef.current
      if (node?.__cafeOnScroll) {
        node.removeEventListener('scroll', node.__cafeOnScroll)
        node.__cafeOnScroll = null
      }
    }
  }, [showWriteDialog])

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

  const fetchInteractions = useCallback(async (characterId?: string) => {
    try {
      setLoading(true)
      const url = characterId
        ? `/api/cafe/interactions?character_id=${characterId}`
        : '/api/cafe/interactions'
      const res = await Network.request({ url })
      console.log('fetchCafeInteractions response:', res.data)
      const data = res.data?.data || res.data || []
      setInteractions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchCafeInteractions error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 选择/清除筛选角色后重新拉取
  const applyFilterCharacter = useCallback((char: Character | null) => {
    setFilterCharacter(char)
    setFilterCharOpen(false)
    fetchInteractions(char?.id)
  }, [fetchInteractions])

  // 本地二次过滤：关键字匹配任一互动角色名
  const filteredInteractions = interactions.filter((item) => {
    if (!searchKeyword.trim()) return true
    const kw = searchKeyword.trim().toLowerCase()
    return (
      item.character_a_name.toLowerCase().includes(kw) ||
      item.character_b_name.toLowerCase().includes(kw) ||
      (item.novel_a_name || '').toLowerCase().includes(kw) ||
      (item.novel_b_name || '').toLowerCase().includes(kw)
    )
  })

  useDidShow(() => {
    if (activeTab === 'wall') {
      fetchMessages()
    } else {
      fetchInteractions(filterCharacter?.id)
      fetchCharacters()
    }
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

  const handleGenerateInteraction = async () => {
    try {
      setGenerating(true)
      await Network.request({
        url: '/api/cafe/interactions/generate',
        method: 'POST',
      })
      fetchInteractions(filterCharacter?.id)
    } catch (err) {
      console.error('generateInteraction error:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteMessage = async (id: number) => {
    try {
      await Network.request({
        url: `/api/cafe/messages/${id}`,
        method: 'DELETE',
      })
      fetchMessages()
    } catch (err) {
      console.error('deleteMessage error:', err)
    }
  }

  const handleDeleteInteraction = async (id: number) => {
    try {
      await Network.request({
        url: `/api/cafe/interactions/${id}`,
        method: 'DELETE',
      })
      fetchInteractions(filterCharacter?.id)
    } catch (err) {
      console.error('deleteInteraction error:', err)
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

      {/* Tab Navigation */}
      <View className="bg-white border-b border-amber-100 px-4">
        <View className="flex gap-0">
          <View
            className={`flex-1 py-3 text-center cursor-pointer ${activeTab === 'wall' ? 'border-b-2 border-amber-500' : ''}`}
            onClick={() => { setActiveTab('wall'); fetchMessages() }}
          >
            <Text className={`block text-sm font-medium ${activeTab === 'wall' ? 'text-amber-700' : 'text-gray-400'}`}>
              便签墙
            </Text>
          </View>
          <View
            className={`flex-1 py-3 text-center cursor-pointer ${activeTab === 'interaction' ? 'border-b-2 border-amber-500' : ''}`}
            onClick={() => {
              setActiveTab('interaction')
              fetchInteractions(filterCharacter?.id)
              fetchCharacters()
            }}
          >
            <Text className={`block text-sm font-medium ${activeTab === 'interaction' ? 'text-amber-700' : 'text-gray-400'}`}>
              角色互动
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView scrollY className="h-[calc(100vh-280px)] px-4 pb-24">
        {activeTab === 'wall' ? (
          /* ===== 便签墙 ===== */
          loading ? (
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
                  <View className="flex items-center justify-between mt-2">
                    <Text className="block text-xs text-amber-500">
                      {formatTime(msg.created_at)}
                    </Text>
                    <View
                      className="px-2 py-1 rounded"
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      <Trash2 size={14} color="#d97706" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          /* ===== 角色互动 ===== */
          <View>
            {/* 筛选栏：搜索角色 / 选择角色 */}
            <View className="mt-3 bg-white rounded-xl p-3 shadow-sm border border-amber-100">
              <View className="flex items-center gap-2">
                <View
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${searchOpen ? 'bg-amber-500' : 'bg-amber-50'}`}
                  onClick={() => {
                    setSearchOpen(!searchOpen)
                    if (searchOpen) setSearchKeyword('')
                  }}
                >
                  <Search size={18} color={searchOpen ? '#ffffff' : '#d97706'} />
                </View>
                <View
                  className="flex-1 flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2"
                  onClick={() => setFilterCharOpen(!filterCharOpen)}
                >
                  <Text className={`block text-sm ${filterCharacter ? 'text-amber-700 font-medium' : 'text-amber-600'}`}>
                    {filterCharacter ? `角色：${filterCharacter.name}` : '选择角色'}
                  </Text>
                  <ChevronDown size={16} color="#d97706" />
                </View>
              </View>

              {/* 搜索框 */}
              {searchOpen && (
                <View className="mt-2 bg-amber-50 rounded-lg px-3 py-1 flex items-center gap-2">
                  <Search size={14} color="#b45309" />
                  <View className="flex-1">
                    <Input
                      className="h-7 border-none ring-0 focus-within:ring-0 px-0 py-0"
                      placeholder="输入角色名称搜索互动"
                      value={searchKeyword}
                      onInput={(e) => setSearchKeyword(e.detail.value)}
                    />
                  </View>
                  {searchKeyword && (
                    <View className="p-1" onClick={() => setSearchKeyword('')}>
                      <X size={14} color="#b45309" />
                    </View>
                  )}
                </View>
              )}

              {/* 角色列表下拉 */}
              {filterCharOpen && (
                <ScrollView scrollY className="max-h-48 mt-2 border-t border-amber-100">
                  <View className="flex flex-col gap-1 pt-2">
                    <View
                      className={`rounded-lg px-3 py-2 ${!filterCharacter ? 'bg-amber-100' : 'bg-stone-50'}`}
                      onClick={() => applyFilterCharacter(null)}
                    >
                      <Text className="block text-sm text-amber-800 font-medium">全部角色</Text>
                    </View>
                    {characters.length === 0 ? (
                      <Text className="block text-gray-400 text-sm text-center py-4">
                        还没有角色
                      </Text>
                    ) : (
                      characters.map((char) => (
                        <View
                          key={char.id}
                          className={`rounded-lg px-3 py-2 ${filterCharacter?.id === char.id ? 'bg-amber-100' : 'bg-stone-50'}`}
                          onClick={() => applyFilterCharacter(char)}
                        >
                          <Text className="block text-sm text-gray-900 font-medium">{char.name}</Text>
                          {char.novel_name && (
                            <Text className="block text-xs text-gray-400 mt-1">{char.novel_name}</Text>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              )}
            </View>

            {generating ? (
              <View className="flex flex-col gap-4 mt-4">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="bg-white rounded-xl p-4 shadow-sm">
                    <View className="h-4 bg-gray-100 rounded w-3/4 mb-2 animate-pulse" />
                    <View className="h-3 bg-gray-100 rounded w-full mb-2 animate-pulse" />
                    <View className="h-3 bg-gray-100 rounded w-5/6 animate-pulse" />
                  </View>
                ))}
              </View>
            ) : filteredInteractions.length === 0 ? (
              <View className="flex flex-col items-center justify-center py-16">
                <Users size={48} color="#d97706" />
                <Text className="block text-gray-400 text-base mt-4 text-center">
                  {searchKeyword || filterCharacter ? (
                    <>没有找到相关互动{'\n'}换个角色或关键词试试</>
                  ) : (
                    <>还没有角色互动{'\n'}AI 会根据角色性格随机生成互动</>
                  )}
                </Text>
                {!searchKeyword && !filterCharacter && (
                  <Button
                    className="mt-4 bg-amber-500 text-white"
                    onClick={handleGenerateInteraction}
                    disabled={generating}
                  >
                    <Text>{generating ? '生成中...' : '生成一段互动'}</Text>
                  </Button>
                )}
              </View>
            ) : (
              <View className="flex flex-col gap-4 mt-4">
                {filteredInteractions.map((item) => (
                  <View key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
                    {/* Characters */}
                    <View className="flex items-center gap-2 mb-3 flex-wrap">
                      <View className="flex items-center gap-1">
                        <Text className="block text-sm font-bold text-amber-900">{item.character_a_name}</Text>
                        {item.novel_a_name && (
                          <Text className="block text-xs text-amber-500">· {item.novel_a_name}</Text>
                        )}
                      </View>
                      <Text className="block text-xs text-amber-400">✦</Text>
                      <View className="flex items-center gap-1">
                        <Text className="block text-sm font-bold text-amber-900">{item.character_b_name}</Text>
                        {item.novel_b_name && (
                          <Text className="block text-xs text-amber-500">· {item.novel_b_name}</Text>
                        )}
                      </View>
                    </View>
                    {/* Content */}
                    <Text className="block text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </Text>
                    <View className="flex items-center justify-between mt-3">
                      <Text className="block text-xs text-amber-400">
                        {formatTime(item.created_at)}
                      </Text>
                      <View
                        className="px-2 py-1 rounded"
                        onClick={() => handleDeleteInteraction(item.id)}
                      >
                        <Trash2 size={14} color="#d97706" />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
          onClick={() => {
            if (activeTab === 'wall') {
              handleWrite()
            } else {
              handleGenerateInteraction()
            }
          }}
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
              <View className="relative">
                <Textarea
                  ref={textareaInstRef}
                  className="w-full bg-transparent border-none resize-none overflow-y-hidden px-4 py-3 pr-5"
                  placeholder="写下你的愿望、随笔、笑话... 什么都可以~"
                  value={content}
                  onInput={(e) => setContent(e.detail.value)}
                  style={{ height: '120px', boxSizing: 'border-box' }}
                />
                {scrollbar.show && (
                  <View
                    className="absolute right-1 rounded-full"
                    style={{ top: 4 + scrollbar.top, height: scrollbar.height, width: 3, backgroundColor: 'rgba(0,0,0,0.25)' }}
                  />
                )}
              </View>
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
