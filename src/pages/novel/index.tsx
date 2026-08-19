import { useState, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Portal } from '@/components/ui/portal'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, MessageCircle, Star, Users, Circle, Camera, Network as NetworkIcon, Trash2, ChevronLeft } from 'lucide-react-taro'

interface Character {
  id: string
  novel_id: string
  name: string
  category: string
  avatar_key: string | null
  avatar_url: string | null
  gender: string
  tagline: string | null
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
    gender: 'unknown',
    tagline: '',
  })

  // Field editor
  const [showFieldEditor, setShowFieldEditor] = useState(false)
  const [editingField, setEditingField] = useState<{ key: string; label: string; value: string } | null>(null)
  const [fieldEditorValue, setFieldEditorValue] = useState('')

  // Tagline editor
  const [showTagEditor, setShowTagEditor] = useState(false)

  // Detail dialog three-dot menu
  const [showDetailMenu, setShowDetailMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      gender: char.gender || 'unknown',
      tagline: char.tagline || '',
    })
    setShowDetailDialog(true)
  }

  // Field editor
  const openFieldEditor = (key: string, label: string) => {
    const value = (detailForm as any)[key] || ''
    setEditingField({ key, label, value })
    setFieldEditorValue(value)
    setShowFieldEditor(true)
  }

  const saveFieldEditor = () => {
    if (!editingField) return
    setDetailForm({ ...detailForm, [editingField.key]: fieldEditorValue })
    setShowFieldEditor(false)
    setEditingField(null)
  }

  // Delete character
  const handleDeleteCharacter = async () => {
    if (!selectedChar) return
    try {
      await Network.request({
        url: `/api/characters/${selectedChar.id}`,
        method: 'DELETE'
      })
      Taro.showToast({ title: '删除成功', icon: 'success' })
      setShowDetailDialog(false)
      setShowDetailMenu(false)
      fetchCharacters()
    } catch (error) {
      Taro.showToast({ title: '删除失败', icon: 'error' })
    }
  }

  // Save detail
  const handleSaveDetail = async () => {
    if (!selectedChar) return
    try {
      await Network.request({
        url: `/api/characters/${selectedChar.id}`,
        method: 'PUT',
        data: {
          name: selectedChar.name,
          gender: detailForm.gender,
          tagline: detailForm.tagline,
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
                          {/* Tagline display */}
                          {char.tagline && (
                            <View className="mt-1">
                              <Text className="text-xs text-gray-500 line-clamp-1">{char.tagline}</Text>
                            </View>
                          )}
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
                          onClick={() => openDetail(char)}
                        >
                          <Pencil size={16} color="#9e8e92" />
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
        <DialogContent className="bg-white rounded-2xl max-h-screen overflow-y-auto" closeClassName="hidden">
          <DialogHeader>
            {/* Back arrow at top-left */}
            <View className="absolute top-4 left-3 z-10">
              <ChevronLeft
                size={22}
                color="#c2185b"
                strokeWidth={2.5}
                onClick={() => setShowDetailDialog(false)}
              />
            </View>

            {/* Trash icon at top-right */}
            <View className="absolute top-6 right-3 z-10">
              <Trash2
                size={16}
                color="#c2185b"
                onClick={() => setShowDetailMenu(true)}
              />
            </View>

            <View
              className="rounded-xl p-4 mb-4 mx-2"
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
                    <View className="flex items-center gap-2">
                      <Text className="text-gray-900 text-lg font-bold">{selectedChar?.name}</Text>
                      <Pencil
                        size={14}
                        color="#c2185b"
                        onClick={() => {
                          setNewName(selectedChar?.name || '')
                          setShowRenameDialog(true)
                        }}
                      />
                    </View>
                  </DialogTitle>
                  {/* Tagline */}
                  <View className="mt-2">
                    <View
                      className="bg-pink-50 rounded-xl px-3 py-2 flex items-center gap-2"
                      onClick={() => setShowTagEditor(true)}
                    >
                      <Text className="flex-1 text-xs text-gray-600 line-clamp-1">
                        {detailForm.tagline || '点击添加一句话简介...'}
                      </Text>
                      <Pencil size={12} color="#c2185b" />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </DialogHeader>

          {/* Gender Selection */}
          <View className="flex items-center justify-center gap-6 py-2">
            <View className="flex flex-col items-center gap-2">
              <View
                className="relative w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background:
                    detailForm.gender === 'female'
                      ? 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)'
                      : '#f5f5f5',
                  border: detailForm.gender === 'female' ? '2px solid #ec4899' : '2px solid #e0e0e0',
                }}
                onClick={() => setDetailForm((prev) => ({ ...prev, gender: 'female' }))}
              >
                <Text className="text-3xl">👧🏻</Text>
                {detailForm.gender === 'female' && (
                  <View className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-600">女生</Text>
            </View>

            <View className="flex flex-col items-center gap-2">
              <View
                className="relative w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background:
                    detailForm.gender === 'male'
                      ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                      : '#f5f5f5',
                  border: detailForm.gender === 'male' ? '2px solid #2196f3' : '2px solid #e0e0e0',
                }}
                onClick={() => setDetailForm((prev) => ({ ...prev, gender: 'male' }))}
              >
                <Text className="text-3xl">👦🏻</Text>
                {detailForm.gender === 'male' && (
                  <View className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-600">男生</Text>
            </View>
          </View>

          <View className="flex flex-col gap-3">
            {/* Field rows with + button */}
            {[
              { key: 'persona', label: '人设定位' },
              { key: 'background', label: '背景故事' },
              { key: 'biography', label: '人物小传' },
              { key: 'principles', label: '行事准则' },
              { key: 'examples', label: '具体事例' },
            ].map((field) => {
              const hasContent = (detailForm as any)[field.key]
              return (
                <View
                  key={field.key}
                  className="flex items-center justify-between bg-pink-50 rounded-xl px-4 py-3"
                  onClick={() => openFieldEditor(field.key, field.label)}
                >
                  <View className="flex items-center gap-3 flex-1">
                    <Text className="text-sm font-medium text-gray-700">{field.label}</Text>
                    {hasContent && (
                      <Text className="text-xs text-gray-400 truncate">
                        {String(hasContent).substring(0, 20)}...
                      </Text>
                    )}
                  </View>
                  <View className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Pencil size={16} color="#c2185b" />
                  </View>
                </View>
              )
            })}
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

      {/* Tagline Editor Dialog */}
      <Dialog open={showTagEditor} onOpenChange={setShowTagEditor}>
        <DialogContent className="bg-white rounded-2xl max-w-sm mx-4" closeClassName="hidden">
          <DialogHeader>
            <DialogTitle>
              <Text className="block text-lg font-bold text-gray-800">一句话简介</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="block text-xs text-gray-500">
                可以是人设概括、特殊行为或口头禅
              </Text>
            </DialogDescription>
          </DialogHeader>

          <View className="mt-4">
            <View className="bg-pink-50 rounded-xl p-4">
              <Textarea
                className="w-full bg-transparent text-sm min-h-24"
                placeholder="输入角色的一句话简介..."
                value={detailForm.tagline}
                onInput={(e) => setDetailForm({ ...detailForm, tagline: e.detail.value })}
                maxlength={200}
              />
            </View>
            <Text className="block text-xs text-gray-400 mt-2 text-right">
              {detailForm.tagline?.length || 0}/200
            </Text>
          </View>

          <View className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowTagEditor(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={() => setShowTagEditor(false)}
            >
              <Text className="text-white">确定</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Three-dot Menu Dropdown */}
      {showDetailMenu && (
        <Portal>
          <View
            className="fixed inset-0 z-[60]"
            onClick={() => setShowDetailMenu(false)}
          >
            <View
              className="absolute top-12 right-4 bg-white rounded-xl shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <View
                className="px-4 py-3 hover:bg-gray-50"
                onClick={() => {
                  setShowDetailMenu(false)
                  setShowDeleteConfirm(true)
                }}
              >
                <Text className="block text-sm text-gray-700">删除人设</Text>
              </View>
            </View>
          </View>
        </Portal>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-white rounded-2xl max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>
              <Text className="block text-lg font-bold text-gray-800">确认删除</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="mt-4">
            <Text className="block text-sm text-gray-600">
              确定删除角色 <Text className="font-semibold text-rose-500">{selectedChar?.name}</Text> 吗？
            </Text>
            <Text className="block text-xs text-gray-500 mt-2">
              一旦删除所有数据不可找回
            </Text>
          </View>
          <View className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleDeleteCharacter}
            >
              <Text className="text-white">删除</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Field Editor Dialog */}
      <Dialog open={showFieldEditor} onOpenChange={setShowFieldEditor}>
        <DialogContent className="bg-white rounded-3xl p-6 max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle>
              <Text className="block text-lg font-semibold text-gray-800">{editingField?.label || ''}</Text>
            </DialogTitle>
          </DialogHeader>

          <View className="mt-4">
            <Textarea
              style={{ width: '100%', minHeight: '200px', backgroundColor: '#fafafa', borderRadius: '16px', padding: '16px', fontSize: '15px', lineHeight: '1.6' }}
              placeholder={`请输入${editingField?.label || ''}...`}
              value={fieldEditorValue}
              onInput={(e) => setFieldEditorValue(e.detail.value)}
              maxlength={3000}
            />
          </View>

          <View className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowFieldEditor(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={saveFieldEditor}
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
