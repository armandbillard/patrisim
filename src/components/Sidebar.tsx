import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Lock, RotateCcw, Menu, X } from 'lucide-react'

interface SidebarProps { currentStep: number }

function getBlocsActifs(): number[] {
  try {
    const raw = localStorage.getItem('patrisim_bloc0')
    if (!raw) return [1,2,3,4,5,6,7]
    const { objectif, niveauDetail = 'complet' } = JSON.parse(raw)
    if (!objectif || objectif === 'bilan') return [1,2,3,4,5,6,7]
    const blocs = new Set<number>([1])
    if (objectif === 'retraite')    { blocs.add(2); blocs.add(4); blocs.add(5) }
    if (objectif === 'fiscalite')   { blocs.add(2); blocs.add(3); blocs.add(4) }
    if (objectif === 'succession')  { blocs.add(2); blocs.add(7) }
    if (objectif === 'investissement') { blocs.add(2); blocs.add(6) }
    if (objectif === 'immobilier')  { blocs.add(2); blocs.add(3) }
    if (objectif === 'protection')  { blocs.add(1); blocs.add(4) }
    if (objectif === 'objectif')    { blocs.add(4); blocs.add(5); blocs.add(6) }
    if (niveauDetail === 'complet') {
      if (blocs.has(4)) blocs.add(3)
      if (blocs.has(5)) blocs.add(4)
      if (blocs.has(7)) blocs.add(2)
    }
    return Array.from(blocs).sort((a, b) => a - b)
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

const STORAGE_KEYS = [
  'patrisim_bloc0',
  'patrisim_bloc1_mode', 'patrisim_bloc1_p1', 'patrisim_bloc1_p2',
  'patrisim_bloc1_pro1', 'patrisim_bloc1_pro2', 'patrisim_bloc1_foyer',
  'patrisim_bloc1_cf1', 'patrisim_bloc1_cf2',
  'patrisim_bloc2', 'patrisim_bloc3', 'patrisim_bloc3_calc',
  'patrisim_bloc4', 'patrisim_bloc5', 'patrisim_bloc6', 'patrisim_bloc7',
  'patrisim_analyse', 'patrisim_hypotheses',
]

const BLOC_DONE_KEYS: Record<number, string> = {
  1: 'patrisim_bloc1_p1',
  2: 'patrisim_bloc2',
  3: 'patrisim_bloc3',
  4: 'patrisim_bloc4',
  5: 'patrisim_bloc5',
  6: 'patrisim_bloc6',
  7: 'patrisim_bloc7',
}

function isBlocCompleted(n: number): boolean {
  const key = BLOC_DONE_KEYS[n]
  if (!key) return false
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0
  } catch { return false }
}

export default function Sidebar({ currentStep }: SidebarProps) {
  const navigate = useNavigate()
  const blocsActifs = getBlocsActifs()
  const [showResetModal, setShowResetModal] = useState(false)

  const handleReset = () => {
    STORAGE_KEYS.forEach(k => localStorage.removeItem(k))
    // Supprimer les caches démo dynamiques (patrisim_analyse_demo_*)
    Object.keys(localStorage)
      .filter(k => k.startsWith('patrisim_analyse_demo_'))
      .forEach(k => localStorage.removeItem(k))
    sessionStorage.clear()
    setShowResetModal(false)
    navigate('/start')
  }

  const isDone = (n: number) => n < currentStep && blocsActifs.includes(n)
  const isActive = (n: number) => n === currentStep
  const isDisabled = (n: number) => !blocsActifs.includes(n)

  const blocsTotal = blocsActifs.length
  const blocsCompleted = blocsActifs.filter(n => isBlocCompleted(n)).length
  const progressPct = blocsTotal > 0 ? Math.round(blocsCompleted / blocsTotal * 100) : 0

  return (
    <div className="w-[220px] bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 h-full z-40">

      {/* Modal réinitialisation */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <RotateCcw size={22} className="text-red-600" />
            </div>
            <h2 className="text-[16px] font-bold text-gray-900 text-center">Réinitialiser toutes les données ?</h2>
            <p className="text-[13px] text-gray-500 text-center leading-relaxed">
              Toutes vos réponses seront effacées et vous reviendrez à l'étape de démarrage.<br />
              <strong className="text-red-600">Cette action est irréversible.</strong>
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors font-medium">
                Annuler
              </button>
              <button type="button" onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition-colors">
                Tout effacer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-50">
        <button type="button" onClick={() => navigate('/start')}
          className="text-[20px] font-bold text-gray-900 hover:opacity-80 transition-opacity">
          Patri<span className="text-[#185FA5]">Sim</span>
        </button>
        <p className="text-[10px] text-gray-400 mt-0.5">Simulation patrimoniale</p>
      </div>

      {/* Progression */}
      <div className="px-5 py-3 border-b border-gray-50">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-gray-400">{blocsCompleted} / {blocsTotal} étapes complétées</span>
          <span className="text-[11px] font-semibold text-[#185FA5]">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#185FA5] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {STEPS.map(({ n, label, path }) => {
          const done = isDone(n)
          const active = isActive(n)
          const disabled = isDisabled(n)

          return (
            <div key={n} className="relative group">
              <button type="button"
                disabled={disabled}
                onClick={() => !disabled && navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  active   ? 'bg-[#E6F1FB] text-[#0C447C]'
                  : done   ? 'text-gray-500 hover:bg-gray-50 cursor-pointer'
                  : disabled ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                  done    ? 'bg-[#0F6E56] text-white'
                  : active  ? 'bg-[#185FA5] text-white'
                  : disabled ? 'bg-gray-100 text-gray-300'
                  : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <CheckCircle size={13} /> : disabled ? <Lock size={10} /> : n}
                </div>

                <span className={`text-[12px] font-medium flex-1 ${
                  active ? 'text-[#0C447C]' : disabled ? 'text-gray-300' : ''
                }`}>
                  {label}
                </span>

                {disabled && (
                  <span className="text-[9px] text-gray-200 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    non requis
                  </span>
                )}
              </button>

              {disabled && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-44 hidden group-hover:block z-50 shadow-xl leading-relaxed pointer-events-none">
                  Non requis pour votre objectif
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-50 space-y-2">
        <button type="button" onClick={() => setShowResetModal(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-100 text-[11px] text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-medium">
          <RotateCcw size={12} />
          Réinitialiser mes données
        </button>
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