import { useState, useRef, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, User, Bot, Loader } from 'lucide-react-taro'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const ChatPage = () => {
  const router = useRouter()
  const characterId = router.params.characterId || ''
  const characterName = decodeURIComponent(router.params.name || '')

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollId = useRef('')

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

  return (
    <View className="flex flex-col h-screen bg-stone-50">
      {/* Chat Header */}
      <View
        className="px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' }}
      >
        <View className="flex items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center">
            <Bot size={16} color="#ffffff" />
          </View>
          <View>
            <Text className="block text-base font-bold text-gray-900">{characterName}</Text>
            <Text className="block text-xs text-gray-500">人设模拟对话</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        scrollY
        className="flex-1 px-4 py-4"
        scrollIntoView={scrollId.current}
        scrollWithAnimation
      >
        {messages.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
              <Bot size={32} color="#e8587a" />
            </View>
            <Text className="block text-gray-500 text-center text-sm">
              开始与「{characterName}」对话{'\n'}输入消息来模拟互动吧
            </Text>
          </View>
        ) : (
          <View className="flex flex-col gap-4">
            {messages.map((msg) => (
              <View
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <View
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-gray-200' : 'bg-rose-100'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User size={16} color="#666" />
                  ) : (
                    <Bot size={16} color="#e8587a" />
                  )}
                </View>
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
            placeholder="输入消息..."
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
    </View>
  )
}

export default ChatPage
