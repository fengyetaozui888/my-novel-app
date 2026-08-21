import { useState, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Sparkles, Plus, Camera, Coffee, Pin } from 'lucide-react-taro'

interface Novel {
  id: string
  name: string
  cover_key: string | null
  cover_url: string | null
  era?: string
  tagline?: string
  is_pinned?: boolean
  world_info?: string
  world_score?: number
  world_nickname?: string
  category_names?: string[]
  section_titles?: string[]
  created_at: string
  updated_at: string
}

const IndexPage = () => {
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTagline, setNewTagline] = useState('')
  const [newEra, setNewEra] = useState<'ancient' | 'modern'>('ancient')
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null) // 当前打开菜单的小说 ID

  // 演示数据（当后端不可用时显示）
  const DEMO_NOVELS: Novel[] = [
    {
      id: 'demo-001',
      name: '游戏入侵',
      tagline: '当虚拟与现实交织，谁才是真正的主角？',
      era: 'modern',
      is_pinned: true,
      cover_key: '',
      cover_url: null,
      world_info: '',
      world_score: 0,
      world_nickname: '',
      category_names: [],
      section_titles: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const fetchNovels = useCallback(async () => {
    try {
      setLoading(true)
      const res = await Network.request({ url: '/api/novels' })
      console.log('fetchNovels response:', res.data)
      const data = res.data?.data || res.data || []
      const novelsList = Array.isArray(data) ? data : []
      // 如果 API 返回空数据，使用演示数据
      if (novelsList.length === 0) {
        setNovels(DEMO_NOVELS)
      } else {
        setNovels(novelsList)
      }
    } catch (err) {
      console.error('fetchNovels error:', err)
      // API 失败时使用演示数据
      setNovels(DEMO_NOVELS)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    fetchNovels()
  })

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await Network.request({
        url: '/api/novels',
        method: 'POST',
        data: { name: newName.trim(), era: newEra },
      })
      setNewName('')
      setNewEra('ancient')
      setShowAddDialog(false)
      fetchNovels()
    } catch (err) {
      console.error('addNovel error:', err)
    }
  }

  const handleRename = async () => {
    if (!newName.trim() || !selectedNovel) return
    try {
      // DEMO 数据：仅本地更新
      if (selectedNovel.id.startsWith('demo-')) {
        setNovels(prev => prev.map(n => n.id === selectedNovel.id ? { ...n, name: newName.trim(), tagline: newTagline.trim(), era: newEra } : n))
        setNewName('')
        setNewTagline('')
        setNewEra('ancient')
        setShowRenameDialog(false)
        setSelectedNovel(null)
        Taro.showToast({ title: '演示模式：信息已更新（仅本地）', icon: 'none' })
        return
      }
      await Network.request({
        url: `/api/novels/${selectedNovel.id}`,
        method: 'PUT',
        data: { name: newName.trim(), tagline: newTagline.trim(), era: newEra },
      })
      setNewName('')
      setNewTagline('')
      setNewEra('ancient')
      setShowRenameDialog(false)
      setSelectedNovel(null)
      fetchNovels()
    } catch (err) {
      console.error('renameNovel error:', err)
      Taro.showToast({ title: '修改失败', icon: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!selectedNovel) return
    try {
      await Network.request({
        url: `/api/novels/${selectedNovel.id}`,
        method: 'DELETE',
      })
      setShowDeleteDialog(false)
      setSelectedNovel(null)
      fetchNovels()
    } catch (err) {
      console.error('deleteNovel error:', err)
    }
  }

  const handleTogglePin = async (novel: Novel) => {
    try {
      // DEMO 数据：仅本地更新
      if (novel.id.startsWith('demo-')) {
        setNovels(prev => prev.map(n => n.id === novel.id ? { ...n, is_pinned: !n.is_pinned } : n))
        setShowActionMenu(null)
        Taro.showToast({ title: '演示模式：' + (novel.is_pinned ? '已取消置顶' : '已置顶'), icon: 'none' })
        return
      }
      await Network.request({
        url: `/api/novels/${novel.id}/toggle-pin`,
        method: 'PUT',
      })
      setShowActionMenu(null)
      Taro.showToast({ title: novel.is_pinned ? '已取消置顶' : '已置顶', icon: 'success' })
      fetchNovels()
    } catch (err) {
      console.error('togglePin error:', err)
      Taro.showToast({ title: '操作失败', icon: 'error' })
    }
  }

  const handleChooseCover = async (novel: Novel) => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })

      // 演示数据：仅本地预览，不调后端
      if (novel.id.startsWith('demo-')) {
        const file = res.tempFiles[0]?.originalFileObj
        let localUrl = res.tempFilePaths[0]
        if (file) {
          localUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        }
        setNovels((prev) => prev.map((n) => (n.id === novel.id ? { ...n, cover_url: localUrl } : n)))
        Taro.showToast({ title: '封面已更新', icon: 'success' })
        return
      }

      const isH5 = Taro.getEnv() === Taro.ENV_TYPE.WEB
      let uploadRes: any

      if (isH5 && res.tempFiles[0]?.originalFileObj) {
        const file = res.tempFiles[0].originalFileObj
        const reader = new FileReader()
        reader.readAsArrayBuffer(file)
        const arrayBuffer: ArrayBuffer = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = reject
        })
        const formData = new FormData()
        formData.append('file', new Blob([arrayBuffer], { type: file.type }), file.name)
        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        const json = await response.json()
        uploadRes = { data: JSON.stringify(json) }
      } else {
        uploadRes = await Network.uploadFile({
          url: '/api/upload',
          filePath: res.tempFilePaths[0],
          name: 'file',
        })
      }

      const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
      const key = parsed.data?.key

      if (!key) {
        Taro.showToast({ title: '上传失败', icon: 'none' })
        return
      }

      await Network.request({
        url: `/api/novels/${novel.id}`,
        method: 'PUT',
        data: { cover_key: key },
      })
      fetchNovels()
      Taro.showToast({ title: '封面已更新', icon: 'success' })
    } catch (err: any) {
      console.error('uploadCover error:', err)
      const msg = err?.message ? String(err.message).slice(0, 20) : '请重试'
      Taro.showToast({ title: `上传失败: ${msg}`, icon: 'none' })
    }
  }

  const goToNovel = (novel: Novel) => {
    Taro.navigateTo({ url: `/pages/novel/index?id=${novel.id}&name=${encodeURIComponent(novel.name)}` })
  }

  return (
    <View className="min-h-screen bg-stone-50 px-4 py-6" onClick={() => setShowActionMenu(null)}>
      {/* Header */}
      <View className="flex items-center justify-between mb-6">
        <View className="flex items-center gap-2">
          <Sparkles size={24} color="#e8587a" />
          <Text className="block text-xl font-bold text-gray-900">小世界</Text>
        </View>
        <Button
          size="sm"
          className="bg-rose-500 text-white rounded-full"
          onClick={() => {
            setNewName('')
            setShowAddDialog(true)
          }}
        >
          <Plus size={16} color="#ffffff" className="mr-1" />
          <Text className="text-white text-sm">创建新世界</Text>
        </Button>
      </View>

      {/* Cafe Entry */}
      <View
        className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4 mb-6 flex items-center gap-3"
        onClick={() => Taro.navigateTo({ url: '/pages/cafe/index' })}
      >
        <Coffee size={32} color="#92400e" />
        <View className="flex-1">
          <Text className="block text-base font-bold text-amber-900">时空咖啡厅</Text>
          <Text className="block text-xs text-amber-600 mt-1">不同世界的角色在此相遇，留下文字成为跨世界笔友</Text>
        </View>
        <Text className="block text-amber-400 text-lg">›</Text>
      </View>

      {/* Novel List */}
      {loading ? (
        <View className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </View>
      ) : novels.length === 0 ? (
        <View className="flex flex-col items-center justify-center py-20">
          <Sparkles size={48} color="#9e8e92" />
          <Text className="block text-gray-400 text-center mt-4 text-base">
            还没有小世界{'\n'}点击下方按钮创建第一个吧
          </Text>
        </View>
      ) : (
        <View className="flex flex-col gap-3">
          {novels.map((novel) => (
            <Card
              key={novel.id}
              className="relative bg-white rounded-2xl border-0 shadow-sm active:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                {novel.is_pinned && (
                  <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, transform: 'rotate(-45deg)' }}>
                    <Pin size={14} color="#e8587a" strokeWidth={2.5} />
                  </View>
                )}
                <View className="flex items-center gap-3">
                  {/* Cover Image */}
                  <View
                    className="relative w-16 h-20 rounded-xl overflow-hidden bg-pink-50 flex items-center justify-center flex-shrink-0"
                    onClick={() => handleChooseCover(novel)}
                  >
                    {novel.cover_url && (/(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(novel.cover_url) || novel.cover_url.startsWith('data:') || novel.cover_url.startsWith('blob:')) ? (
                      <Image
                        src={novel.cover_url}
                        className="w-full h-full"
                        mode="aspectFill"
                      />
                    ) : (
                      <Sparkles size={24} color="#e8587a" />
                    )}
                    {/* Camera overlay */}
                    <View className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 active:opacity-100">
                      <Camera size={16} color="#ffffff" />
                    </View>
                  </View>

                  {/* Novel Info */}
                  <View className="flex-1" onClick={() => goToNovel(novel)}>
                    <Text className="block text-base font-semibold text-gray-900">
                      {novel.name}
                    </Text>
                    {novel.tagline ? (
                      <Text className="block text-sm text-gray-600 mt-1">
                        {novel.tagline}
                      </Text>
                    ) : null}
                    <Text className="block text-xs text-gray-400 mt-1">
                      点击进入世界
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="relative">
                    <View
                      className="p-2 active:opacity-60"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowActionMenu(novel.id)
                      }}
                    >
                      <View className="flex flex-row items-center justify-center gap-1">
                        <View className="w-1 h-1 rounded-full bg-pink-500" />
                        <View className="w-1 h-1 rounded-full bg-pink-500" />
                        <View className="w-1 h-1 rounded-full bg-pink-500" />
                      </View>
                    </View>
                    {showActionMenu === novel.id && (
                      <View
                        className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-32"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <View
                          className="px-4 py-3 active:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowActionMenu(null)
                            setSelectedNovel(novel)
                            setNewName(novel.name)
                            setNewTagline(novel.tagline || '')
                            setNewEra((novel.era as 'ancient' | 'modern') || 'ancient')
                            setShowRenameDialog(true)
                          }}
                        >
                          <Text className="block text-sm text-gray-700 text-center">修改世界信息</Text>
                        </View>
                        <View
                          className="px-4 py-3 active:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowActionMenu(null)
                            handleTogglePin(novel)
                          }}
                        >
                          <Text className="block text-sm text-gray-700 text-center">
                            {novel.is_pinned ? '取消置顶' : '置顶世界'}
                          </Text>
                        </View>
                        <View
                          className="px-4 py-3 active:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowActionMenu(null)
                            setSelectedNovel(novel)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Text className="block text-sm text-red-600 text-center">删除世界</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      )}


      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">创建新世界</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">为你的世界创建一个角色管理空间</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent"
                placeholder="输入世界名称"
                value={newName}
                onInput={(e) => setNewName(e.detail.value)}
              />
            </View>
            <Text className="block text-gray-400 text-sm mt-4 mb-2">世界时代</Text>
            <View className="flex gap-3">
              <View
                className={`flex-1 rounded-xl px-3 py-2 border ${newEra === 'ancient' ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-stone-50'}`}
                onClick={() => setNewEra('ancient')}
              >
                <Text className={`block text-center text-sm ${newEra === 'ancient' ? 'text-rose-600' : 'text-gray-500'}`}>古代世界</Text>
              </View>
              <View
                className={`flex-1 rounded-xl px-3 py-2 border ${newEra === 'modern' ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-stone-50'}`}
                onClick={() => setNewEra('modern')}
              >
                <Text className={`block text-center text-sm ${newEra === 'modern' ? 'text-rose-600' : 'text-gray-500'}`}>现代世界</Text>
              </View>
            </View>
          </View>
          <View className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-600 rounded-xl"
              onClick={() => setShowAddDialog(false)}
            >
              <Text className="text-gray-600">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleAdd}
            >
              <Text className="text-white">创建</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">修改世界信息</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">修改世界的名称和时代</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3 mb-3">
              <Input
                className="w-full bg-transparent"
                placeholder="输入新名称"
                value={newName}
                onInput={(e) => setNewName(e.detail.value)}
              />
            </View>
            <View className="bg-stone-50 rounded-xl px-4 py-3 mb-3">
              <Input
                className="w-full bg-transparent"
                placeholder="一句话简介（选填，最多15字）"
                value={newTagline}
                maxlength={15}
                onInput={(e) => setNewTagline(e.detail.value)}
              />
            </View>
            <Text className="block text-gray-400 text-xs mb-2">世界时代</Text>
            <View className="flex gap-3">
              <View
                className={`flex-1 py-3 rounded-xl text-center ${newEra === 'ancient' ? 'bg-rose-500 text-white' : 'bg-stone-100 text-gray-600'}`}
                onClick={() => setNewEra('ancient')}
              >
                <Text className={newEra === 'ancient' ? 'text-white' : 'text-gray-600'}>古代</Text>
              </View>
              <View
                className={`flex-1 py-3 rounded-xl text-center ${newEra === 'modern' ? 'bg-rose-500 text-white' : 'bg-stone-100 text-gray-600'}`}
                onClick={() => setNewEra('modern')}
              >
                <Text className={newEra === 'modern' ? 'text-white' : 'text-gray-600'}>现代</Text>
              </View>
            </View>
          </View>
          <View className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-600 rounded-xl"
              onClick={() => setShowRenameDialog(false)}
            >
              <Text className="text-gray-600">取消</Text>
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white rounded-xl"
              onClick={handleRename}
            >
              <Text className="text-white">保存</Text>
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
                确定删除「{selectedNovel?.name}」吗？一旦删除所有数据不可找回。
              </Text>
            </DialogDescription>
          </DialogHeader>
          <View className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-gray-200 text-gray-600 rounded-xl"
              onClick={() => setShowDeleteDialog(false)}
            >
              <Text className="text-gray-600">取消</Text>
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
    </View>
  )
}

export default IndexPage
