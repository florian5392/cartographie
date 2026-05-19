import { useState } from 'react'
import useSessionStore from '../../stores/sessionStore'

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateMarkdown({ session, applications, flux, etablissements, deploiements }) {
  const lines = []
  lines.push(`# Cartographie SI — ${session?.nom || 'Session'}`)
  lines.push(`\n**Date** : ${session?.date || '—'}  `)
  lines.push(`**Périmètre** : ${session?.perimetre || '—'}  `)
  lines.push(`**Statut** : ${session?.statut || '—'}`)

  lines.push(`\n## Applications (${applications.length})`)
  lines.push('\n| Nom | Type | Éditeur | Criticité | Statut |')
  lines.push('|-----|------|---------|-----------|--------|')
  for (const app of applications) {
    lines.push(`| ${app.nom} | ${app.type || '—'} | ${app.editeur || '—'} | ${app.criticite || '—'} | ${app.statut || '—'} |`)
  }

  lines.push(`\n## Flux (${flux.length})`)
  lines.push('\n| Source | Cible | Type | Libellé | Fréquence | Critique |')
  lines.push('|--------|-------|------|---------|-----------|----------|')
  for (const f of flux) {
    const src = applications.find((a) => a.id === f.sourceId)?.nom || f.sourceId
    const tgt = applications.find((a) => a.id === f.cibleId)?.nom || f.cibleId
    lines.push(`| ${src} | ${tgt} | ${f.type || '—'} | ${f.label || '—'} | ${f.frequence || '—'} | ${f.critique ? 'Oui' : 'Non'} |`)
  }

  if (etablissements.length > 0) {
    lines.push(`\n## Établissements (${etablissements.length})`)
    lines.push('\n| Nom | Couleur |')
    lines.push('|-----|---------|')
    for (const e of etablissements) {
      lines.push(`| ${e.nom} | ${e.couleur || '—'} |`)
    }
  }

  if (deploiements.length > 0) {
    lines.push(`\n## Déploiements (${deploiements.length})`)
    lines.push('\n| Application | Établissement | Environnement |')
    lines.push('|-------------|---------------|---------------|')
    for (const d of deploiements) {
      const app = applications.find((a) => a.id === d.applicationId)?.nom || d.applicationId
      const etab = etablissements.find((e) => e.id === d.etablissementId)?.nom || d.etablissementId
      lines.push(`| ${app} | ${etab} | ${d.environnement || '—'} |`)
    }
  }

  const appsWithFlux = new Set([...flux.map((f) => f.sourceId), ...flux.map((f) => f.cibleId)])
  const coveragePercent =
    applications.length > 0 ? Math.round((appsWithFlux.size / applications.length) * 100) : 0
  const criticalCount = applications.filter((a) => a.criticite === 'haute').length

  lines.push('\n## KPIs')
  lines.push('\n| Indicateur | Valeur |')
  lines.push('|------------|--------|')
  lines.push(`| Applications recensées | ${applications.length} |`)
  lines.push(`| Flux tracés | ${flux.length} |`)
  lines.push(`| Applications critiques | ${criticalCount} |`)
  lines.push(`| Couverture | ${coveragePercent}% |`)
  if (etablissements.length > 0) {
    lines.push(`| Établissements | ${etablissements.length} |`)
  }

  return lines.join('\n')
}

export default function ExportPanel({ onClose }) {
  const { session, applications, flux, positions, etablissements, deploiements } = useSessionStore()
  const [exporting, setExporting] = useState(false)

  const handleExportJSON = () => {
    const data = { session, applications, flux, positions, etablissements, deploiements }
    downloadBlob(JSON.stringify(data, null, 2), `cartographie-${slug}-${Date.now()}.json`, 'application/json')
  }

  const handleExportMarkdown = () => {
    const md = generateMarkdown({ session, applications, flux, etablissements, deploiements })
    downloadBlob(md, `cartographie-${slug}-${Date.now()}.md`, 'text/markdown')
  }

  const slug = session?.nom?.replace(/\s+/g, '-') || 'session'

  const handleExportPNG = async () => {
    setExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      const flowEl = document.querySelector('.react-flow')
      if (!flowEl) { alert('Impossible de capturer le graphe.'); return }
      const dataUrl = await toPng(flowEl, { backgroundColor: '#111827', quality: 1 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `cartographie-${slug}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('PNG export failed', err)
      alert('Export PNG échoué. Essayez avec Ctrl+P pour imprimer.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportSVG = async () => {
    setExporting(true)
    try {
      const { toSvg } = await import('html-to-image')
      const flowEl = document.querySelector('.react-flow')
      if (!flowEl) { alert('Impossible de capturer le graphe.'); return }
      const dataUrl = await toSvg(flowEl, { backgroundColor: '#111827' })
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

  const handlePrint = () => {
    window.print()
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
            onClick={handleExportMarkdown}
            className="w-full flex items-center gap-3 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <span className="text-2xl">📝</span>
            <div className="text-left">
              <div className="font-medium">Export Markdown</div>
              <div className="text-xs text-gray-400">Tableaux applications &amp; flux</div>
            </div>
          </button>

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

          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-3 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <span className="text-2xl">🖨️</span>
            <div className="text-left">
              <div className="font-medium">Imprimer</div>
              <div className="text-xs text-gray-400">Dialogue d&apos;impression système</div>
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
