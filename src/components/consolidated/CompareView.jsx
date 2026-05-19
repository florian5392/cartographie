import { useState, useEffect, useMemo } from 'react'
import useSessionStore from '../../stores/sessionStore'
import * as api from '../../api/api'
import { demoApplications, demoFlux } from '../../data/demoData'

const fluxKey = (f) => `${f.sourceId}→${f.cibleId}`

export default function CompareView({ sessions, onBack }) {
  const { demoMode } = useSessionStore()
  const [s1Flux, setS1Flux]       = useState([])
  const [s2Flux, setS2Flux]       = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading]     = useState(true)

  const [s1, s2] = sessions

  useEffect(() => {
    async function load() {
      if (demoMode) {
        setS1Flux(demoFlux.filter(f => f.sessionId === s1.id))
        setS2Flux(demoFlux.filter(f => f.sessionId === s2.id))
        setApplications(demoApplications)
        setLoading(false)
        return
      }
      try {
        const [f1, f2, apps] = await Promise.all([
          api.getFlux(s1.id),
          api.getFlux(s2.id),
          api.getApplications(),
        ])
        setS1Flux(f1)
        setS2Flux(f2)
        setApplications(apps)
      } catch (err) {
        console.error('CompareView load error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [demoMode, s1.id, s2.id])

  const appName = (id) => applications.find(a => a.id === id)?.nom || id

  const s1Keys = useMemo(() => new Set(s1Flux.map(fluxKey)), [s1Flux])
  const s2Keys = useMemo(() => new Set(s2Flux.map(fluxKey)), [s2Flux])

  const onlyInS1 = useMemo(() => s1Flux.filter(f => !s2Keys.has(fluxKey(f))), [s1Flux, s2Keys])
  const onlyInS2 = useMemo(() => s2Flux.filter(f => !s1Keys.has(fluxKey(f))), [s2Flux, s1Keys])
  const inBoth   = useMemo(() => s1Flux.filter(f => s2Keys.has(fluxKey(f))), [s1Flux, s2Keys])

  const s1AppIds = useMemo(() => new Set([...s1Flux.map(f => f.sourceId), ...s1Flux.map(f => f.cibleId)]), [s1Flux])
  const s2AppIds = useMemo(() => new Set([...s2Flux.map(f => f.sourceId), ...s2Flux.map(f => f.cibleId)]), [s2Flux])
  const appsOnlyInS1 = useMemo(() => [...s1AppIds].filter(id => !s2AppIds.has(id)), [s1AppIds, s2AppIds])
  const appsOnlyInS2 = useMemo(() => [...s2AppIds].filter(id => !s1AppIds.has(id)), [s2AppIds, s1AppIds])

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-sm">Chargement…</div>
      </div>
    )
  }

  const noDiff = onlyInS1.length === 0 && onlyInS2.length === 0 && appsOnlyInS1.length === 0 && appsOnlyInS2.length === 0

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
        >
          ← Retour
        </button>
        <div className="w-px h-5 bg-gray-700" />
        <span className="text-white font-semibold">Comparaison de sessions</span>
      </div>

      {/* Session headers */}
      <div className="grid grid-cols-2 border-b border-gray-700 shrink-0">
        <div className="px-6 py-3 bg-gray-800/60 border-r border-gray-700">
          <div className="text-sm font-medium text-white">{s1.nom}</div>
          <div className="text-xs text-gray-500">{s1.date} · {s1Flux.length} flux</div>
        </div>
        <div className="px-6 py-3 bg-gray-800/60">
          <div className="text-sm font-medium text-white">{s2.nom}</div>
          <div className="text-xs text-gray-500">{s2.date} · {s2Flux.length} flux</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">

        {noDiff ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <div className="text-4xl mb-4">≈</div>
            <div className="text-base">Les deux sessions sont identiques.</div>
            <div className="text-sm mt-1">Mêmes applications impliquées, mêmes connexions.</div>
          </div>
        ) : (
          <>
            {/* Applications diff */}
            {(appsOnlyInS1.length > 0 || appsOnlyInS2.length > 0) && (
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Applications impliquées dans les flux
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    {appsOnlyInS1.length > 0 ? (
                      <>
                        <div className="text-xs text-red-400 mb-2">Absentes de « {s2.nom} »</div>
                        <div className="space-y-1">
                          {appsOnlyInS1.map(id => (
                            <div key={id} className="bg-red-900/20 border border-red-800/40 rounded px-3 py-1.5 text-sm text-red-300">
                              — {appName(id)}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-600 italic">Aucune app absente</div>
                    )}
                  </div>
                  <div>
                    {appsOnlyInS2.length > 0 ? (
                      <>
                        <div className="text-xs text-green-400 mb-2">Nouvelles dans « {s2.nom} »</div>
                        <div className="space-y-1">
                          {appsOnlyInS2.map(id => (
                            <div key={id} className="bg-green-900/20 border border-green-800/40 rounded px-3 py-1.5 text-sm text-green-300">
                              + {appName(id)}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-600 italic">Aucune app ajoutée</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Flux diff */}
            {(onlyInS1.length > 0 || onlyInS2.length > 0) && (
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Flux modifiés
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    {onlyInS1.length > 0 ? (
                      <>
                        <div className="text-xs text-red-400 mb-2">Supprimés depuis « {s1.nom} »</div>
                        {onlyInS1.map(f => (
                          <div key={f.id} className="bg-red-900/20 border border-red-800/40 rounded px-3 py-2 text-xs text-red-300">
                            <span className="font-medium">{appName(f.sourceId)}</span>
                            <span className="text-red-600 mx-1.5">→</span>
                            <span className="font-medium">{appName(f.cibleId)}</span>
                            {f.label && <span className="text-red-500 ml-1.5">· {f.label}</span>}
                            <span className="ml-2 text-red-700 text-[10px]">{f.type}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-xs text-gray-600 italic">Aucun flux supprimé</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {onlyInS2.length > 0 ? (
                      <>
                        <div className="text-xs text-green-400 mb-2">Ajoutés dans « {s2.nom} »</div>
                        {onlyInS2.map(f => (
                          <div key={f.id} className="bg-green-900/20 border border-green-800/40 rounded px-3 py-2 text-xs text-green-300">
                            <span className="font-medium">{appName(f.sourceId)}</span>
                            <span className="text-green-600 mx-1.5">→</span>
                            <span className="font-medium">{appName(f.cibleId)}</span>
                            {f.label && <span className="text-green-500 ml-1.5">· {f.label}</span>}
                            <span className="ml-2 text-green-700 text-[10px]">{f.type}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-xs text-gray-600 italic">Aucun flux ajouté</div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* Flux communs */}
        {inBoth.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Flux communs ({inBoth.length})
            </h3>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {inBoth.map(f => (
                <div key={f.id} className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-400">
                  <span className="text-gray-300">{appName(f.sourceId)}</span>
                  <span className="text-gray-600 mx-1">→</span>
                  <span className="text-gray-300">{appName(f.cibleId)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
