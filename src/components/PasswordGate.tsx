import { useEffect } from 'react'
import Taro from '@tarojs/taro'

// 开屏密码（可通过环境变量或配置文件修改）
const ACCESS_PASSWORD = '6602877'

export default function PasswordGate() {
  useEffect(() => {
    // 检查是否已解锁
    const isUnlocked = Taro.getStorageSync('app_unlocked')
    if (isUnlocked) return

    // 创建开屏容器
    const container = document.createElement('div')
    container.id = 'splash-screen'
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `

    // 标题
    const title = document.createElement('div')
    title.textContent = '小世界'
    title.style.cssText = `
      font-size: 32px;
      font-weight: bold;
      color: #e91e63;
      margin-bottom: 40px;
    `

    // 输入框容器
    const inputContainer = document.createElement('div')
    inputContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    `

    // 密码输入框
    const input = document.createElement('input')
    input.type = 'password'
    input.placeholder = '请输入密码'
    input.style.cssText = `
      width: 240px;
      padding: 12px 16px;
      font-size: 16px;
      border: 2px solid #f48fb1;
      border-radius: 8px;
      outline: none;
      background: white;
      text-align: center;
    `

    // 错误提示
    const errorMsg = document.createElement('div')
    errorMsg.style.cssText = `
      color: #d32f2f;
      font-size: 14px;
      min-height: 20px;
      display: none;
    `

    // 确认按钮
    const button = document.createElement('button')
    button.textContent = '确认'
    button.style.cssText = `
      width: 240px;
      padding: 12px;
      font-size: 16px;
      background: #e91e63;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 8px;
    `

    // 验证逻辑
    const handleVerify = () => {
      if (input.value === ACCESS_PASSWORD) {
        Taro.setStorageSync('app_unlocked', true)
        container.remove()
      } else {
        errorMsg.textContent = '密码错误，请重试'
        errorMsg.style.display = 'block'
        input.value = ''
        input.focus()
      }
    }

    button.onclick = handleVerify
    input.onkeypress = (e) => {
      if (e.key === 'Enter') handleVerify()
    }

    // 组装
    inputContainer.appendChild(input)
    inputContainer.appendChild(errorMsg)
    inputContainer.appendChild(button)
    container.appendChild(title)
    container.appendChild(inputContainer)
    document.body.appendChild(container)

    // 自动聚焦
    setTimeout(() => input.focus(), 100)

    // 清理
    return () => {
      if (container.parentNode) {
        container.remove()
      }
    }
  }, [])

  return null
}
