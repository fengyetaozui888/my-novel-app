import { useEffect } from 'react'
import Taro from '@tarojs/taro'

function App({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 检查是否已解锁
    const unlocked = Taro.getStorageSync('app_unlocked')
    const currentPage = Taro.getCurrentPages()
    const currentPath = currentPage.length > 0 ? currentPage[currentPage.length - 1].route : ''

    // 如果未解锁且不在密码页面，跳转到密码页面
    if (unlocked !== 'true' && currentPath !== 'pages/password/index') {
      Taro.redirectTo({ url: '/pages/password/index' })
    }
  }, [])

  return children
}

export default App
