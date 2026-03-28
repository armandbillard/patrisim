import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Home, PiggyBank, Shield, Users, Target,
  FileText, ChevronRight, CheckCircle, Clock, Zap
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleKey =
  | 'retraite'
  | 'bilan'
  | 'fiscalite'
  | 'succession'
  | 'investissement'
  | 'immobilier'
  | 'protection'
  | 'objectif'

interface Bloc0State {
  objectifs: ModuleKey[]
  niveauDetail: 'rapide' | 'complet'
  done: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveState(s: Bloc0State) {
  localStorage.setItem('patrisim_bloc0', JSON.stringify(s))
}

function loadState(): Bloc0State {
  try {
    const raw = localStorage.getItem('patrisim_bloc0')
    if (!raw) return { objectifs: [], niveauDetail: 'complet', done: false }
    return JSON.parse(raw)
  } catch {
    return { objectifs: [], niveauDetail: 'complet', done: false }
  }
}

// Mapping objectif → blocs nécessaires
export function getBlocsRequired(objectifs: ModuleKey[], niveau: 'rapide' | 'complet'): number[] {
  if (objectifs.length === 0 || objectifs.includes('bilan')) {
    // Bilan complet = tout
    return [1, 2, 3, 4, 5, 6, 7]
  }

  const blocs = new Set<number>()
  blocs.add(1) // Bloc 1 toujours requis (profil civil)

  if (objectifs.includes('retraite')) { blocs.add(1); blocs.add(4); blocs.add(5) }
  if (objectifs.includes('fiscalite')) { blocs.add(2); blocs.add(3); blocs.add(4) }
  if (objectifs.includes('succession')) { blocs.add(2); blocs.add(7) }
  if (objectifs.includes('investissement')) { blocs.add(2); blocs.add(6) }
  if (objectifs.includes('immobilier')) { blocs.add(2); blocs.add(3) }
  if (objectifs.includes('protection')) { blocs.add(1); blocs.add(4) }
  if (objectifs.includes('objectif')) { blocs.add(4); blocs.add(5); blocs.add(6) }

  if (niveau === 'complet') {
    // Version complète : on ajoute les blocs connexes
    if (blocs.has(4)) blocs.add(3)
    if (blocs.has(5)) blocs.add(4)
    if (blocs.has(7)) blocs.add(2)
  }

  return Array.from(blocs).sort()
}

// ─── Data modules ─────────────────────────────────────────────────────────────

const MODULES: {
  key: ModuleKey
  icon: React.ReactNode
  title: string
  desc: string
  dureeRapide: number
  dureeComplete: number
  tag: string
  tagColor: string
}[] = [
  {
    key: 'retraite',
    icon: <TrendingUp size={22} />,
    title: 'Préparer ma retraite',
    desc: 'Estimez votre pension, calculez le capital nécessaire, identifiez les déficits à combler.',
    dureeRapide: 5, dureeComplete: 12,
    tag: 'Planification', tagColor: 'bg-[#E6F1FB] text-[#0C447C]',
  },
  {
    key: 'bilan',
    icon: <FileText size={22} />,
    title: 'Faire un bilan patrimonial complet',
    desc: 'Vue d\'ensemble de votre situation : actifs, dettes, revenus, fiscalité, objectifs.',
    dureeRapide: 15, dureeComplete: 40,
    tag: 'Bilan global', tagColor: 'bg-gray-100 text-gray-600',
  },
  {
    key: 'fiscalite',
    icon: <PiggyBank size={22} />,
    title: 'Optimiser ma fiscalité',
    desc: 'Identifiez vos leviers fiscaux : PER, déficit foncier, flat tax, enveloppes adaptées.',
    dureeRapide: 4, dureeComplete: 10,
    tag: 'Fiscal', tagColor: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'succession',
    icon: <Users size={22} />,
    title: 'Préparer ma succession',
    desc: 'Analysez les droits à payer, identifiez les optimisations possibles pour transmettre.',
    dureeRapide: 5, dureeComplete: 12,
    tag: 'Transmission', tagColor: 'bg-purple-50 text-purple-700',
  },
  {
    key: 'investissement',
    icon: <Target size={22} />,
    title: 'Structurer mes investissements',
    desc: 'Définissez votre profil investisseur, vérifiez la cohérence de vos placements.',
    dureeRapide: 5, dureeComplete: 10,
    tag: 'Investissement', tagColor: 'bg-[#E1F5EE] text-[#085041]',
  },
  {
    key: 'immobilier',
    icon: <Home size={22} />,
    title: 'Analyser mon patrimoine immobilier',
    desc: 'Valorisation, rendements locatifs, financement, régimes fiscaux adaptés.',
    dureeRapide: 4, dureeComplete: 10,
    tag: 'Immobilier', tagColor: 'bg-orange-50 text-orange-700',
  },
  {
    key: 'protection',
    icon: <Shield size={22} />,
    title: 'Protéger ma famille',
    desc: 'Évaluez les risques, vérifiez vos couvertures, anticipez les aléas de la vie.',
    dureeRapide: 4, dureeComplete: 8,
    tag: 'Protection', tagColor: 'bg-red-50 text-red-700',
  },
  {
    key: 'objectif',
    icon: <Zap size={22} />,
    title: 'Atteindre un objectif précis',
    desc: 'Achat immobilier, financement études, capital cible : simulez votre trajectoire.',
    dureeRapide: 5, dureeComplete: 10,
    tag: 'Objectif', tagColor: 'bg-indigo-50 text-indigo-700',
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc0() {
  const navigate = useNavigate()
  const [state, setState] = useState<Bloc0State>(loadState)
  const [step, setStep] = useState<'objectifs' | 'niveau' | 'recap'>(
    state.done ? 'recap' : 'objectifs'
  )
  const [animIn, setAnimIn] = useState(true)

  useEffect(() => { saveState(state) }, [state])

  const toggle = (key: ModuleKey) => {
    setState(s => {
      let obj = s.objectifs.includes(key)
        ? s.objectifs.filter(o => o !== key)
        : [...s.objectifs, key]
      // Si "bilan complet" sélectionné, tout le reste est redondant
      if (key === 'bilan') obj = ['bilan']
      if (key !== 'bilan' && obj.includes('bilan')) obj = obj.filter(o => o !== 'bilan')
      return { ...s, objectifs: obj }
    })
  }

  const goStep = (next: 'objectifs' | 'niveau' | 'recap') => {
    setAnimIn(false)
    setTimeout(() => { setStep(next); setAnimIn(true) }, 200)
  }

  const blocsActifs = getBlocsRequired(state.objectifs, state.niveauDetail)
  const dureeEstimee = state.objectifs.reduce((a, key) => {
    const m = MODULES.find(m => m.key === key)
    if (!m) return a
    return a + (state.niveauDetail === 'rapide' ? m.dureeRapide : m.dureeComplete)
  }, 0) || (state.niveauDetail === 'rapide' ? 15 : 40)

  const handleStart = () => {
    setState(s => ({ ...s, done: true }))
    navigate('/bloc1')
  }

  const BLOC_LABELS: Record<number, string> = {
    1: 'Profil civil', 2: 'Actif patrimonial', 3: 'Passif & dettes',
    4: 'Flux & fiscalité', 5: 'Projets & retraite',
    6: 'Profil investisseur', 7: 'Succession & transmission',
  }

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
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >

        {/* ══ ÉTAPE 1 — Objectifs ══════════════════════════════════════════ */}
        {step === 'objectifs' && (
          <div className="max-w-3xl w-full space-y-8">
            <div className="text-center space-y-3">
              <p className="text-[12px] font-semibold text-[#185FA5] uppercase tracking-widest">Bienvenue sur PatriSim</p>
              <h1 className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight">
                Que souhaitez-vous analyser aujourd'hui ?
              </h1>
              <p className="text-[15px] text-gray-400 max-w-lg mx-auto leading-relaxed">
                Sélectionnez un ou plusieurs objectifs. PatriSim adaptera les questions à votre situation — inutile de tout remplir si ce n'est pas votre priorité.
              </p>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center">
              <p className="text-[12px] text-amber-700 leading-relaxed">
                <strong>PatriSim</strong> est un outil pédagogique de simulation, conçu pour les patrimoines jusqu'à 500 000 €. Il ne remplace pas le conseil d'un conseiller en gestion de patrimoine agréé.
              </p>
            </div>

            {/* Grille modules */}
            <div className="grid grid-cols-2 gap-3">
              {MODULES.map(m => {
                const sel = state.objectifs.includes(m.key)
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggle(m.key)}
                    className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 group ${
                      sel
                        ? 'border-[#185FA5] bg-[#E6F1FB] shadow-md'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {sel && (
                      <CheckCircle size={16} className="absolute top-4 right-4 text-[#185FA5]" />
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${sel ? 'bg-[#185FA5] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
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

            <button
              type="button"
              disabled={state.objectifs.length === 0}
              onClick={() => goStep('niveau')}
              className="w-full py-4 rounded-2xl text-[14px] font-semibold transition-all shadow-[0_4px_14px_rgba(24,95,165,0.25)] disabled:opacity-40 disabled:cursor-not-allowed bg-[#185FA5] text-white hover:bg-[#0C447C]"
            >
              Continuer — {state.objectifs.length} objectif{state.objectifs.length > 1 ? 's' : ''} sélectionné{state.objectifs.length > 1 ? 's' : ''} →
            </button>
          </div>
        )}

        {/* ══ ÉTAPE 2 — Niveau de détail ══════════════════════════════════ */}
        {step === 'niveau' && (
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-[26px] font-bold text-gray-900">Quel niveau de détail souhaitez-vous ?</h1>
              <p className="text-[14px] text-gray-400">
                Vous pourrez toujours compléter les informations plus tard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  key: 'rapide' as const,
                  title: 'Aperçu rapide',
                  subtitle: 'L\'essentiel en quelques minutes',
                  desc: 'Les grandes lignes de votre situation. Idéal pour une première analyse ou si vous avez peu de temps.',
                  duree: `~${Math.min(dureeEstimee, 15)} min`,
                  icon: <Zap size={20} />,
                  color: 'border-amber-400 bg-amber-50',
                  colorSel: 'border-[#185FA5] bg-[#E6F1FB]',
                  iconColor: 'bg-amber-100 text-amber-700',
                  iconColorSel: 'bg-[#185FA5] text-white',
                },
                {
                  key: 'complet' as const,
                  title: 'Bilan approfondi',
                  subtitle: 'Pour une analyse précise',
                  desc: 'Questions détaillées sur chaque aspect de votre patrimoine. Recommandations personnalisées.',
                  duree: `~${dureeEstimee} min`,
                  icon: <FileText size={20} />,
                  color: 'border-gray-200 bg-white',
                  colorSel: 'border-[#185FA5] bg-[#E6F1FB]',
                  iconColor: 'bg-gray-100 text-gray-600',
                  iconColorSel: 'bg-[#185FA5] text-white',
                },
              ].map(opt => {
                const sel = state.niveauDetail === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setState(s => ({ ...s, niveauDetail: opt.key }))}
                    className={`relative text-left p-6 rounded-2xl border-2 transition-all ${sel ? opt.colorSel : opt.color} hover:shadow-md`}
                  >
                    {sel && <CheckCircle size={16} className="absolute top-4 right-4 text-[#185FA5]" />}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${sel ? opt.iconColorSel : opt.iconColor}`}>
                      {opt.icon}
                    </div>
                    <p className="text-[16px] font-bold text-gray-900">{opt.title}</p>
                    <p className="text-[12px] text-[#185FA5] font-medium mb-2">{opt.subtitle}</p>
                    <p className="text-[13px] text-gray-500 leading-relaxed">{opt.desc}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-gray-600">
                      <Clock size={13} />{opt.duree}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => goStep('objectifs')} className="px-6 py-3.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50">
                ← Retour
              </button>
              <button type="button" onClick={() => goStep('recap')}
                className="flex-1 py-3.5 rounded-xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.2)]">
                Voir mon parcours personnalisé →
              </button>
            </div>
          </div>
        )}

        {/* ══ ÉTAPE 3 — Récap & lancement ════════════════════════════════ */}
        {step === 'recap' && (
          <div className="max-w-2xl w-full space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-[26px] font-bold text-gray-900">Votre parcours personnalisé</h1>
              <p className="text-[14px] text-gray-400">
                {blocsActifs.length} étape{blocsActifs.length > 1 ? 's' : ''} · environ {dureeEstimee} minutes
              </p>
            </div>

            {/* Objectifs choisis */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Vos objectifs</p>
              <div className="flex flex-wrap gap-2">
                {state.objectifs.map(key => {
                  const m = MODULES.find(m => m.key === key)
                  if (!m) return null
                  return (
                    <span key={key} className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full ${m.tagColor}`}>
                      {m.icon && <span className="w-3.5 h-3.5">{m.icon}</span>}
                      {m.title}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Blocs activés */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Étapes incluses
                <span className="ml-2 normal-case font-normal text-gray-400">— {state.niveauDetail === 'rapide' ? 'version rapide' : 'version complète'}</span>
              </p>
              <div className="space-y-2">
                {[1,2,3,4,5,6,7].map(n => {
                  const actif = blocsActifs.includes(n)
                  return (
                    <div key={n} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${actif ? 'bg-[#E6F1FB]' : 'bg-gray-50 opacity-40'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${actif ? 'bg-[#185FA5] text-white' : 'bg-gray-300 text-gray-500'}`}>{n}</div>
                      <span className={`text-[13px] font-medium ${actif ? 'text-[#0C447C]' : 'text-gray-400'}`}>{BLOC_LABELS[n]}</span>
                      {actif && <ChevronRight size={13} className="text-[#185FA5] ml-auto" />}
                      {!actif && <span className="text-[10px] text-gray-400 ml-auto">Non requis</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Disclaimer complet */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] text-gray-400 leading-relaxed text-center">
              PatriSim est un outil de simulation pédagogique destiné aux patrimoines jusqu'à 500 000 €. Les analyses générées sont des estimations basées sur vos réponses et des hypothèses simplifiées. Elles ne constituent pas un conseil en investissement au sens MiFID II et ne remplacent pas l'accompagnement d'un conseiller en gestion de patrimoine agréé.
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => goStep('niveau')} className="px-6 py-3.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50">
                ← Modifier
              </button>
              <button type="button" onClick={handleStart}
                className="flex-1 py-4 rounded-2xl bg-[#185FA5] text-white text-[15px] font-bold hover:bg-[#0C447C] transition-colors shadow-[0_4px_20px_rgba(24,95,165,0.3)]">
                Commencer mon analyse →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}