import { useState, useEffect } from 'react'
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

const TYPE_BADGE = {
  API:    'bg-blue-900 text-blue-300',
  Fichier:'bg-yellow-900 text-yellow-300',
  BDD:    'bg-purple-900 text-purple-300',
  EDI:    'bg-green-900 text-green-300',
  Manuel: 'bg-gray-700 text-gray-300',
  Autre:  'bg-gray-700 text-gray-300',
}

const DEFAULT = {
  sourceId: '', cibleId: '', type: 'API', label: '',
  description: '', frequence: 'Temps réel', volume: '', critique: false,
}

export default function QuickAddFlux({ readOnly }) {
  const { applications, flux, session, addFlux, updateFlux, removeFlux } = useSessionStore()
  const [form, setForm]             = useState(DEFAULT)
  const [error, setError]           = useState(null)
  const [flash, setFlash]           = useState(null)
  const [editingFlux, setEditingFlux]     = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (editingFlux) {
      setForm({
        sourceId:    editingFlux.sourceId    || '',
        cibleId:     editingFlux.cibleId     || '',
        type:        editingFlux.type        || 'API',
        label:       editingFlux.label       || '',
        description: editingFlux.description || '',
        frequence:   editingFlux.frequence   || 'Temps réel',
        volume:      editingFlux.volume      || '',
        critique:    editingFlux.critique    || false,
      })
    } else {
      setForm(DEFAULT)
    }
  }, [editingFlux])

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

    if (editingFlux) {
      updateFlux(editingFlux.id, form)
      setEditingFlux(null)
      setFlash('updated')
    } else {
      addFlux({ ...form, id: crypto.randomUUID(), sessionId: session?.id })
      setForm(f => ({ ...DEFAULT, type: f.type, frequence: f.frequence }))
      setFlash('added')
    }
    setTimeout(() => setFlash(null), 1500)
  }

  const handleDelete = (id) => {
    removeFlux(id)
    setConfirmDeleteId(null)
    if (editingFlux?.id === id) setEditingFlux(null)
  }

  const cibles = applications.filter(a => a.id !== form.sourceId)
  const appName = (id) => applications.find(a => a.id === id)?.nom || '?'

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Mode édition — label contextuel */}
        {editingFlux && (
          <div className="text-xs text-purple-400 bg-purple-900/30 border border-purple-800 rounded px-2 py-1.5">
            Modification du flux <span className="font-medium text-purple-300">{editingFlux.label || `${appName(editingFlux.sourceId)} → ${appName(editingFlux.cibleId)}`}</span>
          </div>
        )}

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
          className={`w-full font-medium py-2 px-4 rounded text-sm transition-colors ${
            editingFlux
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {editingFlux ? 'Enregistrer' : 'Tracer ↵'}
        </button>

        {editingFlux && (
          <button
            type="button"
            onClick={() => setEditingFlux(null)}
            className="w-full py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Annuler l&apos;édition
          </button>
        )}

        {flash === 'added'   && <div className="text-green-400 text-xs text-center">✓ Flux ajouté — type et fréquence conservés</div>}
        {flash === 'updated' && <div className="text-blue-400 text-xs text-center">✓ Modification enregistrée</div>}
      </form>

      {/* ── Liste des flux existants ── */}
      {flux.length > 0 && (
        <div className="pt-1">
          <div className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
            <span className="flex-1 border-t border-gray-700" />
            <span>Flux existants ({flux.length})</span>
            <span className="flex-1 border-t border-gray-700" />
          </div>
          <div className="space-y-1">
            {flux.map(f => (
              <div
                key={f.id}
                className={`rounded px-2 py-1.5 text-xs border transition-colors ${
                  editingFlux?.id === f.id
                    ? 'bg-purple-900/30 border-purple-700'
                    : 'bg-gray-750 border-gray-700 hover:border-gray-600'
                }`}
              >
                {confirmDeleteId === f.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 flex-1">Supprimer ce flux ?</span>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 rounded hover:bg-red-900/40 transition-colors"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-gray-400 hover:text-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-gray-300 truncate flex-1 min-w-0">
                      <span className="text-gray-400">{appName(f.sourceId)}</span>
                      <span className="text-gray-600 mx-1">→</span>
                      <span className="text-gray-400">{appName(f.cibleId)}</span>
                      {f.label && <span className="text-gray-500 ml-1">· {f.label}</span>}
                    </span>
                    <span className={`shrink-0 px-1 py-0.5 rounded text-[10px] ${TYPE_BADGE[f.type] || 'bg-gray-700 text-gray-300'}`}>
                      {f.type}
                    </span>
                    <button
                      onClick={() => { setEditingFlux(f); setConfirmDeleteId(null) }}
                      className="shrink-0 text-gray-500 hover:text-blue-400 transition-colors px-1"
                      title="Modifier ce flux"
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(f.id)}
                      className="shrink-0 text-gray-500 hover:text-red-400 transition-colors px-1"
                      title="Supprimer ce flux"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
