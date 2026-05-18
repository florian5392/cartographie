import { BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType } from 'reactflow'

const FLUX_STYLES = {
  API:    { stroke: '#60a5fa', strokeDasharray: undefined,  strokeWidth: 2 },
  Fichier:{ stroke: '#facc15', strokeDasharray: '7 4',      strokeWidth: 2 },
  BDD:    { stroke: '#c084fc', strokeDasharray: '2 3',      strokeWidth: 2 },
  Manuel: { stroke: '#6b7280', strokeDasharray: undefined,  strokeWidth: 1.5 },
  EDI:    { stroke: '#4ade80', strokeDasharray: '10 4',     strokeWidth: 2 },
  Autre:  { stroke: '#9ca3af', strokeDasharray: undefined,  strokeWidth: 1.5 },
}

export default function FluxEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data,
}) {
  const flux  = data?.flux || {}
  const style = FLUX_STYLES[flux.type] || FLUX_STYLES.Autre

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const tooltip = [flux.label, flux.description, flux.frequence]
    .filter(Boolean)
    .join(' — ')

  const edgeStyle = {
    stroke:           style.stroke,
    strokeWidth:      style.strokeWidth,
    strokeDasharray:  style.strokeDasharray,
  }

  const markerEnd = {
    type:  MarkerType.ArrowClosed,
    color: style.stroke,
    width: 16,
    height: 16,
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={JSON.stringify(markerEnd)}
        style={edgeStyle}
        className="edge-draw"
      />
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
            title={tooltip}
            className="px-1.5 py-0.5 rounded text-xs font-medium shadow-md cursor-default select-none"
            style={{
              backgroundColor: '#111827',
              border: `1px solid ${style.stroke}`,
              color: style.stroke,
              fontSize: '10px',
            }}
          >
            {flux.label || flux.type || 'Flux'}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
