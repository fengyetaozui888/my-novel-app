import Taro, { useLaunch } from '@tarojs/taro'
import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import './app.css'

const ACCESS_PASSWORD = '6602877'

function App({ children }) {
  useLaunch(() => {
    console.log('App launched.')
  })

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Taro.getStorageSync('app_access_verified') === 'true'
    } catch {
      return false
    }
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleVerify = () => {
    if (password === ACCESS_PASSWORD) {
      try {
        Taro.setStorageSync('app_access_verified', 'true')
      } catch {}
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('密码错误，请重新输入')
      setPassword('')
    }
  }

  return (
    <>
      {children}
      {!isAuthenticated && (
        <View
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <View style={{ width: '100%', maxWidth: '320px' }}>
            <View style={{ textAlign: 'center', marginBottom: '32px' }}>
              <View
                style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #fb7185 0%, #ec4899 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Text style={{ fontSize: '28px' }}>🔒</Text>
              </View>
              <Text
                className="block"
                style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}
              >
                访问验证
              </Text>
              <Text className="block" style={{ fontSize: '14px', color: '#6b7280' }}>
                请输入访问密码以继续使用
              </Text>
            </View>

            <View
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <View style={{ background: '#f9fafb', borderRadius: '12px', padding: '12px 16px' }}>
                <Input
                  password
                  value={password}
                  onInput={(e: any) => {
                    setPassword(e.detail.value)
                    setError('')
                  }}
                  onConfirm={handleVerify}
                  placeholder="请输入密码"
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '18px',
                    letterSpacing: '4px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                  }}
                />
              </View>
              {error && (
                <Text
                  className="block"
                  style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginTop: '12px' }}
                >
                  {error}
                </Text>
              )}
              <Button
                onClick={handleVerify}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #fb7185 0%, #ec4899 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '16px',
                  fontWeight: '500',
                  border: 'none',
                  fontSize: '16px',
                }}
              >
                确认
              </Button>
            </View>

            <Text
              className="block"
              style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '24px' }}
            >
              忘记密码请联系应用管理员
            </Text>
          </View>
        </View>
      )}
    </>
  )
}

export default App
