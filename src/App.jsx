import { useEffect } from 'react'
import useSessionStore from './stores/sessionStore'
import SessionSelector from './components/session/SessionSelector'
import SessionManager from './components/session/SessionManager'

export default function App() {
  const { session, demoMode, initStore } = useSessionStore()

  useEffect(() => {
    initStore()
  }, [initStore])

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 text-gray-100">
      {demoMode && (
        <div className="fixed top-2 right-2 z-50 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          Mode démo
        </div>
      )}
      {session ? <SessionManager /> : <SessionSelector />}
    </div>
  )
}
