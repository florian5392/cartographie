import { useState, useCallback, useRef } from 'react'
import useSessionStore from '../../stores/sessionStore'
import { useUndoRedo } from '../../hooks/useUndoRedo'
import { useAutoSave } from '../../hooks/useAutoSave'
import GraphCanvas from '../graph/GraphCanvas'
import QuickAddApp from '../panel/QuickAddApp'
import QuickAddFlux from '../panel/QuickAddFlux'
import QuickAddEtablissement from '../panel/QuickAddEtablissement'
import KpiBar from '../KpiBar'
import ExportPanel from './ExportPanel'
import PresentationMode from '../PresentationMode'
import * as api from '../../api/nocodb'

const TABS = [
  { id: 'app', label: 'Applications', key: 'F1' },
  { id: 'flux', label: 'Flux', key: 'F2' },
  { id: 'etab', label: 'Établissements', key: 'F3' },
]

const saveStatusLabel = {
  saved: { text: 'Sauvegardé', cls: 'text-green-400' },
  saving: { text: 'Sauvegarde...', cls: 'text-yellow-400' },
  unsaved: { text: 'Non sauvegardé', cls: 'text-orange-400' },
}

export default function SessionManager() {
  const [activeTab, setActiveTab] = useState('app')
  const [showExport, setShowExport] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [editingApp, setEditingApp] = useState(null)
  const flowRef = useRef(null)

  const { session, addFlux, demoMode, applications } = useSessionStore()
  const { canUndo, canRedo, undo, redo } = useUndoRedo()
  const { saveStatus, save } = useAutoSave(30000)

  const status = saveStatusLabel[saveStatus] || saveStatusLabel.saved

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('app') }
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('flux') }
      if (e.key === 'F3') { e.preventDefault(); setActiveTab('etab') }
      if (e.key === 'Escape') setPresentationMode(false)
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        // fit view — signal via a ref or state if needed
      }
    },
    [],
  )

  // Handle connection from canvas
  const handleConnect = useCallback(
    async (connection) => {
      const newFlux = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        sessionId: session?.id,
        sourceId: connection.source,
        cibleId: connection.target,
        type: 'API',
        label: '',
        critique: false,
      }
      addFlux(newFlux)
      if (!demoMode) {
        try {
          await api.createFlux(newFlux)
        } catch (err) {
          console.warn('Could not persist flux', err)
        }
      }
    },
    [session, addFlux, demoMode],
  )

  const handleNodeEdit = useCallback((app) => {
    setEditingApp(app)
    setActiveTab('app')
  }, [])

  if (presentationMode) {
    return <PresentationMode onExit={() => setPresentationMode(false)} />
  }

  return (
    <div
      className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Top bar */}
      <KpiBar
        onExport={() => setShowExport(true)}
        onPresentation={() => setPresentationMode(true)}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Side panel */}
        <div className="w-80 flex-shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
          {/* Tab nav */}
          <div className="flex border-b border-gray-700">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-blue-500 bg-gray-750'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={`${tab.label} (${tab.key})`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'app' && <QuickAddApp editingApp={editingApp} onEditDone={() => setEditingApp(null)} />}
            {activeTab === 'flux' && <QuickAddFlux />}
            {activeTab === 'etab' && <QuickAddEtablissement />}
          </div>

          {/* Bottom toolbar */}
          <div className="border-t border-gray-700 px-3 py-2 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Annuler (Ctrl+Z)"
              >
                ↩ Annuler
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rétablir (Ctrl+Shift+Z)"
              >
                ↪ Rétablir
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${status.cls}`}>{status.text}</span>
              {saveStatus === 'unsaved' && !demoMode && (
                <button
                  onClick={save}
                  className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded"
                >
                  Sauv.
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Graph area */}
        <div className="flex-1 relative overflow-hidden">
          <GraphCanvas
            onNodeEdit={handleNodeEdit}
            onConnect={handleConnect}
            showMiniMap={true}
            flowRef={flowRef}
          />

          {/* Application count badge */}
          {applications.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-600">
                <div className="text-5xl mb-3">◈</div>
                <div className="text-lg font-medium">Aucune application</div>
                <div className="text-sm mt-1">
                  Ajoutez des applications dans le panneau gauche
                </div>
                <div className="text-xs mt-3 text-gray-700">
                  ou connectez deux nœuds pour créer un flux
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export modal */}
      {showExport && <ExportPanel onClose={() => setShowExport(false)} />}
    </div>
  )
}
