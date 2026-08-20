import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen,
  UserPlus,
  MessageCircle,
  Heart,
  Camera,
  Sparkles,
  Circle,
  ChevronRight,
  Palette,
  CircleAlert,
  Coffee,
} from 'lucide-react-taro'

interface HelpSection {
  icon: React.ReactNode
  title: string
  subtitle: string
  content: string[]
}

const VERSION = 'v1.4.0'
const UPDATE_DATE = '2026-08-21'

const HelpPage = () => {
  const sections: HelpSection[] = [
    {
      icon: <BookOpen size={20} color="#ec4899" />,
      title: '1. 创建小说',
      subtitle: '开启你的创作之旅',
      content: [
        '在首页点击「创建小说」，输入小说名称和简介。',
        '可选择世界时代（古代/现代），底部导航栏会跟随时代变动。',
        '可设置「一句话简介」（15字以内），显示在世界名下方。',
        '每部小说可以拥有多个角色，角色之间可以建立关系。',
        '创建后进入「角色管理」页面，开始设定你的角色世界。',
      ],
    },
    {
      icon: <UserPlus size={20} color="#ec4899" />,
      title: '2. 添加角色卡',
      subtitle: '塑造鲜活的人物',
      content: [
        '在角色管理页，点击右上角「+ 添加角色卡」创建新角色。',
        '为每个角色设定：人设定位、背景故事、人物小传、行事准则、具体事例。',
        '角色分为三类：主角、重要配角、不重要角色，可在顶部 Tab 切换查看。',
        '长按角色卡可置顶/取消置顶，置顶角色会出现在列表顶部（左上角有粉色图钉标识）。',
        '💡 未来版本可能支持：为角色选择/生成专属立绘，让角色卡片更生动。',
      ],
    },
    {
      icon: <MessageCircle size={20} color="#ec4899" />,
      title: '3. 与角色对话',
      subtitle: '沉浸式互动体验',
      content: [
        '在角色卡上点击「对话」图标，进入对话界面。',
        '选择对话模式：「我自己」以你的身份对话，或「设定角色」让两个角色互相交谈。',
        '每次对话会增加亲密度，亲密度越高，角色对你越亲近。',
        '对话由扣子平台 AI 驱动，角色会根据人设和亲密度做出不同反应。',
        '🧠 新增：分层记忆系统，角色能记住对话中的重要信息，人设更稳定。',
      ],
    },
    {
      icon: <Heart size={20} color="#ec4899" />,
      title: '4. 亲密度图鉴',
      subtitle: '查看关系进展',
      content: [
        '在「我的」页面进入「亲密度图鉴」，查看所有角色与你的亲密度。',
        '亲密度满 100 时，角色会对你产生特殊情感。',
        '点击角色卡上的「编辑」按钮，可以设定「我」在该角色眼中的人设（每角色独立）。',
        '修改「我」的人设后，会获得一次手动调整亲密度的机会。',
      ],
    },
    {
      icon: <Camera size={20} color="#ec4899" />,
      title: '5. 朋友圈',
      subtitle: '角色们的日常生活',
      content: [
        '在底部导航栏切换到「朋友圈」，查看角色们发布的动态。',
        '角色会根据人设自动生成朋友圈内容，你也可以点击右上角「+」发布自己的动态。',
        '左上角灰色相机图标可以更换朋友圈背景图。',
        '可以点赞、评论角色的动态，角色之间也会互相评论互动。',
        '点击蓝色字体（角色名）可跳转到该角色的个人朋友圈。',
        '🔄 新增：点击顶部刷新图标，每天可刷新一次朋友圈（角色>10时生成3-5条，≤10时生成1-3条）。',
      ],
    },
    {
      icon: <Sparkles size={20} color="#ec4899" />,
      title: '6. 小说图谱',
      subtitle: '可视化人物关系',
      content: [
        '在角色管理页右下角点击「关系图」，进入小说图谱页面。',
        '图谱以可视化方式展示角色之间的关系网络。',
        '可以查看角色之间的关联强度和关系类型。',
      ],
    },
    {
      icon: <MessageCircle size={20} color="#ec4899" />,
      title: '7. 群聊',
      subtitle: '多角色互动',
      content: [
        '在底部导航栏切换到「群聊」，查看已创建的群聊列表。',
        '点击「创建群聊」按钮，输入群聊名称，选择参与的角色（至少2个）。',
        '群聊中多个角色会根据人设自动互动，你可以参与对话。',
        '群聊界面顶部显示群聊名称和成员列表。',
      ],
    },
    {
      icon: <Palette size={20} color="#ec4899" />,
      title: '8. 3D 互动场景',
      subtitle: '让角色活起来（开发中）',
      content: [
        '未来将支持为角色生成 3D 互动场景。',
        '消耗积分可生成立绘和互动反应。',
        '敬请期待！',
      ],
    },
    {
      icon: <CircleAlert size={20} color="#ec4899" />,
      title: '9. Agent 反馈',
      subtitle: '优化角色表现',
      content: [
        '当角色做出不符合人设的行为时，在「我的」页面进入「agent反馈」。',
        '选择对应角色，描述问题行为，提交反馈。',
        'AI 会分析反馈并生成行为准则，即时优化该角色的模拟表现。',
      ],
    },
    {
      icon: <Coffee size={20} color="#92400e" />,
      title: '10. 时空咖啡厅',
      subtitle: '跨世界笔友',
      content: [
        '在首页点击「时空咖啡厅」卡片进入。',
        '不同世界的角色都可以在便利贴墙上留下文字：愿望、随笔、笑话……想写什么写什么。',
        '你可能会通过另一个世界某个角色的文字，触碰到它的灵魂，成为跨世界的"笔友"。',
        '点击右下角「+」按钮，选择角色后写下留言即可贴上墙。',
      ],
    },
    {
      icon: <BookOpen size={20} color="#ec4899" />,
      title: '11. 记忆管理',
      subtitle: '查看和管理角色记忆',
      content: [
        '在「我的」页面进入「记忆管理」，选择世界和角色查看其记忆列表。',
        '记忆是角色在对话中自动记住的重要信息，包括事实、关系、事件、偏好等。',
        '可以删除不需要的记忆，或批量清理旧记忆（保留最重要的30条）。',
        '记忆系统让角色能记住之前的事，人设更稳定，不会"忘记"重要信息。',
      ],
    },
  ]

  const faqs = [
    {
      q: '如何修改角色的人设？',
      a: '在角色管理页点击角色卡，进入编辑界面，可以修改人设定位、背景故事等所有字段。',
    },
    {
      q: '亲密度如何提升？',
      a: '与角色对话会自动增加亲密度。每次对话 +1，亲密度越高角色对你越亲近。',
    },
    {
      q: '为什么角色回复不符合人设？',
      a: '可以通过「agent反馈」功能提交问题，AI 会分析并优化角色表现。也可以检查人设描述是否足够详细。',
    },
    {
      q: '积分有什么用？',
      a: '积分用于 3D 互动场景功能（开发中），如生成立绘、互动反应等。',
    },
    {
      q: '如何更换朋友圈背景？',
      a: '在朋友圈页面点击左上角灰色相机图标，选择图片即可更换背景。',
    },
    {
      q: '如何置顶角色？',
      a: '在角色管理页长按角色卡，选择「置顶」即可。置顶角色会出现在列表顶部，左上角有粉色图钉标识。',
    },
    {
      q: '如何创建群聊？',
      a: '在底部导航栏切换到「群聊」，点击「创建群聊」按钮，输入群聊名称并选择至少2个角色即可创建。',
    },
    {
      q: '朋友圈每天能刷新几次？',
      a: '每天只能刷新一次。角色总数>10时生成3-5条新动态，≤10时生成1-3条。当天已刷新后再次点击会提示"今日刷新次数已用完"。',
    },
    {
      q: '什么是分层记忆系统？',
      a: '角色在对话中会自动记住重要信息（如你的喜好、关键事件等），存储在数据库中。下次对话时会加载这些记忆，让角色表现更连贯，不会"忘记"之前的事。',
    },
    {
      q: '如何编辑分类标题？',
      a: '在角色管理页双击导航栏下方的分类标题（如"主角"），即可独立编辑该标题，与顶部 Tab 标签互不影响。',
    },
  ]

  return (
    <View className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <View
        className="px-6 pt-8 pb-6"
        style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' }}
      >
        <View className="flex items-center gap-3">
          <Circle size={28} color="#ec4899" />
          <View>
            <Text className="block text-xl font-bold text-gray-900">使用说明</Text>
            <Text className="block text-sm text-gray-600 mt-1">版本 {VERSION} · 更新于 {UPDATE_DATE}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView scrollY className="h-full" style={{ height: 'calc(100vh - 140px)' }}>
        <View className="px-4 py-4">
          {/* Sections */}
          {sections.map((section, idx) => (
            <Card key={idx} className="border-0 shadow-sm mb-3">
              <CardContent className="p-4">
                <View className="flex items-start gap-3">
                  <View className="mt-1">{section.icon}</View>
                  <View className="flex-1">
                    <Text className="block text-base font-semibold text-gray-900">{section.title}</Text>
                    <Text className="block text-xs text-gray-500 mb-2">{section.subtitle}</Text>
                    {section.content.map((text, tIdx) => (
                      <Text key={tIdx} className="block text-sm text-gray-700 leading-6 mb-1">
                        · {text}
                      </Text>
                    ))}
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}

          <Separator className="my-4" />

          {/* FAQ */}
          <View className="mb-4">
            <Text className="block text-lg font-bold text-gray-900 mb-3">常见问题</Text>
            {faqs.map((faq, idx) => (
              <Card key={idx} className="border-0 shadow-sm mb-2">
                <CardContent className="p-4">
                  <View className="flex items-start gap-2">
                    <ChevronRight size={16} color="#ec4899" className="mt-1 flex-shrink-0" />
                    <View className="flex-1">
                      <Text className="block text-sm font-medium text-gray-900 mb-1">{faq.q}</Text>
                      <Text className="block text-sm text-gray-600 leading-6">{faq.a}</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>

          {/* Ask Agent */}
          <View className="px-4 py-4">
            <View className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100">
              <View className="flex items-center gap-3 mb-3">
                <MessageCircle size={24} color="#e8587a" />
                <Text className="block text-base font-bold text-gray-900">都不是我想问的问题？</Text>
              </View>
              <Text className="block text-sm text-gray-600 mb-4">
                试试问问 Agent，它会为你详细解答
              </Text>
              <Button
                className="w-full bg-rose-500 text-white rounded-xl"
                onClick={() => {
                  Taro.navigateTo({ url: '/pages/help-ask/index' })
                }}
              >
                <Text className="text-white text-sm font-medium">问问 Agent</Text>
              </Button>
            </View>
          </View>

          {/* Footer */}
          <View className="text-center py-6">
            <Text className="block text-xs text-gray-400">人设工坊 · 让每个角色都有灵魂</Text>
            <Text className="block text-xs text-gray-400 mt-1">如有问题请联系开发者</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default HelpPage
