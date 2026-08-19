import { useState, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, MessageCircle, Star, Users, Circle, Camera, Network as NetworkIcon } from 'lucide-react-taro'

interface Character {
  id: string
  novel_id: string
  name: string
  category: string
  avatar_key: string | null
  avatar_url: string | null
  persona: string | null
  background: string | null
  biography: string | null
  principles: string | null
  examples: string | null
  created_at: string
  updated_at: string
}

type CategoryType = 'protagonist' | 'supporting' | 'minor'

const CATEGORY_CONFIG: Record<CategoryType, { label: string; color: string; bgColor: string; icon: typeof Star }> = {
  protagonist: { label: '主角', color: '#e8587a', bgColor: '#fce4ec', icon: Star },
  supporting: { label: '重要配角', color: '#ab47bc', bgColor: '#f3e5f5', icon: Users },
  minor: { label: '不重要角色', color: '#90a4ae', bgColor: '#eceff1', icon: Circle },
}

const NovelPage = () => {
  const router = useRouter()
  const novelId = router.params.id || ''

  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CategoryType>('protagonist')

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)
  const [newName, setNewName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Detail form
  const [detailForm, setDetailForm] = useState({
    persona: '',
    background: '',
    biography: '',
    principles: '',
    examples: '',
  })

  const fetchCharacters = useCallback(async () => {
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
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useDidShow(() => {
    if (novelId) fetchCharacters()
  })

  const filteredCharacters = characters.filter((c) => c.category === activeCategory)

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await Network.request({
        url: '/api/characters',
        method: 'POST',
        data: {
          novel_id: novelId,
          name: newName.trim(),
          category: activeCategory,
        },
      })
      setNewName('')
      setShowAddDialog(false)
      fetchCharacters()
    } catch (err) {
      console.error('addCharacter error:', err)
    }
  }

  const handleRename = async () => {
    if (!newName.trim() || !selectedChar) return
    try {
      await Network.request({
        url: `/api/characters/${selectedChar.id}`,
        method: 'PUT',
        data: { name: newName.trim() },
      })
      setNewName('')
      setShowRenameDialog(false)
      setSelectedChar(null)
      fetchCharacters()
    } catch (err) {
      console.error('renameCharacter error:', err)
    }
  }

  const handleDelete = async () => {
    if (!selectedChar) return
    try {
      await Network.request({
        url: `/api/characters/${selectedChar.id}`,
        method: 'DELETE',
      })
      setShowDeleteDialog(false)
      setSelectedChar(null)
      fetchCharacters()
    } catch (err) {
      console.error('deleteCharacter error:', err)
    }
  }

  const handleChooseAvatar = async () => {
    if (!selectedChar) return
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const tempFilePath = res.tempFilePaths[0]
      setUploadingAvatar(true)

      const uploadRes = await Network.uploadFile({
        url: '/api/upload',
        filePath: tempFilePath,
        name: 'file',
      })
      console.log('uploadAvatar response:', uploadRes.data)
      const uploadData = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
      const result = uploadData?.data || uploadData
      if (result?.key) {
        await Network.request({
          url: `/api/characters/${selectedChar.id}`,
          method: 'PUT',
          data: { avatar_key: result.key },
        })
        fetchCharacters()
        // Update selectedChar with new avatar
        setSelectedChar((prev) =>
          prev ? { ...prev, avatar_key: uploadData.key, avatar_url: uploadData.url } : null,
        )
        Taro.showToast({ title: '头像已更新', icon: 'success' })
      }
    } catch (err) {
      console.error('uploadAvatar error:', err)
      Taro.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const openDetail = (char: Character) => {
    setSelectedChar(char)
    setDetailForm({
      persona: char.persona || '',
      background: char.background || '',
      biography: char.biography || '',
      principles: char.principles || '',
      examples: char.examples || '',
    })
    setShowDetailDialog(true)
  }

  const handleSaveDetail = async () => {
    if (!selectedChar) return
    try {
      await Network.request({
        url: `/api/characters/${selectedChar.id}`,
        method: 'PUT',
        data: {
          persona: detailForm.persona,
          background: detailForm.background,
          biography: detailForm.biography,
          principles: detailForm.principles,
          examples: detailForm.examples,
        },
      })
      setShowDetailDialog(false)
      fetchCharacters()
    } catch (err) {
      console.error('saveDetail error:', err)
    }
  }

  const goToChat = (char: Character) => {
    Taro.navigateTo({
      url: `/pages/chat/index?characterId=${char.id}&name=${encodeURIComponent(char.name)}&avatar=${encodeURIComponent(char.avatar_url || '')}`,
    })
  }

  const categories: CategoryType[] = ['protagonist', 'supporting', 'minor']

  return (
    <View className="min-h-screen bg-stone-50">
      {/* Category Tabs */}
      <View className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
        {categories.map((cat) => {
          const config = CATEGORY_CONFIG[cat]
          const isActive = activeCategory === cat
          const count = characters.filter((c) => c.category === cat).length
          return (
            <View
              key={cat}
              className="flex-1 flex items-center justify-center py-2 rounded-xl transition-colors"
              style={{
                backgroundColor: isActive ? config.bgColor : 'transparent',
              }}
              onClick={() => setActiveCategory(cat)}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: isActive ? config.color : '#9e8e92' }}
              >
                {config.label}({count})
              </Text>
            </View>
          )
        })}
      </View>

      {/* Character List */}
      <View className="px-4 py-4">
        <View className="flex items-center justify-between mb-3">
          <Text className="block text-base font-semibold text-gray-900">
            {CATEGORY_CONFIG[activeCategory].label}
          </Text>
          <Button
            size="sm"
            className="bg-rose-500 text-white rounded-full"
            onClick={() => {
              setNewName('')
              setShowAddDialog(true)
            }}
          >
            <Plus size={14} color="#ffffff" className="mr-1" />
            <Text className="text-white text-xs">添加</Text>
          </Button>
        </View>

        {loading ? (
          <View className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <View key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </View>
        ) : filteredCharacters.length === 0 ? (
          <View className="flex flex-col items-center py-12">
            <Text className="block text-gray-400 text-center text-sm">
              暂无{CATEGORY_CONFIG[activeCategory].label}{'\n'}点击上方按钮添加
            </Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3">
            {filteredCharacters.map((char) => {
              const hasDetail = char.persona || char.background || char.biography
              return (
                <Card key={char.id} className="bg-white rounded-2xl border-0 shadow-sm">
                  <CardContent className="p-4">
                    <View className="flex items-center justify-between">
                      <View className="flex-1 flex items-center gap-3" onClick={() => openDetail(char)}>
                        {/* Avatar */}
                        <View className="w-12 h-12 rounded-full overflow-hidden bg-pink-50 flex items-center justify-center flex-shrink-0">
                          {char.avatar_url ? (
                            <Image
                              src={char.avatar_url}
                              className="w-full h-full"
                              mode="aspectFill"
                            />
                          ) : (
                            <Text className="block text-lg font-bold text-rose-300">
                              {char.name.charAt(0)}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex items-center gap-2">
                            <Text className="block text-base font-semibold text-gray-900">
                              {char.name}
                            </Text>
                            {hasDetail && (
                              <Badge className="bg-pink-50 text-rose-500 border-0 text-xs">
                                <Text className="text-xs text-rose-500">已设定</Text>
                              </Badge>
                            )}
                          </View>
                          <Text className="block text-xs text-gray-400 mt-1">
                            点击编辑人设详情
                          </Text>
                        </View>
                      </View>
                      <View className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => goToChat(char)}
                        >
                          <MessageCircle size={16} color="#e8587a" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => {
                            setSelectedChar(char)
                            setNewName(char.name)
                            setShowRenameDialog(true)
                          }}
                        >
                          <Pencil size={16} color="#9e8e92" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => {
                            setSelectedChar(char)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </Button>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              )
            })}
          </View>
        )}
      </View>

      {/* Add Character Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">
                添加{CATEGORY_CONFIG[activeCategory].label}
              </Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">输入角色名称</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-gray-900"
                placeholder="角色名称"
                value={newName}
                onInput={(e) => setNewName(e.detail.value)}
              />
            </View>
          </View>
          <View className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowAddDialog(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleAdd}
            >
              <Text className="text-white">添加</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">重命名角色</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">修改角色名称</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-gray-900"
                placeholder="新名称"
                value={newName}
                onInput={(e) => setNewName(e.detail.value)}
              />
            </View>
          </View>
          <View className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowRenameDialog(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleRename}
            >
              <Text className="text-white">确认</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">确认删除</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">
                确定要删除角色「{selectedChar?.name}」吗？
              </Text>
            </DialogDescription>
          </DialogHeader>
          <View className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowDeleteDialog(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-red-500 text-white rounded-xl"
              onClick={handleDelete}
            >
              <Text className="text-white">删除</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Character Detail Dialog (Pink Theme) */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-white rounded-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <View
              className="rounded-xl p-4 -mx-2 -mt-2 mb-4"
              style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' }}
            >
              <View className="flex items-center gap-3">
                {/* Avatar in detail dialog */}
                <View
                  className="relative w-16 h-16 rounded-full overflow-hidden bg-white bg-opacity-50 flex items-center justify-center flex-shrink-0"
                  onClick={handleChooseAvatar}
                >
                  {selectedChar?.avatar_url ? (
                    <Image
                      src={selectedChar.avatar_url}
                      className="w-full h-full"
                      mode="aspectFill"
                    />
                  ) : (
                    <Text className="block text-2xl font-bold text-rose-400">
                      {selectedChar?.name?.charAt(0) || '?'}
                    </Text>
                  )}
                  {/* Camera overlay */}
                  <View className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <Camera size={18} color="#ffffff" />
                  </View>
                </View>
                <View className="flex-1">
                  <DialogTitle>
                    <Text className="text-gray-900 text-lg font-bold">{selectedChar?.name}</Text>
                  </DialogTitle>
                  <DialogDescription>
                    <Text className="text-gray-600 text-sm mt-1 block">
                      {CATEGORY_CONFIG[selectedChar?.category as CategoryType]?.label} · 点击头像可更换
                    </Text>
                  </DialogDescription>
                </View>
              </View>
            </View>
          </DialogHeader>

          <View className="flex flex-col gap-4">
            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">人设定位</Text>
              <View className="bg-stone-50 rounded-xl p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '60px', backgroundColor: 'transparent' }}
                  placeholder="角色的核心人设，如：性格、说话风格..."
                  value={detailForm.persona}
                  onInput={(e) => setDetailForm((prev) => ({ ...prev, persona: e.detail.value }))}
                  maxlength={500}
                />
              </View>
            </View>

            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">背景故事</Text>
              <View className="bg-stone-50 rounded-xl p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '60px', backgroundColor: 'transparent' }}
                  placeholder="角色的出身、经历、世界观..."
                  value={detailForm.background}
                  onInput={(e) => setDetailForm((prev) => ({ ...prev, background: e.detail.value }))}
                  maxlength={1000}
                />
              </View>
            </View>

            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">小传</Text>
              <View className="bg-stone-50 rounded-xl p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '60px', backgroundColor: 'transparent' }}
                  placeholder="角色的详细传记、成长轨迹..."
                  value={detailForm.biography}
                  onInput={(e) => setDetailForm((prev) => ({ ...prev, biography: e.detail.value }))}
                  maxlength={1000}
                />
              </View>
            </View>

            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">行事准则</Text>
              <View className="bg-stone-50 rounded-xl p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '60px', backgroundColor: 'transparent' }}
                  placeholder="角色的行为逻辑、决策原则..."
                  value={detailForm.principles}
                  onInput={(e) => setDetailForm((prev) => ({ ...prev, principles: e.detail.value }))}
                  maxlength={500}
                />
              </View>
            </View>

            <View>
              <Text className="block text-sm font-medium text-gray-700 mb-2">具体事例</Text>
              <View className="bg-stone-50 rounded-xl p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '60px', backgroundColor: 'transparent' }}
                  placeholder="能体现角色性格的具体事件、对话示例..."
                  value={detailForm.examples}
                  onInput={(e) => setDetailForm((prev) => ({ ...prev, examples: e.detail.value }))}
                  maxlength={1000}
                />
              </View>
            </View>
          </View>

          <View className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowDetailDialog(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleSaveDetail}
            >
              <Text className="text-white">保存</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Upload Loading Overlay */}
      {uploadingAvatar && (
        <View className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <View className="bg-white rounded-2xl px-6 py-4">
            <Text className="block text-gray-600 text-center">上传头像中...</Text>
          </View>
        </View>
      )}

      {/* 关系图 Floating Button */}
      <View
        className="fixed right-4 bottom-24 z-40"
        onClick={() => {
          Taro.navigateTo({
            url: `/pages/graph/index?novelId=${novelId}&characterId=${characters[0]?.id || ''}`,
          })
        }}
      >
        <View className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg flex flex-col items-center justify-center">
          <NetworkIcon size={20} color="#fff" />
          <Text className="text-xs text-white mt-1">关系图</Text>
        </View>
      </View>
    </View>
  )
}

export default NovelPage
