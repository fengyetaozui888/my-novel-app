import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, User, AtSign, Send, Loader, Users } from 'lucide-react-taro'

interface Member {
  id: string
  name: string
  avatar_url: string | null
}

interface GroupMessage {
  id: string
  group_id: string
  role: 'user' | 'character'
  character_id: string | null
  sender_name: string
  content: string
  created_at: string
}

const GroupChatPage = () => {
  const router = useRouter()
  const groupId = router.params.id || ''

  const [groupName, setGroupName] = useState('群聊')
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const scrollRef = useRef<string>('')

  const scrollToBottom = () => {
    scrollRef.current = `msg-bottom-${Date.now()}`
  }

  const fetchDetail = useCallback(async () => {
    if (!groupId) return
    try {
      const res = await Network.request({
        url: `/api/group-chats/${groupId}`,
      })
      console.log('fetchGroupDetail response:', res.data)
      const data = res.data?.data
      if (data) {
        setGroupName(data.name || '群聊')
        setMembers(Array.isArray(data.members) ? data.members : [])
      }
    } catch (err) {
      console.error('fetchGroupDetail error:', err)
      Taro.showToast({ title: '加载群聊失败', icon: 'none' })
    }
  }, [groupId])

  const fetchMessages = useCallback(async () => {
    if (!groupId) return
    try {
      const res = await Network.request({
        url: `/api/group-chats/${groupId}/messages`,
      })
      console.log('fetchMessages response:', res.data)
      const data = res.data?.data || res.data || []
      const list = Array.isArray(data) ? data : []
      setMessages(list)
      if (list.length > 0) scrollToBottom()
    } catch (err) {
      console.error('fetchMessages error:', err)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    fetchDetail()
    fetchMessages()
  }, [fetchDetail, fetchMessages])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || sending) return
    setSending(true)
    setInputText('')
    // Optimistic append user message
    const optimistic: GroupMessage = {
      id: `temp_${Date.now()}`,
      group_id: groupId,
      role: 'user',
      character_id: null,
      sender_name: '我',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    scrollToBottom()
    try {
      const res = await Network.request({
        url: `/api/group-chats/${groupId}/simulate`,
        method: 'POST',
        data: { message: text },
      })
      console.log('simulate response:', res.data)
      const data = res.data?.data
      if (data) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => !m.id.startsWith('temp_'))
          const newUserMsg = data.user_message
          const charMsgs = data.character_messages || []
          return [...withoutTemp, newUserMsg, ...charMsgs].filter(Boolean)
        })
        scrollToBottom()
      } else {
        Taro.showToast({ title: '回复失败', icon: 'none' })
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp_')))
        setInputText(text)
      }
    } catch (err) {
      console.error('simulate error:', err)
      Taro.showToast({ title: '网络错误', icon: 'none' })
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp_')))
      setInputText(text)
    } finally {
      setSending(false)
    }
  }

  const insertMention = (name: string) => {
    setInputText((prev) => `${prev}@${name} `)
    setShowMentionPicker(false)
  }

  const memberAvatar = (msg: GroupMessage) => {
    if (msg.role === 'user') return null
    const m = members.find((mem) => mem.id === msg.character_id)
    return m || null
  }

  // Highlight @mentions in message content
  const renderContent = (content: string, isUser: boolean = false) => {
    const parts = content.split(/(@[\u4e00-\u9fa5\w]+)/g)
    return parts.map((part, idx) =>
      part.startsWith('@') && part.length > 1 ? (
        <Text key={idx} className={isUser ? 'text-white font-medium' : 'text-rose-500 font-medium'}>
          {part}
        </Text>
      ) : (
        <Text key={idx}>{part}</Text>
      ),
    )
  }

  const memberNames = members.map((m) => m.name).join('、')

  return (
    <View className="h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-3 border-b border-gray-100">
        <View className="flex items-center justify-between">
          <View
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            onClick={() => Taro.navigateBack()}
          >
            <ChevronLeft size={20} color="#57534e" />
          </View>
          <View className="flex-1 flex flex-col items-center mx-2">
            <Text className="block text-base font-semibold text-gray-900 truncate">
              {groupName}
            </Text>
            <Text className="block text-xs text-gray-400 truncate max-w-60">
              {members.length > 0 ? memberNames : '加载中...'}
            </Text>
          </View>
          <View className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
            <Users size={18} color="#e8587a" />
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        scrollY
        className="flex-1"
        scrollIntoView={scrollRef.current}
        scrollWithAnimation
        style={{ height: '0' }}
      >
        <View className="px-4 py-4 pb-6">
          {loading ? (
            <View className="py-16 flex items-center justify-center">
              <Text className="text-sm text-gray-400">加载中...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View className="py-16 flex flex-col items-center gap-2 px-8">
              <View className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-2">
                <Users size={26} color="#e8587a" />
              </View>
              <Text className="text-sm text-gray-500 text-center leading-relaxed">
                群聊已创建{'\n'}发送一句话开启群聊，角色们会根据人设决定是否加入
              </Text>
              <Text className="text-xs text-gray-400 mt-2 text-center">
                可以用 @ 提及某位角色，被@的角色更可能回应
              </Text>
            </View>
          ) : (
            <View className="flex flex-col gap-4">
              {messages.map((msg) => {
                const member = memberAvatar(msg)
                const isUser = msg.role === 'user'
                return (
                  <View
                    key={msg.id}
                    id={msg.id}
                    className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <View className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {isUser ? (
                        <View className="w-full h-full bg-rose-400 flex items-center justify-center">
                          <Text className="text-xs text-white font-medium">我</Text>
                        </View>
                      ) : member?.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          className="w-full h-full"
                          mode="aspectFill"
                          style={{ objectPosition: 'top center' }}
                        />
                      ) : (
                        <View className="w-full h-full flex items-center justify-center bg-gray-100">
                          <User size={16} color="#9ca3af" />
                        </View>
                      )}
                    </View>
                    {/* Name + Bubble */}
                    <View className={`flex flex-col max-w-3/4 ${isUser ? 'items-end' : 'items-start'}`}>
                      {!isUser && (
                        <Text className="block text-xs text-gray-400 mb-1 ml-1">
                          {msg.sender_name}
                        </Text>
                      )}
                      <View
                        className={`rounded-2xl px-4 py-3 ${
                          isUser
                            ? 'bg-rose-500 text-white'
                            : 'bg-white text-gray-800 shadow-sm'
                        }`}
                      >
                        <Text
                          className={`block text-sm leading-relaxed whitespace-pre-wrap ${
                            isUser ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {renderContent(msg.content, isUser)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
              {sending && (
                <View className="flex flex-row gap-2">
                  <View className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Loader size={16} color="#e8587a" className="animate-spin" />
                  </View>
                  <View className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <Text className="block text-sm text-gray-400">角色们正在围观消息...</Text>
                  </View>
                </View>
              )}
              <View id={`msg-bottom-${Date.now()}`} />
            </View>
          )}
        </View>
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
          padding: '12px 16px 20px',
          backgroundColor: '#fff',
          borderTop: '1px solid #f0e8e4',
        }}
      >
        <Button
          size="sm"
          className="bg-stone-100 text-stone-600 rounded-full w-10 h-10 p-0 flex items-center justify-center"
          onClick={() => setShowMentionPicker(true)}
          disabled={sending}
        >
          <AtSign size={18} color="#78716c" />
        </Button>
        <View
          style={{
            flex: 1,
            backgroundColor: '#f8f5f2',
            borderRadius: '20px',
            padding: '8px 16px',
          }}
        >
          <Input
            style={{ width: '100%', fontSize: '14px', backgroundColor: 'transparent' }}
            placeholder="发消息开启群聊..."
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            onConfirm={handleSend}
            confirmType="send"
            disabled={sending}
          />
        </View>
        <Button
          size="sm"
          className="bg-rose-500 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center"
          onClick={handleSend}
          disabled={sending || !inputText.trim()}
        >
          {sending ? (
            <Loader size={18} color="#ffffff" className="animate-spin" />
          ) : (
            <Send size={18} color="#ffffff" />
          )}
        </Button>
      </View>

      {/* Mention Picker */}
      {showMentionPicker && (
        <View
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowMentionPicker(false)}
        >
          <View
            className="w-full bg-white rounded-t-3xl pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <View className="p-4 border-b border-gray-100">
              <Text className="block text-base font-bold text-gray-900 text-center">
                提及(@)谁？
              </Text>
              <Text className="block text-xs text-gray-500 text-center mt-1">
                被@的角色会更认真地回应你
              </Text>
            </View>
            <ScrollView scrollY style={{ maxHeight: '40vh' }}>
              <View className="px-4 py-2">
                <View
                  className="flex items-center gap-3 p-3 rounded-xl active:bg-gray-50"
                  onClick={() => insertMention('所有人')}
                >
                  <View className="w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center">
                    <Text className="text-xs text-white font-medium">我</Text>
                  </View>
                  <Text className="text-sm text-gray-800">@所有人（角色们按意愿回应）</Text>
                </View>
                {members.map((m) => (
                  <View
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl active:bg-gray-50"
                    onClick={() => insertMention(m.name)}
                  >
                    <View className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                      {m.avatar_url ? (
                        <Image
                          src={m.avatar_url}
                          className="w-full h-full"
                          mode="aspectFill"
                          style={{ objectPosition: 'top center' }}
                        />
                      ) : (
                        <View className="w-full h-full flex items-center justify-center">
                          <User size={16} color="#9ca3af" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="block text-sm text-gray-800">@{m.name}</Text>
                    </View>
                    <AtSign size={16} color="#d6d3d1" />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  )
}

export default GroupChatPage
