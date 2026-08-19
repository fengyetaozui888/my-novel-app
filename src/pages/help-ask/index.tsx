import { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { Network } from '@/network'
import { Send } from 'lucide-react-taro'
import { Input } from '@/components/ui/input'

interface Msg {
  role: 'user' | 'agent'
  content: string
}

export default function HelpAskPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'agent',
      content: '你好呀~我是人设工坊的答疑 Agent 🌸\n关于小程序的任何使用问题都可以问我，比如"怎么让角色记住我"、"亲密度有什么用"等。我会尽力为你解答！',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [scrollId, setScrollId] = useState('msg-0')
  const inputRef = useRef('')

  useEffect(() => {
    if (messages.length > 0) {
      setScrollId(`msg-${messages.length - 1}`)
    }
  }, [messages])

  const send = async () => {
    const text = input.trim() || inputRef.current.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    inputRef.current = ''
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      const res = await Network.request({
        url: '/api/help-ask/ask',
        method: 'POST',
        data: { question: text, history },
      })
      console.log('[help-ask] response:', res.data)
      const answer = (res.data as { data?: { answer?: string } })?.data?.answer
      setMessages((prev) => [...prev, { role: 'agent', content: answer || '抱歉，我暂时没有理解你的问题，换个说法试试？' }])
    } catch (e) {
      console.error('[help-ask] error:', e)
      setMessages((prev) => [...prev, { role: 'agent', content: '网络开小差了，请稍后再试~' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <View className="flex flex-col h-screen bg-gradient-to-b from-pink-50 via-orange-50 to-amber-50">
      <ScrollView
        className="flex-1"
        scrollY
        scrollIntoView={scrollId}
        scrollWithAnimation
        style={{ height: 'calc(100vh - 110px)' }}
      >
        <View className="px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <View key={i} id={`msg-${i}`} className={`flex flex-row mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'agent' && (
                <View className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center shrink-0 mr-2">
                  <Text className="text-white text-lg font-semibold">A</Text>
                </View>
              )}
              <View
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-pink-500 rounded-br-md' : 'bg-white rounded-tl-md shadow-sm'}`}
              >
                <Text className={`block text-sm leading-6 whitespace-pre-wrap ${m.role === 'user' ? 'text-white' : 'text-gray-700'}`}>
                  {m.content}
                </Text>
              </View>
            </View>
          ))}
          {sending && (
            <View className="flex flex-row justify-start">
              <View className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center shrink-0 mr-2">
                <Text className="text-white text-lg font-semibold">A</Text>
              </View>
              <View className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <View className="flex flex-row space-x-1">
                  <View className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
                  <View className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <View className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </View>
              </View>
            </View>
          )}
          <View className="h-4" />
        </View>
      </ScrollView>

      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          backgroundColor: 'rgba(255, 250, 245, 0.95)',
          borderTop: '1px solid #fde8d8',
        }}
      >
        <View className="flex-1 bg-white rounded-full px-4 py-2">
          <Input
            style={{ width: '100%', fontSize: '14px' }}
            placeholder="输入你的问题..."
            value={input}
            onInput={(e) => {
              setInput(e.detail.value)
              inputRef.current = e.detail.value
            }}
            confirmType="send"
            onConfirm={send}
          />
        </View>
        <View
          className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${sending ? 'bg-gray-300' : 'bg-pink-500'}`}
          onClick={send}
        >
          <Send size={18} color="#fff" />
        </View>
      </View>
    </View>
  )
}
