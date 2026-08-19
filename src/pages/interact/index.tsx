import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, Video } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronLeft,
  Send,
  Loader,
  Sparkles,
  Gem,
  Wand,
} from 'lucide-react-taro'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const InteractPage = () => {
  const router = useRouter()
  const characterId = router.params.characterId || ''
  const characterName = decodeURIComponent(router.params.name || '')

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [portraitVideo, setPortraitVideo] = useState<string | null>(null)
  const [portraitPoster, setPortraitPoster] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [isDeveloper, setIsDeveloper] = useState(false)
  const [genStatus, setGenStatus] = useState('')
  const scrollId = useRef('')

  // Load existing portrait if any
  useEffect(() => {
    const loadPortrait = async () => {
      if (!characterId) return
      try {
        const res = await Network.request({
          url: `/api/portrait/${characterId}`,
        })
        console.log('portrait load res:', res.data)
        const data = res.data?.data || res.data
        if (data?.video_url) {
          setPortraitVideo(data.video_url)
          if (data.poster_url) setPortraitPoster(data.poster_url)
        }
      } catch (err) {
        console.error('load portrait error:', err)
      }
    }
    loadPortrait()
  }, [characterId])

  // Load user credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await Network.request({ url: '/api/users/profile' })
        const data = res.data?.data || res.data
        setCredits(typeof data?.credits === 'number' ? data.credits : null)
        setIsDeveloper(!!data?.is_developer)
      } catch (err) {
        console.error('fetch credits error:', err)
      }
    }
    fetchCredits()
  }, [])

  const handleGeneratePortrait = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setGenStatus('正在理解角色设定...')
    try {
      const res = await Network.request({
        url: '/api/portrait/generate',
        method: 'POST',
        data: { characterId },
      })
      console.log('portrait generate res:', res.data)
      const data = res.data?.data || res.data
      if (data?.video_url) {
        setPortraitVideo(data.video_url)
        if (data.poster_url) setPortraitPoster(data.poster_url)
        if (typeof data.credits_remaining === 'number') {
          setCredits(data.credits_remaining)
        }
      }
    } catch (err: any) {
      console.error('generate portrait error:', err)
      Taro.showToast({ title: err?.message || '生成失败，请稍后再试', icon: 'none', duration: 2500 })
    } finally {
      setIsGenerating(false)
      setGenStatus('')
    }
  }, [characterId, isGenerating])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isStreaming) return
    setInputText('')
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
    const assistantPlaceholder: Message = { id: `a-${Date.now()}`, role: 'assistant', content: '' }
    setMessages((prev) => [...prev, userMsg, assistantPlaceholder])
    setIsStreaming(true)
    scrollId.current = assistantPlaceholder.id

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
      const res = await Network.request({
        url: '/api/portrait/interact',
        method: 'POST',
        data: { characterId, message: text, history },
      })
      console.log('portrait interact res:', res.data)
      const data = res.data?.data || res.data
      const reply = data?.reply || ''
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantPlaceholder.id ? { ...m, content: reply } : m))
      )
      if (typeof data?.credits_remaining === 'number') {
        setCredits(data.credits_remaining)
      }
    } catch (err: any) {
      console.error('interact error:', err)
      const errMsg = err?.message || '回复失败，请稍后再试'
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantPlaceholder.id ? { ...m, content: errMsg } : m))
      )
    } finally {
      setIsStreaming(false)
    }
  }, [inputText, isStreaming, messages, characterId])

  const handleBack = () => {
    Taro.navigateBack({ delta: 1 })
  }

  return (
    <View className="relative w-full h-screen bg-black overflow-hidden">
      {/* Portrait video background */}
      {portraitVideo ? (
        <Video
          src={portraitVideo}
          poster={portraitPoster || undefined}
          className="absolute inset-0 w-full h-full"
          autoplay
          loop
          muted
          objectFit="cover"
          controls={false}
          showMuteBtn={false}
          enableProgressGesture={false}
          showCenterPlayBtn={false}
        />
      ) : (
        <View className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-pink-100 to-pink-50">
          <View className="w-24 h-24 rounded-full bg-pink-200 flex items-center justify-center mb-4">
            <Wand size={40} color="#ec4899" />
          </View>
          <Text className="block text-base text-pink-900 font-semibold mb-2">
            {isGenerating ? genStatus || '生成中...' : '还没有角色立绘'}
          </Text>
          <Text className="block text-xs text-pink-700 text-center px-8 leading-relaxed">
            {isGenerating
              ? '正在为角色打造 3D 立绘，请耐心等待'
              : '点击下方按钮，为角色生成专属 3D 立绘'}
          </Text>
        </View>
      )}

      {/* Top bar */}
      <View
        className="absolute top-0 left-0 right-0 flex flex-row items-center justify-between"
        style={{ paddingTop: '44px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '10px' }}
      >
        <View
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center"
        >
          <ChevronLeft size={20} color="#ffffff" />
        </View>
        <View className="flex flex-col items-center">
          <Text className="block text-base font-semibold text-white drop-shadow-md">
            {characterName || '3D互动'}
          </Text>
          <View className="flex flex-row items-center mt-1">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-1" />
            <Text className="block text-xs text-neutral-200">3D互动中</Text>
          </View>
        </View>
        <View className="flex flex-row items-center bg-neutral-800 rounded-full px-3 py-2">
          <Gem size={14} color="#fbbf24" />
          <Text className="block text-xs text-white ml-1">
            {isDeveloper ? '免费' : credits === null ? '--' : credits}
          </Text>
        </View>
      </View>

      {/* Generate button (only when no portrait) */}
      {!portraitVideo && !isGenerating && (
        <View
          onClick={handleGeneratePortrait}
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: '55%', zIndex: 100 }}
        >
          <View className="rounded-full bg-pink-500 shadow-lg px-6 py-3" style={{ boxShadow: '0 10px 15px -3px rgba(236, 72, 153, 0.5)' }}>
            <View className="flex flex-row items-center">
              <Sparkles size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white ml-2">
                {isDeveloper ? '生成3D立绘（开发者免费）' : '生成3D立绘（消耗100积分）'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Regenerate button while loading */}
      {isGenerating && (
        <View className="absolute left-0 right-0 flex flex-col items-center" style={{ top: '52%' }}>
          <View className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-3">
            <Loader size={24} color="#ec4899" className="animate-spin" />
          </View>
          <Text className="block text-xs text-pink-800">{genStatus || '生成中...'}</Text>
        </View>
      )}

      {/* Chat messages overlay */}
      <ScrollView
        scrollY
        className="absolute left-0 right-0"
        style={{ top: '120px', bottom: '80px' }}
        scrollIntoView={scrollId.current}
      >
        <View className="px-4 py-2">
          {messages.map((msg) => (
            <View key={msg.id} id={msg.id} className="mb-3 flex">
              {msg.role === 'assistant' ? (
                <View className="max-w-[78%] bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <Text className="block text-sm text-gray-800 leading-relaxed">{msg.content || '...'}</Text>
                </View>
              ) : (
                <View className="max-w-[78%] ml-auto bg-pink-500 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                  <Text className="block text-sm text-white leading-relaxed">{msg.content}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Input bar */}
      <View
        className="absolute bottom-0 left-0 right-0"
        style={{ padding: '10px 12px', paddingBottom: '24px', backgroundColor: 'rgba(0,0,0,0.35)' }}
      >
        <View className="flex flex-row items-center" style={{ display: 'flex' }}>
          <View className="flex-1 rounded-full px-4" style={{ display: 'flex', alignItems: 'center', height: '38px', backgroundColor: '#ffffff' }}>
            <Input
              style={{ width: '100%', height: '36px', fontSize: '14px' }}
              placeholder="对ta说点什么..."
              placeholderClass="text-gray-400"
              value={inputText}
              onInput={(e) => setInputText(e.detail.value)}
              onConfirm={handleSend}
              confirmType="send"
            />
          </View>
          <View className="ml-2" style={{ flexShrink: 0 }}>
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || isStreaming}
              className="rounded-full bg-pink-500 text-white px-2 py-1"
            >
              <View className="flex items-center justify-center w-7 h-7">
                {isStreaming ? (
                  <Loader size={16} color="#ffffff" />
                ) : (
                  <Send size={16} color="#ffffff" />
                )}
              </View>
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}

export default InteractPage
