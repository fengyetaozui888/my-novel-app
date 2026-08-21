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

    if (isH5) {
      // H5 端：使用原生 fetch + FormData
      // tempFilePath 在 H5 端是 blob URL，需要转换为 File 对象
      const response = await fetch(tempFilePath)
      const blob = await response.blob()
      const file = new File([blob], 'upload.jpg', { type: blob.type })

      const formData = new FormData()
      formData.append('file', file)

      const uploadUrl = `${PROJECT_DOMAIN}/api/upload`
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
      return null
    } else {
      // 小程序端：使用 Taro.uploadFile
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
      return null
    }
  } catch (error) {
    console.error('uploadFileToServer error:', error)
    return null
  }
}
