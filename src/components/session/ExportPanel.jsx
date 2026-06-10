import { useState } from 'react'
import useSessionStore from '../../stores/sessionStore'

export default function ExportPanel({ onClose }) {
  const { session, applications, flux, positions, etablissements, deploiements } = useSessionStore()
  const [exporting, setExporting] = useState(false)
  const [lightBg, setLightBg] = useState(false)

  const slug = session?.nom?.replace(/\s+/g, '-') || 'session'

  const captureFlow = async (captureFn) => {
    const flowEl = document.querySelector('.react-flow')
    if (!flowEl) { alert('Impossible de capturer le graphe.'); return null }

    const bgColor = lightBg ? '#ffffff' : '#111827'

    // Force background on all ReactFlow layers via !important so html-to-image
    // picks up the correct computed style when inlining CSS.
    const styleEl = document.createElement('style')
    styleEl.textContent = lightBg
      ? `.react-flow, .react-flow__background, .react-flow__pane,
         .react-flow__renderer, .react-flow__container,
         .react-flow__viewport { background-color: #ffffff !important; background: #ffffff !important; }
         .react-flow__node { color: #111827 !important; }
         .react-flow__edge-label { color: #111827 !important; }`
      : ''
    document.head.appendChild(styleEl)

    try {
      return await captureFn(flowEl, bgColor)
    } finally {
      document.head.removeChild(styleEl)
    }
  }

  const handleExportPNG = async () => {
    setExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await captureFlow((flowEl, bgColor) =>
        toPng(flowEl, { backgroundColor: bgColor, quality: 1 })
      )
      if (!dataUrl) return
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `cartographie-${slug}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('PNG export failed', err)
      alert('Export PNG échoué.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportSVG = async () => {
    setExporting(true)
    try {
      const { toSvg } = await import('html-to-image')
      const dataUrl = await captureFlow((flowEl, bgColor) =>
        toSvg(flowEl, { backgroundColor: bgColor })
      )
      if (!dataUrl) return
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `cartographie-${slug}-${Date.now()}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('SVG export failed', err)
      alert('Export SVG échoué.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = () => {
    const data = { session, applications, flux, positions, etablissements, deploiements }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cartographie-${slug}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Exporter la cartographie</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 cursor-pointer select-none">
            <div
              onClick={() => setLightBg(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${lightBg ? 'bg-blue-500' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${lightBg ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-300">Fond clair (impression)</span>
            <span className="ml-auto text-xs text-gray-500">{lightBg ? '⬜ blanc' : '⬛ sombre'}</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleExportPNG}
              disabled={exporting}
              className="flex-1 flex items-center gap-3 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-2xl">🖼️</span>
              <div className="text-left">
                <div className="font-medium">PNG</div>
                <div className="text-xs text-gray-400">Image bitmap</div>
              </div>
            </button>
            <button
              onClick={handleExportSVG}
              disabled={exporting}
              className="flex-1 flex items-center gap-3 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-2xl">✏️</span>
              <div className="text-left">
                <div className="font-medium">SVG</div>
                <div className="text-xs text-gray-400">Vectoriel</div>
              </div>
            </button>
          </div>

          <button
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <span className="text-2xl">📦</span>
            <div className="text-left">
              <div className="font-medium">Export JSON</div>
              <div className="text-xs text-gray-400">Données complètes (import possible)</div>
            </div>
          </button>
        </div>

        <div className="mt-5 text-xs text-gray-500 text-center">
          {applications.length} applications · {flux.length} flux
        </div>
      </div>
    </div>
  )
}
