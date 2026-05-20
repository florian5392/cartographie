import { useState, useEffect, useMemo, useCallback } from 'react'
import ReactFlow, {
  Background, Controls, BackgroundVariant,
  useNodesState, useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import useSessionStore from '../../stores/sessionStore'
import * as api from '../../api/api'
import AppNode from '../graph/AppNode'
import FluxEdge from '../graph/FluxEdge'
import { demoApplications, demoFlux, demoEtablissements, demoSession } from '../../data/demoData'

const nodeTypes = { appNode: AppNode }
const edgeTypes = { fluxEdge: FluxEdge }

function gridLayout(apps) {
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(apps.length))))
  return apps.reduce((acc, app, i) => {
    acc[app.id] = { x: (i % cols) * 260 + 60, y: Math.floor(i / cols) * 170 + 60 }
    return acc
  }, {})
}

export default function ConsolidatedView({ onBack }) {
  const { demoMode, sessions: storeSessions } = useSessionStore()
  const [applications, setApplications] = useState([])
  const [allFlux, setAllFlux]           = useState([])
  const [, setEtablissements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [activeSessionIds, setActiveSessionIds] = useState(new Set())
  const [selectedNodeId, setSelectedNodeId]     = useState(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Sessions to display as filter pills
  const allSessions = useMemo(() => {
    if (demoMode) return [demoSession]
    return storeSessions
  }, [demoMode, storeSessions])

  useEffect(() => {
    async function load() {
      if (demoMode) {
        setApplications(demoApplications)
        setAllFlux(demoFlux)
        setEtablissements(demoEtablissements)
        setActiveSessionIds(new Set([demoSession.id]))
        setLoading(false)
        return
      }
      try {
        const [apps, flux, etabs] = await Promise.all([
          api.getApplications(),
          api.getFlux(),
          api.getEtablissements(),
        ])
        setApplications(apps)
        setAllFlux(flux)
        setEtablissements(etabs)
        setActiveSessionIds(new Set(storeSessions.map(s => s.id)))
      } catch (err) {
        console.error('ConsolidatedView load error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [demoMode, storeSessions])

  const filteredFlux = useMemo(
    () => allFlux.filter(f => activeSessionIds.has(f.sessionId)),
    [allFlux, activeSessionIds],
  )

  const appIdsInFlux = useMemo(() => {
    const ids = new Set()
    filteredFlux.forEach(f => { ids.add(f.sourceId); ids.add(f.cibleId) })
    return ids
  }, [filteredFlux])

  // Sync nodes
  useEffect(() => {
    const appsToShow = applications.filter(a => appIdsInFlux.has(a.id))
    const positions  = gridLayout(appsToShow)
    setNodes(appsToShow.map(app => ({
      id: app.id,
      type: 'appNode',
      position: positions[app.id],
      data: { app, onEdit: null, onDelete: null, etablissements: [], isMultiSite: false },
    })))
  }, [applications, appIdsInFlux, setNodes])

  // Sync edges
  useEffect(() => {
    setEdges(filteredFlux.map(f => ({
      id: f.id,
      source: f.sourceId,
      target: f.cibleId,
      type: 'fluxEdge',
      data: { flux: f },
      deletable: false,
    })))
  }, [filteredFlux, setEdges])

  // Highlighting
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
      style: { ...n.style, opacity: connectedInfo.nodeIds.has(n.id) ? 1 : 0.12, transition: 'opacity 0.2s' },
    }))
  }, [nodes, connectedInfo])

  const displayEdges = useMemo(() => {
    if (!connectedInfo) return edges
    return edges.map(e => ({
      ...e,
      style: { ...e.style, opacity: connectedInfo.edgeIds.has(e.id) ? 1 : 0.07, transition: 'opacity 0.2s' },
    }))
  }, [edges, connectedInfo])

  const toggleSession = useCallback((id) => {
    setActiveSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-sm">Chargement…</div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0 overflow-x-auto">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700 shrink-0"
        >
          ← Retour
        </button>
        <div className="w-px h-5 bg-gray-700 shrink-0" />
        <span className="text-white font-semibold shrink-0">Cartographie globale</span>
        <span className="text-xs text-gray-500 shrink-0">
          {appIdsInFlux.size} apps · {filteredFlux.length} flux
        </span>

        {allSessions.length > 0 && (
          <>
            <div className="w-px h-5 bg-gray-700 shrink-0" />
            <span className="text-xs text-gray-500 shrink-0">Sessions :</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {allSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSession(s.id)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors shrink-0 ${
                    activeSessionIds.has(s.id)
                      ? 'bg-blue-700 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {s.nom}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-600">
              <div className="text-5xl mb-3">◈</div>
              <div className="text-base">Aucune application dans les sessions sélectionnées</div>
              <div className="text-sm mt-1 text-gray-700">Activez au moins une session via les filtres ci-dessus</div>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            deleteKeyCode={null}
            className="bg-gray-900"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1f2937" />
            <Controls showInteractive={false} className="bg-gray-800 border-gray-700" />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
