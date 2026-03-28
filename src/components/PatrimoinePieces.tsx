// src/components/PatrimoinePieces.tsx
// Visualisation du patrimoine en pièces de 1€ + comparaison objectif

import { useMemo } from 'react'

interface Props {
  patrimoineActuel: number
  objectifCible?: number
  label?: string
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M€`
    : n >= 1_000
    ? `${Math.round(n / 1_000)} k€`
    : `${n} €`

// Monuments de référence en pièces de 1€ empilées (épaisseur 2.35mm)
const MONUMENTS = [
  { name: 'Tour Eiffel', hauteur: 330, pieces: Math.round(330_000 / 2.35), emoji: '🗼' },
  { name: 'Notre-Dame', hauteur: 96, pieces: Math.round(96_000 / 2.35), emoji: '⛪' },
  { name: 'Arc de Triomphe', hauteur: 50, pieces: Math.round(50_000 / 2.35), emoji: '🏛️' },
]

function getComparaison(montant: number) {
  // Hauteur en pièces empilées (épaisseur 2.35mm)
  const piecesTotal = montant // 1 pièce = 1€, empilées en hauteur symbolique
  const cm = (piecesTotal * 2.35) / 10 // hauteur en cm
  const m = cm / 100 // hauteur en mètres

  if (m >= 330) return { text: `${(m / 330).toFixed(1)} Tour Eiffel`, emoji: '🗼' }
  if (m >= 96) return { text: `${(m / 96).toFixed(1)} Notre-Dame`, emoji: '⛪' }
  if (m >= 50) return { text: `${(m / 50).toFixed(1)} Arc de Triomphe`, emoji: '🏛️' }
  if (m >= 8.45) return { text: `${(m / 8.45).toFixed(0)} étage${m/8.45 > 1 ? 's' : ''} d'immeuble`, emoji: '🏢' }
  if (m >= 1.75) return { text: `${(m / 1.75).toFixed(1)} taille humaine`, emoji: '🧍' }
  return { text: `${Math.round(cm)} cm`, emoji: '📏' }
}

// Génère les pièces visuellement (max 200 pièces affichées)
function PiecesGrid({ count, color }: { count: number; color: string }) {
  const display = Math.min(count, 200)
  const cols = 20

  return (
    <div
      className="flex flex-wrap gap-0.5"
      style={{ width: cols * 14 }}
      title={`${count.toLocaleString('fr-FR')} pièces`}
    >
      {Array.from({ length: display }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: color, borderColor: `${color}88`, opacity: 0.85 }}
        />
      ))}
      {count > 200 && (
        <div className="w-full text-center text-[10px] text-gray-400 mt-1">
          + {(count - 200).toLocaleString('fr-FR')} pièces…
        </div>
      )}
    </div>
  )
}

export default function PatrimoinePieces({ patrimoineActuel, objectifCible, label }: Props) {
  const comparaisonActuel = useMemo(() => getComparaison(patrimoineActuel), [patrimoineActuel])
  const comparaisonObjectif = useMemo(
    () => (objectifCible ? getComparaison(objectifCible) : null),
    [objectifCible]
  )

  const pctAtteint = objectifCible && objectifCible > 0
    ? Math.min(100, Math.round(patrimoineActuel / objectifCible * 100))
    : null

  const manque = objectifCible ? Math.max(0, objectifCible - patrimoineActuel) : null
  const manqueComp = manque ? getComparaison(manque) : null

  // Nombre de pièces à afficher (échelle logarithmique pour restez lisible)
  const piecesActuel = Math.min(
    200,
    Math.max(1, Math.round(Math.log10(Math.max(1, patrimoineActuel)) * 15))
  )
  const piecesObjectif = objectifCible
    ? Math.min(200, Math.max(1, Math.round(Math.log10(Math.max(1, objectifCible)) * 15)))
    : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
          {label || 'Votre patrimoine en pièces de 1€'}
        </p>
        <p className="text-[12px] text-gray-400">
          Si vous empilez vos pièces de 1 € (épaisseur 2,35 mm chacune)…
        </p>
      </div>

      {/* Patrimoine actuel */}
      <div className="space-y-3">
        <div className="flex items-end gap-3">
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Patrimoine actuel</p>
            <p className="text-[26px] font-bold text-[#185FA5]">{fmt(patrimoineActuel)}</p>
          </div>
          <div className="mb-1 text-[22px]">{comparaisonActuel.emoji}</div>
          <div className="mb-2">
            <p className="text-[13px] font-semibold text-gray-700">= {comparaisonActuel.text}</p>
            <p className="text-[11px] text-gray-400">de pièces empilées</p>
          </div>
        </div>

        <PiecesGrid count={piecesActuel} color="#185FA5" />
      </div>

      {/* Objectif */}
      {objectifCible && objectifCible > 0 && (
        <>
          <div className="h-px bg-gray-100" />

          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Objectif cible</p>
                <p className="text-[26px] font-bold text-[#0F6E56]">{fmt(objectifCible)}</p>
              </div>
              <div className="mb-1 text-[22px]">{comparaisonObjectif?.emoji}</div>
              <div className="mb-2">
                <p className="text-[13px] font-semibold text-gray-700">= {comparaisonObjectif?.text}</p>
                <p className="text-[11px] text-gray-400">de pièces empilées</p>
              </div>
            </div>

            <PiecesGrid count={piecesObjectif} color="#0F6E56" />
          </div>

          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-500">Progression</span>
              <span className={`font-bold ${pctAtteint! >= 100 ? 'text-[#0F6E56]' : pctAtteint! >= 70 ? 'text-[#185FA5]' : 'text-amber-600'}`}>
                {pctAtteint}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pctAtteint}%`,
                  backgroundColor: pctAtteint! >= 100 ? '#0F6E56' : pctAtteint! >= 70 ? '#185FA5' : '#D97706',
                }}
              />
            </div>
          </div>

          {/* Il manque X */}
          {manque !== null && manque > 0 && manqueComp && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-[13px] text-amber-800 font-medium">
                Il vous manque encore <strong>{fmt(manque)}</strong>
                {' '}— soit {manqueComp.emoji} <strong>{manqueComp.text}</strong> de pièces supplémentaires
              </p>
            </div>
          )}

          {manque === 0 && (
            <div className="bg-[#E1F5EE] border border-[#0F6E56]/20 rounded-xl px-4 py-3">
              <p className="text-[13px] text-[#085041] font-medium">
                🎉 Objectif atteint ou dépassé — félicitations !
              </p>
            </div>
          )}
        </>
      )}

      {/* Références */}
      <div className="border-t border-gray-50 pt-4">
        <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wider">Références (pièces empilées)</p>
        <div className="grid grid-cols-3 gap-2">
          {MONUMENTS.map(m => (
            <div key={m.name} className="text-center">
              <p className="text-[18px]">{m.emoji}</p>
              <p className="text-[10px] font-semibold text-gray-600">{m.name}</p>
              <p className="text-[10px] text-gray-400">{fmt(m.pieces)}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-300 text-center mt-2">
          Épaisseur pièce 1€ : 2,35 mm
        </p>
      </div>
    </div>
  )
}