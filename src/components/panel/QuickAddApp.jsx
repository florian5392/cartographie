import { useState } from 'react'
import useSessionStore from '../../stores/sessionStore'

const defaultForm = {
  nom: '',
  type: '',
  editeur: '',
  version: '',
  criticite: 'moyenne',
  description: '',
  responsable: '',
  statut: 'production',
  couleur: '#6366f1',
}

const APP_TYPES = ['ERP', 'DPI', 'SIH', 'Imagerie', 'Messagerie', 'Annuaire', 'BI', 'Autre']
const CRITICITES = ['haute', 'moyenne', 'basse']
const STATUTS = ['production', 'recette', 'développement', 'retraité']

export default function QuickAddApp() {
  const { addApplication, session } = useSessionStore()
  const [form, setForm] = useState(defaultForm)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nom.trim()) return

    const newApp = {
      ...form,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      sessionId: session?.id,
    }
    addApplication(newApp)
    setForm(defaultForm)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-1">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nom *</label>
        <input
          name="nom"
          value={form.nom}
          onChange={handleChange}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Ex: SAP ERP"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">— Choisir —</option>
            {APP_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Criticité</label>
          <select
            name="criticite"
            value={form.criticite}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {CRITICITES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Éditeur</label>
          <input
            name="editeur"
            value={form.editeur}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Ex: SAP SE"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Version</label>
          <input
            name="version"
            value={form.version}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Ex: 2024.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Statut</label>
          <select
            name="statut"
            value={form.statut}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {STATUTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Couleur</label>
          <input
            type="color"
            name="couleur"
            value={form.couleur}
            onChange={handleChange}
            className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Responsable</label>
        <input
          name="responsable"
          value={form.responsable}
          onChange={handleChange}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Ex: DSI — Pôle Gestion"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Courte description..."
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
      >
        Ajouter l&apos;application
      </button>

      {success && (
        <div className="text-green-400 text-xs text-center">Application ajoutée !</div>
      )}
    </form>
  )
}
