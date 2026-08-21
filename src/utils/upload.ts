import Taro from '@tarojs/taro'
import { Network } from '@/network'

/**
 * 跨端文件上传工具
 * H5 端使用原生 fetch + FormData（绕过 Taro uploadFile 的 SW 拦截问题）
 * 小程序端使用 Taro.uploadFile
 */
export async function uploadFileToServer(tempFilePath: string): Promise<{ key: string; url: string } | null> {
  try {
    // 检测是否为 H5 环境
    const isH5 = Taro.getEnv() === Taro.ENV_TYPE.WEB
    console.log('uploadFileToServer: isH5 =', isH5, 'tempFilePath =', tempFilePath)

    if (isH5) {
      // H5 端：使用原生 fetch + FormData
      // tempFilePath 在 H5 端通常是 blob URL
      
      // 尝试从 tempFilePath 获取文件
      let file: File | null = null
      
      // 方法 1: 如果是 blob URL，用 fetch 获取
      if (tempFilePath.startsWith('blob:')) {
        console.log('H5: 使用 blob URL 方式')
        try {
          const response = await fetch(tempFilePath)
          const blob = await response.blob()
          file = new File([blob], 'upload.jpg', { type: blob.type })
        } catch (e) {
          console.error('H5: blob fetch 失败', e)
        }
      }
      
      // 方法 2: 如果是 data URL
      if (!file && tempFilePath.startsWith('data:')) {
        console.log('H5: 使用 data URL 方式')
        const res = await fetch(tempFilePath)
        const blob = await res.blob()
        file = new File([blob], 'upload.jpg', { type: blob.type })
      }
      
      if (!file) {
        console.error('H5: 无法获取文件对象', tempFilePath)
        Taro.showToast({ title: '无法获取文件', icon: 'none' })
        return null
      }

      const formData = new FormData()
      formData.append('file', file)

      const uploadUrl = `${PROJECT_DOMAIN}/api/upload`
      console.log('H5: 上传到', uploadUrl)
      
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        // 不要设置 Content-Type，让浏览器自动处理 boundary
      })

      const data = await res.json()
      console.log('H5 upload response:', data)

      if (data?.code === 200 && data?.data?.key) {
        return data.data
      }
      
      Taro.showToast({ title: data?.msg || '上传失败', icon: 'none' })
      return null
    } else {
      // 小程序端：使用 Taro.uploadFile
      console.log('MiniApp: 使用 Taro.uploadFile')
      const uploadRes = await Network.uploadFile({
        url: '/api/upload',
        filePath: tempFilePath,
        name: 'file',
      })

      console.log('MiniApp upload response:', uploadRes.data)
      const uploadData = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
      const result = uploadData?.data || uploadData

      if (result?.key) {
        return result
      }
      
      Taro.showToast({ title: '上传失败', icon: 'none' })
      return null
    }
  } catch (error) {
    console.error('uploadFileToServer error:', error)
    Taro.showToast({ title: '上传出错', icon: 'none' })
    return null
  }
}
