// src/store/usePatriStore.ts
// Store léger sans dépendance externe — utilise localStorage directement

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Bloc0State {
  objectifs: string[]
  niveauDetail: 'rapide' | 'complet'
  done: boolean
}

export interface AIAnalysis {
  generated_at: number
  score_patrimonial: Record<string, unknown>
  synthese_executive: Record<string, unknown>
  analyse_objectif_principal: Record<string, unknown>
  recommandations: unknown[]
  analyse_fiscale: Record<string, unknown>
  analyse_retraite: Record<string, unknown>
  analyse_succession: Record<string, unknown>
  analyse_portefeuille: Record<string, unknown>
  alertes: unknown[]
  hypotheses_utilisees: Record<string, unknown>
}

export interface Hypotheses {
  rendement: number
  inflation: number
  immo: number
  croissance: number
  espVie: number
}

// ─── Helpers localStorage ─────────────────────────────────────────────────────

function getLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback as object, ...JSON.parse(raw) } as T
  } catch { return fallback }
}

function setLS<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─── API publique ─────────────────────────────────────────────────────────────

const DEFAULT_HYPOTHESES: Hypotheses = {
  rendement: 4,
  inflation: 2,
  immo: 2,
  croissance: 1.5,
  espVie: 87,
}

export const PatriStore = {
  // Bloc 0
  getBloc0: (): Bloc0State =>
    getLS('patrisim_bloc0', { objectifs: [], niveauDetail: 'complet' as const, done: false }),
  setBloc0: (b: Partial<Bloc0State>) =>
    setLS('patrisim_bloc0', { ...PatriStore.getBloc0(), ...b }),

  // Blocs complétés
  getStepsCompleted: (): number[] =>
    getLS<{ items: number[] }>('patrisim_steps', { items: [] }).items,
  markStepDone: (n: number) => {
    const steps = PatriStore.getStepsCompleted()
    if (!steps.includes(n)) setLS('patrisim_steps', { items: [...steps, n] })
  },

  // Analyse IA
  getAIAnalysis: (): AIAnalysis | null => {
    try {
      const raw = localStorage.getItem('patrisim_analyse')
      if (!raw) return null
      const { data } = JSON.parse(raw)
      return data
    } catch { return null }
  },
  setAIAnalysis: (a: AIAnalysis) =>
    setLS('patrisim_analyse', { data: a, ts: Date.now() }),

  // Hypothèses
  getHypotheses: (): Hypotheses =>
    getLS('patrisim_hypo', DEFAULT_HYPOTHESES),
  setHypotheses: (h: Partial<Hypotheses>) =>
    setLS('patrisim_hypo', { ...PatriStore.getHypotheses(), ...h }),
  resetHypotheses: () =>
    setLS('patrisim_hypo', DEFAULT_HYPOTHESES),

  // Reset global
  reset: () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('patrisim'))
    keys.forEach(k => localStorage.removeItem(k))
  },
}

// ─── Helpers blocs actifs ─────────────────────────────────────────────────────

export function getBlocsActifs(objectifs: string[], niveau: 'rapide' | 'complet'): number[] {
  if (!objectifs.length || objectifs.includes('bilan')) return [1,2,3,4,5,6,7]
  const blocs = new Set<number>([1])
  if (objectifs.includes('retraite'))       { blocs.add(4); blocs.add(5) }
  if (objectifs.includes('fiscalite'))      { blocs.add(2); blocs.add(3); blocs.add(4) }
  if (objectifs.includes('succession'))     { blocs.add(2); blocs.add(7) }
  if (objectifs.includes('investissement')) { blocs.add(2); blocs.add(6) }
  if (objectifs.includes('immobilier'))     { blocs.add(2); blocs.add(3) }
  if (objectifs.includes('protection'))     { blocs.add(4) }
  if (objectifs.includes('objectif'))       { blocs.add(4); blocs.add(5); blocs.add(6) }
  if (niveau === 'complet') {
    if (blocs.has(4)) blocs.add(3)
    if (blocs.has(5)) blocs.add(4)
    if (blocs.has(7)) blocs.add(2)
  }
  return Array.from(blocs).sort()
}

export function getNextBloc(current: number, objectifs: string[], niveau: 'rapide' | 'complet'): number | null {
  const actifs = getBlocsActifs(objectifs, niveau)
  const idx = actifs.indexOf(current)
  return idx !== -1 && idx < actifs.length - 1 ? actifs[idx + 1] : null
}