import { useState, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Sparkles, Plus, Pencil, Trash2, Camera, Coffee } from 'lucide-react-taro'

interface Novel {
  id: string
  name: string
  cover_key: string | null
  cover_url: string | null
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
  const [newEra, setNewEra] = useState<'ancient' | 'modern'>('ancient')
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)

  const fetchNovels = useCallback(async () => {
    try {
      setLoading(true)
      const res = await Network.request({ url: '/api/novels' })
      console.log('fetchNovels response:', res.data)
      const data = res.data?.data || res.data || []
      setNovels(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('fetchNovels error:', err)
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
      await Network.request({
        url: `/api/novels/${selectedNovel.id}`,
        method: 'PUT',
        data: { name: newName.trim() },
      })
      setNewName('')
      setShowRenameDialog(false)
      setSelectedNovel(null)
      fetchNovels()
    } catch (err) {
      console.error('renameNovel error:', err)
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

  const handleChooseCover = async (novel: Novel) => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const tempFilePath = res.tempFilePaths[0]
      setUploadingCover(true)

      const uploadRes = await Network.uploadFile({
        url: '/api/upload',
        filePath: tempFilePath,
        name: 'file',
      })
      console.log('uploadCover response:', uploadRes.data)
      const uploadData = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
      const result = uploadData?.data || uploadData
      if (result?.key) {
        await Network.request({
          url: `/api/novels/${novel.id}`,
          method: 'PUT',
          data: { cover_key: result.key },
        })
        fetchNovels()
        Taro.showToast({ title: '封面已更新', icon: 'success' })
      }
    } catch (err) {
      console.error('uploadCover error:', err)
      Taro.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      setUploadingCover(false)
    }
  }

  const goToNovel = (novel: Novel) => {
    Taro.navigateTo({ url: `/pages/novel/index?id=${novel.id}&name=${encodeURIComponent(novel.name)}` })
  }

  return (
    <View className="min-h-screen bg-stone-50 px-4 py-6">
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
              className="bg-white rounded-2xl border-0 shadow-sm active:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <View className="flex items-center gap-3">
                  {/* Cover Image */}
                  <View
                    className="relative w-16 h-20 rounded-xl overflow-hidden bg-pink-50 flex items-center justify-center flex-shrink-0"
                    onClick={() => handleChooseCover(novel)}
                  >
                    {novel.cover_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(novel.cover_url) ? (
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
                    <Text className="block text-xs text-gray-400 mt-1">
                      点击管理角色
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2"
                      onClick={() => {
                        setSelectedNovel(novel)
                        setNewName(novel.name)
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
                        setSelectedNovel(novel)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </Button>
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      )}

      {uploadingCover && (
        <View className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <View className="bg-white rounded-2xl px-6 py-4">
            <Text className="block text-gray-600 text-center">上传封面中...</Text>
          </View>
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
                className={`flex-1 rounded-xl px-4 py-3 border ${newEra === 'ancient' ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-stone-50'}`}
                onClick={() => setNewEra('ancient')}
              >
                <Text className={`block text-center ${newEra === 'ancient' ? 'text-rose-600' : 'text-gray-500'}`}>古代世界</Text>
              </View>
              <View
                className={`flex-1 rounded-xl px-4 py-3 border ${newEra === 'modern' ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-stone-50'}`}
                onClick={() => setNewEra('modern')}
              >
                <Text className={`block text-center ${newEra === 'modern' ? 'text-rose-600' : 'text-gray-500'}`}>现代世界</Text>
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
              <Text className="text-gray-900 text-lg font-bold">重命名世界</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">修改世界的名称</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent"
                placeholder="输入新名称"
                value={newName}
                onInput={(e) => setNewName(e.detail.value)}
              />
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
                确定要删除「{selectedNovel?.name}」吗？{'\n'}该操作将同时删除所有角色数据，不可恢复。
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
