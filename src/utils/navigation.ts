// src/utils/navigation.ts
// Logique de navigation adaptative selon l'objectif sélectionné au Bloc 0

function getBlocsActifs(): number[] {
  try {
    const raw = localStorage.getItem('patrisim_bloc0')
    if (!raw) return [1, 2, 3, 4, 5, 6, 7]
    const { objectif, niveauDetail = 'complet' } = JSON.parse(raw)
    if (!objectif || objectif === 'bilan') return [1, 2, 3, 4, 5, 6, 7]
    const blocs = new Set<number>([1])
    if (objectif === 'retraite')       { blocs.add(2); blocs.add(4); blocs.add(5) }
    if (objectif === 'fiscalite')      { blocs.add(2); blocs.add(3); blocs.add(4) }
    if (objectif === 'succession')     { blocs.add(2); blocs.add(7) }
    if (objectif === 'investissement') { blocs.add(2); blocs.add(6) }
    if (objectif === 'immobilier')     { blocs.add(2); blocs.add(3) }
    if (objectif === 'protection')     { blocs.add(1); blocs.add(4) }
    if (objectif === 'objectif')       { blocs.add(4); blocs.add(5); blocs.add(6) }
    if (niveauDetail === 'complet') {
      if (blocs.has(4)) blocs.add(3)
      if (blocs.has(5)) blocs.add(4)
      if (blocs.has(7)) blocs.add(2)
    }
    return Array.from(blocs).sort((a, b) => a - b)
  } catch {
    return [1, 2, 3, 4, 5, 6, 7]
  }
}

const BLOC_PATHS: Record<number, string> = {
  1: '/bloc1', 2: '/bloc2', 3: '/bloc3',
  4: '/bloc4', 5: '/bloc5', 6: '/bloc6', 7: '/bloc7',
}

/** Retourne le chemin du prochain bloc actif après `current`, ou '/analyse' si c'est le dernier. */
export function getNextBloc(current: number): string {
  const actifs = getBlocsActifs()
  const next = actifs.find(n => n > current)
  return next !== undefined ? (BLOC_PATHS[next] ?? '/analyse') : '/analyse'
}

/** Retourne le chemin du bloc actif précédant `current`, ou '/start' si c'est le premier. */
export function getPrevBloc(current: number): string {
  const actifs = getBlocsActifs()
  const prev = [...actifs].reverse().find(n => n < current)
  return prev !== undefined ? (BLOC_PATHS[prev] ?? '/start') : '/start'
}

/** Retourne true si `current` est le dernier bloc actif (le suivant sera l'analyse). */
export function isLastBloc(current: number): boolean {
  const actifs = getBlocsActifs()
  return actifs.find(n => n > current) === undefined
}
