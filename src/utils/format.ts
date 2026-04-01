// src/utils/format.ts
// Utilitaires de formatage des montants

/** Formate un nombre avec séparateurs de milliers et suffixe " €" */
export function formatAmount(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}

/** Formate un nombre avec séparateurs de milliers, sans suffixe */
export function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

/** Formate un pourcentage (ex: 30.5 → "30,5 %") */
export function formatPct(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'
}
