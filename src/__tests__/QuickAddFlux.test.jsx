import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../stores/sessionStore', () => ({ default: vi.fn() }))
const { default: useSessionStore } = await import('../stores/sessionStore')
const { default: QuickAddFlux } = await import('../components/panel/QuickAddFlux')

const SESSION = { id: 'sess-1', nom: 'Test', perimetre: 'mono-site' }
const APP_A   = { id: 'app-a', nom: 'Alpha', criticite: 'haute' }
const APP_B   = { id: 'app-b', nom: 'Beta',  criticite: 'basse' }
const APP_C   = { id: 'app-c', nom: 'Gamma', criticite: 'moyenne' }

function mockStore(overrides = {}) {
  useSessionStore.mockReturnValue({
    addFlux: vi.fn(),
    applications: [APP_A, APP_B],
    session: SESSION,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Garde < 2 applications ────────────────────────────────────────────────────

describe('QuickAddFlux — garde applications', () => {
  it('affiche un message quand moins de 2 applications', () => {
    mockStore({ applications: [APP_A] })
    render(<QuickAddFlux />)
    expect(screen.getByText(/au moins 2 applications/i)).toBeInTheDocument()
  })

  it('affiche le formulaire quand il y a 2 applications ou plus', () => {
    mockStore()
    render(<QuickAddFlux />)
    expect(screen.getByRole('button', { name: /tracer/i })).toBeInTheDocument()
  })
})

// ─── Validation ────────────────────────────────────────────────────────────────

describe('QuickAddFlux — validation', () => {
  it('affiche une erreur si source ou cible manquante', () => {
    const { container } = render(<QuickAddFlux />)
    mockStore()

    fireEvent.submit(container.querySelector('form'))

    expect(screen.getByText(/source et cible requises/i)).toBeInTheDocument()
  })

  it('n\'appelle pas addFlux si source manquante', async () => {
    const addFlux = vi.fn()
    mockStore({ addFlux })
    const { container } = render(<QuickAddFlux />)

    fireEvent.submit(container.querySelector('form'))

    expect(addFlux).not.toHaveBeenCalled()
  })

  it('exclut la source de la liste cible', async () => {
    mockStore({ applications: [APP_A, APP_B, APP_C] })
    const user = userEvent.setup()
    render(<QuickAddFlux />)

    const [sourceSelect, cibleSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(sourceSelect, APP_A.id)

    // APP_A ne doit pas apparaître dans le select cible
    const cibleOptions = Array.from(cibleSelect.options).map(o => o.value)
    expect(cibleOptions).not.toContain(APP_A.id)
    expect(cibleOptions).toContain(APP_B.id)
    expect(cibleOptions).toContain(APP_C.id)
  })
})

// ─── Soumission et conservation du contexte ────────────────────────────────────

describe('QuickAddFlux — soumission', () => {
  it('appelle addFlux avec les bonnes données', async () => {
    const addFlux = vi.fn()
    mockStore({ addFlux })
    const user = userEvent.setup()
    render(<QuickAddFlux />)

    const [sourceSelect, cibleSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(sourceSelect, APP_A.id)
    await user.selectOptions(cibleSelect, APP_B.id)
    await user.click(screen.getByRole('button', { name: /tracer/i }))

    expect(addFlux).toHaveBeenCalledOnce()
    expect(addFlux.mock.calls[0][0]).toMatchObject({
      sourceId: APP_A.id,
      cibleId: APP_B.id,
      sessionId: SESSION.id,
    })
  })

  it('conserve le type sélectionné après soumission', async () => {
    mockStore()
    const user = userEvent.setup()
    render(<QuickAddFlux />)

    // Sélectionner le type "Fichier"
    await user.click(screen.getByRole('button', { name: 'Fichier' }))

    const [sourceSelect, cibleSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(sourceSelect, APP_A.id)
    await user.selectOptions(cibleSelect, APP_B.id)
    await user.click(screen.getByRole('button', { name: /tracer/i }))

    // Après soumission, le bouton "Fichier" doit rester actif
    const fichierBtn = screen.getByRole('button', { name: 'Fichier' })
    expect(fichierBtn.className).toMatch(/bg-yellow/)
  })

  it('conserve la fréquence sélectionnée après soumission', async () => {
    mockStore()
    const user = userEvent.setup()
    render(<QuickAddFlux />)

    await user.click(screen.getByRole('button', { name: 'Quotidien' }))

    const [sourceSelect, cibleSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(sourceSelect, APP_A.id)
    await user.selectOptions(cibleSelect, APP_B.id)
    await user.click(screen.getByRole('button', { name: /tracer/i }))

    const quotidienBtn = screen.getByRole('button', { name: 'Quotidien' })
    expect(quotidienBtn.className).toMatch(/bg-gray-600/)
  })

  it('remet source et cible à vide après soumission', async () => {
    mockStore()
    const user = userEvent.setup()
    render(<QuickAddFlux />)

    const [sourceSelect, cibleSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(sourceSelect, APP_A.id)
    await user.selectOptions(cibleSelect, APP_B.id)
    await user.click(screen.getByRole('button', { name: /tracer/i }))

    expect(sourceSelect.value).toBe('')
    expect(cibleSelect.value).toBe('')
  })

  it('affiche le flash de confirmation après ajout', async () => {
    mockStore()
    const user = userEvent.setup()
    render(<QuickAddFlux />)

    const [sourceSelect, cibleSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(sourceSelect, APP_A.id)
    await user.selectOptions(cibleSelect, APP_B.id)
    await user.click(screen.getByRole('button', { name: /tracer/i }))

    expect(screen.getByText(/flux ajouté/i)).toBeInTheDocument()
  })
})

// ─── Lecture seule ─────────────────────────────────────────────────────────────

describe('QuickAddFlux — lecture seule', () => {
  it('affiche un message et n\'expose pas le formulaire', () => {
    mockStore()
    render(<QuickAddFlux readOnly />)

    expect(screen.getByText(/lecture seule/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tracer/i })).not.toBeInTheDocument()
  })
})
