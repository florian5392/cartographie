import { useState, useEffect, useCallback, useMemo } from 'react'
import GraphCanvas from './graph/GraphCanvas'
import KpiBar from './KpiBar'

export default function PresentationMode({ onExit }) {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 })
  const [laserVisible, setLaserVisible] = useState(false)
  const [laserColor, setLaserColor] = useState('#ef4444')

  const LASER_COLORS = useMemo(
    () => ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'],
    [],
  )

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setLaserVisible(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setLaserVisible(false)
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onExit()
      }
      if (e.key === 'l' || e.key === 'L') {
        const idx = LASER_COLORS.indexOf(laserColor)
        setLaserColor(LASER_COLORS[(idx + 1) % LASER_COLORS.length])
      }
    },
    [onExit, laserColor, LASER_COLORS],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* KPI overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 opacity-90">
        <KpiBar />
      </div>

      {/* Graph */}
      <div className="flex-1 mt-14">
        <GraphCanvas />
      </div>

      {/* Laser pointer */}
      {laserVisible && (
        <div
          className="pointer-events-none fixed z-[100] rounded-full"
          style={{
            left: mousePos.x - 12,
            top: mousePos.y - 12,
            width: 24,
            height: 24,
            backgroundColor: laserColor,
            opacity: 0.8,
            boxShadow: `0 0 12px 4px ${laserColor}`,
            transition: 'left 0.05s, top 0.05s',
          }}
        />
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-900/80 px-3 py-2 rounded-lg">
        <kbd className="bg-gray-700 px-1 rounded">Esc</kbd> Quitter ·{' '}
        <kbd className="bg-gray-700 px-1 rounded">L</kbd> Changer couleur laser
      </div>

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-16 right-4 z-20 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded transition-colors border border-gray-600"
      >
        Quitter présentation
      </button>
    </div>
  )
}
