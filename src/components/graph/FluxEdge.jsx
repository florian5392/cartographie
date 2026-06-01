import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'
import { FLUX_STYLES } from './fluxStyles'

export default function FluxEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data,
  markerEnd,
}) {
  const flux        = data?.flux || {}
  const curvature   = data?.curvature ?? 0.25
  const labelOffset = data?.labelOffset ?? 0
  const style       = FLUX_STYLES[flux.type] || FLUX_STYLES.Autre

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    curvature,
  })

  const tooltip = [flux.label, flux.description, flux.frequence]
    .filter(Boolean)
    .join(' — ')

  const edgeStyle = {
    stroke:          style.stroke,
    strokeWidth:     style.strokeWidth,
    strokeDasharray: style.strokeDasharray,
    // White halo behind the stroke for contrast against dark node backgrounds
    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
  }

  return (
    <>
      {/* Invisible wider hit-area path for easier hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        className="edge-draw"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + labelOffset}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
          className="nodrag nopan"
        >
          <div
            title={tooltip}
            className="px-1.5 py-0.5 rounded text-xs font-medium cursor-default select-none"
            style={{
              backgroundColor: '#0f172a',
              border: `1.5px solid ${style.stroke}`,
              color: style.stroke,
              fontSize: '10px',
              boxShadow: `0 0 6px ${style.stroke}55, 0 2px 4px rgba(0,0,0,0.7)`,
              whiteSpace: 'nowrap',
            }}
          >
            {flux.label || flux.type || 'Flux'}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
