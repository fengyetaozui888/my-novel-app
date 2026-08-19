import { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react-taro'

interface Novel {
  id: string
  name: string
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
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null)

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
        data: { name: newName.trim() },
      })
      setNewName('')
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

  const goToNovel = (novel: Novel) => {
    Taro.navigateTo({ url: `/pages/novel/index?id=${novel.id}&name=${encodeURIComponent(novel.name)}` })
  }

  return (
    <View className="min-h-screen bg-stone-50 px-4 py-6">
      {/* Header */}
      <View className="flex items-center justify-between mb-6">
        <View className="flex items-center gap-2">
          <BookOpen size={24} color="#e8587a" />
          <Text className="block text-xl font-bold text-gray-900">我的小说</Text>
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
          <Text className="text-white text-sm">新建</Text>
        </Button>
      </View>

      {/* Novel List */}
      {loading ? (
        <View className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </View>
      ) : novels.length === 0 ? (
        <View className="flex flex-col items-center justify-center py-20">
          <BookOpen size={48} color="#9e8e92" />
          <Text className="block text-gray-400 text-center mt-4 text-base">
            还没有小说模块{'\n'}点击下方按钮创建第一个吧
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
                <View className="flex items-center justify-between">
                  <View
                    className="flex-1 flex items-center gap-3"
                    onClick={() => goToNovel(novel)}
                  >
                    <View className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                      <BookOpen size={20} color="#e8587a" />
                    </View>
                    <View className="flex-1">
                      <Text className="block text-base font-semibold text-gray-900">
                        {novel.name}
                      </Text>
                      <Text className="block text-xs text-gray-400 mt-1">
                        点击管理角色
                      </Text>
                    </View>
                  </View>
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

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              <Text className="text-gray-900 text-lg font-bold">新建小说模块</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">为你的小说创建一个角色管理模块</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-gray-900"
                placeholder="输入小说名称"
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
              <Text className="text-gray-900 text-lg font-bold">重命名模块</Text>
            </DialogTitle>
            <DialogDescription>
              <Text className="text-gray-400 text-sm">修改小说模块的名称</Text>
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <View className="bg-stone-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-gray-900"
                placeholder="输入新名称"
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
                确定要删除「{selectedNovel?.name}」吗？{'\n'}该小说下的所有角色也会被删除，此操作不可恢复。
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
    </View>
  )
}

export default IndexPage
