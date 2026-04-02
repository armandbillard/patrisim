import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getNextBloc } from '../utils/navigation'
import FadeIn from '../components/FadeIn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MifidReponses {
  q1:number; q2:number; q3:number; q4:number; q5:number; q6:number; q7:number
}

interface Bloc6State {
  mifidDone: boolean
  reponses: MifidReponses
  // Convictions
  aConvictions: boolean | null
  universInvest: string[]
  prefGeo: string
  secteursPriv: string[]
  secteursExcl: string[]
  prefESG: string
  // Suivi
  liquiditePct: number
  suiviFrequence: string
  modeConseil: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T extends object>(key:string, fb:T):T {
  try{const r=localStorage.getItem(key);if(!r)return fb;return{...fb,...JSON.parse(r)}}catch{return fb}
}

function getProfilMifid(score:number) {
  if(score<=10) return {label:'Défensif',   color:'#185FA5', bg:'#E6F1FB', text:'#0C447C'}
  if(score<=14) return {label:'Équilibré',  color:'#0F6E56', bg:'#E1F5EE', text:'#085041'}
  if(score<=17) return {label:'Dynamique',  color:'#D97706', bg:'#FEF3C7', text:'#92400E'}
  return           {label:'Offensif',       color:'#DC2626', bg:'#FEF2F2', text:'#991B1B'}
}

const defaultState = (): Bloc6State => ({
  mifidDone: false,
  reponses: {q1:0,q2:0,q3:0,q4:0,q5:0,q6:0,q7:0},
  aConvictions: null,
  universInvest: [], prefGeo: '', secteursPriv: [], secteursExcl: [], prefESG: '',
  liquiditePct: 20, suiviFrequence: '', modeConseil: '',
})

// ─── UI de base ───────────────────────────────────────────────────────────────

function SectionTitle({children}:{children:string}){
  return(<div className="flex items-center gap-3 mb-5"><span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</span><div className="flex-1 h-px bg-gray-100"/></div>)
}
function Field({label,children,tooltip}:{label:string;children:React.ReactNode;tooltip?:string}){
  return(<div><div className="flex items-center gap-1.5 mb-2"><label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest">{label}</label>{tooltip&&<div className="group relative"><span className="w-4 h-4 rounded-full border border-gray-200 text-gray-400 text-[10px] flex items-center justify-center cursor-help">?</span><div className="absolute bottom-6 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-56 hidden group-hover:block z-20 shadow-xl">{tooltip}</div></div>}</div>{children}</div>)
}
function Chips({options,value,onChange,multi=false,small=false}:{options:string[];value:string|string[];onChange:(v:string|string[])=>void;multi?:boolean;small?:boolean}){
  const isSel=(o:string)=>multi?(value as string[]).includes(o):value===o
  const click=(o:string)=>{if(multi){const a=value as string[];onChange(a.includes(o)?a.filter(x=>x!==o):[...a,o])}else onChange(o)}
  return(<div className="flex flex-wrap gap-2">{options.map(o=><button key={o} type="button" onClick={()=>click(o)} className={`${small?'px-3 py-1.5 text-[11px]':'px-3.5 py-2 text-[12px]'} rounded-lg border transition-all font-medium ${isSel(o)?'bg-[#185FA5] border-[#185FA5] text-white':'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{o}</button>)}</div>)
}
function InfoCard({children,color='blue'}:{children:React.ReactNode;color?:'blue'|'amber'|'green'|'red'}){
  const s={blue:'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20',amber:'bg-amber-50 text-amber-800 border-amber-200',green:'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20',red:'bg-red-50 text-red-700 border-red-200'}
  return<div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

// ─── Questions MiFID ──────────────────────────────────────────────────────────

const MIFID_QUESTIONS = [
  {
    id: 'q1', question: 'Votre portefeuille perd 20% en 3 mois. Quelle est votre réaction ?',
    options: [
      {label: 'Je vends tout pour sécuriser ce qui reste', pts: 1},
      {label: "J'attends sans rien faire", pts: 2},
      {label: "Je renforce mes positions, c'est une opportunité", pts: 3},
    ]
  },
  {
    id: 'q2', question: "Pour vos investissements, votre horizon de placement est :",
    options: [
      {label: 'Moins de 3 ans', pts: 1},
      {label: 'Entre 3 et 8 ans', pts: 2},
      {label: 'Plus de 8 ans', pts: 3},
    ]
  },
  {
    id: 'q3', question: "Votre priorité en matière d'investissement est :",
    options: [
      {label: 'Protéger mon capital avant tout', pts: 1},
      {label: 'Générer des revenus réguliers avec un risque limité', pts: 2},
      {label: 'Faire croître mon capital sur le long terme', pts: 3},
    ]
  },
  {
    id: 'q4', question: "Votre expérience en matière d'investissement financier :",
    options: [
      {label: 'Nulle ou très limitée', pts: 1},
      {label: 'Quelques investissements sur des produits simples (livrets, AV)', pts: 2},
      {label: 'Expérience régulière sur des produits variés (actions, ETF, immo…)', pts: 3},
    ]
  },
  {
    id: 'q5', question: "Dans les 12 prochains mois, vous pourriez avoir besoin de mobiliser :",
    options: [
      {label: "Plus de 50% de votre épargne", pts: 1},
      {label: "Entre 10% et 50%", pts: 2},
      {label: "Moins de 10%", pts: 3},
    ]
  },
  {
    id: 'q6', question: "Une baisse temporaire de 30% de votre portefeuille vous semble :",
    options: [
      {label: "Inacceptable — je ne peux pas supporter cette perte", pts: 1},
      {label: "Difficile mais supportable sur le court terme", pts: 2},
      {label: "Une opportunité d'achat à saisir", pts: 3},
    ]
  },
  {
    id: 'q7', question: "En cas de perte totale de cet investissement, l'impact sur votre vie quotidienne serait :",
    options: [
      {label: "Catastrophique — cela affecterait gravement mon niveau de vie", pts: 1},
      {label: "Difficile mais gérable", pts: 2},
      {label: "Négligeable — cela n'affecterait pas mon niveau de vie", pts: 3},
    ]
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc6() {
  const navigate = useNavigate()

  // Récupérer l'objectif depuis Bloc0
  const bloc0 = loadLS<{objectif?: string}>('patrisim_bloc0', {})
  const objectifPrincipal = bloc0.objectif || 'bilan'

  const OBJECTIF_LABELS: Record<string, string> = {
    retraite: 'Préparer ma retraite',
    bilan: 'Bilan patrimonial complet',
    fiscalite: 'Optimiser ma fiscalité',
    succession: 'Préparer ma succession',
  }

  const [state, setState] = useState<Bloc6State>(() => loadLS('patrisim_bloc6', defaultState()))
  const [savedAt, setSavedAt] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)

  const upd = useCallback(<K extends keyof Bloc6State>(k:K, v:Bloc6State[K]) =>
    setState(s => ({...s, [k]: v})), [])

  useEffect(() => {
    localStorage.setItem('patrisim_bloc6', JSON.stringify(state))
    setSavedAt(new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}))
  }, [state])

  const score = Object.values(state.reponses).reduce((a,b) => a+b, 0)
  const profil = getProfilMifid(score)
  const allAnswered = MIFID_QUESTIONS.every(q => state.reponses[q.id as keyof MifidReponses] > 0)

  const handleReponse = (qId: string, pts: number) => {
    upd('reponses', {...state.reponses, [qId]: pts})
    if (currentQ < MIFID_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(c => c + 1), 300)
    } else {
      setTimeout(() => upd('mifidDone', true), 300)
    }
  }

  const handleSuivant = () => {
    const e: string[] = []
    if (!allAnswered) e.push('Répondez aux 7 questions MiFID II')
    if (e.length > 0) { setErrors(e); return }
    setToast(true)
    setTimeout(() => navigate(getNextBloc(6)), 1200)
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium">
          <CheckCircle size={16} className="text-green-400" />Étape 6 enregistrée ✓
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-32">

        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 6 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#185FA5] rounded-full" initial={{ width: '0%' }} animate={{ width: '86%' }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
            <span className="text-[11px] text-gray-300">86%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>Brouillon enregistré · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Profil investisseur</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-xl">Questionnaire obligatoire dans le cadre réglementaire MiFID II.</p>
        </div>

        {/* Objectif rappelé depuis Bloc0 */}
        <FadeIn delay={0}>
        <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl px-5 py-3 mb-8 flex items-center gap-3">
          <Info size={16} className="text-[#185FA5] flex-shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-[#0C447C]">Votre objectif : {OBJECTIF_LABELS[objectifPrincipal] || objectifPrincipal}</p>
            <p className="text-[11px] text-[#185FA5] mt-0.5">Défini en début de parcours — les recommandations seront adaptées à cet objectif.</p>
          </div>
        </div>

        </FadeIn>

        {/* ══ MiFID II ══════════════════════════════════════════════════════ */}
        <FadeIn delay={0.08}>
        <SectionTitle>Questionnaire MiFID II — Profil de risque</SectionTitle>
        <InfoCard color="blue">
          Ce questionnaire est conforme aux exigences MiFID II. Vos réponses déterminent votre profil investisseur officiel.
        </InfoCard>

        <div className="mt-6 space-y-4">
          {!state.mifidDone ? (
            // Mode questionnaire progressif
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider">Question {currentQ + 1} / {MIFID_QUESTIONS.length}</span>
                <div className="flex gap-1">
                  {MIFID_QUESTIONS.map((_, i) => (
                    <div key={i} className={`w-6 h-1.5 rounded-full transition-all ${
                      state.reponses[MIFID_QUESTIONS[i].id as keyof MifidReponses] > 0 ? 'bg-[#185FA5]' : i === currentQ ? 'bg-[#185FA5]/40' : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
              </div>

              <p className="text-[16px] font-semibold text-gray-800 leading-relaxed">
                {MIFID_QUESTIONS[currentQ].question}
              </p>

              <div className="space-y-3">
                {MIFID_QUESTIONS[currentQ].options.map((opt, i) => {
                  const qId = MIFID_QUESTIONS[currentQ].id as keyof MifidReponses
                  const selected = state.reponses[qId] === opt.pts
                  return (
                    <button key={i} type="button"
                      onClick={() => handleReponse(MIFID_QUESTIONS[currentQ].id, opt.pts)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-[13px] font-medium ${
                        selected ? 'border-[#185FA5] bg-[#E6F1FB] text-[#0C447C]' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-white'
                      }`}>
                      <span className="mr-3 text-gray-300 font-bold">{String.fromCharCode(65+i)}.</span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Navigation questions */}
              <div className="flex justify-between items-center pt-2">
                <button type="button" onClick={() => setCurrentQ(c => Math.max(0, c-1))}
                  disabled={currentQ === 0}
                  className="text-[12px] text-gray-400 hover:text-gray-600 disabled:opacity-30">
                  ← Précédente
                </button>
                {allAnswered && (
                  <button type="button" onClick={() => upd('mifidDone', true)}
                    className="text-[12px] text-[#185FA5] font-semibold hover:text-[#0C447C]">
                    Voir mon profil →
                  </button>
                )}
                {currentQ < MIFID_QUESTIONS.length - 1 && (
                  <button type="button"
                    onClick={() => setCurrentQ(c => c+1)}
                    disabled={state.reponses[MIFID_QUESTIONS[currentQ].id as keyof MifidReponses] === 0}
                    className="text-[12px] text-[#185FA5] font-semibold hover:text-[#0C447C] disabled:opacity-30">
                    Suivante →
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Résultat profil
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Votre profil MiFID II</p>
                    <p className="text-[24px] font-bold" style={{color: profil.color}}>{profil.label}</p>
                    <p className="text-[13px] text-gray-400 mt-1">Score : {score} / 21</p>
                  </div>
                  <div className="flex gap-1 items-end">
                    {['Défensif','Équilibré','Dynamique','Offensif'].map((p, i) => (
                      <div key={p} className="flex flex-col items-center gap-1">
                        <div className={`w-8 rounded-t-lg transition-all ${profil.label === p ? 'opacity-100' : 'opacity-30'}`}
                          style={{height: `${(i+1)*16}px`, backgroundColor: profil.label === p ? profil.color : '#E5E7EB'}} />
                        <span className="text-[8px] text-gray-400">{p[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl px-4 py-3 text-[12px]" style={{backgroundColor: profil.bg, color: profil.text}}>
                  {profil.label === 'Défensif' && 'Vous privilégiez la sécurité et la préservation du capital. Placements adaptés : fonds euros, livrets réglementés, obligations court terme.'}
                  {profil.label === 'Équilibré' && 'Vous acceptez une part de risque modérée pour un meilleur rendement. Placements adaptés : assurance-vie mixte, fonds diversifiés, SCPI de rendement.'}
                  {profil.label === 'Dynamique' && 'Vous recherchez la performance sur le long terme et acceptez la volatilité. Placements adaptés : actions, ETF, PEA, SCPI.'}
                  {profil.label === 'Offensif' && 'Vous acceptez une volatilité élevée pour maximiser le rendement. Placements adaptés : actions individuelles, ETF sectoriels, private equity.'}
                </div>
                <button type="button" onClick={() => { upd('mifidDone', false); setCurrentQ(0) }}
                  className="text-[12px] text-gray-400 hover:text-gray-600 mt-3 underline">
                  Refaire le questionnaire
                </button>
              </div>

              {/* ══ CONVICTIONS ══════════════════════════════════════════════ */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <SectionTitle>Convictions & préférences d'investissement</SectionTitle>

                <div className="space-y-2">
                  <p className="text-[12px] text-gray-500 font-medium">Avez-vous des convictions sur vos placements ?</p>
                  <div className="flex gap-2">
                    {['Oui','Non'].map(l => (
                      <button key={l} type="button" onClick={() => upd('aConvictions', l === 'Oui')}
                        className={`px-4 py-2 rounded-lg text-[13px] border transition-all ${state.aConvictions === (l === 'Oui') ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {state.aConvictions && (
                  <div className="space-y-4 pt-2">
                    <Field label="Univers d'investissement souhaités">
                      <Chips multi small
                        options={['Immobilier physique','SCPI / OPCI','PEA','ETF / Fonds indiciels','Assurance-vie','PER','Obligations','Or et métaux précieux','Cryptomonnaies','ISR / ESG']}
                        value={state.universInvest}
                        onChange={v => upd('universInvest', v as string[])}
                      />
                    </Field>

                    <Field label="Préférence géographique">
                      <Chips small
                        options={['France uniquement','Europe','Monde entier','Marchés émergents inclus']}
                        value={state.prefGeo}
                        onChange={v => upd('prefGeo', v as string)}
                      />
                    </Field>

                    <Field label="Préférence ESG / ISR">
                      <Chips small
                        options={['Pas de préférence','Critères ESG importants','ESG prioritaire','Impact investing uniquement']}
                        value={state.prefESG}
                        onChange={v => upd('prefESG', v as string)}
                      />
                    </Field>

                    <Field label="Secteurs à exclure (optionnel)">
                      <Chips multi small
                        options={['Armement','Tabac','Alcool','Jeux d\'argent','Énergies fossiles']}
                        value={state.secteursExcl}
                        onChange={v => upd('secteursExcl', v as string[])}
                      />
                    </Field>
                  </div>
                )}
              </div>

              {/* ══ SUIVI ═════════════════════════════════════════════════════ */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <SectionTitle>Suivi & mode de conseil</SectionTitle>

                <Field label="Liquidité souhaitée" tooltip="Part de votre patrimoine que vous souhaitez pouvoir mobiliser rapidement">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-gray-500">Part disponible</span>
                      <span className="font-bold text-[#185FA5]">{state.liquiditePct}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={5} value={state.liquiditePct}
                      onChange={e => upd('liquiditePct', Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
                  </div>
                </Field>

                <Field label="Fréquence de suivi souhaitée">
                  <Chips small
                    options={['Mensuelle','Trimestrielle','Semestrielle','Annuelle']}
                    value={state.suiviFrequence}
                    onChange={v => upd('suiviFrequence', v as string)}
                  />
                </Field>

                <Field label="Mode de conseil préféré">
                  <Chips small
                    options={['Autonome (je décide seul)','Guidé (conseils puis je décide)','Délégué (je fais confiance au conseiller)']}
                    value={state.modeConseil}
                    onChange={v => upd('modeConseil', v as string)}
                  />
                </Field>
              </div>

              {/* Synthèse */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[13px] font-semibold text-gray-800 mb-3">Récapitulatif</p>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 mb-1">Profil MiFID II</p>
                    <p className="font-bold" style={{color: profil.color}}>{profil.label}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 mb-1">Objectif principal</p>
                    <p className="font-semibold text-gray-700">{OBJECTIF_LABELS[objectifPrincipal] || objectifPrincipal}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 mb-1">Liquidité souhaitée</p>
                    <p className="font-semibold text-gray-700">{state.liquiditePct}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 mb-1">Mode de conseil</p>
                    <p className="font-semibold text-gray-700">{state.modeConseil || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        </FadeIn>

        {errors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1">
            {errors.map(e => <p key={e} className="text-[12px] text-red-600">⚠ {e}</p>)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={() => navigate('/bloc5')} className="text-[13px] text-gray-400 hover:text-gray-600">← Retour</button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>Brouillon enregistré · {savedAt}</span>}
          <button type="button" onClick={handleSuivant}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}