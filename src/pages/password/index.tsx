import { useEffect } from 'react'
import Taro from '@tarojs/taro'

const ACCESS_PASSWORD = '6602877'

export default function PasswordPage() {
  useEffect(() => {
    // Create splash screen using native DOM, completely outside Taro's rendering tree
    const container = document.createElement('div')
    container.id = 'splash-screen'
    container.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 99999;
      background: linear-gradient(135deg, #fce7f3 0%, #fecdd3 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `

    const title = document.createElement('div')
    title.textContent = '小世界'
    title.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #e11d48;
      margin-bottom: 40px;
    `

    const input = document.createElement('input')
    input.type = 'password'
    input.placeholder = '请输入访问密码'
    input.style.cssText = `
      width: 280px;
      padding: 16px 20px;
      border: 2px solid #fda4af;
      border-radius: 12px;
      font-size: 18px;
      text-align: center;
      outline: none;
      background: white;
      color: #333;
      margin-bottom: 20px;
    `

    const hint = document.createElement('div')
    hint.textContent = '输入正确密码进入应用'
    hint.style.cssText = `
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 30px;
    `

    const btn = document.createElement('button')
    btn.textContent = '确认'
    btn.style.cssText = `
      width: 280px;
      padding: 16px;
      background: #e11d48;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
    `

    const error = document.createElement('div')
    error.style.cssText = `
      font-size: 14px;
      color: #ef4444;
      margin-top: 16px;
      min-height: 20px;
    `

    const handleUnlock = () => {
      if (input.value === ACCESS_PASSWORD) {
        Taro.setStorageSync('app_unlocked', true)
        container.remove()
        // Navigate to home page
        Taro.redirectTo({ url: '/pages/index/index' })
      } else {
        error.textContent = '密码错误，请重新输入'
        input.value = ''
        input.focus()
      }
    }

    btn.addEventListener('click', handleUnlock)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUnlock()
    })

    container.appendChild(title)
    container.appendChild(input)
    container.appendChild(hint)
    container.appendChild(btn)
    container.appendChild(error)
    document.body.appendChild(container)

    input.focus()

    return () => {
      if (container.parentNode) {
        container.remove()
      }
    }
  }, [])

  // This page renders nothing visible - the splash screen is native DOM
  return null
}
