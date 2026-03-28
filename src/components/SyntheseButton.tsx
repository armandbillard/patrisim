// src/components/SyntheseButton.tsx
// Composant réutilisable : bouton "Suivant" ET "Vérifier mes informations"
// À utiliser dans le footer de chaque bloc à la place du simple bouton Suivant

import { useState } from 'react'
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface SyntheseItem {
  label: string
  value: string
  color?: string
}

interface SyntheseButtonProps {
  onSuivant: () => void          // action Suivant
  onRetour?: () => void          // action Retour (optionnel)
  labelSuivant?: string          // texte bouton principal
  savedAt?: string               // "Brouillon enregistré · HH:MM"
  items?: SyntheseItem[]         // données résumées à afficher
  errors?: string[]              // erreurs de validation
  disabled?: boolean
}

export default function SyntheseButton({
  onSuivant,
  onRetour,
  labelSuivant = 'Suivant →',
  savedAt,
  items = [],
  errors = [],
  disabled = false,
}: SyntheseButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-0 left-[220px] right-0 z-30 bg-white/90 backdrop-blur-sm border-t border-gray-100">

      {/* Synthèse dépliable */}
      {open && items.length > 0 && (
        <div className="max-w-4xl mx-auto px-8 py-4 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Récapitulatif de cette étape
          </p>
          <div className="grid grid-cols-3 gap-3">
            {items.map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`text-[13px] font-semibold ${item.color || 'text-gray-800'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Erreurs */}
      {errors.length > 0 && (
        <div className="max-w-4xl mx-auto px-8 py-2">
          {errors.map((e, i) => (
            <p key={i} className="text-[12px] text-red-500">⚠ {e}</p>
          ))}
        </div>
      )}

      {/* Barre principale */}
      <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between gap-3">

        {/* Retour */}
        {onRetour ? (
          <button
            type="button"
            onClick={onRetour}
            className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Retour
          </button>
        ) : <div />}

        {/* Droite */}
        <div className="flex items-center gap-3">

          {/* Brouillon */}
          {savedAt && (
            <span className="text-[11px] text-gray-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Brouillon enregistré · {savedAt}
            </span>
          )}

          {/* Vérifier mes infos */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              Vérifier mes informations
            </button>
          )}

          {/* Suivant */}
          <button
            type="button"
            onClick={onSuivant}
            disabled={disabled}
            className="flex items-center gap-2 text-[13px] text-white px-6 py-2.5 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle size={15} />
            {labelSuivant}
          </button>
        </div>
      </div>
    </div>
  )
}