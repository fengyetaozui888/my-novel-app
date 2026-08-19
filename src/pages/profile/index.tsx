import { useState, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { User, Pencil, Camera, Coins, CreditCard, BookHeart, MessageSquareWarning } from 'lucide-react-taro'
import { Separator } from '@/components/ui/separator'

interface UserProfile {
  id: string
  uid: string
  nickname: string
  avatar_key: string | null
  avatar_url: string | null
  credits: number
  nickname_updated_at: string | null
}

const RECHARGE_PACKAGES = [
  { amount: 60, price: 6, label: '尝鲜礼包' },
  { amount: 300, price: 30, label: '常用礼包' },
  { amount: 680, price: 68, label: '畅享礼包' },
  { amount: 1280, price: 128, label: '至尊礼包' },
  { amount: 3280, price: 328, label: '尊贵礼包' },
  { amount: 6480, price: 648, label: '超值礼包' },
]

const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [showRechargeDialog, setShowRechargeDialog] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [recharging, setRecharging] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const res = await Network.request({ url: '/api/users/profile' })
      console.log('profile response:', res.data)
      const data = res.data?.data || res.data
      setProfile(data)
    } catch (err) {
      console.error('fetch profile error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    fetchProfile()
  })

  const handleUploadAvatar = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })

      // H5 端特殊处理
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

      const updateRes = await Network.request({
        url: '/api/users/avatar',
        method: 'PUT',
        data: { avatar_key: key },
      })
      console.log('avatar update response:', updateRes.data)
      const updatedData = updateRes.data?.data || updateRes.data
      setProfile(updatedData)
      Taro.showToast({ title: '头像已更新', icon: 'success' })
    } catch (err) {
      console.error('upload avatar error:', err)
      Taro.showToast({ title: '上传失败', icon: 'none' })
    }
  }

  const handleRecharge = async () => {
    if (selectedPackage === null) return

    try {
      setRecharging(true)
      const res = await Network.request({
        url: '/api/users/recharge',
        method: 'POST',
        data: { amount: selectedPackage, packageId: `pack_${selectedPackage}` },
      })
      console.log('recharge response:', res.data)

      const data = res.data?.data || res.data
      if (data?.credits !== undefined) {
        setProfile(data)
        setShowRechargeDialog(false)
        setSelectedPackage(null)
        Taro.showToast({ title: `充值成功 +${selectedPackage}积分`, icon: 'success' })
      } else {
        Taro.showToast({ title: res.data?.msg || '充值失败', icon: 'none' })
      }
    } catch (err) {
      console.error('recharge error:', err)
      Taro.showToast({ title: '充值失败', icon: 'none' })
    } finally {
      setRecharging(false)
    }
  }

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) return

    try {
      const res = await Network.request({
        url: '/api/users/nickname',
        method: 'PUT',
        data: { nickname: newNickname.trim() },
      })
      console.log('nickname update response:', res.data)

      if (res.data?.code === 400) {
        Taro.showToast({ title: res.data.msg || '修改失败', icon: 'none' })
        return
      }

      const data = res.data?.data || res.data
      setProfile(data)
      setShowNicknameDialog(false)
      setNewNickname('')
      Taro.showToast({ title: '昵称已更新', icon: 'success' })
    } catch (err) {
      console.error('update nickname error:', err)
      Taro.showToast({ title: '修改失败', icon: 'none' })
    }
  }

  const getDaysUntilCanChange = (): number => {
    if (!profile?.nickname_updated_at) return 0
    const lastUpdate = new Date(profile.nickname_updated_at)
    const now = new Date()
    const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(0, Math.ceil(15 - daysDiff))
  }



  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen">
        <Text className="text-gray-400">加载中...</Text>
      </View>
    )
  }

  const daysRemaining = getDaysUntilCanChange()

  return (
    <View className="min-h-screen bg-stone-50 pb-20">
      {/* Profile Header */}
      <View
        className="px-6 pt-10 pb-8"
        style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' }}
      >
        <View className="flex items-center gap-5">
          {/* Avatar */}
          <View className="relative">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                className="w-20 h-20 rounded-full border-4 border-white"
                mode="aspectFill"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white">
                <User size={32} color="#ec4899" />
              </View>
            )}
            <View
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center border-2 border-white"
              onClick={handleUploadAvatar}
            >
              <Camera size={12} color="#ffffff" />
            </View>
          </View>

          {/* Name and UID */}
          <View className="flex-1">
            <View className="flex items-center gap-2">
              <Text className="text-xl font-bold text-gray-900">{profile?.nickname || '无名氏'}</Text>
              <View
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
                onClick={() => {
                  setNewNickname(profile?.nickname || '')
                  setShowNicknameDialog(true)
                }}
              >
                <Pencil size={12} color="#ec4899" />
              </View>
            </View>
            <Text className="block text-sm text-gray-600 mt-1">UID: {profile?.uid || '--'}</Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View className="px-4 -mt-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <View className="flex items-center justify-around">
              <View className="flex items-center gap-2">
                <Coins size={24} color="#f59e0b" />
                <View>
                  <Text className="block text-lg font-bold text-gray-900">{profile?.credits || 0}</Text>
                  <Text className="block text-xs text-gray-500">剩余积分</Text>
                </View>
              </View>
              <View className="w-px h-10 bg-gray-200" />
              <View className="flex items-center gap-2">
                <CreditCard size={24} color="#8b5cf6" />
                <View>
                  <Text className="block text-lg font-bold text-gray-900">
                    {daysRemaining > 0 ? `${daysRemaining}天` : '可修改'}
                  </Text>
                  <Text className="block text-xs text-gray-500">昵称冷却</Text>
                </View>
              </View>
            </View>
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Button
                className="w-full bg-pink-500 text-white rounded-xl"
                onClick={() => setShowRechargeDialog(true)}
              >
                <Text className="text-white font-medium">充值积分</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Menu Items */}
      <View className="px-4 mt-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <View
              className="flex items-center justify-between p-4 border-b border-gray-100"
              onClick={() => {
                setNewNickname(profile?.nickname || '')
                setShowNicknameDialog(true)
              }}
            >
              <View className="flex items-center gap-3">
                <Pencil size={18} color="#ec4899" />
                <Text className="text-base text-gray-700">修改昵称</Text>
              </View>
              <Text className="text-sm text-gray-400">
                {daysRemaining > 0 ? `${daysRemaining}天后可改` : '可修改'}
              </Text>
            </View>
            <View
              className="flex items-center justify-between p-4"
              onClick={handleUploadAvatar}
            >
              <View className="flex items-center gap-3">
                <Camera size={18} color="#ec4899" />
                <Text className="text-base text-gray-700">修改头像</Text>
              </View>
              <Text className="text-sm text-gray-400">点击上传</Text>
            </View>
            <Separator />
            <View
              className="flex items-center justify-between p-4"
              onClick={() => Taro.navigateTo({ url: '/pages/affinity-book/index' })}
            >
              <View className="flex items-center gap-3">
                <BookHeart size={18} color="#ec4899" />
                <Text className="text-base text-gray-700">亲密度图鉴</Text>
              </View>
              <Text className="text-sm text-gray-400">查看全部</Text>
            </View>
            <Separator />
            <View
              className="flex items-center justify-between p-4"
              onClick={() => Taro.navigateTo({ url: '/pages/agent-feedback/index' })}
            >
              <View className="flex items-center gap-3">
                <MessageSquareWarning size={18} color="#ec4899" />
                <Text className="text-base text-gray-700">agent反馈</Text>
              </View>
              <Text className="text-sm text-gray-400">优化角色模拟</Text>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Nickname Dialog */}
      <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改昵称</DialogTitle>
            <DialogDescription>
              {daysRemaining > 0
                ? `昵称每15天可修改一次，还需等待 ${daysRemaining} 天`
                : '昵称修改后15天内不可再次修改'}
            </DialogDescription>
          </DialogHeader>
          <View className="py-4">
            <View className="bg-gray-50 rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent"
                placeholder="请输入新昵称"
                value={newNickname}
                onInput={(e) => setNewNickname(e.detail.value)}
                maxlength={20}
              />
            </View>
          </View>
          <View className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 text-gray-700 border-0"
              onClick={() => setShowNicknameDialog(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white"
              disabled={daysRemaining > 0 || !newNickname.trim()}
              onClick={handleUpdateNickname}
            >
              确认修改
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>充值积分</DialogTitle>
            <DialogDescription>
              3D 互动场景消耗积分：生成立绘 20 积分 / 次，互动反应 5 积分 / 次
            </DialogDescription>
          </DialogHeader>
          <View className="grid grid-cols-3 gap-3 py-2">
            {RECHARGE_PACKAGES.map((pkg) => (
              <Button
                key={pkg.amount}
                variant={selectedPackage === pkg.amount ? 'default' : 'outline'}
                className={`flex flex-col items-center py-3 h-auto ${
                  selectedPackage === pkg.amount
                    ? 'bg-rose-500 text-white border-0'
                    : 'border-rose-200 text-gray-700'
                }`}
                onClick={() => setSelectedPackage(pkg.amount)}
              >
                <Text className="block text-lg font-bold">{pkg.amount}</Text>
                <Text className="block text-xs opacity-80">积分</Text>
                <Text className="block text-xs opacity-70 mt-1">¥{pkg.price}</Text>
              </Button>
            ))}
          </View>
          <View className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 text-gray-700 border-0"
              onClick={() => setShowRechargeDialog(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-rose-500 text-white"
              disabled={selectedPackage === null || recharging}
              onClick={handleRecharge}
            >
              {recharging ? '充值中...' : '确认充值'}
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}

export default ProfilePage
