import { useEffect, useState } from 'react'
import useSessionStore from '../stores/sessionStore'

export function useSession() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { session, loadSessionData } = useSessionStore()

  const reload = async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      await loadSessionData(session.id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  return { loading, error, reload }
}
