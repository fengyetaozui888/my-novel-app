import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { Textarea } from '@/components/ui/textarea'
import Taro, { useRouter } from '@tarojs/taro'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader, Check, ChevronDown, CircleQuestionMark, Sparkles } from 'lucide-react-taro'

interface WorldInfoData {
  forces: string
  cultivation_system: string
  secret_realms: string
  map_layers: string
  world_friendliness: string
  other: string
}

const ANCIENT_FIELDS = [
  { key: 'forces' as const, label: '势力分布', placeholder: '如：青云门、天魔教、散修联盟、皇室势力...' },
  { key: 'cultivation_system' as const, label: '修炼体系', placeholder: '如：炼气→筑基→金丹→元婴→化神→渡劫...' },
  { key: 'secret_realms' as const, label: '秘境模式举例', placeholder: '如：每月朔月开启的幽冥秘境、百年一现的仙府...' },
  { key: 'map_layers' as const, label: '地图层次', placeholder: '如：凡人界→修真界→仙界、东荒→西漠→南岭...' },
]

const MODERN_FIELDS = [
  { key: 'forces' as const, label: '势力分布', placeholder: '如：联邦政府、财阀集团、地下组织...' },
  { key: 'cultivation_system' as const, label: '科技水平', placeholder: '如：AI普及程度、太空殖民阶段、基因改造技术...' },
  { key: 'secret_realms' as const, label: '特殊区域', placeholder: '如：禁区、隔离带、地下城、浮空城...' },
  { key: 'map_layers' as const, label: '地理版图', placeholder: '如：上城区/下城区、地表/地下、地球/火星殖民地...' },
]

const UNIVERSAL_FIELDS = [
  { key: 'world_friendliness' as const, label: '世界友好度', placeholder: '描述这个世界的整体氛围与生存法则...' },
  { key: 'other' as const, label: '其他', placeholder: '补充任何我们未涵盖的设定...' },
]

const FRIENDLINESS_HELP = `世界友好度，是指这个世界中不同群体之间的相处模式与生存法则。

例如：
• 弱肉强食型：如修仙界、末世，实力为尊，弱者在夹缝中求生
• 表面和谐型：如现代星际，多势力共治，法律完善，罪恶只在暗面涌动
• 阶层分化型：如赛博朋克，高科技与低生活并存，上城与下城泾渭分明
• 温暖治愈型：如童话世界，善意是通行的货币，互助是生存的法则`

const EMPTY_DATA: WorldInfoData = {
  forces: '',
  cultivation_system: '',
  secret_realms: '',
  map_layers: '',
  world_friendliness: '',
  other: '',
}

