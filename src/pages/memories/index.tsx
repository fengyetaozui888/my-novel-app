import { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Trash2, Sparkles } from 'lucide-react-taro'

interface Memory {
  id: number
  novel_id: string
  character_id: string
  type: 'fact' | 'relationship' | 'event' | 'preference'
  content: string
  importance: number
  created_at: string
}

interface Character {
  id: string
  name: string
  category: string
}

const MemoriesPage = () => {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await Network.request({ url: '/api/characters' })
      const data = res.data?.data || res.data
      setCharacters(data || [])
    } catch (err) {
      console.error('fetch characters error:', err)
    }
  }, [])

  const fetchMemories = useCallback(async (characterId: string) => {
    try {
      setLoading(true)
      const res = await Network.request({
        url: `/api/memories/character/${characterId}?limit=50&minImportance=0.5`,
      })
      const data = res.data?.data || res.data
      setMemories(data || [])
    } catch (err) {
      console.error('fetch memories error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    fetchCharacters()
  })

  const handleSelectCharacter = (characterId: string) => {
    setSelectedCharacter(characterId)
    fetchMemories(characterId)
  }

  const handleDeleteMemory = async (memoryId: number) => {
    try {
      await Network.request({
        url: `/api/memories/${memoryId}`,
        method: 'DELETE',
      })
      setMemories(memories.filter((m) => m.id !== memoryId))
      Taro.showToast({ title: '记忆已删除', icon: 'success' })
    } catch (err) {
      console.error('delete memory error:', err)
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const handlePruneMemories = async () => {
    if (!selectedCharacter) return

    try {
      const res = await Network.request({
        url: `/api/memories/character/${selectedCharacter}/prune?keepCount=30`,
        method: 'DELETE',
      })
      const data = res.data?.data || res.data
      Taro.showToast({ title: `已清理 ${data.deleted} 条旧记忆`, icon: 'success' })
      fetchMemories(selectedCharacter)
    } catch (err) {
      console.error('prune memories error:', err)
      Taro.showToast({ title: '清理失败', icon: 'none' })
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fact: '事实',
      relationship: '关系',
      event: '事件',
      preference: '偏好',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fact: '#3b82f6',
      relationship: '#ec4899',
      event: '#f59e0b',
      preference: '#10b981',
    }
    return colors[type] || '#6b7280'
  }

  if (loading && memories.length === 0) {
    return (
      <View className="flex items-center justify-center h-screen">
        <Text className="text-gray-400">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <View className="px-6 pt-10 pb-6 bg-gradient-to-br from-pink-50 to-rose-50">
        <View className="flex items-center gap-3 mb-4">
          <Brain size={28} color="#ec4899" />
          <Text className="text-2xl font-bold text-gray-900">记忆管理</Text>
        </View>
        <Text className="block text-sm text-gray-600">
          查看和管理角色的长期记忆，让角色更懂你
        </Text>
      </View>

      {/* Character Selection */}
      <View className="px-4 mt-4">
        <Text className="block text-sm font-medium text-gray-700 mb-3">选择角色</Text>
        <View className="flex flex-wrap gap-2">
          {characters.map((char) => (
            <Button
              key={char.id}
              variant={selectedCharacter === char.id ? 'default' : 'outline'}
              className={`text-sm ${
                selectedCharacter === char.id
                  ? 'bg-rose-500 text-white border-0'
                  : 'border-rose-200 text-gray-700'
              }`}
              onClick={() => handleSelectCharacter(char.id)}
            >
              {char.name}
            </Button>
          ))}
        </View>
      </View>

      {/* Memories List */}
      {selectedCharacter && (
        <View className="px-4 mt-6">
          <View className="flex items-center justify-between mb-3">
            <Text className="text-sm font-medium text-gray-700">
              记忆列表 ({memories.length})
            </Text>
            {memories.length > 30 && (
              <Button
                variant="outline"
                className="text-xs border-rose-200 text-rose-600"
                onClick={handlePruneMemories}
              >
                <Trash2 size={12} color="#ec4899" />
                <Text className="text-xs ml-1">清理旧记忆</Text>
              </Button>
            )}
          </View>

          {memories.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Sparkles size={48} color="#d1d5db" />
                <Text className="block text-gray-500 mt-4">暂无记忆</Text>
                <Text className="block text-xs text-gray-400 mt-2">
                  与角色对话时会自动提取重要记忆
                </Text>
              </CardContent>
            </Card>
          ) : (
            <View className="flex flex-col gap-2">
              {memories.map((memory) => (
                <Card key={memory.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <View className="flex items-start justify-between gap-3">
                      <View className="flex-1">
                        <View className="flex items-center gap-2 mb-2">
                          <View
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${getTypeColor(memory.type)}20` }}
                          >
                            <Text
                              className="text-xs font-medium"
                              style={{ color: getTypeColor(memory.type) }}
                            >
                              {getTypeLabel(memory.type)}
                            </Text>
                          </View>
                          <Text className="text-xs text-gray-400">
                            重要性：{Math.round(memory.importance * 100)}%
                          </Text>
                        </View>
                        <Text className="block text-sm text-gray-900 leading-relaxed">
                          {memory.content}
                        </Text>
                        <Text className="block text-xs text-gray-400 mt-2">
                          {new Date(memory.created_at).toLocaleDateString('zh-CN')}
                        </Text>
                      </View>
                      <Button
                        variant="ghost"
                        className="p-2 h-auto"
                        onClick={() => handleDeleteMemory(memory.id)}
                      >
                        <Trash2 size={14} color="#9ca3af" />
                      </Button>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Info Card */}
      <View className="px-4 mt-6">
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <Text className="block text-sm font-medium text-blue-900 mb-2">
              关于记忆系统
            </Text>
            <Text className="block text-xs text-blue-700 leading-relaxed">
              • 记忆系统让角色能够记住重要信息，不会因对话过长而遗忘{'\n'}
              • 每次对话有 20% 概率提取关键记忆（重要性 {'>'} 70% 才会保存）{'\n'}
              • 对话时会自动加载关键记忆到上下文，让角色表现更连贯{'\n'}
              • 定期清理旧记忆，保持上下文窗口高效利用
            </Text>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}

export default MemoriesPage
