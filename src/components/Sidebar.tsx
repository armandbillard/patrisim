// src/components/Sidebar.tsx

import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

interface SidebarProps {
  currentStep: number
}

// Blocs requis selon Bloc0
function getBlocsActifs(): number[] {
  try {
    const raw = localStorage.getItem('patrisim_bloc0')
    if (!raw) return [1,2,3,4,5,6,7]
    const { objectifs = [], niveauDetail = 'complet' } = JSON.parse(raw)
    if (!objectifs.length || objectifs.includes('bilan')) return [1,2,3,4,5,6,7]
    const blocs = new Set<number>([1])
    if (objectifs.includes('retraite'))      { blocs.add(4); blocs.add(5) }
    if (objectifs.includes('fiscalite'))     { blocs.add(2); blocs.add(3); blocs.add(4) }
    if (objectifs.includes('succession'))    { blocs.add(2); blocs.add(7) }
    if (objectifs.includes('investissement')){ blocs.add(2); blocs.add(6) }
    if (objectifs.includes('immobilier'))    { blocs.add(2); blocs.add(3) }
    if (objectifs.includes('protection'))    { blocs.add(4) }
    if (objectifs.includes('objectif'))      { blocs.add(4); blocs.add(5); blocs.add(6) }
    if (niveauDetail === 'complet') {
      if (blocs.has(4)) blocs.add(3)
      if (blocs.has(5)) blocs.add(4)
      if (blocs.has(7)) blocs.add(2)
    }
    return Array.from(blocs).sort()
  } catch { return [1,2,3,4,5,6,7] }
}

const STEPS = [
  { n: 1, label: 'Profil civil', path: '/bloc1' },
  { n: 2, label: 'Actif patrimonial', path: '/bloc2' },
  { n: 3, label: 'Passif & dettes', path: '/bloc3' },
  { n: 4, label: 'Flux & fiscalité', path: '/bloc4' },
  { n: 5, label: 'Projets & retraite', path: '/bloc5' },
  { n: 6, label: 'Profil investisseur', path: '/bloc6' },
  { n: 7, label: 'Succession', path: '/bloc7' },
]

export default function Sidebar({ currentStep }: SidebarProps) {
  const navigate = useNavigate()
  const blocsActifs = getBlocsActifs()

  // Blocs complétés = tous ceux < currentStep et actifs
  const isDone = (n: number) => n < currentStep && blocsActifs.includes(n)
  const isActive = (n: number) => n === currentStep
  const isDisabled = (n: number) => !blocsActifs.includes(n)

  return (
    <div className="w-[220px] bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 h-full z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-50">
        <button
          type="button"
          onClick={() => navigate('/start')}
          className="text-[20px] font-bold text-gray-900 hover:opacity-80 transition-opacity"
        >
          Patri<span className="text-[#185FA5]">Sim</span>
        </button>
        <p className="text-[10px] text-gray-400 mt-0.5">Simulation patrimoniale</p>
      </div>

      {/* Steps */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {STEPS.map(({ n, label, path }) => {
          const done = isDone(n)
          const active = isActive(n)
          const disabled = isDisabled(n)

          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                active
                  ? 'bg-[#E6F1FB] text-[#0C447C]'
                  : done
                  ? 'text-gray-500 hover:bg-gray-50 cursor-pointer'
                  : disabled
                  ? 'text-gray-300 cursor-not-allowed opacity-40'
                  : 'text-gray-400 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              {/* Indicateur */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                done
                  ? 'bg-[#0F6E56] text-white'
                  : active
                  ? 'bg-[#185FA5] text-white'
                  : disabled
                  ? 'bg-gray-100 text-gray-300'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <CheckCircle size={13} /> : n}
              </div>

              <span className={`text-[12px] font-medium ${active ? 'text-[#0C447C]' : ''}`}>
                {label}
              </span>

              {disabled && (
                <span className="ml-auto text-[9px] text-gray-300">—</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-50 space-y-2">
        <div className="text-[10px] text-gray-400 text-center leading-relaxed px-1">
          Outil pédagogique · Patrimoine &lt; 500 000 €<br />
          Ne remplace pas un CGP agréé
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Données non stockées
        </div>
      </div>
    </div>
  )
}