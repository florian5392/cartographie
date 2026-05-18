import useSessionStore from '../stores/sessionStore'

function KpiCard({ label, value, color = 'text-white' }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-2 min-w-[90px]">
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  )
}

export default function KpiBar({ onExport, onPresentation }) {
  const { applications, flux, deploiements, etablissements, session, isDirty, demoMode } =
    useSessionStore()

  const appCount = applications.length
  const fluxCount = flux.length
  const criticalCount = applications.filter((a) => a.criticite === 'haute').length
  const criticalFluxCount = flux.filter((f) => f.critique).length
  const etablissementCount = etablissements.length

  // Coverage: apps deployed / total apps (if multi-sites)
  const coveragePercent =
    appCount > 0
      ? Math.round((new Set(deploiements.map((d) => d.applicationId)).size / appCount) * 100)
      : 0

  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 h-14 px-2 gap-1 overflow-x-auto">
      {/* Session name */}
      <div className="flex items-center gap-2 px-3 border-r border-gray-700 mr-1">
        <div>
          <div className="text-sm font-semibold text-white truncate max-w-[180px]">
            {session?.nom || '—'}
          </div>
          <div className="text-xs text-gray-400">{session?.perimetre || ''}</div>
        </div>
        {demoMode && (
          <span className="text-xs bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-full">
            DÉMO
          </span>
        )}
        {isDirty && (
          <span className="text-xs bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded-full">
            non sauvegardé
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="flex items-center divide-x divide-gray-700 flex-1">
        <KpiCard label="Applications" value={appCount} color="text-blue-400" />
        <KpiCard label="Flux" value={fluxCount} color="text-purple-400" />
        <KpiCard label="Critiques" value={criticalCount} color={criticalCount > 0 ? 'text-red-400' : 'text-gray-400'} />
        <KpiCard label="Flux critiques" value={criticalFluxCount} color={criticalFluxCount > 0 ? 'text-orange-400' : 'text-gray-400'} />
        {session?.perimetre === 'multi-sites' && (
          <>
            <KpiCard label="Établissements" value={etablissementCount} color="text-green-400" />
            <KpiCard label="Couverture" value={`${coveragePercent}%`} color="text-teal-400" />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 border-l border-gray-700">
        {onPresentation && (
          <button
            onClick={onPresentation}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
          >
            Présentation
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium px-3 py-1.5 rounded transition-colors"
          >
            Exporter
          </button>
        )}
      </div>
    </div>
  )
}
