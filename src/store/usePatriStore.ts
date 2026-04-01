// src/store/usePatriStore.ts
// Store léger — synchronisé avec localStorage, pas de dépendance Zustand

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Bloc0State {
  objectif: string          // Objectif principal unique (ex: "retraite")
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
  rendement: number   // %/an
  inflation: number   // %/an
  immo: number        // %/an
  croissance: number  // %/an
  espVie: number      // âge
}

// ─── Helpers localStorage ──────────────────────────────────────────────────────

function getLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback as object, ...JSON.parse(raw) } as T
  } catch { return fallback }
}

function setLS<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ─── Bloc0 ────────────────────────────────────────────────────────────────────

export function getBloc0(): Bloc0State {
  return getLS('patrisim_bloc0', { objectif: '', niveauDetail: 'complet' as const, done: false })
}

export function setBloc0(data: Partial<Bloc0State>): void {
  setLS('patrisim_bloc0', { ...getBloc0(), ...data })
}

// ─── Analyse IA ───────────────────────────────────────────────────────────────

export function getAnalyse(): AIAnalysis | null {
  try {
    const raw = localStorage.getItem('patrisim_analyse')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.data || parsed
  } catch { return null }
}

export function setAnalyse(data: AIAnalysis): void {
  setLS('patrisim_analyse', { data, ts: Date.now() })
}

// Cache IA par profil démo — évite de reconsommer des crédits
export function getAnalyseDemo(profileId: string): AIAnalysis | null {
  try {
    const raw = localStorage.getItem(`patrisim_analyse_demo_${profileId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.data || parsed
  } catch { return null }
}

export function setAnalyseDemo(profileId: string, data: AIAnalysis): void {
  setLS(`patrisim_analyse_demo_${profileId}`, { data, ts: Date.now() })
}

// ─── Hypothèses ───────────────────────────────────────────────────────────────

const HYPOTHESES_DEFAULT: Hypotheses = {
  rendement: 4,
  inflation: 2,
  immo: 2,
  croissance: 1.5,
  espVie: 87,
}

export function getHypotheses(): Hypotheses {
  return getLS('patrisim_hypotheses', HYPOTHESES_DEFAULT)
}

export function setHypotheses(data: Partial<Hypotheses>): void {
  setLS('patrisim_hypotheses', { ...getHypotheses(), ...data })
}

export function resetHypotheses(): void {
  setLS('patrisim_hypotheses', HYPOTHESES_DEFAULT)
}

// ─── Blocs actifs selon objectif ──────────────────────────────────────────────

// Retourne les numéros de blocs requis pour un objectif donné
export function getBlocsActifs(objectif: string, niveau: 'rapide' | 'complet'): number[] {
  const always = [1] // Bloc 1 toujours requis

  const map: Record<string, number[]> = {
    bilan:          [1, 2, 3, 4, 5, 6, 7],
    retraite:       [1, 3, 4, 5],
    fiscalite:      [1, 2, 3, 4],
    succession:     [1, 2, 7],
    investissement: [1, 2, 6],
    immobilier:     [1, 2, 3],
    protection:     [1, 4],
    objectif:       [1, 4, 5, 6],
  }

  const blocs = new Set<number>([...always, ...(map[objectif] || [1,2,3,4,5,6,7])])
  return Array.from(blocs).sort((a, b) => a - b)
}

// Prochain bloc après le courant
export function getNextBloc(current: number, objectif: string, niveau: 'rapide' | 'complet'): number | null {
  const actifs = getBlocsActifs(objectif, niveau)
  const idx = actifs.indexOf(current)
  if (idx === -1 || idx === actifs.length - 1) return null
  return actifs[idx + 1]
}

// ─── Reset complet ────────────────────────────────────────────────────────────

export function resetAll(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('patrisim_'))
  keys.forEach(k => localStorage.removeItem(k))
}