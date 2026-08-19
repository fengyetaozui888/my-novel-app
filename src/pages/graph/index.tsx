import { useState, useEffect, useCallback } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image, Canvas } from '@tarojs/components'
import { Plus, Trash2, Sparkles, Loader } from 'lucide-react-taro'
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
}

const CATEGORY_LABELS: Record<string, string> = {
  protagonist: '主角',
  supporting: '配角',
  minor: '龙套',
}

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

  // Add relationship dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedFrom, setSelectedFrom] = useState('')
  const [selectedTo, setSelectedTo] = useState('')
  const [relationType, setRelationType] = useState('')
  const [relationDesc, setRelationDesc] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Long press to select edge for delete - removed unused

  const CANVAS_WIDTH = 350
  const CANVAS_HEIGHT = 500
  const NODE_RADIUS = 35

  const fetchData = useCallback(async () => {
    try {
      const [charsRes, relsRes] = await Promise.all([
        Network.request({ url: `/api/characters?novel_id=${novelId}` }),
        Network.request({ url: `/api/relationships?novel_id=${novelId}` }),
      ])
      const charsData = (charsRes.data as any).data || []
      const relsData = (relsRes.data as any).data || []
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

  const layoutGraph = (chars: Character[], rels: Relationship[]) => {
    const nodes: GraphNode[] = []
    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2

    // Find focus character (the one we're viewing relationships for)
    const focusChar = chars.find(c => c.id === focusCharacterId)
    const otherChars = chars.filter(c => c.id !== focusCharacterId)

    // Place focus character in center
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

    // Place other characters in a circle around the center
    const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35
    const angleStep = (2 * Math.PI) / Math.max(otherChars.length, 1)

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

    // Build edges from relationships
    const edges: GraphEdge[] = rels.map(rel => {
      const fromChar = chars.find(c => c.id === rel.from_character_id)
      const toChar = chars.find(c => c.id === rel.to_character_id)
      return {
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

  const handleGenerateGraph = async () => {
    setGenerating(true)
    try {
      const res = await Network.request({
        url: `/api/chat/graph?novel_id=${novelId}`,
      })
      const graphData = (res.data as any).data
      if (graphData && graphData.nodes) {
        // Merge LLM-generated edges with existing nodes
        const newEdges: GraphEdge[] = graphData.edges || []
        setGraphEdges(newEdges)

        // Also sync relationships to database
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
          {characters.length} 位角色 · {relationships.length} 条关系
        </Text>
      </View>

      {/* Graph Canvas Area */}
      <View className="relative mx-4 mt-4 bg-white rounded-3xl shadow-lg overflow-hidden"
        style={{ height: `${CANVAS_HEIGHT + 40}px` }}
      >
        {/* SVG Lines */}
        <Canvas
          type="2d"
          id="graphCanvas"
          className="absolute top-0 left-0"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT + 40}px` }}
        />

        {/* Render edges as div lines */}
        {graphEdges.map((edge, idx) => {
          const fromNode = getNodeById(edge.from)
          const toNode = getNodeById(edge.to)
          if (!fromNode || !toNode) return null

          const dx = toNode.x - fromNode.x
          const dy = toNode.y - fromNode.y
          const length = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) * 180 / Math.PI
          const midX = (fromNode.x + toNode.x) / 2
          const midY = (fromNode.y + toNode.y) / 2

          return (
            <View key={`edge-${idx}`}>
              {/* Line */}
              <View
                className="absolute bg-pink-200"
                style={{
                  left: `${fromNode.x}px`,
                  top: `${fromNode.y + 20}px`,
                  width: `${length}px`,
                  height: '2px',
                  transformOrigin: '0 50%',
                  transform: `rotate(${angle}deg)`,
                }}
              />
              {/* Relation label */}
              <View
                className="absolute bg-pink-100 rounded-full px-2 py-1"
                style={{
                  left: `${midX - 20}px`,
                  top: `${midY + 10}px`,
                }}
              >
                <Text className="text-xs text-pink-600">{edge.relation}</Text>
              </View>
            </View>
          )
        })}

        {/* Render nodes */}
        {graphNodes.map(node => (
          <View
            key={node.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${node.x - NODE_RADIUS}px`,
              top: `${node.y + 20 - NODE_RADIUS}px`,
            }}
          >
            {/* Avatar */}
            <View
              className="rounded-full overflow-hidden border-2 border-pink-300 shadow-md bg-pink-100 flex items-center justify-center"
              style={{ width: `${NODE_RADIUS * 2}px`, height: `${NODE_RADIUS * 2}px` }}
            >
              {node.avatar_url ? (
                <Image
                  src={node.avatar_url}
                  className="w-full h-full"
                  mode="aspectFill"
                />
              ) : (
                <Text className="text-xl font-bold text-pink-400">
                  {node.name.charAt(0)}
                </Text>
              )}
            </View>
            {/* Name */}
            <View className="mt-1 bg-white rounded-full px-2 py-1 shadow-sm">
              <Text className="text-xs text-gray-700 font-medium">{node.name}</Text>
            </View>
            {/* Category badge */}
            <Text className="text-xs text-pink-400 mt-1">
              {CATEGORY_LABELS[node.category] || node.category}
            </Text>
          </View>
        ))}
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
                    className={`flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all ${
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
                    className={`flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all ${
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
