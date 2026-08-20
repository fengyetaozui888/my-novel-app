import { PropsWithChildren, useState, useEffect } from 'react';
import { LucideTaroProvider } from 'lucide-react-taro';
import { View, Text, Input } from '@tarojs/components';
import '@/app.css';
import { Toaster } from '@/components/ui/toast';
import { Preset } from './presets';

// 访问密码（你可以修改这个密码）
const ACCESS_PASSWORD = '123456';
const STORAGE_KEY = 'app_access_verified';

const App = ({ children }: PropsWithChildren) => {
  const [isVerified, setIsVerified] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 检查是否已经验证过
    const verified = sessionStorage.getItem(STORAGE_KEY);
    if (verified === 'true') {
      setIsVerified(true);
    }
    setIsChecking(false);
  }, []);

  const handleVerify = () => {
    if (inputPassword === ACCESS_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setIsVerified(true);
      setError('');
    } else {
      setError('密码错误，请重试');
    }
  };

  // 正在检查验证状态
  if (isChecking) {
    return null;
  }

  // 未验证，显示密码输入页面
  if (!isVerified) {
    return (
      <View className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-8">
        <View className="w-full max-w-sm">
          <View className="text-center mb-8">
            <Text className="block text-3xl font-bold text-gray-800 mb-2">
              欢迎来到
            </Text>
            <Text className="block text-xl text-rose-500 font-medium">
              小说角色互动世界
            </Text>
          </View>

          <View className="bg-white rounded-2xl shadow-lg p-8">
            <Text className="block text-sm text-gray-600 mb-4 text-center">
              请输入访问密码
            </Text>

            <View className="mb-4">
              <Input
                type="text"
                password
                placeholder="请输入密码"
                value={inputPassword}
                onInput={(e: any) => setInputPassword(e.detail.value)}
                onConfirm={handleVerify}
                confirmType="done"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-lg focus:outline-none focus:border-rose-400 transition-colors"
              />
            </View>

            {error && (
              <Text className="block text-sm text-red-500 text-center mb-4">
                {error}
              </Text>
            )}

            <View
              onClick={handleVerify}
              className="w-full bg-rose-500 text-white text-center py-3 rounded-xl font-medium active:bg-rose-600 transition-colors cursor-pointer"
            >
              <Text className="block">确认进入</Text>
            </View>

            <Text className="block text-xs text-gray-400 text-center mt-6">
              忘记密码？请联系应用管理员
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 已验证，显示正常应用
  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <Preset>{children}</Preset>
      <Toaster />
    </LucideTaroProvider>
  );
};

export default App;
