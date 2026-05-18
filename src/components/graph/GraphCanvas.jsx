import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import useSessionStore from '../../stores/sessionStore'
import AppNode from './AppNode'
import FluxEdge from './FluxEdge'

// ─── Column header node ──────────────────────────────────────────────────────

function ColumnHeader({ data }) {
  return (
    <div
      className="column-header-node px-5 py-2 rounded-lg text-sm font-semibold select-none"
      style={{
        border: `1.5px dashed ${data.color}`,
        color: data.color,
        backgroundColor: data.color + '18',
        minWidth: '200px',
        textAlign: 'center',
      }}
    >
      {data.label}
    </div>
  )
}

const nodeTypes = { appNode: AppNode, columnHeader: ColumnHeader }
const edgeTypes = { fluxEdge: FluxEdge }

// ─── Layout helpers ──────────────────────────────────────────────────────────

function computeGridLayout(apps) {
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(apps.length))))
  const colW  = 260
  const rowH  = 170
  return apps.reduce((acc, app, i) => {
    acc[app.id] = { x: (i % cols) * colW + 60, y: Math.floor(i / cols) * rowH + 60 }
    return acc
  }, {})
}

function computeMultiSiteLayout(apps, deploiements, etablissements) {
  const appEtabMap = {}
  for (const dep of deploiements) {
    if (!appEtabMap[dep.applicationId]) appEtabMap[dep.applicationId] = new Set()
    appEtabMap[dep.applicationId].add(dep.etablissementId)
  }

  const transverseIds = new Set(
    apps
      .filter(a => a.perimetre === 'global' || (appEtabMap[a.id]?.size > 1))
      .map(a => a.id),
  )

  const colApps = {}
  for (const e of etablissements) colApps[e.id] = []
  colApps['_none'] = []

  for (const app of apps) {
    if (transverseIds.has(app.id)) continue
    const etabs = appEtabMap[app.id]
    if (etabs?.size === 1) {
      const etabId = [...etabs][0]
      ;(colApps[etabId] || colApps['_none']).push(app)
    } else {
      colApps['_none'].push(app)
    }
  }

  const positions = {}
  const headers   = []
  const COL_W     = 270
  const ROW_H     = 175
  const APP_W     = 220
  const TRANS_Y   = 60
  const COL_Y     = 280

  const transverse = apps.filter(a => transverseIds.has(a.id))
  if (transverse.length > 0) {
    headers.push({ id: 'hdr-transverse', label: 'Global / Multi-sites', color: '#60a5fa', x: 20, y: 10 })
    transverse.forEach((app, i) => {
      positions[app.id] = { x: i * (APP_W + 30) + 60, y: TRANS_Y }
    })
  }

  let colIdx = 0
  for (const etab of etablissements) {
    if (!colApps[etab.id]?.length) continue
    headers.push({ id: `hdr-${etab.id}`, label: etab.nom, color: etab.couleur || '#6b7280', x: colIdx * COL_W + 60, y: COL_Y - 55 })
    colApps[etab.id].forEach((app, i) => {
      positions[app.id] = { x: colIdx * COL_W + 60, y: COL_Y + i * ROW_H }
    })
    colIdx++
  }
  if (colApps['_none'].length) {
    headers.push({ id: 'hdr-none', label: 'Non assigné', color: '#6b7280', x: colIdx * COL_W + 60, y: COL_Y - 55 })
    colApps['_none'].forEach((app, i) => {
      positions[app.id] = { x: colIdx * COL_W + 60, y: COL_Y + i * ROW_H }
    })
  }

  return { positions, headers }
}

