import { useState, useCallback, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Portal } from '@/components/ui/portal'
import { Plus, Pencil, MessageCircle, Star, Users, Circle, Camera, Network as NetworkIcon, Trash2, ChevronLeft, User, Flame, UserPlus, MessagesSquare, Newspaper, ScrollText, BookOpen } from 'lucide-react-taro'

interface Character {
  id: string
  novel_id: string
  name: string
  category: string
  avatar_key: string | null
  avatar_url: string | null
  gender: string
  age: string | null
  tagline: string | null
  status: string | null
  persona: string | null
  background: string | null
  biography: string | null
  principles: string | null
  examples: string | null
  created_at: string
  updated_at: string
}

interface GroupChat {
  id: string
  novel_id: string
  name: string
  member_ids: string[]
  member_count: number
  message_count: number
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
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)
  const [newName, setNewName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Fetch characters on mount
  useEffect(() => {
    if (novelId) {
      fetchCharacters()
      fetchGroupChats()
      fetchNovelEra()
    }
  }, [novelId])

  // Refresh group chats when page shows again (returning from group pages)
  useDidShow(() => {
    if (novelId) {
      fetchGroupChats()
    }
  })

  // Detail form
  const [detailForm, setDetailForm] = useState({
    persona: '',
    background: '',
    biography: '',
    principles: '',
    examples: '',
    gender: 'unknown',
    tagline: '',
    age: null as string | null,
  })

  // Gender dropdown
  const [showGenderDropdown, setShowGenderDropdown] = useState(false)

  // Field editor
  const [showFieldEditor, setShowFieldEditor] = useState(false)
  const [editingField, setEditingField] = useState<{ key: string; label: string; value: string } | null>(null)
  const [fieldEditorValue, setFieldEditorValue] = useState('')

  // Tagline editor
  const [showTagEditor, setShowTagEditor] = useState(false)

  // Detail dialog three-dot menu
  const [showDetailMenu, setShowDetailMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Plus menu & group chats
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [groupChats, setGroupChats] = useState<GroupChat[]>([])
  const [novelEra, setNovelEra] = useState<'ancient' | 'modern'>('ancient')
  const [worldInfoFilled, setWorldInfoFilled] = useState(false)
  const [worldNickname, setWorldNickname] = useState<string | null>(null)
  const [novelName, setNovelName] = useState('')
  const [showNameEditor, setShowNameEditor] = useState(false)
  const [editingName, setEditingName] = useState<string>('')
  const [showNicknameEditor, setShowNicknameEditor] = useState(false)
  const [editingNickname, setEditingNickname] = useState('')
  const [activeBottomTab, setActiveBottomTab] = useState<'friends' | 'news'>('friends')

  // World info check dialog
  const [showWorldInfoDialog, setShowWorldInfoDialog] = useState(false)

  const fetchNovelEra = useCallback(async () => {
    if (!novelId) return
    try {
      const res = await Network.request({ url: `/api/novels` })
      console.log('fetchNovelEra response:', res.data)
      const list = (res.data as { data?: Array<{ id: string; era?: string; world_info?: string; name?: string; world_nickname?: string }> })?.data || []
      const current = list.find((n) => n.id === novelId)
      if (current?.era) setNovelEra(current.era === 'modern' ? 'modern' : 'ancient')
      if (current?.name) setNovelName(current.name)
      if (current?.world_nickname) setWorldNickname(current.world_nickname)
      // Check if world_info has content (JSON string or plain text)
      const hasInfo = current?.world_info && current.world_info.trim() && current.world_info !== '{}' && current.world_info !== '""'
      setWorldInfoFilled(!!hasInfo)
    } catch (e) {
      console.error('fetchNovelEra failed:', e)
    }
  }, [novelId])

  const handleSaveNovelName = async () => {
    if (!novelId || !editingName.trim()) return
    try {
      await Network.request({
        url: `/api/novels/${novelId}`,
        method: 'PUT',
        data: { name: editingName.trim() },
      })
      setNovelName(editingName.trim())
      setShowNameEditor(false)
      Taro.showToast({ title: '修改成功', icon: 'success' })
    } catch (err) {
      console.error('saveNovelName error:', err)
      Taro.showToast({ title: '修改失败', icon: 'error' })
    }
  }

  const handleSaveNickname = async () => {
    if (!novelId) return
    try {
      await Network.request({
        url: `/api/novels/${novelId}/nickname`,
        method: 'PUT',
        data: { world_nickname: editingNickname.trim() || null },
      })
      setWorldNickname(editingNickname.trim() || null)
      setShowNicknameEditor(false)
      Taro.showToast({ title: '修改成功', icon: 'success' })
    } catch (err) {
      console.error('saveNickname error:', err)
      Taro.showToast({ title: '修改失败', icon: 'error' })
    }
  }

  const fetchGroupChats = useCallback(async () => {
    if (!novelId) return
    try {
      const res = await Network.request({
        url: `/api/group-chats?novel_id=${novelId}`,
      })
      console.log('fetchGroupChats response:', res.data)
      const data = res.data?.data || res.data || []
      setGroupChats(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchGroupChats error:', err)
    }
  }, [novelId])

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
      age: char.age || null,
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
    } finally {
      setShowDeleteConfirm(false)
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
    <View className="min-h-screen bg-stone-50 pb-20">
      {/* 自定义导航：世界昵称行。角色详情弹窗打开时隐藏返回箭头（弹窗内已有粉色返回） */}
      <View className="flex items-center justify-between px-4 pt-12 pb-3 bg-white border-b border-gray-100">
        <View className="flex items-center gap-2 flex-1 min-w-0">
          <View
            className={`flex-shrink-0 -ml-1 ${showDetailDialog ? 'opacity-0' : 'opacity-100'}`}
            onClick={() => Taro.navigateBack()}
          >
            <ChevronLeft size={24} color="#57534e" strokeWidth={2.5} />
          </View>
          <Text className="text-lg font-bold text-gray-900 truncate">{worldNickname || novelName || '未命名世界'}</Text>
          <Text className="text-xs text-gray-400">{novelEra === 'modern' ? '现代' : '古代'}</Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          onClick={() => {
            setEditingName(String(worldNickname || novelName))
            setShowNicknameEditor(true)
          }}
        >
          <Pencil size={16} color="#e8587a" />
        </Button>
      </View>

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
          <View className="relative">
            <Button
              size="sm"
              className="bg-rose-500 text-white rounded-full w-8 h-8 p-0 flex items-center justify-center"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
            >
              <Plus size={16} color="#ffffff" className={showPlusMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
            </Button>
            {showPlusMenu && (
              <>
                <View
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPlusMenu(false)}
                />
                <View className="absolute right-0 top-11 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-36">
                  <View
                    className="flex items-center gap-3 px-4 py-3 active:bg-gray-50"
                    onClick={() => {
                      setShowPlusMenu(false)
                      Taro.navigateTo({
                        url: `/pages/group-create/index?novelId=${novelId}`,
                      })
                    }}
                  >
                    <MessagesSquare size={18} color="#e8587a" />
                    <Text className="text-sm text-gray-800">发起群聊</Text>
                  </View>
                  <View className="h-px bg-gray-100 mx-2" />
                  <View
                    className="flex items-center gap-3 px-4 py-3 active:bg-gray-50"
                    onClick={() => {
                      setShowPlusMenu(false)
                      setNewName('')
                      setShowAddDialog(true)
                    }}
                  >
                    <UserPlus size={18} color="#e8587a" />
                    <Text className="text-sm text-gray-800">添加朋友</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Group Chats Section */}
        {groupChats.length > 0 && (
          <View className="mb-4">
            <Text className="block text-sm text-gray-500 mb-2">群聊({groupChats.length})</Text>
            <View className="flex flex-col gap-1 bg-white rounded-2xl overflow-hidden">
              {groupChats.map((group) => (
                <View
                  key={group.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 active:bg-gray-50"
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages/group-chat/index?id=${group.id}`,
                    })
                  }
                >
                  <View className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <Users size={22} color="#e8587a" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex items-center gap-2">
                      <Text className="block text-base font-medium text-gray-900 truncate">
                        {group.name}
                      </Text>
                    </View>
                    <Text className="block text-xs text-gray-500 mt-1 truncate">
                      {group.member_count}位成员 · {group.message_count}条消息
                    </Text>
                  </View>
                  <MessageCircle size={18} color="#d1a3ad" />
                </View>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <View className="grid grid-cols-3 gap-3">
            {[1, 2].map((i) => (
              <View key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </View>
        ) : filteredCharacters.length === 0 ? (
          <View className="flex flex-col items-center py-12">
            <Text className="block text-gray-400 text-center text-sm">
              暂无{CATEGORY_CONFIG[activeCategory].label}{'\n'}点击右上角 + 添加朋友
            </Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3">
            {filteredCharacters.map((char) => {
              return (
                <View
                  key={char.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl active:bg-gray-50 mb-2"
                  onClick={() => openDetail(char)}
                >
                  {/* Avatar */}
                  <View className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                    {char.avatar_url ? (
                      <Image
                        src={char.avatar_url}
                        className="w-full h-full"
                        mode="aspectFill"
                        style={{ objectPosition: 'top center' }}
                      />
                    ) : (
                      <View className="w-full h-full flex items-center justify-center bg-gray-100">
                        <User size={24} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  {/* Name & Info */}
                  <View className="flex-1 min-w-0">
                    <View className="flex items-center gap-2">
                      <Text className="block text-base font-medium text-gray-900">
                        {char.name}
                      </Text>
                      {char.status === 'flaming' && (
                        <View className="flex items-center">
                          <Flame size={16} color="#f97316" />
                        </View>
                      )}
                    </View>
                    {char.tagline && (
                      <Text className="block text-xs text-gray-500 truncate mt-1">{char.tagline}</Text>
                    )}
                  </View>
                  {/* Chat Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      goToChat(char)
                    }}
                  >
                    <MessageCircle size={20} color="#e8587a" />
                  </Button>
                </View>
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
              <Text className="text-gray-400 text-sm">输入角色名称（添加朋友）</Text>
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

      {/* Character Detail Dialog (Pink Theme) */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-white rounded-2xl max-h-screen overflow-y-auto w-full max-w-md" closeClassName="hidden">
          <DialogHeader className="relative w-full">
            {/* Back arrow outside the pink box, on white background */}
            <View className="absolute -left-1 top-3 z-10">
              <ChevronLeft
                size={22}
                color="#c2185b"
                strokeWidth={2.5}
                onClick={() => setShowDetailDialog(false)}
              />
            </View>
            <View
              className="rounded-xl p-4 mb-4 ml-8 mr-2 relative"
              style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' }}
            >

              {/* Trash icon at top-right, aligned with pink box */}
              <View className="absolute top-3 right-3 z-10">
                <Trash2
                  size={16}
                  color="#c2185b"
                  onClick={() => setShowDetailMenu(true)}
                />
              </View>

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

          {/* Gender Selection - Dropdown */}
          <View className="flex items-center gap-4 py-2">
            {/* Gender Dropdown */}
            <View className="flex-1">
              <Text className="block text-sm text-gray-600 mb-2">性别</Text>
              <View className="relative w-full">
                <View
                  className="bg-white border border-gray-200 rounded-lg px-4 h-11 flex items-center justify-between w-full"
                  onClick={() => setShowGenderDropdown(!showGenderDropdown)}
                >
                  <Text className="text-sm text-gray-700">
                    {detailForm.gender === 'female' ? '女' : detailForm.gender === 'male' ? '男' : '请选择'}
                  </Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
                {showGenderDropdown && (
                  <View className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <View
                      className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                      onClick={() => {
                        setDetailForm((prev) => ({ ...prev, gender: 'female' }))
                        setShowGenderDropdown(false)
                      }}
                    >
                      <Text className="text-sm text-gray-700">女</Text>
                    </View>
                    <View
                      className="px-4 py-3 active:bg-gray-50"
                      onClick={() => {
                        setDetailForm((prev) => ({ ...prev, gender: 'male' }))
                        setShowGenderDropdown(false)
                      }}
                    >
                      <Text className="text-sm text-gray-700">男</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Age Input */}
            <View className="flex-1">
              <Text className="block text-sm text-gray-600 mb-2">年龄</Text>
              <Input
                className="bg-white border border-gray-200 rounded-lg px-4 h-11 text-sm text-gray-700 w-full"
                placeholder="请输入年龄"
                value={detailForm.age || ''}
                type="number"
                onInput={(e) => setDetailForm((prev) => ({ ...prev, age: e.detail.value.replace(/\D/g, '') }))}
              />
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
                className="w-full h-24 bg-transparent text-sm border-none ring-0 focus-within:ring-0"
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

          <View className="mt-4 bg-pink-50 rounded-2xl p-4">
            <Textarea
              className="w-full h-44 bg-transparent text-sm border-none ring-0 focus-within:ring-0"
              style={{ boxSizing: 'border-box', fontSize: '15px', lineHeight: '1.6' }}
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

      {/* World Info Required Dialog */}
      {showWorldInfoDialog && (
        <View className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-2xl mx-8 p-6 w-full max-w-sm">
            <View className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} color="#f43f5e" />
            </View>
            <Text className="block text-center text-base font-semibold text-gray-900 mb-2">请先完善世界信息</Text>
            <Text className="block text-center text-sm text-gray-500 mb-6">当前世界信息尚未填写，完善后可生成更真实的奇闻轶事内容哦~</Text>
            <View className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-200 text-gray-700 rounded-xl"
                onClick={() => setShowWorldInfoDialog(false)}
              >
                <Text className="text-gray-700">暂时不了</Text>
              </Button>
              <Button
                className="flex-1 bg-rose-500 text-white rounded-xl"
                onClick={() => {
                  setShowWorldInfoDialog(false)
                  Taro.navigateTo({ url: `/pages/world-info/index?id=${novelId}&era=${novelEra}` })
                }}
              >
                <Text className="text-white">去完善</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Name Editor Dialog */}
      <Dialog open={showNameEditor} onOpenChange={setShowNameEditor}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">修改世界名</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">为你的世界取一个名字</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-gray-900"
                placeholder="世界名称"
                value={editingName}
                onInput={(e) => setEditingName(e.detail.value)}
              />
            </View>
          </View>
          <View className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowNameEditor(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleSaveNovelName}
            >
              <Text className="text-white">保存</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* World Nickname Editor Dialog */}
      <Dialog open={showNicknameEditor} onOpenChange={setShowNicknameEditor}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">修改世界特色昵称</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">为你的世界取一个独特的昵称</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-gray-900"
                placeholder="世界特色昵称"
                value={editingNickname}
                onInput={(e) => setEditingNickname(e.detail.value)}
              />
            </View>
          </View>
          <View className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              onClick={() => setShowNicknameEditor(false)}
            >
              <Text className="text-gray-700">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleSaveNickname}
            >
              <Text className="text-white">保存</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation Bar */}
      <View
        className="fixed left-0 right-0 bottom-0 z-40 bg-white border-t border-gray-100 flex items-center justify-around py-2 pb-safe"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <View
          className="flex flex-col items-center py-1 px-6"
          onClick={() => setActiveBottomTab('friends')}
        >
          <Users size={24} color={activeBottomTab === 'friends' ? '#e8587a' : '#9ca3af'} />
          <Text
            className="text-xs mt-1"
            style={{ color: activeBottomTab === 'friends' ? '#e8587a' : '#9ca3af' }}
          >
            朋友
          </Text>
        </View>
        <View
          className="flex flex-col items-center py-1 px-6"
          onClick={() => {
            if (!worldInfoFilled) {
              setShowWorldInfoDialog(true)
            } else {
              Taro.navigateTo({ url: `/pages/world-news/index?id=${novelId}` })
            }
          }}
        >
          {novelEra === 'modern' ? (
            <Newspaper size={24} color={activeBottomTab === 'news' ? '#e8587a' : '#9ca3af'} />
          ) : (
            <ScrollText size={24} color={activeBottomTab === 'news' ? '#e8587a' : '#9ca3af'} />
          )}
          <Text
            className="text-xs mt-1"
            style={{ color: activeBottomTab === 'news' ? '#e8587a' : '#9ca3af' }}
          >
            {novelEra === 'modern' ? '世界日常' : '奇闻轶事'}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default NovelPage
