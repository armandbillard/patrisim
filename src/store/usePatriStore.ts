// src/store/usePatriStore.ts
// Store Zustand global — state partagé entre tous les blocs

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bloc0State {
  objectifs: string[]
  niveauDetail: 'rapide' | 'complet'
  done: boolean
}

interface AIAnalysis {
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

interface PatriStore {
  // Bloc 0
  bloc0: Bloc0State
  setBloc0: (b: Partial<Bloc0State>) => void

  // Progression globale
  currentStep: number
  setCurrentStep: (n: number) => void
  stepsCompleted: number[]
  markStepDone: (n: number) => void

  // Analyse IA
  aiAnalysis: AIAnalysis | null
  setAIAnalysis: (a: AIAnalysis) => void
  aiGeneratedAt: number | null

  // Hypothèses dashboard
  hypotheses: {
    rendement: number
    inflation: number
    immo: number
    croissance: number
    espVie: number
  }
  setHypotheses: (h: Partial<PatriStore['hypotheses']>) => void
  resetHypotheses: () => void

  // Actions
  reset: () => void
}

const DEFAULT_HYPOTHESES = {
  rendement: 4,
  inflation: 2,
  immo: 2,
  croissance: 1.5,
  espVie: 87,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePatriStore = create<PatriStore>()(
  persist(
    (set) => ({
      // Bloc 0
      bloc0: { objectifs: [], niveauDetail: 'complet', done: false },
      setBloc0: (b) => set((s) => ({ bloc0: { ...s.bloc0, ...b } })),

      // Progression
      currentStep: 0,
      setCurrentStep: (n) => set({ currentStep: n }),
      stepsCompleted: [],
      markStepDone: (n) =>
        set((s) => ({
          stepsCompleted: s.stepsCompleted.includes(n)
            ? s.stepsCompleted
            : [...s.stepsCompleted, n],
        })),

      // IA
      aiAnalysis: null,
      setAIAnalysis: (a) => set({ aiAnalysis: a, aiGeneratedAt: Date.now() }),
      aiGeneratedAt: null,

      // Hypothèses
      hypotheses: DEFAULT_HYPOTHESES,
      setHypotheses: (h) =>
        set((s) => ({ hypotheses: { ...s.hypotheses, ...h } })),
      resetHypotheses: () => set({ hypotheses: DEFAULT_HYPOTHESES }),

      // Reset global
      reset: () =>
        set({
          bloc0: { objectifs: [], niveauDetail: 'complet', done: false },
          currentStep: 0,
          stepsCompleted: [],
          aiAnalysis: null,
          aiGeneratedAt: null,
          hypotheses: DEFAULT_HYPOTHESES,
        }),
    }),
    {
      name: 'patrisim-store', // clé localStorage
      partialize: (s) => ({
        bloc0: s.bloc0,
        stepsCompleted: s.stepsCompleted,
        aiAnalysis: s.aiAnalysis,
        aiGeneratedAt: s.aiGeneratedAt,
        hypotheses: s.hypotheses,
      }),
    }
  )
)

// ─── Helpers exportés ─────────────────────────────────────────────────────────

/** Retourne les numéros de blocs actifs selon les objectifs Bloc0 */
export function getBlocsActifs(
  objectifs: string[],
  niveau: 'rapide' | 'complet'
): number[] {
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

/** Prochain bloc après le n courant */
export function getNextBloc(current: number, objectifs: string[], niveau: 'rapide' | 'complet'): number | null {
  const actifs = getBlocsActifs(objectifs, niveau)
  const idx = actifs.indexOf(current)
  return idx !== -1 && idx < actifs.length - 1 ? actifs[idx + 1] : null
}