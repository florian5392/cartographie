import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'

const fluxStyles = {
  API: {
    stroke: '#60a5fa',
    strokeDasharray: undefined,
    strokeWidth: 2,
    label: 'API',
  },
  Fichier: {
    stroke: '#facc15',
    strokeDasharray: '6 3',
    strokeWidth: 2,
    label: 'Fichier',
  },
  BDD: {
    stroke: '#c084fc',
    strokeDasharray: '2 2',
    strokeWidth: 2,
    label: 'BDD',
  },
  Manuel: {
    stroke: '#9ca3af',
    strokeDasharray: undefined,
    strokeWidth: 1,
    label: 'Manuel',
  },
  EDI: {
    stroke: '#4ade80',
    strokeDasharray: '8 3',
    strokeWidth: 2,
    label: 'EDI',
  },
  Autre: {
    stroke: '#9ca3af',
    strokeDasharray: undefined,
    strokeWidth: 1.5,
    label: 'Autre',
  },
}

export default function FluxEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) {
  const flux = data?.flux || {}
  const style = fluxStyles[flux.type] || fluxStyles.Autre

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edgeStyle = {
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: style.strokeDasharray,
  }

  const tooltipText = [flux.label, flux.description, flux.frequence]
    .filter(Boolean)
    .join(' — ')

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            title={tooltipText}
            className="px-1.5 py-0.5 rounded text-xs font-medium shadow-md cursor-default select-none"
            style={{
              backgroundColor: '#1f2937',
              border: `1px solid ${style.stroke}`,
              color: style.stroke,
            }}
          >
            {flux.label || style.label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
