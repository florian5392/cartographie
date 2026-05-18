import { useState } from 'react'
import useSessionStore from '../../stores/sessionStore'

const FLUX_TYPES = ['API', 'Fichier', 'BDD', 'EDI', 'Manuel', 'Autre']
const FREQUENCES  = ['Temps réel', 'Quotidien', 'Hebdomadaire', 'Ponctuel']

const TYPE_ACTIVE = {
  API:    'bg-blue-700 border-blue-500 text-blue-100',
  Fichier:'bg-yellow-700 border-yellow-600 text-yellow-100',
  BDD:    'bg-purple-700 border-purple-500 text-purple-100',
  EDI:    'bg-green-700 border-green-500 text-green-100',
  Manuel: 'bg-gray-600 border-gray-400 text-gray-100',
  Autre:  'bg-gray-600 border-gray-400 text-gray-100',
}

const DEFAULT = {
  sourceId: '', cibleId: '', type: 'API', label: '',
  description: '', frequence: 'Temps réel', volume: '', critique: false,
}

export default function QuickAddFlux({ readOnly }) {
  const { applications, session, addFlux } = useSessionStore()
  const [form, setForm]   = useState(DEFAULT)
  const [error, setError] = useState(null)
  const [flash, setFlash] = useState(false)

  if (readOnly) {
    return <div className="text-gray-500 text-sm p-4 text-center">Session en lecture seule</div>
  }

  if (applications.length < 2) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">
        Ajoutez au moins 2 applications pour tracer un flux.
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    if (!form.sourceId || !form.cibleId) { setError('Source et cible requises.'); return }
    if (form.sourceId === form.cibleId)  { setError('Source et cible identiques.'); return }

    addFlux({ ...form, id: crypto.randomUUID(), sessionId: session?.id })

    // Conserver type + fréquence, vider source/cible/label
    setForm(f => ({ ...DEFAULT, type: f.type, frequence: f.frequence }))
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  const cibles = applications.filter(a => a.id !== form.sourceId)

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Source */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Source *</label>
        <select
          value={form.sourceId}
          onChange={e => setForm(f => ({ ...f, sourceId: e.target.value, cibleId: f.cibleId === e.target.value ? '' : f.cibleId }))}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          required
        >
          <option value="">— Application source —</option>
          {applications.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
      </div>

      {/* Cible */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Cible *</label>
        <select
          value={form.cibleId}
          onChange={e => setForm(f => ({ ...f, cibleId: e.target.value }))}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          required
        >
          <option value="">— Application cible —</option>
          {cibles.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
      </div>

      {/* Type — pills colorés */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Type de flux</label>
        <div className="flex flex-wrap gap-1">
          {FLUX_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`px-2.5 py-1 rounded text-xs border font-medium transition-colors ${
                form.type === t
                  ? TYPE_ACTIVE[t]
                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Fréquence — boutons */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Fréquence</label>
        <div className="flex flex-wrap gap-1">
          {FREQUENCES.map(fr => (
            <button
              key={fr}
              type="button"
              onClick={() => setForm(f => ({ ...f, frequence: fr }))}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                form.frequence === fr
                  ? 'bg-gray-600 border-gray-400 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {fr}
            </button>
          ))}
        </div>
      </div>

      {/* Libellé */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Libellé court</label>
        <input
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Ex : Auth SSO, Données patient…"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Description <span className="text-gray-600">(optionnel)</span>
        </label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Détail du flux…"
        />
      </div>

      {/* Flux critique */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.critique}
          onChange={e => setForm(f => ({ ...f, critique: e.target.checked }))}
          className="rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500"
        />
        <span className="text-sm text-gray-300">
          Flux critique{' '}
          <span className="text-gray-500 text-xs">(comptabilisé dans les KPIs)</span>
        </span>
      </label>

      {error && <div className="text-red-400 text-xs">{error}</div>}

      <button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
      >
        Tracer ↵
      </button>

      {flash && (
        <div className="text-green-400 text-xs text-center">
          ✓ Flux ajouté — type et fréquence conservés
        </div>
      )}
    </form>
  )
}
