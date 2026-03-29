import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, FileText, PiggyBank, Users, Lock,
  CheckCircle, Clock, ArrowRight, Info
} from 'lucide-react'

type ModuleKey = 'retraite' | 'bilan' | 'fiscalite' | 'succession' | 'investissement' | 'immobilier' | 'protection' | 'objectif'

interface Bloc0State {
  objectif: ModuleKey | null
  niveauDetail: 'rapide' | 'complet'
  done: boolean
}

function saveState(s: Bloc0State) {
  localStorage.setItem('patrisim_bloc0', JSON.stringify(s))
}

function loadState(): Bloc0State {
  try {
    const raw = localStorage.getItem('patrisim_bloc0')
    if (!raw) return { objectif: null, niveauDetail: 'complet', done: false }
    return JSON.parse(raw)
  } catch {
    return { objectif: null, niveauDetail: 'complet', done: false }
  }
}

export function getBlocsRequired(objectif: ModuleKey | null, niveau: 'rapide' | 'complet'): number[] {
  if (!objectif || objectif === 'bilan') return [1, 2, 3, 4, 5, 6, 7]
  const blocs = new Set<number>([1])
  if (objectif === 'retraite')    { blocs.add(4); blocs.add(5) }
  if (objectif === 'fiscalite')   { blocs.add(2); blocs.add(3); blocs.add(4) }
  if (objectif === 'succession')  { blocs.add(2); blocs.add(7) }
  if (niveau === 'complet') {
    if (blocs.has(4)) blocs.add(3)
    if (blocs.has(5)) blocs.add(4)
    if (blocs.has(7)) blocs.add(2)
  }
  return Array.from(blocs).sort()
}

// ─── Modules ──────────────────────────────────────────────────────────────────

