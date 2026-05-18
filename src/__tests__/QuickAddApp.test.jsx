import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../stores/sessionStore', () => ({ default: vi.fn() }))
const { default: useSessionStore } = await import('../stores/sessionStore')
const { default: QuickAddApp } = await import('../components/panel/QuickAddApp')

const SESSION = { id: 'sess-1', nom: 'Test', perimetre: 'mono-site' }
const APP_A   = { id: 'app-a', nom: 'Alpha', type: 'ERP', criticite: 'haute', sessionId: 'sess-1' }

function mockStore(overrides = {}) {
  useSessionStore.mockReturnValue({
    addApplication: vi.fn(),
    updateApplication: vi.fn(),
    applications: [],
    session: SESSION,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Mode ajout ────────────────────────────────────────────────────────────────

describe('QuickAddApp — mode ajout', () => {
  it('appelle addApplication avec le nom saisi', async () => {
    const addApplication = vi.fn()
    mockStore({ addApplication })
    const user = userEvent.setup()

    render(<QuickAddApp />)
    await user.type(screen.getByPlaceholderText(/SAP ERP/i), 'MonApp')
    await user.keyboard('{Enter}')

    expect(addApplication).toHaveBeenCalledOnce()
    expect(addApplication.mock.calls[0][0].nom).toBe('MonApp')
  })

  it('réinitialise le nom après soumission', async () => {
    mockStore()
    const user = userEvent.setup()

    render(<QuickAddApp />)
    const input = screen.getByPlaceholderText(/SAP ERP/i)
    await user.type(input, 'MonApp')
    await user.keyboard('{Enter}')

    expect(input.value).toBe('')
  })

  it('réfocalise sur le champ nom après soumission', async () => {
    mockStore()
    const user = userEvent.setup()

    render(<QuickAddApp />)
    const input = screen.getByPlaceholderText(/SAP ERP/i)
    await user.type(input, 'MonApp')
    await user.keyboard('{Enter}')

    expect(document.activeElement).toBe(input)
  })

  it('n\'appelle pas addApplication si le nom est vide', async () => {
    const addApplication = vi.fn()
    mockStore({ addApplication })
    const user = userEvent.setup()

    render(<QuickAddApp />)
    await user.keyboard('{Enter}')

    expect(addApplication).not.toHaveBeenCalled()
  })

  it('affiche le flash de confirmation après ajout', async () => {
    mockStore()
    const user = userEvent.setup()

    render(<QuickAddApp />)
    await user.type(screen.getByPlaceholderText(/SAP ERP/i), 'MonApp')
    await user.keyboard('{Enter}')

    expect(screen.getByText(/application ajoutée/i)).toBeInTheDocument()
  })

  it('inclut l\'id de session dans la nouvelle application', async () => {
    const addApplication = vi.fn()
    mockStore({ addApplication })
    const user = userEvent.setup()

    render(<QuickAddApp />)
    await user.type(screen.getByPlaceholderText(/SAP ERP/i), 'MonApp')
    await user.keyboard('{Enter}')

    expect(addApplication.mock.calls[0][0].sessionId).toBe(SESSION.id)
  })
})

// ─── Mode édition ──────────────────────────────────────────────────────────────

describe('QuickAddApp — mode édition', () => {
  it('pré-remplit le formulaire avec l\'application en cours d\'édition', () => {
    mockStore({ applications: [APP_A] })
    render(<QuickAddApp editingApp={APP_A} onEditDone={vi.fn()} />)

    expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument()
  })

  it('appelle updateApplication avec les données modifiées', async () => {
    const updateApplication = vi.fn()
    mockStore({ applications: [APP_A], updateApplication })
    const user = userEvent.setup()
    const onEditDone = vi.fn()

    render(<QuickAddApp editingApp={APP_A} onEditDone={onEditDone} />)
    const input = screen.getByDisplayValue('Alpha')
    await user.clear(input)
    await user.type(input, 'Alpha Modifiée')
    await user.keyboard('{Enter}')

    expect(updateApplication).toHaveBeenCalledWith(
      APP_A.id,
      expect.objectContaining({ nom: 'Alpha Modifiée' }),
    )
  })

  it('appelle onEditDone après modification', async () => {
    const onEditDone = vi.fn()
    mockStore({ applications: [APP_A] })
    const user = userEvent.setup()

    render(<QuickAddApp editingApp={APP_A} onEditDone={onEditDone} />)
    const input = screen.getByDisplayValue('Alpha')
    await user.clear(input)
    await user.type(input, 'Nouveau Nom')
    await user.keyboard('{Enter}')

    expect(onEditDone).toHaveBeenCalledOnce()
  })

  it('affiche le label "Modifier" sur le bouton submit', () => {
    mockStore({ applications: [APP_A] })
    render(<QuickAddApp editingApp={APP_A} onEditDone={vi.fn()} />)

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument()
  })

  it('annule l\'édition et remet le formulaire par défaut', async () => {
    mockStore({ applications: [APP_A] })
    const onEditDone = vi.fn()
    const user = userEvent.setup()

    render(<QuickAddApp editingApp={APP_A} onEditDone={onEditDone} />)
    await user.click(screen.getByRole('button', { name: /annuler/i }))

    expect(onEditDone).toHaveBeenCalledOnce()
  })
})

// ─── Mode lecture seule ────────────────────────────────────────────────────────

describe('QuickAddApp — lecture seule', () => {
  it('affiche un message et n\'expose pas le formulaire', () => {
    mockStore()
    render(<QuickAddApp readOnly />)

    expect(screen.getByText(/lecture seule/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/SAP ERP/i)).not.toBeInTheDocument()
  })
})

// ─── Autocomplétion ────────────────────────────────────────────────────────────

describe('QuickAddApp — autocomplétion', () => {
  it('affiche des suggestions à partir de 2 caractères', async () => {
    mockStore({ applications: [APP_A, { id: 'app-b', nom: 'Aleph', type: 'DPI', criticite: 'basse' }] })
    const user = userEvent.setup()

    render(<QuickAddApp />)
    await user.type(screen.getByPlaceholderText(/SAP ERP/i), 'Al')

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Aleph')).toBeInTheDocument()
  })

  it('applique une suggestion au clic', async () => {
    mockStore({ applications: [APP_A] })
    const user = userEvent.setup()

    render(<QuickAddApp />)
    const input = screen.getByPlaceholderText(/SAP ERP/i)
    await user.type(input, 'Al')
    await user.click(screen.getByText('Alpha'))

    expect(input.value).toBe('Alpha')
  })
})
