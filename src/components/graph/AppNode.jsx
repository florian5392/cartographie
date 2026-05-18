import { Handle, Position } from 'reactflow'

const CRITICITE_BORDER = {
  haute:   'border-l-red-500',
  moyenne: 'border-l-orange-500',
  basse:   'border-l-gray-500',
}

const CRITICITE_DOT = {
  haute:   'bg-red-500',
  moyenne: 'bg-orange-500',
  basse:   'bg-gray-500',
}

const PERIMETRE_BADGE = {
  global:       { label: 'Global',       cls: 'bg-blue-900 text-blue-300' },
  'multi-sites':{ label: 'Multi-sites',  cls: 'bg-purple-900 text-purple-300' },
  local:        { label: 'Local',        cls: 'bg-gray-700 text-gray-400' },
}

const STATUT_BADGE = {
  production: 'bg-green-900 text-green-300',
  recette:    'bg-yellow-900 text-yellow-300',
  pilote:     'bg-blue-900 text-blue-300',
}

export default function AppNode({ data, selected }) {
  const { app, onEdit, etablissements = [], isMultiSite = false } = data

  const borderCls = CRITICITE_BORDER[app.criticite] || 'border-l-gray-500'
  const dotCls    = CRITICITE_DOT[app.criticite]    || 'bg-gray-500'
  const perimBadge = isMultiSite && app.perimetre ? PERIMETRE_BADGE[app.perimetre] : null

  return (
    <div
      className={[
        'node-enter',
        'relative bg-gray-800 rounded-lg shadow-xl',
        'border border-gray-700 border-l-4', borderCls,
        'min-w-[170px] max-w-[230px] cursor-pointer',
        'transition-shadow duration-150',
        selected ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900 shadow-blue-900/50' : '',
      ].join(' ')}
      onDoubleClick={() => onEdit && onEdit(app)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-600 !border-gray-500 !w-3 !h-3 !opacity-0 hover:!opacity-100 transition-opacity"
      />

      <div className="px-3 pt-2.5 pb-2">
        {/* Name */}
        <div className="text-white font-bold text-[15px] leading-tight mb-0.5 pr-1">
          {app.nom}
        </div>

        {/* Type */}
        <div className="text-gray-400 text-xs mb-1.5">{app.type}</div>

        {/* Éditeur */}
        {app.editeur && (
          <div className="text-gray-500 text-xs truncate mb-1.5">{app.editeur}</div>
        )}

        {/* Bottom row: criticité + statut */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
          <span className="text-gray-400 text-xs capitalize">{app.criticite}</span>

          {app.statut && STATUT_BADGE[app.statut] && (
            <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${STATUT_BADGE[app.statut]}`}>
              {app.statut}
            </span>
          )}
        </div>

        {/* Périmètre badge — multi-sites only */}
        {perimBadge && (
          <div className="mt-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${perimBadge.cls}`}>
              {perimBadge.label}
            </span>
          </div>
        )}

        {/* Établissement color dots — multi-sites only */}
        {isMultiSite && etablissements.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {etablissements.map((e) => (
              <span
                key={e.id}
                title={e.nom}
                className="inline-block w-3 h-3 rounded-full border border-gray-600 flex-shrink-0"
                style={{ backgroundColor: e.couleur || '#6b7280' }}
              />
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-600 !border-gray-500 !w-3 !h-3 !opacity-0 hover:!opacity-100 transition-opacity"
      />
    </div>
  )
}