const MODULES: {
  key: ModuleKey
  icon: React.ReactNode
  title: string
  desc: string
  dureeRapide: number
  dureeComplete: number
  tag: string
  tagColor: string
  disponible: boolean
  raisonIndisponible?: string
}[] = [
  {
    key: 'retraite',
    icon: <TrendingUp size={22} />,
    title: 'Préparer ma retraite',
    desc: 'Estimez votre pension, calculez le capital nécessaire, identifiez les déficits à combler.',
    dureeRapide: 5, dureeComplete: 12,
    tag: 'Planification', tagColor: 'bg-[#E6F1FB] text-[#0C447C]',
    disponible: true,
  },
  {
    key: 'bilan',
    icon: <FileText size={22} />,
    title: 'Faire un bilan patrimonial complet',
    desc: 'Vue d\'ensemble de votre situation : actifs, dettes, revenus, fiscalité, objectifs.',
    dureeRapide: 15, dureeComplete: 40,
    tag: 'Bilan global', tagColor: 'bg-gray-100 text-gray-600',
    disponible: true,
  },
  {
    key: 'fiscalite',
    icon: <PiggyBank size={22} />,
    title: 'Optimiser ma fiscalité',
    desc: 'Identifiez vos leviers fiscaux : PER, déficit foncier, flat tax, enveloppes adaptées.',
    dureeRapide: 4, dureeComplete: 10,
    tag: 'Fiscal', tagColor: 'bg-amber-50 text-amber-700',
    disponible: true,
  },
  {
    key: 'succession',
    icon: <Users size={22} />,
    title: 'Préparer ma succession',
    desc: 'Analysez les droits à payer, identifiez les optimisations possibles pour transmettre.',
    dureeRapide: 5, dureeComplete: 12,
    tag: 'Transmission', tagColor: 'bg-purple-50 text-purple-700',
    disponible: true,
  },
  {
    key: 'investissement',
    icon: <TrendingUp size={22} />,
    title: 'Structurer mes investissements',
    desc: 'Définissez votre profil investisseur, vérifiez la cohérence de vos placements.',
    dureeRapide: 5, dureeComplete: 10,
    tag: 'Investissement', tagColor: 'bg-[#E6F1FB] text-[#0C447C]',
    disponible: false,
    raisonIndisponible: 'Disponible dans une prochaine version — nécessite une analyse MiFID II complète.',
  },
  {
    key: 'immobilier',
    icon: <FileText size={22} />,
    title: 'Analyser mon patrimoine immobilier',
    desc: 'Valorisation, rendements locatifs, financement, régimes fiscaux adaptés.',
    dureeRapide: 4, dureeComplete: 10,
    tag: 'Immobilier', tagColor: 'bg-orange-50 text-orange-700',
    disponible: false,
    raisonIndisponible: 'Disponible dans une prochaine version — requiert des données cadastrales et fiscales avancées.',
  },
  {
    key: 'protection',
    icon: <Users size={22} />,
    title: 'Protéger ma famille',
    desc: 'Évaluez les risques, vérifiez vos couvertures, anticipez les aléas de la vie.',
    dureeRapide: 4, dureeComplete: 8,
    tag: 'Protection', tagColor: 'bg-[#E1F5EE] text-[#085041]',
    disponible: false,
    raisonIndisponible: 'Disponible dans une prochaine version — nécessite l\'intégration de données d\'assurance.',
  },
  {
    key: 'objectif',
    icon: <FileText size={22} />,
    title: 'Atteindre un objectif précis',
    desc: 'Achat immobilier, financement études, capital cible : simulez votre trajectoire.',
    dureeRapide: 5, dureeComplete: 10,
    tag: 'Objectif', tagColor: 'bg-gray-100 text-gray-600',
    disponible: false,
    raisonIndisponible: 'Disponible dans une prochaine version — simulation de trajectoire en cours de développement.',
  },
]

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Bloc0() {
  const navigate = useNavigate()
  const [state, setState] = useState<Bloc0State>(loadState)
  const [animIn, setAnimIn] = useState(false)
  const [hoveredLocked, setHoveredLocked] = useState<ModuleKey | null>(null)

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 50)
  }, [])

  useEffect(() => {
    saveState(state)
  }, [state])

  const select = (key: ModuleKey) => {
    setState(s => ({ ...s, objectif: key }))
  }

  const handleStart = () => {
    if (!state.objectif) return
    setState(s => ({ ...s, done: true }))
    navigate('/bloc1')
  }

  const duree = state.objectif
    ? MODULES.find(m => m.key === state.objectif)?.[state.niveauDetail === 'rapide' ? 'dureeRapide' : 'dureeComplete'] || 15
    : null

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <span className="text-[20px] font-bold text-gray-900">
          Patri<span className="text-[#185FA5]">Sim</span>
        </span>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Données 100% confidentielles · Non stockées
        </div>
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{
          opacity: animIn ? 1 : 0,
          transform: animIn ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        <div className="max-w-3xl w-full space-y-8">

          {/* Titre */}
          <div className="text-center space-y-3">
            <p className="text-[12px] font-semibold text-[#185FA5] uppercase tracking-widest">Bienvenue sur PatriSim</p>
            <h1 className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight">
              Que souhaitez-vous analyser ?
            </h1>
            <p className="text-[15px] text-gray-400 max-w-lg mx-auto leading-relaxed">
              Choisissez un objectif. PatriSim adapte les questions à votre situation — inutile de tout remplir.
            </p>
          </div>

          {/* Bannière v1 */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-start gap-3">
            <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-amber-800">PatriSim v1 — Simulation simplifiée</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                4 parcours disponibles. Les fonctionnalités avancées (investissements, immobilier, protection, objectif précis) arrivent dans la prochaine version. Cet outil ne remplace pas un conseiller en gestion de patrimoine agréé.
              </p>
            </div>
          </div>

          {/* Grille modules */}
          <div className="grid grid-cols-2 gap-3">
            {MODULES.map(m => {
              const sel = state.objectif === m.key
              const locked = !m.disponible

              if (locked) {
                return (
                  <div
                    key={m.key}
                    className="relative text-left p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                    onMouseEnter={() => setHoveredLocked(m.key)}
                    onMouseLeave={() => setHoveredLocked(null)}
                  >
                    {/* Cadenas */}
                    <div className="absolute top-4 right-4 bg-gray-200 rounded-full p-1.5">
                      <Lock size={12} className="text-gray-500" />
                    </div>

                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gray-200 text-gray-400">
                      {m.icon}
                    </div>
                    <p className="text-[14px] font-semibold text-gray-400 mb-1">{m.title}</p>
                    <p className="text-[12px] text-gray-300 leading-relaxed">{m.desc}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-400">
                        Prochainement
                      </span>
                    </div>

                    {/* Tooltip au hover */}
                    {hoveredLocked === m.key && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 text-white text-[11px] px-4 py-3 rounded-xl leading-relaxed z-20 shadow-xl">
                        {m.raisonIndisponible}
                        <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => select(m.key)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 group ${
                    sel
                      ? 'border-[#185FA5] bg-[#E6F1FB] shadow-md'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  {sel && (
                    <CheckCircle size={16} className="absolute top-4 right-4 text-[#185FA5]" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    sel ? 'bg-[#185FA5] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                  }`}>
                    {m.icon}
                  </div>
                  <p className="text-[14px] font-semibold text-gray-900 mb-1">{m.title}</p>
                  <p className="text-[12px] text-gray-400 leading-relaxed">{m.desc}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.tagColor}`}>{m.tag}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {m.dureeRapide}–{m.dureeComplete} min
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Niveau de détail — visible seulement si objectif sélectionné */}
          {state.objectif && (
            <div
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
              style={{ animation: 'fadeIn 0.2s ease' }}
            >
              <div>
                <p className="text-[13px] font-semibold text-gray-800 mb-1">Niveau de détail</p>
                <p className="text-[12px] text-gray-400">Choisissez entre une analyse rapide ou une simulation complète.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    key: 'rapide' as const,
                    label: 'Version rapide',
                    duree: MODULES.find(m => m.key === state.objectif)?.dureeRapide,
                    desc: 'Questions essentielles uniquement. Résultat en quelques minutes.',
                    color: 'border-[#0F6E56] bg-[#E1F5EE]',
                    badge: 'bg-[#E1F5EE] text-[#085041]',
                  },
                  {
                    key: 'complet' as const,
                    label: 'Version complète',
                    duree: MODULES.find(m => m.key === state.objectif)?.dureeComplete,
                    desc: 'Analyse approfondie avec tous les paramètres. Résultats plus précis.',
                    color: 'border-[#185FA5] bg-[#E6F1FB]',
                    badge: 'bg-[#E6F1FB] text-[#0C447C]',
                  },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setState(s => ({ ...s, niveauDetail: opt.key }))}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      state.niveauDetail === opt.key
                        ? opt.color + ' shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[13px] font-semibold text-gray-900">{opt.label}</p>
                      {state.niveauDetail === opt.key && <CheckCircle size={14} className="text-[#185FA5]" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{opt.desc}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${opt.badge}`}>
                      <Clock size={9} /> ~{opt.duree} min
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bouton démarrer */}
          <button
            type="button"
            disabled={!state.objectif}
            onClick={handleStart}
            className="w-full py-4 rounded-2xl text-[14px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#185FA5] text-white hover:bg-[#0C447C] shadow-[0_4px_14px_rgba(24,95,165,0.25)] flex items-center justify-center gap-2"
          >
            {state.objectif
              ? `Commencer — ${MODULES.find(m => m.key === state.objectif)?.title} · ~${duree} min`
              : 'Sélectionnez un objectif pour continuer'
            }
            {state.objectif && <ArrowRight size={18} />}
          </button>

          {/* Lien démo */}
          <p className="text-center text-[12px] text-gray-400">
            Vous voulez d'abord voir un exemple ?{' '}
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="text-[#185FA5] hover:underline font-medium"
            >
              Voir une démonstration →
            </button>
          </p>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}