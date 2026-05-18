import useSessionStore from '../stores/sessionStore'

function KpiCard({ label, value, color = 'text-white' }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-2 min-w-[80px]">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  )
}

export default function KpiBar({ onExport, onPresentation, onBack, onToggleStatus, isReadOnly }) {
  const { applications, flux, etablissements, session, demoMode } =
    useSessionStore()

  const appCount = applications.length
  const fluxCount = flux.length
  const criticalCount = applications.filter((a) => a.criticite === 'haute').length
  const etablissementCount = etablissements.length

  const appsWithFlux = new Set([
    ...flux.map((f) => f.sourceId),
    ...flux.map((f) => f.cibleId),
  ])
  const coveragePercent = appCount > 0 ? Math.round((appsWithFlux.size / appCount) * 100) : 0

  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 h-14 px-2 gap-1 overflow-x-auto shrink-0">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-xs shrink-0"
          title="Retour aux sessions"
        >
          ← Sessions
        </button>
      )}

      {/* Session info */}
      <div className="flex items-center gap-2 px-3 border-x border-gray-700 mr-1 shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate max-w-[200px]">
            {session?.nom || '—'}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="capitalize">{session?.perimetre || ''}</span>
            {session?.etablissementCible && (
              <span className="text-blue-400 truncate max-w-[100px]">{session.etablissementCible}</span>
            )}
          </div>
        </div>
        {demoMode && (
          <span className="text-xs bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-full shrink-0">
            DÉMO
          </span>
        )}
      </div>

      {/* Status badge + toggle */}
      <div className="flex items-center gap-1 px-2 shrink-0">
        <button
          onClick={onToggleStatus}
          className={`text-xs font-medium px-2 py-1 rounded border transition-colors ${
            isReadOnly
              ? 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
              : 'bg-green-900 border-green-700 text-green-300 hover:bg-green-800'
          }`}
          title={isReadOnly ? 'Cliquer pour rouvrir' : 'Cliquer pour terminer'}
        >
          {isReadOnly ? '🔒 Terminée' : '● En cours'}
        </button>
      </div>

      {/* KPIs */}
      <div className="flex items-center divide-x divide-gray-700 flex-1 min-w-0">
        <KpiCard label="Apps" value={appCount} color="text-blue-400" />
        <KpiCard label="Flux" value={fluxCount} color="text-purple-400" />
        <KpiCard
          label="Critiques"
          value={criticalCount}
          color={criticalCount > 0 ? 'text-red-400' : 'text-gray-500'}
        />
        {session?.perimetre === 'multi-sites' && (
          <>
            <KpiCard label="Établ." value={etablissementCount} color="text-green-400" />
            <KpiCard label="Couverture" value={`${coveragePercent}%`} color="text-teal-400" />
          </>
        )}
        {session?.perimetre === 'mono-site' && (
          <KpiCard label="Couverture" value={`${coveragePercent}%`} color="text-teal-400" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 border-l border-gray-700 shrink-0">
        {onPresentation && (
          <button
            onClick={onPresentation}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
            title="Mode présentation (F11)"
          >
            Présenter
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
