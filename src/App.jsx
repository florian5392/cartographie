import { useEffect, useState } from 'react'
import useSessionStore from './stores/sessionStore'
import SessionSelector from './components/session/SessionSelector'
import SessionManager from './components/session/SessionManager'
import ConsolidatedView from './components/consolidated/ConsolidatedView'
import ReferentielTable from './components/consolidated/ReferentielTable'
import CompareView from './components/consolidated/CompareView'

const VERSION = __APP_VERSION__

export default function App() {
  const { session, demoMode, initStore } = useSessionStore()
  const [currentView, setCurrentView] = useState(null)

  useEffect(() => {
    initStore()
  }, [initStore])

  if (session) return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 text-gray-100">
      {demoMode && (
        <div className="fixed top-2 right-2 z-50 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          Mode démo
        </div>
      )}
      <div className="fixed bottom-2 left-2 z-50 text-gray-600 text-[10px] select-none">
        v{VERSION}
      </div>
      <SessionManager />
    </div>
  )

  if (currentView === 'consolidated')
    return <ConsolidatedView onBack={() => setCurrentView(null)} />

  if (currentView === 'referentiel')
    return <ReferentielTable onBack={() => setCurrentView(null)} />

  if (currentView?.type === 'compare')
    return <CompareView sessions={currentView.sessions} onBack={() => setCurrentView(null)} />

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 text-gray-100">
      {demoMode && (
        <div className="fixed top-2 right-2 z-50 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          Mode démo
        </div>
      )}
      <div className="fixed bottom-2 left-2 z-50 text-gray-600 text-[10px] select-none">
        v{VERSION}
      </div>
      <SessionSelector onViewChange={setCurrentView} />
    </div>
  )
}
