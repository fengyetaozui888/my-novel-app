import { useState, useRef, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Send,
  User,
  Bot,
  Loader,
  Ellipsis,
  Circle,
  Fish,
  Moon,
  Coffee,
  Shield,
  Trophy,
  Flame,
  Pin,
  Image as ImageIcon,
  Search,
  Sparkles,
  Users,
  Check,
  Heart,
} from 'lucide-react-taro'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface StatusOption {
  id: string
  label: string
  icon: any
  color: string
  bgColor: string
}

interface SpeakerCharacter {
  id: string
  name: string
  avatar_url: string | null
  relation_type: string
}

const STATUS_OPTIONS: StatusOption[] = [
  { id: 'online', label: '在线状态', icon: Circle, color: '#22c55e', bgColor: 'bg-green-100' },
  { id: 'fishing', label: '摸鱼状态', icon: Fish, color: '#06b6d4', bgColor: 'bg-cyan-100' },
  { id: 'sleeping', label: '睡觉状态', icon: Moon, color: '#8b5cf6', bgColor: 'bg-violet-100' },
  { id: 'busy', label: '忙碌状态', icon: Coffee, color: '#f59e0b', bgColor: 'bg-amber-100' },
  { id: 'dnd', label: '勿扰状态', icon: Shield, color: '#ef4444', bgColor: 'bg-red-100' },
  { id: 'mvp', label: '我是MVP', icon: Trophy, color: '#eab308', bgColor: 'bg-yellow-100' },
  { id: 'meditating', label: '打坐状态', icon: Sparkles, color: '#a855f7', bgColor: 'bg-purple-100' },
  { id: 'flaming', label: '燃烧状态', icon: Flame, color: '#f97316', bgColor: 'bg-orange-100' },
]