export default function WorldInfoPage() {
  const router = useRouter()
  const novelId = router.params.id || ''
  const novelName = router.params.name || '这个世界'
  const era = router.params.era || 'ancient'
  const isAncient = era !== 'modern'

  const [formData, setFormData] = useState<WorldInfoData>({ ...EMPTY_DATA })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())

  const fields = isAncient ? ANCIENT_FIELDS : MODERN_FIELDS

  // Load existing world info
  useEffect(() => {
    if (novelId) {
      Network.request({ url: `/api/novels/${novelId}` })
        .then((res: any) => {
          const novel = res.data?.data
          if (novel?.world_info) {
            try {
              const parsed = JSON.parse(novel.world_info)
              setFormData({ ...EMPTY_DATA, ...parsed })
              // Expand all fields that have content
              const expanded = new Set<string>()
              Object.entries(parsed).forEach(([key, val]) => {
                if (val && String(val).trim()) expanded.add(key)
              })
              setExpandedFields(expanded)
            } catch {
              // If it's plain text (old format), put it in 'other'
              setFormData(prev => ({ ...prev, other: novel.world_info }))
            }
          }
        })
        .catch(() => {})
    }
  }, [novelId])

  const handleFieldChange = (key: keyof WorldInfoData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const toggleField = (key: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSave = async () => {
    // Check if at least one field has content
    const hasContent = Object.values(formData).some(v => v.trim())
    if (!hasContent) {
      Taro.showToast({ title: '请至少填写一项世界信息', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await Network.request({
        url: `/api/novels/${novelId}/world-info`,
        method: 'POST',
        data: { world_info: JSON.stringify(formData) },
      })
      setSaved(true)
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1000)
    } catch (e) {
      Taro.showToast({ title: '保存失败', icon: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const hasContent = Object.values(formData).some(v => v.trim())

  return (
    <View className="min-h-screen bg-stone-50">
      {/* Header */}
      <View className="bg-white border-b border-stone-200 px-4 py-3">
        <Text className="block text-lg font-semibold text-stone-800">世界信息</Text>
        <Text className="block text-xs text-stone-500 mt-1">{novelName}</Text>
      </View>

      <ScrollView scrollY className="h-[calc(100vh-140px)]">
        <View className="p-4 space-y-4">
          {/* Tip Card */}
          <View className="bg-rose-50 rounded-2xl p-4 flex items-start gap-3">
            <View className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} color="#e8587a" />
            </View>
            <View className="flex-1">
              <Text className="block text-sm text-rose-700 font-medium">
                世界信息越完善，生成的内容就越真实哦~
              </Text>
            </View>
          </View>

          {/* Era-specific fields */}
          <View>
            <View className="flex items-center gap-2 mb-3">
              <View className="flex-1 h-px bg-stone-200" />
              <Text className="block text-xs text-stone-400 px-2">
                {isAncient ? '古代 · 仙侠世界' : '现代 · 都市世界'}
              </Text>
              <View className="flex-1 h-px bg-stone-200" />
            </View>

            {fields.map((field) => {
              const isExpanded = expandedFields.has(field.key)
              const value = formData[field.key]
              return (
                <View key={field.key} className="bg-white rounded-2xl mb-3 overflow-hidden shadow-sm">
                  <View
                    className="flex items-center justify-between px-4 py-3 active:bg-stone-50"
                    onClick={() => toggleField(field.key)}
                  >
                    <Text className="block text-sm font-semibold text-stone-700">{field.label}</Text>
                    <ChevronDown
                      size={16}
                      color="#9e8e92"
                      className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'}
                    />
                  </View>
                  {isExpanded && (
                    <View className="px-4 pb-4">
                      <View className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                        <Textarea
                          className="w-full bg-transparent text-sm text-stone-800"
                          style={{ minHeight: '80px', width: '100%' }}
                          placeholder={field.placeholder}
                          value={value}
                          onInput={(e) => handleFieldChange(field.key, e.detail.value)}
                          maxlength={500}
                        />
                      </View>
                      <Text className="block text-xs text-stone-400 mt-1">{value.length} / 500</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>

          {/* Universal fields */}
          <View>
            <View className="flex items-center gap-2 mb-3">
              <View className="flex-1 h-px bg-stone-200" />
              <Text className="block text-xs text-stone-400 px-2">通用设定</Text>
              <View className="flex-1 h-px bg-stone-200" />
            </View>

            {UNIVERSAL_FIELDS.map((field) => {
              const isExpanded = expandedFields.has(field.key)
              const value = formData[field.key]
              const isFriendliness = field.key === 'world_friendliness'
              return (
                <View key={field.key} className="bg-white rounded-2xl mb-3 overflow-hidden shadow-sm">
                  <View
                    className="flex items-center justify-between px-4 py-3 active:bg-stone-50"
                    onClick={() => toggleField(field.key)}
                  >
                    <View className="flex items-center gap-2">
                      <Text className="block text-sm font-semibold text-stone-700">{field.label}</Text>
                      {isFriendliness && (
                        <CircleQuestionMark
                          size={14}
                          color="#e8587a"
                          onClick={(e: any) => {
                            e.stopPropagation()
                            setShowHelp(true)
                          }}
                        />
                      )}
                    </View>
                    <ChevronDown
                      size={16}
                      color="#9e8e92"
                      className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'}
                    />
                  </View>
                  {isExpanded && (
                    <View className="px-4 pb-4">
                      <View className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                        <Textarea
                          className="w-full bg-transparent text-sm text-stone-800"
                          style={{ minHeight: '80px', width: '100%' }}
                          placeholder={field.placeholder}
                          value={value}
                          onInput={(e) => handleFieldChange(field.key, e.detail.value)}
                          maxlength={500}
                        />
                      </View>
                      <Text className="block text-xs text-stone-400 mt-1">{value.length} / 500</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>

          {/* Save Button */}
          <Button
            className="w-full bg-rose-500 text-white rounded-xl mt-4"
            disabled={saving || !hasContent}
            onClick={handleSave}
          >
            {saving ? (
              <View className="flex items-center justify-center gap-2">
                <Loader size={16} color="#ffffff" className="animate-spin" />
                <Text className="block text-sm">保存中...</Text>
              </View>
            ) : saved ? (
              <View className="flex items-center justify-center gap-2">
                <Check size={16} color="#ffffff" />
                <Text className="block text-sm">已保存</Text>
              </View>
            ) : (
              <Text className="block text-sm">保存世界信息</Text>
            )}
          </Button>
        </View>
      </ScrollView>

      {/* World Friendliness Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-white rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <View className="flex items-center gap-2">
                <CircleQuestionMark size={20} color="#e8587a" />
                <Text className="text-stone-800 text-lg font-bold">世界友好度说明</Text>
              </View>
            </DialogTitle>
          </DialogHeader>
          <View className="mt-4">
            <Text className="block text-sm text-stone-600 leading-6 whitespace-pre-line">
              {FRIENDLINESS_HELP}
            </Text>
          </View>
          <View className="mt-6">
            <Button
              className="w-full bg-rose-500 text-white rounded-xl"
              onClick={() => setShowHelp(false)}
            >
              <Text className="text-white text-sm">知道了</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}
