import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { Plus, Minus, Maximize, Trash2, Sparkles, Loader } from 'lucide-react-taro'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Network } from '@/network'
import './index.css'

interface Character {
  id: string
  name: string
  category: string
  avatar_key?: string
  avatar_url?: string
}

interface Relationship {
  id: string
  from_character_id: string
  to_character_id: string
  relation_type: string
  description?: string
}

interface GraphNode {
  id: string
  name: string
  category: string
  avatar_url?: string
  x: number
  y: number
}

interface GraphEdge {
  from: string
  to: string
  fromName: string
  toName: string
  relation: string
  description?: string
  id?: string
}

interface PairGroup {
  key: string
  from: string
  to: string
  edges: GraphEdge[]
}

// 关系优先级：数值越大越优先显示
const RELATION_PRIORITY: Record<string, number> = {
  恋人: 100, 爱人: 100, 夫妻: 100, 情侣: 100, 未婚妻: 98, 未婚夫: 98,
  仇敌: 92, 宿敌: 92, 敌人: 90,
  姐弟: 88, 兄妹: 88, 姐妹: 88, 兄弟: 88, 父女: 88, 父子: 88, 母女: 88, 母子: 88,
  祖孙: 86, 亲人: 85, 亲属: 85, 表亲: 80,
  主仆: 78,
  师徒: 75, 师父: 75, 师傅: 75, 徒弟: 75, 师姐: 72, 师兄: 72, 师妹: 72, 师弟: 72,
  挚友: 70, 知己: 70, 闺蜜: 68, 发小: 66,
  朋友: 60, 友人: 60, 同窗: 55, 同学: 55, 同僚: 50, 同事: 50, 邻居: 45, 熟人: 40,
}

const priorityOf = (t: string) => RELATION_PRIORITY[t] ?? 50

// 虚拟画布尺寸（可拖拽缩放的大画布）
const CANVAS_W = 640
const CANVAS_H = 820
const NODE_R = 23
const CENTER_R = 30
const MIN_SCALE = 0.3
const MAX_SCALE = 2.5

