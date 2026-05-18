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

const SAVE_STATUS_CONFIG = {
  saved: { text: 'Sauvegardé ✓', cls: 'text-green-400' },
  saving: { text: 'Sauvegarde...', cls: 'text-yellow-400' },
  unsaved: { text: 'Non sauvegardé ⚠', cls: 'text-orange-400' },
}

export default function SessionManager() {
  const [activeTab, setActiveTab] = useState('app')
  const [showExport, setShowExport] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [editingApp, setEditingApp] = useState(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const flowRef = useRef(null)

  const { session, addFlux, demoMode, applications, setSession, updateSessionStatus } =
    useSessionStore()
  const { canUndo, canRedo, undo, redo } = useUndoRedo()
  const { saveStatus, save } = useAutoSave(30000)

  const isReadOnly = session?.statut === 'terminée'
  const statusConfig = SAVE_STATUS_CONFIG[saveStatus] || SAVE_STATUS_CONFIG.saved

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('app') }
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('flux') }
      if (e.key === 'F3') { e.preventDefault(); setActiveTab('etab') }
      if (e.key === 'Escape') setPresentationMode(false)
      if (e.key === 'F11') { e.preventDefault(); setPresentationMode(true) }
      if (e.key === ' ' && e.target === document.body) e.preventDefault()
    },
    [],
  )

  const handleConnect = useCallback(
    async (connection) => {
      if (isReadOnly) return
      const newFlux = {
        id: crypto.randomUUID(),
        sessionId: session?.id,
        sourceId: connection.source,
        cibleId: connection.target,
        type: 'API',
        label: '',
        critique: false,
      }
      addFlux(newFlux)
      if (!demoMode) {
        try { await api.createFlux(newFlux) } catch (err) { console.warn('flux persist error', err) }
      }
    },
    [session, addFlux, demoMode, isReadOnly],
  )

  const handleNodeEdit = useCallback((app) => {
    if (isReadOnly) return
    setEditingApp(app)
    setActiveTab('app')
  }, [isReadOnly])

  const handleOpenAddApp = useCallback(() => {
    if (isReadOnly) return
    setActiveTab('app')
    setEditingApp(null)
  }, [isReadOnly])

  const handleToggleStatus = async () => {
    const next = isReadOnly ? 'en cours' : 'terminée'
    await updateSessionStatus(next)
  }

  const handleBack = () => {
    if (saveStatus === 'unsaved' && !demoMode) {
      setConfirmClose(true)
    } else {
      setSession(null)
    }
  }

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
        onBack={handleBack}
        onToggleStatus={handleToggleStatus}
        isReadOnly={isReadOnly}
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
                disabled={isReadOnly && tab.id !== 'etab'}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title={`${tab.label} (${tab.key})`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Read-only banner */}
          {isReadOnly && (
            <div className="bg-gray-700 border-b border-gray-600 px-3 py-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">🔒 Session terminée — lecture seule</span>
              <button
                onClick={handleToggleStatus}
                className="ml-auto text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Rouvrir
              </button>
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'app' && (
              <QuickAddApp
                editingApp={editingApp}
                onEditDone={() => setEditingApp(null)}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'flux' && <QuickAddFlux readOnly={isReadOnly} />}
            {activeTab === 'etab' && <QuickAddEtablissement readOnly={isReadOnly} />}
          </div>

          {/* Bottom toolbar */}
          {!isReadOnly && (
            <div className="border-t border-gray-700 px-3 py-2 flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Annuler (Ctrl+Z)"
                >
                  ↩
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Rétablir (Ctrl+Shift+Z)"
                >
                  ↪
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${statusConfig.cls}`}>{statusConfig.text}</span>
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
          )}
        </div>

        {/* Graph area */}
        <div className="flex-1 relative overflow-hidden">
          <GraphCanvas
            onNodeEdit={handleNodeEdit}
            onConnect={handleConnect}
            onOpenAddApp={handleOpenAddApp}
            showMiniMap={true}
            flowRef={flowRef}
            readOnly={isReadOnly}
          />

          {applications.length === 0 && !isReadOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-600">
                <div className="text-5xl mb-3">◈</div>
                <div className="text-lg font-medium">Aucune application</div>
                <div className="text-sm mt-1">Ajoutez des applications dans le panneau gauche</div>
                <div className="text-xs mt-2 text-gray-700">F1 → Applications · Entrée → Ajouter</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export modal */}
      {showExport && <ExportPanel onClose={() => setShowExport(false)} />}

      {/* Confirm close dialog */}
      {confirmClose && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Modifications non sauvegardées</h3>
            <p className="text-gray-400 text-sm mb-4">
              Voulez-vous sauvegarder avant de quitter ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => { await save(); setConfirmClose(false); setSession(null) }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded"
              >
                Sauvegarder et quitter
              </button>
              <button
                onClick={() => { setConfirmClose(false); setSession(null) }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
              >
                Quitter sans sauvegarder
              </button>
              <button
                onClick={() => setConfirmClose(false)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
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
