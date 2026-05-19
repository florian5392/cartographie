import { useState, useEffect, useRef } from 'react'
import useSessionStore from '../../stores/sessionStore'

const APP_TYPES = ['DPI', 'Imagerie', 'Messagerie', 'Annuaire']
const HEBERGEMENTS = ['On-premise', 'Cloud public', 'SaaS', 'Hybride']
const PORTEES = ['Etablissement', 'Groupe', 'Externe']
const PERIMETRES = ['global', 'multi-sites', 'local']
const CRITICITES = [
  { value: 'haute',   label: 'Haute',   dot: 'bg-red-500',    active: 'border-red-500 text-red-400' },
  { value: 'moyenne', label: 'Moyenne', dot: 'bg-orange-500', active: 'border-orange-500 text-orange-400' },
  { value: 'basse',   label: 'Basse',   dot: 'bg-gray-400',   active: 'border-gray-400 text-gray-300' },
]
const STATUTS = ['production', 'recette', 'pilote', 'développement', 'retraité']

const DEFAULT = {
  nom: '', type: '', criticite: 'moyenne', perimetre: 'local',
  hebergement: '', portee: '', description: '', editeur: '', version: '', responsable: '',
  statut: 'production', couleur: '#6366f1',
}

export default function QuickAddApp({ editingApp, onEditDone, readOnly }) {
  const { addApplication, updateApplication, applications, session } = useSessionStore()
  const [form, setForm]           = useState(DEFAULT)
  const [showExtra, setShowExtra] = useState(false)
  const [showDesc, setShowDesc]   = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [flash, setFlash]         = useState(null)
  const nomRef = useRef(null)

  const isMultiSite = session?.perimetre === 'multi-sites'
  const isEditing   = !!editingApp

  // Pre-fill form when editing
  useEffect(() => {
    if (editingApp) {
      setForm({ ...DEFAULT, ...editingApp })
      setShowExtra(true)
      setShowDesc(!!editingApp.description)
      setTimeout(() => nomRef.current?.focus(), 50)
    } else {
      setForm(DEFAULT)
      setShowExtra(false)
      setShowDesc(false)
    }
  }, [editingApp])

  const handleNomChange = (e) => {
    const val = e.target.value
    setForm(f => ({ ...f, nom: val }))
    if (val.length >= 2) {
      setSuggestions(
        applications
          .filter(a => (!isEditing || a.id !== editingApp?.id) &&
            a.nom.toLowerCase().includes(val.toLowerCase()))
          .slice(0, 5),
      )
    } else {
      setSuggestions([])
    }
  }

  const applySuggestion = (app) => {
    setForm(f => ({
      ...f,
      nom: app.nom,
      type: app.type || f.type,
      criticite: app.criticite || f.criticite,
      editeur: app.editeur || '',
      version: app.version || '',
    }))
    setSuggestions([])
    nomRef.current?.focus()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nom.trim() || readOnly) return

    if (isEditing) {
      updateApplication(editingApp.id, form)
      setFlash('updated')
      onEditDone?.()
    } else {
      addApplication({ ...form, id: crypto.randomUUID(), sessionId: session?.id })
      setFlash('added')
      setForm(DEFAULT)
      setShowDesc(false)
    }

    setTimeout(() => setFlash(null), 2000)
    nomRef.current?.focus()
  }

  if (readOnly) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">Session en lecture seule</div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Nom + autocomplétion */}
      <div className="relative">
        <label className="block text-xs text-gray-400 mb-1">
          {isEditing ? `Modifier "${editingApp.nom}"` : 'Nom *'}
        </label>
        <input
          ref={nomRef}
          autoFocus={!isEditing}
          value={form.nom}
          onChange={handleNomChange}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Ex : SAP ERP, Mediboard…"
          required
        />
        {suggestions.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-gray-700 border border-gray-600 rounded shadow-xl">
            {suggestions.map(app => (
              <button
                key={app.id}
                type="button"
                onMouseDown={() => applySuggestion(app)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-600 flex items-center gap-2"
              >
                <span className="text-gray-200">{app.nom}</span>
                <span className="text-gray-500 text-xs ml-auto">{app.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type — pills + saisie libre */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Type</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {APP_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, type: f.type === t ? '' : t }))}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                form.type === t
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {!APP_TYPES.includes(form.type) && (
          <input
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Autre type… (saisie libre)"
          />
        )}
      </div>

      {/* Criticité — boutons visuels */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Criticité</label>
        <div className="flex gap-1.5">
          {CRITICITES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, criticite: c.value }))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs font-medium transition-colors ${
                form.criticite === c.value
                  ? c.active + ' bg-gray-700'
                  : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${form.criticite === c.value ? c.dot : 'bg-gray-600'}`} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hébergement — pills */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Hébergement</label>
        <div className="flex flex-wrap gap-1">
          {HEBERGEMENTS.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => setForm(f => ({ ...f, hebergement: f.hebergement === h ? '' : h }))}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                form.hebergement === h
                  ? 'bg-teal-700 border-teal-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Portée — Etablissement / Groupe */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Portée organisationnelle</label>
        <div className="flex gap-1">
          {PORTEES.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm(f => ({ ...f, portee: f.portee === p ? '' : p }))}
              className={`flex-1 py-1 rounded text-xs border transition-colors ${
                form.portee === p
                  ? p === 'Groupe'
                    ? 'bg-indigo-700 border-indigo-500 text-white'
                    : p === 'Externe'
                    ? 'bg-amber-700 border-amber-500 text-white'
                    : 'bg-emerald-700 border-emerald-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Périmètre — multi-sites uniquement */}
      {isMultiSite && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Périmètre</label>
          <div className="flex gap-1">
            {PERIMETRES.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setForm(f => ({ ...f, perimetre: p }))}
                className={`flex-1 py-1 rounded text-xs border capitalize transition-colors ${
                  form.perimetre === p
                    ? 'bg-purple-700 border-purple-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Champs supplémentaires (repliés) */}
      <button
        type="button"
        onClick={() => setShowExtra(v => !v)}
        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
      >
        <span>{showExtra ? '▾' : '▸'}</span>
        Champs supplémentaires
      </button>

      {showExtra && (
        <div className="space-y-2 pl-1 border-l border-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Éditeur</label>
              <input
                value={form.editeur}
                onChange={e => setForm(f => ({ ...f, editeur: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="SAP SE…"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Version</label>
              <input
                value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="2024.1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Statut</label>
              <select
                value={form.statut}
                onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Couleur</label>
              <input
                type="color"
                value={form.couleur}
                onChange={e => setForm(f => ({ ...f, couleur: e.target.value }))}
                className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Responsable</label>
            <input
              value={form.responsable}
              onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="DSI — Pôle Gestion"
            />
          </div>
        </div>
      )}

      {/* Description (repliée) */}
      <button
        type="button"
        onClick={() => setShowDesc(v => !v)}
        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
      >
        <span>{showDesc ? '▾' : '▸'}</span>
        Description
      </button>
      {showDesc && (
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Description courte de l'application…"
        />
      )}

      {/* Submit */}
      <button
        type="submit"
        className={`w-full font-medium py-2 px-4 rounded text-sm transition-colors ${
          isEditing
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isEditing ? 'Enregistrer' : 'Ajouter ↵'}
      </button>

      {isEditing && (
        <button
          type="button"
          onClick={() => { onEditDone?.(); setForm(DEFAULT) }}
          className="w-full py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Annuler l&apos;édition
        </button>
      )}

      {flash === 'added'   && <div className="text-green-400 text-xs text-center">✓ Application ajoutée</div>}
      {flash === 'updated' && <div className="text-blue-400 text-xs text-center">✓ Modification enregistrée</div>}
    </form>
  )
}
