import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const ACCESS_PASSWORD = '6602877'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (password === ACCESS_PASSWORD) {
      Taro.setStorageSync('app_unlocked', 'true')
      Taro.redirectTo({ url: '/pages/index/index' })
    } else {
      setError('密码错误，请重试')
      setPassword('')
    }
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50 flex flex-col items-center justify-center px-8">
      <View className="w-full max-w-sm">
        <Text className="block text-3xl font-bold text-foreground text-center mb-2">
          角色宇宙
        </Text>
        <Text className="block text-sm text-muted-foreground text-center mb-8">
          请输入访问密码
        </Text>

        <View className="bg-white rounded-2xl p-6 shadow-sm">
          <View className="mb-4">
            <View className="bg-muted rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent text-center text-lg tracking-widest border-0 focus:ring-0"
                placeholder="请输入密码"
                password
                value={password}
                onInput={(e: any) => { setPassword(e.detail.value); setError('') }}
                onConfirm={handleConfirm}
                focus
              />
            </View>
          </View>

          {error && (
            <Text className="block text-sm text-destructive text-center mb-4">
              {error}
            </Text>
          )}

          <Button
            className="w-full rounded-xl py-3 text-base font-medium"
            variant="default"
            onClick={handleConfirm}
          >
            <Text>确认</Text>
          </Button>
        </View>

        <Text className="block text-xs text-muted-foreground text-center mt-6">
          忘记密码请联系管理员
        </Text>
      </View>
    </View>
  )
}