const ChatPage = () => {
  const router = useRouter()
  const characterId = router.params.characterId || ''
  const characterName = decodeURIComponent(router.params.name || '')
  const characterAvatar = decodeURIComponent(router.params.avatar || '')

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<StatusOption>(STATUS_OPTIONS[0])
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showSpeakerPicker, setShowSpeakerPicker] = useState(false)
  const [showImageGenDialog, setShowImageGenDialog] = useState(false)
  const [imageGenDescription, setImageGenDescription] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerCharacter | null>(null)
  const [availableSpeakers, setAvailableSpeakers] = useState<SpeakerCharacter[]>([])
  const scrollId = useRef('')

  // Fetch user profile for avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await Network.request({ url: '/api/users/profile' })
        const data = res.data?.data || res.data
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url)
        }
      } catch (err) {
        console.error('fetch user profile error:', err)
      }
    }
    fetchUserProfile()
  }, [])

  // Fetch available speakers from relationships
  useEffect(() => {
    const fetchSpeakers = async () => {
      if (!characterId) return
      try {
        const res = await Network.request({
          url: '/api/relationships',
          method: 'GET',
          data: { characterId },
        })
        const data = res.data?.data || res.data
        if (Array.isArray(data)) {
          // Get unique characters from relationships
          const speakerMap = new Map<string, SpeakerCharacter>()
          data.forEach((rel: any) => {
            if (rel.from_character_id !== characterId && rel.from_character) {
              speakerMap.set(rel.from_character_id, {
                id: rel.from_character_id,
                name: rel.from_character.name,
                avatar_url: rel.from_character.avatar_url,
                relation_type: rel.relation_type,
              })
            }
            if (rel.to_character_id !== characterId && rel.to_character) {
              speakerMap.set(rel.to_character_id, {
                id: rel.to_character_id,
                name: rel.to_character.name,
                avatar_url: rel.to_character.avatar_url,
                relation_type: rel.relation_type,
              })
            }
          })
          setAvailableSpeakers(Array.from(speakerMap.values()))
        }
      } catch (err) {
        console.error('fetch speakers error:', err)
      }
    }
    fetchSpeakers()
  }, [characterId])

  const scrollToBottom = useCallback(() => {
    const id = `msg-${Date.now()}`
    scrollId.current = id
    Taro.createSelectorQuery()
      .select(`#${id}`)
      .boundingClientRect()
      .exec()
  }, [])

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsStreaming(true)

    const assistantMsgId = `assistant-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '' },
    ])

    try {
      const res = await Network.request({
        url: '/api/chat/simulate',
        method: 'POST',
        data: {
          characterId,
          speakerId: selectedSpeaker?.id || undefined,
          message: userMsg.content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      })
      console.log('chat response:', res.data)
      const reply = res.data?.data?.content || res.data?.content || '抱歉，我无法回答。'

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, content: reply } : m))
      )
    } catch (err) {
      console.error('chat error:', err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: '网络异常，请稍后重试。' } : m
        )
      )
    } finally {
      setIsStreaming(false)
      setTimeout(scrollToBottom, 100)
    }
  }

  const handleTogglePin = () => {
    setIsPinned(!isPinned)
    setShowMoreMenu(false)
    Taro.showToast({
      title: isPinned ? '已取消置顶' : '已置顶聊天',
      icon: 'none',
    })
  }

  const handleSetBackground = () => {
    setShowMoreMenu(false)
    Taro.showToast({ title: '聊天背景设置（开发中）', icon: 'none' })
  }

  const handleSearchHistory = () => {
    setShowMoreMenu(false)
    Taro.showToast({ title: '查找聊天记录（开发中）', icon: 'none' })
  }

  const handleOpenSpeakerPicker = () => {
    setShowMoreMenu(false)
    setShowSpeakerPicker(true)
  }

  const handleGenerateCharacterImage = async () => {
    if (!imageGenDescription.trim()) {
      Taro.showToast({ title: '请描述你想要生成的人设图', icon: 'none' })
      return
    }
    setIsGeneratingImage(true)
    try {
      const res = await Network.request({
        url: '/api/portrait/generate-image',
        method: 'POST',
        data: {
          characterId,
          description: imageGenDescription,
        },
      })
      const data = res.data?.data || res.data
      if (data?.image_url) {
        Taro.showToast({ title: '人设图生成成功', icon: 'success' })
        setShowImageGenDialog(false)
        setImageGenDescription('')
      }
    } catch (err: any) {
      console.error('人设图生成失败:', err)
      Taro.showToast({
        title: err?.errMsg || '人设图生成失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSelectSpeaker = (speaker: SpeakerCharacter | null) => {
    setSelectedSpeaker(speaker)
    setShowSpeakerPicker(false)
    if (speaker) {
      Taro.showToast({
        title: `已切换为「${speaker.name}」身份`,
        icon: 'none',
      })
    } else {
      Taro.showToast({
        title: '已切换为你自己的身份',
        icon: 'none',
      })
    }
  }

  const StatusIcon = currentStatus.icon

  // Get current user display info (avatar based on selected speaker)
  const currentUserAvatar = selectedSpeaker?.avatar_url || userAvatar

  return (
    <View className="flex flex-col h-screen bg-stone-50">
      {/* Chat Header */}
      <View
        className="px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' }}
      >
        <View className="flex items-center justify-between">
          <View className="flex items-center gap-2">
            {/* Character Avatar */}
            {characterAvatar ? (
              <Image
                src={characterAvatar}
                className="w-9 h-9 rounded-full"
                mode="aspectFill"
              />
            ) : (
              <View className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center">
                <Bot size={18} color="#ffffff" />
              </View>
            )}
            <View>
              <Text className="block text-base font-bold text-gray-900">{characterName}</Text>
              {/* Status Bar */}
              <View
                className="flex items-center gap-1 mt-1"
                onClick={() => setShowStatusPicker(true)}
              >
                <StatusIcon size={12} color={currentStatus.color} />
                <Text className="text-xs" style={{ color: currentStatus.color }}>
                  {currentStatus.label}
                </Text>
              </View>
            </View>
          </View>

          {/* More Menu Button */}
          <View
            className="w-8 h-8 rounded-full flex items-center justify-center"
            onClick={() => setShowMoreMenu(true)}
          >
            <Ellipsis size={20} color="#666" />
          </View>
        </View>

        {/* Speaker Indicator */}
        {selectedSpeaker && (
          <View className="flex items-center gap-2 mt-2 px-3 py-2 bg-white bg-opacity-60 rounded-full">
            {selectedSpeaker.avatar_url ? (
              <Image
                src={selectedSpeaker.avatar_url}
                className="w-5 h-5 rounded-full"
                mode="aspectFill"
              />
            ) : (
              <View className="w-5 h-5 rounded-full bg-pink-200 flex items-center justify-center">
                <User size={10} color="#ec4899" />
              </View>
            )}
            <Text className="text-xs text-gray-600">
              以「{selectedSpeaker.name}」身份对话
            </Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        scrollY
        className="flex-1 px-4 py-4"
        style={{ marginBottom: '60px' }}
        scrollIntoView={scrollId.current}
        scrollWithAnimation
      >
        {messages.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
              {characterAvatar ? (
                <Image
                  src={characterAvatar}
                  className="w-16 h-16 rounded-full"
                  mode="aspectFill"
                />
              ) : (
                <Bot size={32} color="#e8587a" />
              )}
            </View>
            <Text className="block text-gray-500 text-center text-sm">
              开始与「{characterName}」对话
              {selectedSpeaker ? `\n当前以「${selectedSpeaker.name}」身份` : '\n输入消息来模拟互动吧'}
            </Text>
          </View>
        ) : (
          <View className="flex flex-col gap-4">
            {messages.map((msg) => (
              <View
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {msg.role === 'user' ? (
                  currentUserAvatar ? (
                    <Image
                      src={currentUserAvatar}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      mode="aspectFill"
                    />
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User size={16} color="#666" />
                    </View>
                  )
                ) : characterAvatar ? (
                  <Image
                    src={characterAvatar}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    mode="aspectFill"
                  />
                ) : (
                  <View className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} color="#e8587a" />
                  </View>
                )}
                <View
                  className={`max-w-3/4 rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-rose-500 text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}
                >
                  <Text
                    className={`block text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {msg.content || (isStreaming ? '思考中...' : '')}
                  </Text>
                </View>
              </View>
            ))}
            <View id={`msg-${Date.now()}`} />
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #f0e8e4',
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#f8f5f2', borderRadius: '20px', padding: '8px 16px' }}>
          <Input
            style={{ width: '100%', fontSize: '14px', backgroundColor: 'transparent' }}
            placeholder={selectedSpeaker ? `以${selectedSpeaker.name}的身份说话...` : '输入消息...'}
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            onConfirm={handleSend}
            confirmType="send"
            disabled={isStreaming}
          />
        </View>
        <Button
          size="sm"
          className="bg-rose-500 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center"
          onClick={handleSend}
          disabled={isStreaming || !inputText.trim()}
        >
          {isStreaming ? (
            <Loader size={18} color="#ffffff" />
          ) : (
            <Send size={18} color="#ffffff" />
          )}
        </Button>
      </View>

      {/* Status Picker Dialog */}
      {showStatusPicker && (
        <View
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowStatusPicker(false)}
        >
          <View
            className="w-full bg-white rounded-t-3xl p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="block text-lg font-bold text-gray-900 mb-4 text-center">
              选择状态
            </Text>
            <View className="grid grid-cols-4 gap-4">
              {STATUS_OPTIONS.map((status) => {
                const Icon = status.icon
                const isSelected = currentStatus.id === status.id
                return (
                  <View
                    key={status.id}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                      isSelected ? status.bgColor : 'bg-gray-50'
                    }`}
                    onClick={() => {
                      setCurrentStatus(status)
                      setShowStatusPicker(false)
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${status.color}20` }}
                    >
                      <Icon size={20} color={status.color} />
                    </View>
                    <Text className="text-xs text-gray-700 text-center">{status.label}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        </View>
      )}

      {/* More Menu Dialog */}
      {showMoreMenu && (
        <View
          className="fixed inset-0 z-50"
          onClick={() => setShowMoreMenu(false)}
        >
          <View
            className="absolute top-14 right-4 bg-white rounded-xl shadow-xl p-2 w-44"
            onClick={(e) => e.stopPropagation()}
          >
            <View
              className="flex items-center gap-3 p-3 rounded-lg active:bg-gray-50"
              onClick={handleOpenSpeakerPicker}
            >
              <Users size={16} color="#ec4899" />
              <Text className="text-sm text-gray-700">人设选择</Text>
            </View>
            <View
              className="flex items-center gap-3 p-3 rounded-lg active:bg-gray-50"
              onClick={() => {
                setShowMoreMenu(false)
                Taro.navigateTo({
                  url: `/pages/interact/index?characterId=${characterId}&name=${encodeURIComponent(characterName)}`,
                })
              }}
            >
              <Sparkles size={16} color="#ec4899" />
              <Text className="text-sm text-gray-700">3D互动</Text>
            </View>
            <View
              className="flex items-center gap-3 p-3 rounded-lg active:bg-gray-50"
              onClick={() => {
                setShowMoreMenu(false)
                setShowImageGenDialog(true)
              }}
            >
              <ImageIcon size={16} color="#ec4899" />
              <Text className="text-sm text-gray-700">人设图生成</Text>
            </View>
            <View
              className="flex items-center gap-3 p-3 rounded-lg active:bg-gray-50"
              onClick={() => {
                setShowMoreMenu(false)
                Taro.navigateTo({
                  url: `/pages/moments/index?characterId=${characterId}`,
                })
              }}
            >
              <Heart size={16} color="#ec4899" />
              <Text className="text-sm text-gray-700">查看朋友圈</Text>
            </View>
            <View
              className="flex items-center gap-3 p-3 rounded-lg active:bg-gray-50"
              onClick={handleTogglePin}
            >
              <Pin size={16} color={isPinned ? '#ec4899' : '#666'} />
              <Text className="text-sm text-gray-700">{isPinned ? '取消置顶' : '置顶聊天'}</Text>
            </View>
            <View
              className="flex items-center gap-3 p-3 rounded-lg active:bg-gray-50"
              onClick={handleSetBackground}
            >
              <ImageIcon size={16} color="#666" />
              <Text className="text-sm text-gray-700">聊天背景</Text>
            </View>
            <View
              className="flex items-center gap-3 p-3 rounded-lg active:bg-gray-50"
              onClick={handleSearchHistory}
            >
              <Search size={16} color="#666" />
              <Text className="text-sm text-gray-700">查找记录</Text>
            </View>
          </View>
        </View>
      )}

      {/* Image Generation Dialog */}
      {showImageGenDialog && (
        <View
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => !isGeneratingImage && setShowImageGenDialog(false)}
        >
          <View
            className="w-80 bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="bg-gradient-to-r from-pink-400 to-rose-400 px-5 py-4">
              <Text className="block text-lg font-bold text-white text-center">
                人设图生成
              </Text>
              <Text className="block text-xs text-white text-center mt-1 opacity-90">
                描述角色外貌，AI 将为你生成专属人设图（消耗150积分）
              </Text>
            </View>
            {/* Body */}
            <View className="p-5">
              <View className="bg-gray-50 rounded-xl p-3 mb-4">
                <Text className="block text-xs text-gray-500 mb-2">
                  描述角色外貌、穿着、气质等
                </Text>
                <View className="bg-white rounded-lg p-2">
                  <Textarea
                    className="w-full bg-transparent text-sm text-gray-800 resize-none outline-none border-none"
                    style={{ minHeight: '100px' }}
                    placeholder="例如：一位身穿白色仙侠长袍的少女，黑色长发飘逸，眉目清秀，气质温婉..."
                    value={imageGenDescription}
                    onInput={(e) => setImageGenDescription(e.detail.value)}
                  />
                </View>
              </View>
              <View className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={isGeneratingImage}
                  onClick={() => {
                    setShowImageGenDialog(false)
                    setImageGenDescription('')
                  }}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-pink-400 to-rose-400 text-white"
                  disabled={isGeneratingImage}
                  onClick={handleGenerateCharacterImage}
                >
                  {isGeneratingImage ? '生成中...' : '生成'}
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Speaker Picker Dialog */}
      {showSpeakerPicker && (
        <View
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowSpeakerPicker(false)}
        >
          <View
            className="w-full bg-white rounded-t-3xl pb-6"
            style={{ maxHeight: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <View className="p-4 border-b border-gray-100">
              <Text className="block text-lg font-bold text-gray-900 text-center">
                选择对话身份
              </Text>
              <Text className="block text-xs text-gray-500 text-center mt-1">
                选择后，{characterName}会以对应身份与你对话
              </Text>
            </View>

            <ScrollView scrollY className="flex-1 px-4 py-3" style={{ maxHeight: '50vh' }}>
              {/* Option: Self (no speaker) */}
              <View
                className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${
                  !selectedSpeaker ? 'bg-pink-50 border-2 border-pink-300' : 'bg-gray-50'
                }`}
                onClick={() => handleSelectSpeaker(null)}
              >
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    className="w-10 h-10 rounded-full"
                    mode="aspectFill"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={18} color="#666" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="block text-sm font-medium text-gray-900">我自己</Text>
                  <Text className="block text-xs text-gray-500">以你的真实身份对话</Text>
                </View>
                {!selectedSpeaker && <Check size={18} color="#ec4899" />}
              </View>

              {/* Available Speakers from Relationships */}
              {availableSpeakers.length === 0 ? (
                <View className="py-8 text-center">
                  <Users size={32} color="#d1d5db" />
                  <Text className="block text-sm text-gray-400 mt-2">
                    暂无可选人设
                  </Text>
                  <Text className="block text-xs text-gray-400 mt-1">
                    请先在关系图谱中添加角色关系
                  </Text>
                </View>
              ) : (
                availableSpeakers.map((speaker) => {
                  const isSelected = selectedSpeaker?.id === speaker.id
                  return (
                    <View
                      key={speaker.id}
                      className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${
                        isSelected ? 'bg-pink-50 border-2 border-pink-300' : 'bg-gray-50'
                      }`}
                      onClick={() => handleSelectSpeaker(speaker)}
                    >
                      {speaker.avatar_url ? (
                        <Image
                          src={speaker.avatar_url}
                          className="w-10 h-10 rounded-full"
                          mode="aspectFill"
                        />
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                          <Text className="text-sm font-medium text-pink-600">
                            {speaker.name.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="block text-sm font-medium text-gray-900">
                          {speaker.name}
                        </Text>
                        <Text className="block text-xs text-gray-500">
                          {speaker.relation_type}
                        </Text>
                      </View>
                      {isSelected && <Check size={18} color="#ec4899" />}
                    </View>
                  )
                })
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  )
}

export default ChatPage
