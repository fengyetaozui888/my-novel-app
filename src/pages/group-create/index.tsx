import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, User, Check, Star, Users as UsersIcon, Circle } from 'lucide-react-taro'

interface Character {
  id: string
  name: string
  category: string
  avatar_url: string | null
  tagline: string | null
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: typeof Star }> = {
  protagonist: { label: '主角', color: '#e8587a', bg: '#fce4ec', icon: Star },
  supporting: { label: '配角', color: '#ab47bc', bg: '#f3e5f5', icon: UsersIcon },
  minor: { label: '次要', color: '#90a4ae', bg: '#eceff1', icon: Circle },
}

const GroupCreatePage = () => {
  const router = useRouter()
  const novelId = router.params.novelId || ''

  const [characters, setCharacters] = useState<Character[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchCharacters = useCallback(async () => {
    if (!novelId) return
    try {
      setLoading(true)
      const res = await Network.request({
        url: `/api/characters?novel_id=${novelId}`,
      })
      console.log('fetchCharacters response:', res.data)
      const data = res.data?.data || res.data || []
      setCharacters(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchCharacters error:', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    fetchCharacters()
  }, [fetchCharacters])

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleCreate = async () => {
    if (selected.length < 2) {
      Taro.showToast({ title: '至少选择2位角色', icon: 'none' })
      return
    }
    setCreating(true)
    try {
      // Default group name: first two members' names
      const name =
        groupName.trim() ||
        `${characters.find((c) => c.id === selected[0])?.name || ''}等${selected.length}人的群聊`
      const res = await Network.request({
        url: '/api/group-chats',
        method: 'POST',
        data: {
          novel_id: novelId,
          name,
          member_ids: selected,
        },
      })
      console.log('createGroupChat response:', res.data)
      const group = res.data?.data
      if (group?.id) {
        Taro.redirectTo({
          url: `/pages/group-chat/index?id=${group.id}`,
        })
      } else {
        Taro.showToast({ title: '创建失败', icon: 'none' })
      }
    } catch (err) {
      console.error('createGroupChat error:', err)
      Taro.showToast({ title: '创建失败', icon: 'none' })
    } finally {
      setCreating(false)
    }
  }

  const selectedCount = selected.length

  return (
    <View className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-3 border-b border-gray-100">
        <View className="flex items-center justify-between">
          <View
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            onClick={() => Taro.navigateBack()}
          >
            <ChevronLeft size={20} color="#57534e" />
          </View>
          <Text className="block text-base font-semibold text-gray-900">发起群聊</Text>
          <View className="w-9" />
        </View>
      </View>

      {/* Body */}
      <View className="flex-1 px-4 py-4 pb-28">
        {/* Group name input */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="block text-sm text-gray-500 mb-2">群聊名称（可选）</Text>
          <View className="bg-stone-50 rounded-xl px-4 py-3">
            <Input
              className="w-full bg-transparent text-gray-900"
              style={{ width: '100%' }}
              placeholder="不填则自动生成"
              value={groupName}
              onInput={(e) => setGroupName(e.detail.value)}
              maxlength={20}
            />
          </View>
        </View>

        {/* Selected members preview */}
        {selectedCount > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="block text-sm text-gray-500 mb-3">已选({selectedCount})</Text>
            <View className="flex flex-wrap gap-2">
              {characters
                .filter((c) => selected.includes(c.id))
                .map((c) => (
                  <View
                    key={c.id}
                    className="flex items-center gap-1 bg-rose-50 rounded-full pl-1 pr-3 py-1"
                    onClick={() => toggleSelect(c.id)}
                  >
                    <View className="w-6 h-6 rounded-full overflow-hidden bg-gray-100">
                      {c.avatar_url ? (
                        <Image
                          src={c.avatar_url}
                          className="w-full h-full"
                          mode="aspectFill"
                          style={{ objectPosition: 'top center' }}
                        />
                      ) : (
                        <View className="w-full h-full flex items-center justify-center">
                          <User size={12} color="#9ca3af" />
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-gray-700">{c.name}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Character select list */}
        <View className="bg-white rounded-2xl overflow-hidden">
          <View className="px-4 pt-4 pb-2">
            <Text className="block text-sm font-semibold text-gray-900">
              选择角色({characters.length})
            </Text>
            <Text className="block text-xs text-gray-400 mt-1">勾选要拉进群聊的角色</Text>
          </View>
          {loading ? (
            <View className="py-10 flex items-center justify-center">
              <Text className="text-sm text-gray-400">加载中...</Text>
            </View>
          ) : characters.length === 0 ? (
            <View className="py-10 flex items-center justify-center">
              <Text className="text-sm text-gray-400">暂无角色，请先添加朋友</Text>
            </View>
          ) : (
            <View className="flex flex-col">
              {characters.map((char) => {
                const isSelected = selected.includes(char.id)
                const meta = CATEGORY_META[char.category] || CATEGORY_META.minor
                return (
                  <View
                    key={char.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 active:bg-gray-50 ${
                      isSelected ? 'bg-rose-50' : ''
                    }`}
                    onClick={() => toggleSelect(char.id)}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-rose-500 border-rose-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    </View>
                    <View className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {char.avatar_url ? (
                        <Image
                          src={char.avatar_url}
                          className="w-full h-full"
                          mode="aspectFill"
                          style={{ objectPosition: 'top center' }}
                        />
                      ) : (
                        <View className="w-full h-full flex items-center justify-center bg-gray-100">
                          <User size={18} color="#9ca3af" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex items-center gap-2">
                        <Text className="block text-sm font-medium text-gray-900 truncate">
                          {char.name}
                        </Text>
                        <View
                          className="px-2 py-1 rounded-full"
                          style={{ backgroundColor: meta.bg }}
                        >
                          <Text className="text-xs" style={{ color: meta.color }}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>
                      {char.tagline && (
                        <Text className="block text-xs text-gray-400 truncate mt-1">
                          {char.tagline}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </View>

      {/* Bottom action bar */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px 24px',
          backgroundColor: '#fff',
          borderTop: '1px solid #f0e8e4',
        }}
      >
        <Button
          className="w-full bg-rose-500 text-white rounded-full h-11"
          disabled={selectedCount < 2 || creating}
          onClick={handleCreate}
        >
          <Text className="text-white text-base font-medium">
            {creating ? '创建中...' : `完成${selectedCount > 0 ? `(${selectedCount})` : ''}`}
          </Text>
        </Button>
      </View>
    </View>
  )
}

export default GroupCreatePage