export default function GraphPage() {
  const router = useRouter()
  const novelId = router.params.novelId || ''
  const focusCharacterId = router.params.characterId || ''

  const [characters, setCharacters] = useState<Character[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // 画布视口：平移 + 缩放（工作流画布交互）
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 0.5 })
  const containerRef = useRef({ top: 0, left: 0, w: 340, h: 480 })
  // 已展开的多重关系对
  const [expandedPairs, setExpandedPairs] = useState<string[]>([])

  // 触摸手势状态
  const touch = useRef({
    mode: 'none' as 'none' | 'pan' | 'zoom',
    startX: 0, startY: 0,
    startVx: 0, startVy: 0,
    startDist: 1, startScale: 1,
    midX: 0, midY: 0,
  })

  // Add relationship dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedFrom, setSelectedFrom] = useState('')
  const [selectedTo, setSelectedTo] = useState('')
  const [relationType, setRelationType] = useState('')
  const [relationDesc, setRelationDesc] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [charsRes, relsRes] = await Promise.all([
        Network.request({ url: `/api/characters?novel_id=${novelId}` }),
        Network.request({ url: `/api/relationships?novel_id=${novelId}` }),
      ])
      const charsData = (charsRes.data as any).data || []
      const relsData = (relsRes.data as any).data || []
      console.log('[graph] 角色列表:', charsData.length, '关系列表:', relsData.length)
      setCharacters(charsData)
      setRelationships(relsData)
      layoutGraph(charsData, relsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 查询画布容器尺寸并初始化视口（居中）
  useEffect(() => {
    setTimeout(() => {
      Taro.createSelectorQuery()
        .select('#graph-canvas-container')
        .boundingClientRect((rect: any) => {
          if (rect && rect.width > 0) {
            containerRef.current = { top: rect.top, left: rect.left, w: rect.width, h: rect.height }
            resetViewport(rect.width, rect.height)
          }
        })
        .exec()
    }, 200)
  }, [loading])

  const resetViewport = (cw: number, ch: number) => {
    const scale = Math.min(cw / CANVAS_W, ch / CANVAS_H) * 0.96
    setViewport({
      scale,
      x: (cw - CANVAS_W * scale) / 2,
      y: (ch - CANVAS_H * scale) / 2,
    })
  }

  const layoutGraph = (chars: Character[], rels: Relationship[]) => {
    const nodes: GraphNode[] = []
    const centerX = CANVAS_W / 2
    const centerY = CANVAS_H / 2

    const focusChar = chars.find(c => c.id === focusCharacterId)
    const otherChars = chars.filter(c => c.id !== focusCharacterId)

    if (focusChar) {
      nodes.push({
        id: focusChar.id,
        name: focusChar.name,
        category: focusChar.category,
        avatar_url: focusChar.avatar_url,
        x: centerX,
        y: centerY,
      })
    }

    // 圆形布局：角色越多半径越大，避免挤成一坨
    const n = otherChars.length
    const radius = Math.min(290, Math.max(180, 65 + n * 24))
    const angleStep = (2 * Math.PI) / Math.max(n, 1)

    otherChars.forEach((char, index) => {
      const angle = angleStep * index - Math.PI / 2
      nodes.push({
        id: char.id,
        name: char.name,
        category: char.category,
        avatar_url: char.avatar_url,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    })

    const edges: GraphEdge[] = rels.map(rel => {
      const fromChar = chars.find(c => c.id === rel.from_character_id)
      const toChar = chars.find(c => c.id === rel.to_character_id)
      return {
        id: rel.id,
        from: rel.from_character_id,
        to: rel.to_character_id,
        fromName: fromChar?.name || '',
        toName: toChar?.name || '',
        relation: rel.relation_type,
        description: rel.description,
      }
    })

    setGraphNodes(nodes)
    setGraphEdges(edges)
  }

  // 按"角色对"分组的多重关系（已按优先级降序）
  const pairGroups = useMemo<PairGroup[]>(() => {
    const groups = new Map<string, PairGroup>()
    graphEdges.forEach(e => {
      const key = [e.from, e.to].sort().join('::')
      if (!groups.has(key)) {
        groups.set(key, { key, from: e.from, to: e.to, edges: [] })
      }
      groups.get(key)!.edges.push(e)
    })
    return Array.from(groups.values()).map(g => ({
      ...g,
      edges: [...g.edges].sort((a, b) => priorityOf(b.relation) - priorityOf(a.relation)),
    }))
  }, [graphEdges])

  const togglePair = (key: string) => {
    setExpandedPairs(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // ---------- 画布手势：单指拖拽平移 / 双指缩放 ----------
  const handleTouchStart = (e: any) => {
    const ts = e.touches
    const c = containerRef.current
    if (ts.length === 2) {
      const ax = ts[0].clientX, ay = ts[0].clientY
      const bx = ts[1].clientX, by = ts[1].clientY
      touch.current.mode = 'zoom'
      touch.current.startDist = Math.hypot(ax - bx, ay - by) || 1
      touch.current.startScale = viewport.scale
      touch.current.midX = (ax + bx) / 2 - c.left
      touch.current.midY = (ay + by) / 2 - c.top
      touch.current.startVx = viewport.x
      touch.current.startVy = viewport.y
    } else if (ts.length === 1) {
      touch.current.mode = 'pan'
      touch.current.startX = ts[0].clientX
      touch.current.startY = ts[0].clientY
      touch.current.startVx = viewport.x
      touch.current.startVy = viewport.y
    }
  }

  const handleTouchMove = (e: any) => {
    const t = touch.current
    if (t.mode === 'pan') {
      const cur = e.touches[0]
      if (!cur) return
      e.stopPropagation()
      setViewport(v => ({
        ...v,
        x: t.startVx + (cur.clientX - t.startX),
        y: t.startVy + (cur.clientY - t.startY),
      }))
    } else if (t.mode === 'zoom' && e.touches.length === 2) {
      e.stopPropagation()
      const ax = e.touches[0].clientX, ay = e.touches[0].clientY
      const bx = e.touches[1].clientX, by = e.touches[1].clientY
      const dist = Math.hypot(ax - bx, ay - by) || 1
      const s1 = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.startScale * dist / t.startDist))
      // 围绕双指中点缩放，保持该点内容不动
      setViewport(() => ({
        scale: s1,
        x: t.midX - (t.midX - t.startVx) * (s1 / t.startScale),
        y: t.midY - (t.midY - t.startVy) * (s1 / t.startScale),
      }))
    }
  }

  const handleTouchEnd = (e: any) => {
    if (e.touches.length === 0) {
      touch.current.mode = 'none'
    } else if (e.touches.length === 1) {
      // 双指变单指：转为平移
      touch.current.mode = 'pan'
      touch.current.startX = e.touches[0].clientX
      touch.current.startY = e.touches[0].clientY
      touch.current.startVx = viewport.x
      touch.current.startVy = viewport.y
    }
  }

  // 缩放按钮（围绕画布中心）
  const zoomByButton = (factor: number) => {
    const c = containerRef.current
    const s1 = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * factor))
    const cx = c.w / 2, cy = c.h / 2
    setViewport(v => ({
      scale: s1,
      x: cx - (cx - v.x) * (s1 / v.scale),
      y: cy - (cy - v.y) * (s1 / v.scale),
    }))
  }

  const handleResetView = () => {
    const c = containerRef.current
    resetViewport(c.w, c.h)
  }

  const handleGenerateGraph = async () => {
    setGenerating(true)
    try {
      const res = await Network.request({
        url: `/api/chat/graph?novel_id=${novelId}`,
      })
      const graphData = (res.data as any).data
      console.log('[graph] AI 生成关系图:', graphData)
      if (graphData && graphData.nodes) {
        const newEdges: GraphEdge[] = graphData.edges || []
        setGraphEdges(newEdges)

        const existingRels = relationships.map(r => `${r.from_character_id}-${r.to_character_id}`)
        for (const edge of newEdges) {
          const key = `${edge.from}-${edge.to}`
          if (!existingRels.includes(key)) {
            await Network.request({
              url: '/api/relationships',
              method: 'POST',
              data: {
                novel_id: novelId,
                from_character_id: edge.from,
                to_character_id: edge.to,
                relation_type: edge.relation,
                description: edge.description,
              },
            })
          }
        }
        await fetchData()
        Taro.showToast({ title: '关系图已生成', icon: 'success' })
      }
    } catch (error) {
      console.error('Failed to generate graph:', error)
      Taro.showToast({ title: '生成失败', icon: 'none' })
    } finally {
      setGenerating(false)
    }
  }

  const handleAddRelationship = async () => {
    if (!selectedFrom || !selectedTo || !relationType) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    if (selectedFrom === selectedTo) {
      Taro.showToast({ title: '不能和自己建立关系', icon: 'none' })
      return
    }

    try {
      await Network.request({
        url: '/api/relationships',
        method: 'POST',
        data: {
          novel_id: novelId,
          from_character_id: selectedFrom,
          to_character_id: selectedTo,
          relation_type: relationType,
          description: relationDesc,
        },
      })
      setShowAddDialog(false)
      setSelectedFrom('')
      setSelectedTo('')
      setRelationType('')
      setRelationDesc('')
      await fetchData()
      Taro.showToast({ title: '关系已添加', icon: 'success' })
    } catch (error) {
      console.error('Failed to add relationship:', error)
      Taro.showToast({ title: '添加失败', icon: 'none' })
    }
  }

  const handleDeleteRelationship = async (relId: string) => {
    try {
      await Network.request({
        url: `/api/relationships/${relId}`,
        method: 'DELETE',
      })
      setDeleteTarget(null)
      await fetchData()
      Taro.showToast({ title: '关系已删除', icon: 'success' })
    } catch (error) {
      console.error('Failed to delete relationship:', error)
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const getNodeById = (id: string) => graphNodes.find(n => n.id === id)

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen bg-pink-50">
        <Loader className="animate-spin" size={32} color="#ec4899" />
        <Text className="block mt-4 text-pink-500">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-pink-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 shadow-sm">
        <Text className="block text-lg font-bold text-gray-800">关系图谱</Text>
        <Text className="block text-xs text-gray-400 mt-1">
          {characters.length} 位角色 · {relationships.length} 条关系 · 拖动画布/双指缩放查看
        </Text>
      </View>

      {/* 可拖拽缩放的关系图画布（工作流风格） */}
      <View
        id="graph-canvas-container"
        className="relative mx-4 mt-4 bg-white rounded-3xl shadow-lg overflow-hidden graph-grid"
        style={{ height: '58vh', touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* 虚拟画布（随视口变换） */}
        <View
          className="absolute left-0 top-0"
          style={{
            width: `${CANVAS_W}px`,
            height: `${CANVAS_H}px`,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* 关系连线：按角色对分组，多重关系可展开/收起 */}
          {pairGroups.map(group => {
            const fromNode = getNodeById(group.from)
            const toNode = getNodeById(group.to)
            if (!fromNode || !toNode) return null

            const fromR = fromNode.id === focusCharacterId ? CENTER_R : NODE_R
            const toR = toNode.id === focusCharacterId ? CENTER_R : NODE_R

            const dx = toNode.x - fromNode.x
            const dy = toNode.y - fromNode.y
            const len = Math.hypot(dx, dy) || 1
            const ux = dx / len, uy = dy / len
            // 线从圆边缘到圆边缘
            const sx = fromNode.x + ux * fromR, sy = fromNode.y + uy * fromR
            const ex = toNode.x - ux * toR, ey = toNode.y - uy * toR
            const elen = Math.hypot(ex - sx, ey - sy)
            const angle = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI
            const midX = (sx + ex) / 2
            const midY = (sy + ey) / 2

            const expanded = expandedPairs.includes(group.key)
            const shownEdges = expanded ? group.edges : group.edges.slice(0, 1)
            const labelStep = 22

            return (
              <View key={`pair-${group.key}`}>
                {/* 连线 */}
                <View
                  className="absolute bg-pink-300"
                  style={{
                    left: `${sx}px`,
                    top: `${sy}px`,
                    width: `${elen}px`,
                    height: '2px',
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg)`,
                  }}
                />

                {/* 关系标签：未展开只显示优先级最高的一条，展开显示全部 */}
                {shownEdges.map((edge, i) => (
                  <View
                    key={`label-${group.key}-${i}`}
                    className="absolute bg-white rounded-full px-2 shadow-sm border border-pink-100"
                    style={{
                      left: `${midX}px`,
                      top: `${midY - 9 + (i - (shownEdges.length - 1) / 2) * labelStep}px`,
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                    }}
                  >
                    <Text className="text-pink-500" style={{ fontSize: '10px' }}>
                      {edge.relation}
                    </Text>
                  </View>
                ))}

                {/* 多重关系：+/- 展开收起按钮 */}
                {group.edges.length > 1 && (
                  <View
                    className="absolute rounded-full bg-white shadow-md flex items-center justify-center"
                    style={{
                      width: '20px',
                      height: '20px',
                      left: `${midX + (shownEdges.length * labelStep) / 2 + 14}px`,
                      top: `${midY - 10}px`,
                      border: '1px solid #fbcfe8',
                      zIndex: 11,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePair(group.key)
                    }}
                  >
                    {expanded ? (
                      <Minus size={13} color="#ec4899" strokeWidth={2.5} />
                    ) : (
                      <View className="flex items-center justify-center">
                        <Plus size={13} color="#ec4899" strokeWidth={2.5} />
                      </View>
                    )}
                  </View>
                )}

                {/* 展开时的总数角标提示 */}
                {group.edges.length > 1 && !expanded && (
                  <View
                    className="absolute rounded-full"
                    style={{ left: `${midX + 24}px`, top: `${midY - 20}px`, zIndex: 11 }}
                  >
                    <Text className="text-pink-300" style={{ fontSize: '9px' }}>
                      +{group.edges.length - 1}
                    </Text>
                  </View>
                )}
              </View>
            )
          })}

          {/* 角色节点：名字放在圆圈内 */}
          {graphNodes.map(node => {
            const radius = node.id === focusCharacterId ? CENTER_R : NODE_R
            const size = radius * 2
            const displayName = node.name.length > 4 ? node.name.slice(0, 4) : node.name
            const isFocus = node.id === focusCharacterId
            return (
              <View
                key={node.id}
                className="absolute rounded-full overflow-hidden shadow-md flex"
                style={{
                  left: `${node.x - radius}px`,
                  top: `${node.y - radius}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  borderWidth: isFocus ? '3px' : '2px',
                  borderStyle: 'solid',
                  borderColor: isFocus ? '#ec4899' : '#f9a8d4',
                  backgroundColor: '#fdf2f8',
                }}
              >
                {/* 头像铺满圆 */}
                {node.avatar_url && (
                  <Image
                    src={node.avatar_url}
                    className="absolute left-0 top-0"
                    style={{ width: `${size}px`, height: `${size}px` }}
                    mode="aspectFill"
                  />
                )}
                {/* 无头像时显示名字首字 */}
                {!node.avatar_url && (
                  <View className="absolute left-0 top-0 w-full h-full flex items-center justify-center">
                    <Text
                      className="font-bold"
                      style={{
                        color: '#ec4899',
                        fontSize: isFocus ? '18px' : '14px',
                      }}
                    >
                      {node.name.charAt(0)}
                    </Text>
                  </View>
                )}
                {/* 底部渐变遮罩 + 圆内小字名字 */}
                <View
                  className="node-name-mask absolute left-0 bottom-0 w-full flex items-center justify-center"
                  style={{ height: '46%' }}
                >
                  <Text
                    className="text-white font-medium"
                    style={{
                      fontSize: isFocus ? '10px' : '8px',
                      lineHeight: 1.2,
                    }}
                  >
                    {displayName}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* 缩放控件（右下角，不随画布缩放） */}
        <View className="absolute bottom-3 right-3 flex flex-col gap-2" style={{ zIndex: 20 }}>
          <View
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-pink-100 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); zoomByButton(1.3) }}
          >
            <Plus size={17} color="#ec4899" />
          </View>
          <View
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-pink-100 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); zoomByButton(1 / 1.3) }}
          >
            <Minus size={17} color="#ec4899" />
          </View>
          <View
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-pink-100 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); handleResetView() }}
          >
            <Maximize size={16} color="#ec4899" />
          </View>
        </View>

        {/* 缩放比例指示 */}
        <View
          className="absolute top-3 left-3 rounded-full bg-white bg-opacity-80 px-2 py-1 shadow-sm"
          style={{ zIndex: 20 }}
        >
          <Text className="text-pink-400" style={{ fontSize: '10px' }}>
            {Math.round(viewport.scale * 100)}%
          </Text>
        </View>
      </View>

      {/* Relationship List */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <Text className="block text-sm font-bold text-gray-700 mb-3">关系列表</Text>
        {relationships.length === 0 ? (
          <View className="py-8 flex flex-col items-center">
            <Text className="block text-gray-400 text-sm">暂无关系</Text>
            <Text className="block text-gray-300 text-xs mt-1">点击下方按钮添加关系</Text>
          </View>
        ) : (
          relationships.map(rel => {
            const fromChar = characters.find(c => c.id === rel.from_character_id)
            const toChar = characters.find(c => c.id === rel.to_character_id)
            return (
              <View
                key={rel.id}
                className="flex items-center justify-between py-2 border-b border-pink-50 last:border-0"
              >
                <View className="flex items-center flex-1">
                  <Text className="text-sm text-gray-700">{fromChar?.name}</Text>
                  <View className="mx-2 bg-pink-100 rounded-full px-2 py-1">
                    <Text className="text-xs text-pink-500">{rel.relation_type}</Text>
                  </View>
                  <Text className="text-sm text-gray-700">{toChar?.name}</Text>
                </View>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(rel.id)}
                >
                  <Trash2 size={14} color="#f87171" />
                </Button>
              </View>
            )
          })
        )}
      </View>

      {/* Bottom Actions */}
      <View className="fixed bottom-24 right-4 flex flex-col gap-3">
        {/* Generate Graph Button */}
        <Button
          className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg"
          onClick={handleGenerateGraph}
          disabled={generating}
        >
          {generating ? (
            <Loader className="animate-spin" size={20} color="#fff" />
          ) : (
            <Sparkles size={20} color="#fff" />
          )}
        </Button>

        {/* Add Relationship Button */}
        <Button
          className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus size={24} color="#fff" />
        </Button>
      </View>

      {/* Add Relationship Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-pink-600">添加关系</DialogTitle>
          </DialogHeader>

          <View className="space-y-4 py-2">
            {/* From Character */}
            <View>
              <Text className="block text-sm text-gray-600 mb-2">从</Text>
              <View className="flex flex-wrap gap-2">
                {characters.map(char => (
                  <View
                    key={char.id}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                      selectedFrom === char.id
                        ? 'bg-pink-100 border-2 border-pink-400'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                    onClick={() => setSelectedFrom(char.id)}
                  >
                    <View className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
                      {char.avatar_url ? (
                        <Image src={char.avatar_url} className="w-full h-full" mode="aspectFill" />
                      ) : (
                        <Text className="text-sm font-bold text-pink-400">{char.name.charAt(0)}</Text>
                      )}
                    </View>
                    <Text className="text-xs text-gray-600 mt-1">{char.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* To Character */}
            <View>
              <Text className="block text-sm text-gray-600 mb-2">到</Text>
              <View className="flex flex-wrap gap-2">
                {characters.filter(c => c.id !== selectedFrom).map(char => (
                  <View
                    key={char.id}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                      selectedTo === char.id
                        ? 'bg-pink-100 border-2 border-pink-400'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                    onClick={() => setSelectedTo(char.id)}
                  >
                    <View className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
                      {char.avatar_url ? (
                        <Image src={char.avatar_url} className="w-full h-full" mode="aspectFill" />
                      ) : (
                        <Text className="text-sm font-bold text-pink-400">{char.name.charAt(0)}</Text>
                      )}
                    </View>
                    <Text className="text-xs text-gray-600 mt-1">{char.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Relation Type */}
            <View>
              <Text className="block text-sm text-gray-600 mb-2">关系类型</Text>
              <View className="bg-gray-50 rounded-xl px-3 py-2">
                <Input
                  className="w-full bg-transparent"
                  placeholder="如：恋人、仇敌、师徒..."
                  value={relationType}
                  onInput={(e) => setRelationType(e.detail.value)}
                />
              </View>
            </View>

            {/* Description */}
            <View>
              <Text className="block text-sm text-gray-600 mb-2">描述（可选）</Text>
              <View className="bg-gray-50 rounded-xl px-3 py-2">
                <Input
                  className="w-full bg-transparent"
                  placeholder="简单描述这段关系..."
                  value={relationDesc}
                  onInput={(e) => setRelationDesc(e.detail.value)}
                />
              </View>
            </View>
          </View>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button className="bg-pink-500" onClick={handleAddRelationship}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <Text className="block text-gray-600 py-4">确定要删除这段关系吗？</Text>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDeleteRelationship(deleteTarget)}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  )
}