function resolvePositions(apps, stored, session, deploiements, etablissements) {
  const isMulti   = session?.perimetre === 'multi-sites'
  const hasStored = apps.some(a => stored[a.id])

  if (!hasStored) {
    return isMulti
      ? computeMultiSiteLayout(apps, deploiements, etablissements).positions
      : computeGridLayout(apps)
  }

  // Fallback for new apps without a stored position
  const result  = { ...stored }
  const missing = apps.filter(a => !stored[a.id])
  if (missing.length) {
    const maxY = Math.max(0, ...Object.values(stored).map(p => p.y))
    missing.forEach((app, i) => {
      result[app.id] = { x: (i % 4) * 260 + 60, y: maxY + 200 + Math.floor(i / 4) * 170 }
    })
  }
  return result
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GraphCanvas({ onNodeEdit, onConnect, onOpenAddApp, showMiniMap = true, flowRef, readOnly = false }) {
  const { applications, flux, positions, updatePositions, removeApplication, removeFlux,
          session, deploiements, etablissements } = useSessionStore()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId]   = useState(null)
  const [miniMapVisible, setMiniMapVisible]   = useState(showMiniMap)
  const [pendingDelete, setPendingDelete]     = useState(null) // { nodes: [], edges: [] }
  const rfInstanceRef = useRef(null)

  const isMultiSite = session?.perimetre === 'multi-sites'

  // Build etablissements lookup per app (for multi-site dots)
  const appEtabsMap = useMemo(() => {
    const map = {}
    for (const dep of deploiements) {
      if (!map[dep.applicationId]) map[dep.applicationId] = []
      const etab = etablissements.find(e => e.id === dep.etablissementId)
      if (etab) map[dep.applicationId].push(etab)
    }
    return map
  }, [deploiements, etablissements])

  // Resolved positions (auto-layout fallback)
  const resolvedPositions = useMemo(
    () => resolvePositions(applications, positions, session, deploiements, etablissements),
    [applications, positions, session, deploiements, etablissements],
  )

  // Column headers for multi-site
  const columnHeaders = useMemo(() => {
    if (!isMultiSite || !applications.length) return []
    return computeMultiSiteLayout(applications, deploiements, etablissements).headers
  }, [isMultiSite, applications, deploiements, etablissements])

  // ── Sync nodes ──
  useEffect(() => {
    const headerNodes = columnHeaders.map(h => ({
      id: h.id,
      type: 'columnHeader',
      position: { x: h.x, y: h.y },
      data: { label: h.label, color: h.color },
      draggable: false,
      selectable: false,
      connectable: false,
    }))

    const appNodes = applications.map(app => ({
      id: app.id,
      type: 'appNode',
      position: resolvedPositions[app.id] || { x: 60, y: 60 },
      data: {
        app,
        onEdit: readOnly ? null : onNodeEdit,
        etablissements: appEtabsMap[app.id] || [],
        isMultiSite,
      },
    }))

    setNodes([...headerNodes, ...appNodes])
  }, [applications, resolvedPositions, appEtabsMap, columnHeaders, isMultiSite, onNodeEdit, readOnly, setNodes])

  // ── Sync edges ──
  useEffect(() => {
    setEdges(
      flux.map(f => ({
        id: f.id,
        source: f.sourceId,
        target: f.cibleId,
        type: 'fluxEdge',
        data: { flux: f },
        deletable: !readOnly,
      })),
    )
  }, [flux, readOnly, setEdges])

  // ── Highlighting ──
  const connectedInfo = useMemo(() => {
    if (!selectedNodeId) return null
    const connEdges = edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId)
    const connNodeIds = new Set([selectedNodeId])
    connEdges.forEach(e => { connNodeIds.add(e.source); connNodeIds.add(e.target) })
    return { edgeIds: new Set(connEdges.map(e => e.id)), nodeIds: connNodeIds }
  }, [selectedNodeId, edges])

  const displayNodes = useMemo(() => {
    if (!connectedInfo) return nodes
    return nodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: n.type === 'columnHeader' || connectedInfo.nodeIds.has(n.id) ? 1 : 0.12,
        transition: 'opacity 0.2s',
      },
    }))
  }, [nodes, connectedInfo])

  const displayEdges = useMemo(() => {
    if (!connectedInfo) return edges
    return edges.map(e => ({
      ...e,
      style: {
        ...e.style,
        opacity: connectedInfo.edgeIds.has(e.id) ? 1 : 0.07,
        transition: 'opacity 0.2s',
      },
    }))
  }, [edges, connectedInfo])

  // ── Callbacks ──
  const onNodeDragStop = useCallback((_, node) => {
    updatePositions({ [node.id]: node.position })
  }, [updatePositions])

  const handleConnect = useCallback((connection) => {
    if (readOnly) return
    if (onConnect) onConnect(connection)
  }, [onConnect, readOnly])

  const handleNodeClick = useCallback((_, node) => {
    if (node.type === 'columnHeader') return
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Double-click on pane → open add panel (only if not readOnly)
  const handlePaneDblClick = useCallback(() => {
    if (!readOnly && onOpenAddApp) onOpenAddApp()
  }, [readOnly, onOpenAddApp])

  // ── Delete with confirmation ──
  const triggerDelete = useCallback(() => {
    if (readOnly) return
    const selectedNodes = rfInstanceRef.current?.getNodes().filter(n => n.selected && n.type === 'appNode') || []
    const selectedEdges = rfInstanceRef.current?.getEdges().filter(e => e.selected) || []
    if (!selectedNodes.length && !selectedEdges.length) return
    setPendingDelete({ nodes: selectedNodes, edges: selectedEdges })
  }, [readOnly])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    pendingDelete.nodes.forEach(n => removeApplication(n.id))
    pendingDelete.edges.forEach(e => removeFlux(e.id))
    setPendingDelete(null)
    setSelectedNodeId(null)
  }, [pendingDelete, removeApplication, removeFlux])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === ' ') {
        e.preventDefault()
        rfInstanceRef.current?.fitView({ padding: 0.15, duration: 400 })
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        triggerDelete()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [triggerDelete])

  return (
    <div className="w-full h-full relative" ref={flowRef}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onPaneDoubleClick={handlePaneDblClick}
        onInit={(instance) => { rfInstanceRef.current = instance }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        className="bg-gray-900"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1f2937" />
        <Controls showInteractive={false} className="bg-gray-800 border-gray-700" />

        {miniMapVisible && (
          <MiniMap
            nodeColor={n => n.data?.app?.couleur || '#374151'}
            nodeStrokeWidth={2}
            maskColor="rgba(17,24,39,0.75)"
          />
        )}

        {/* Toggle mini-map */}
        <Panel position="top-right">
          <button
            onClick={() => setMiniMapVisible(v => !v)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              miniMapVisible
                ? 'bg-gray-700 border-gray-600 text-gray-300'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
            title="Afficher/masquer la mini-carte"
          >
            {miniMapVisible ? '⊟ Mini-carte' : '⊞ Mini-carte'}
          </button>
        </Panel>
      </ReactFlow>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Confirmer la suppression</h3>
            <p className="text-gray-400 text-sm mb-1">
              {pendingDelete.nodes.length > 0 && (
                <span>
                  {pendingDelete.nodes.length} application{pendingDelete.nodes.length > 1 ? 's' : ''} :{' '}
                  <span className="text-white">
                    {pendingDelete.nodes.map(n => n.data?.app?.nom).join(', ')}
                  </span>
                </span>
              )}
            </p>
            <p className="text-gray-400 text-sm mb-4">
              {pendingDelete.edges.length > 0 && (
                <span>{pendingDelete.edges.length} flux</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mb-4">Cette action est annulable via Ctrl+Z.</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm py-2 rounded font-medium"
              >
                Supprimer
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
