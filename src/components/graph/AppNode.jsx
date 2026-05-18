import { Handle, Position } from 'reactflow'

const criticalityBorder = {
  haute: 'border-l-red-500',
  moyenne: 'border-l-orange-500',
  basse: 'border-l-gray-500',
}

const criticalityDot = {
  haute: 'bg-red-500',
  moyenne: 'bg-orange-500',
  basse: 'bg-gray-500',
}

export default function AppNode({ data, selected }) {
  const { app, onEdit } = data
  const borderColor = criticalityBorder[app.criticite] || 'border-l-gray-500'
  const dotColor = criticalityDot[app.criticite] || 'bg-gray-500'

  return (
    <div
      className={`
        relative bg-gray-800 rounded-lg shadow-lg border border-gray-700
        border-l-4 ${borderColor} min-w-[160px] max-w-[220px] cursor-pointer
        transition-all duration-150
        ${selected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-gray-900' : ''}
      `}
      onDoubleClick={() => onEdit && onEdit(app)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-500 !border-gray-400 !w-3 !h-3"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: app.couleur || '#6b7280' }}
          />
          <span className="text-white font-bold text-sm truncate">{app.nom}</span>
        </div>
        <div className="text-gray-400 text-xs mb-1">{app.type}</div>
        {app.editeur && (
          <div className="text-gray-500 text-xs truncate">{app.editeur}</div>
        )}
        <div className="flex items-center gap-1 mt-1">
          <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-gray-400 text-xs capitalize">{app.criticite}</span>
          {app.statut && (
            <span
              className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                app.statut === 'production'
                  ? 'bg-green-900 text-green-300'
                  : app.statut === 'recette'
                  ? 'bg-yellow-900 text-yellow-300'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {app.statut}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-500 !border-gray-400 !w-3 !h-3"
      />
    </div>
  )
}
