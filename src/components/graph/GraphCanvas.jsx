import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import useSessionStore from '../../stores/sessionStore'
import AppNode from './AppNode'
import FluxEdge from './FluxEdge'

const nodeTypes = { appNode: AppNode }
const edgeTypes = { fluxEdge: FluxEdge }

export default function GraphCanvas({ onNodeEdit, onConnect, showMiniMap = true, flowRef }) {
  const { applications, flux, positions, updatePositions } = useSessionStore()

  const initialNodes = useMemo(() => {
    return applications.map((app) => ({
      id: app.id,
      type: 'appNode',
      position: positions[app.id] || {
        x: Math.random() * 600,
        y: Math.random() * 400,
      },
      data: { app, onEdit: onNodeEdit },
    }))
  }, [applications, positions, onNodeEdit])

  const initialEdges = useMemo(() => {
    return flux.map((f) => ({
      id: f.id,
      source: f.sourceId,
      target: f.cibleId,
      type: 'fluxEdge',
      data: { flux: f },
      markerEnd: { type: 'arrowclosed', color: '#6b7280' },
    }))
  }, [flux])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync nodes when applications/positions change
  useMemo(() => {
    setNodes(
      applications.map((app) => ({
        id: app.id,
        type: 'appNode',
        position: positions[app.id] || { x: Math.random() * 600, y: Math.random() * 400 },
        data: { app, onEdit: onNodeEdit },
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, positions])

  useMemo(() => {
    setEdges(
      flux.map((f) => ({
        id: f.id,
        source: f.sourceId,
        target: f.cibleId,
        type: 'fluxEdge',
        data: { flux: f },
        markerEnd: { type: 'arrowclosed', color: '#6b7280' },
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flux])

  const onNodeDragStop = useCallback(
    (_, node) => {
      updatePositions({ [node.id]: node.position })
    },
    [updatePositions],
  )

  const handleConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds))
      if (onConnect) onConnect(connection)
    },
    [setEdges, onConnect],
  )

  return (
    <div className="w-full h-full" ref={flowRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        className="bg-gray-900"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls className="bg-gray-800 border-gray-700" />
        {showMiniMap && (
          <MiniMap
            nodeColor={(node) => node.data?.app?.couleur || '#6b7280'}
            maskColor="rgba(17,24,39,0.7)"
          />
        )}
      </ReactFlow>
    </div>
  )
}
