import { useCallback } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from 'reactflow'
import { DEFAULT_FLUX_COLOR, FLUX_STROKE_WIDTH } from './fluxStyles'

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
  const onUpdate    = data?.onUpdate
  const readOnly    = data?.readOnly ?? false
  const color       = flux.color || DEFAULT_FLUX_COLOR

  const { getZoom } = useReactFlow()

  // Bezier de référence (auto-layout parallèle/bidirectionnel)
  const [bezierPath, bezierLX, bezierLY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    curvature,
  })

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  // Si l'utilisateur a déplacé la courbe, on passe en quadratic bezier custom
  const hasCustomCtrl = flux.ctrlDx !== undefined
  // Point de contrôle : initialisé depuis le midpoint bezier pour continuité visuelle
  const ctrlX = hasCustomCtrl ? midX + flux.ctrlDx : 2 * bezierLX - midX
  const ctrlY = hasCustomCtrl ? midY + flux.ctrlDy : 2 * bezierLY - midY

  const edgePath = hasCustomCtrl
    ? `M ${sourceX} ${sourceY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`
    : bezierPath

  // Midpoint de la courbe courante (t=0.5 sur quadratic bezier)
  const curveX = hasCustomCtrl
    ? 0.25 * sourceX + 0.5 * ctrlX + 0.25 * targetX
    : bezierLX
  const curveY = hasCustomCtrl
    ? 0.25 * sourceY + 0.5 * ctrlY + 0.25 * targetY
    : bezierLY

  // Position du libellé : midpoint + offset auto-parallèle + offset utilisateur
  const finalLabelX = curveX + (flux.labelDx ?? 0)
  const finalLabelY = curveY + labelOffset + (flux.labelDy ?? 0)

  // ── Drag sur la poignée de courbe ──
  const startEdgeDrag = useCallback((e) => {
    if (readOnly || !onUpdate) return
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    // Initialise le ctrlDx depuis le bezier courant pour un départ sans saut visuel
    const initCtrlDx = hasCustomCtrl ? flux.ctrlDx : 2 * (bezierLX - midX)
    const initCtrlDy = hasCustomCtrl ? flux.ctrlDy : 2 * (bezierLY - midY)
    const onMove = (ev) => {
      const zoom = getZoom()
      const dx = (ev.clientX - startX) / zoom
      const dy = (ev.clientY - startY) / zoom
      // Déplacer le midpoint de (dx,dy) requiert de déplacer le ctrl de (2dx,2dy)
      onUpdate({ ctrlDx: initCtrlDx + 2 * dx, ctrlDy: initCtrlDy + 2 * dy })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [readOnly, onUpdate, hasCustomCtrl, flux.ctrlDx, flux.ctrlDy, bezierLX, bezierLY, midX, midY, getZoom])

  // ── Drag sur le libellé ──
  const startLabelDrag = useCallback((e) => {
    if (readOnly || !onUpdate || !flux.label) return
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const initDx = flux.labelDx ?? 0
    const initDy = flux.labelDy ?? 0
    const onMove = (ev) => {
      const zoom = getZoom()
      const dx = (ev.clientX - startX) / zoom
      const dy = (ev.clientY - startY) / zoom
      onUpdate({ labelDx: initDx + dx, labelDy: initDy + dy })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [readOnly, onUpdate, flux.label, flux.labelDx, flux.labelDy, getZoom])

  const tooltip = [flux.label, flux.description, flux.frequence].filter(Boolean).join(' — ')

  return (
    <>
      {/* Zone de hit élargie */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ pointerEvents: 'stroke', cursor: readOnly ? 'default' : 'grab' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: FLUX_STROKE_WIDTH,
          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
        }}
        className="edge-draw"
      />
      <EdgeLabelRenderer>
        {/* Poignée de déplacement de la courbe */}
        {!readOnly && onUpdate && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${curveX}px,${curveY}px)`,
              pointerEvents: 'all',
              zIndex: 5,
            }}
            className="nodrag nopan group"
          >
            <div
              onMouseDown={startEdgeDrag}
              title="Déplacer le flux"
              className="w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              style={{
                backgroundColor: color,
                border: '2px solid white',
                boxShadow: '0 0 6px rgba(0,0,0,0.6)',
              }}
            />
          </div>
        )}

        {/* Libellé */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${finalLabelX}px,${finalLabelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
            cursor: (readOnly || !flux.label) ? 'default' : 'grab',
          }}
          className="nodrag nopan"
          onMouseDown={startLabelDrag}
        >
          {flux.label && (
            <div
              title={tooltip}
              className="px-1.5 py-0.5 rounded text-xs font-medium select-none active:cursor-grabbing"
              style={{
                backgroundColor: '#0f172a',
                border: `1.5px solid ${color}`,
                color,
                fontSize: '10px',
                boxShadow: `0 0 6px ${color}55, 0 2px 4px rgba(0,0,0,0.7)`,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {flux.label}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
