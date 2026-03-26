import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, GripVertical } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MifidReponses {
  q1: number; q2: number; q3: number; q4: number; q5: number; q6: number; q7: number
}

interface ObjectifRetraite { ageCible: string; revenusSouhaites: string; deficitEstime: string; capitalNecessaire: string }
interface ObjectifCapital { montant: string; horizon: number }
interface ObjectifRevenus { montant: string; quand: string }
interface ObjectifImpots { economie: string; toleranceBlockage: string }
interface ObjectifTransmission { montant: string; beneficiaires: string[]; horizon: string }
interface ObjectifRP { budget: string; horizon: string; apport: string }
interface ObjectifEtudes { enfantPrenom: string; ageActuel: string; ageDebut: string; budget: string }
interface ObjectifAutre { description: string; montant: string; horizon: string }

interface Bloc6State {
  // A - MiFID II
  reponses: MifidReponses
  // B - Objectifs
  objectifsSelectionnes: string[]
  objectifsOrder: string[]
  objRetraite: ObjectifRetraite
  objCapital: ObjectifCapital
  objRevenus: ObjectifRevenus
  objImpots: ObjectifImpots
  objTransmission: ObjectifTransmission
  objRP: ObjectifRP
  objEtudes: ObjectifEtudes
  objAutre: ObjectifAutre
  // C - Convictions
  universInvest: string[]
  prefGeo: string
  secteursPriv: string[]
  secteursExcl: string[]
  prefESG: string
  // D - Diversification
  concentrationJustifiee: boolean
  concentrationRaison: string
  concentrationRaisonAutre: string
  liquiditePct: number
  suiviFrequence: string
  modeConseil: string
  showSynthese: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultState = (): Bloc6State => ({
  reponses: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0 },
  objectifsSelectionnes: [], objectifsOrder: [],
  objRetraite: { ageCible: '', revenusSouhaites: '', deficitEstime: '', capitalNecessaire: '' },
  objCapital: { montant: '', horizon: 15 },
  objRevenus: { montant: '', quand: '' },
  objImpots: { economie: '', toleranceBlockage: '' },
  objTransmission: { montant: '', beneficiaires: [], horizon: '' },
  objRP: { budget: '', horizon: '', apport: '' },
  objEtudes: { enfantPrenom: '', ageActuel: '', ageDebut: '', budget: '' },
  objAutre: { description: '', montant: '', horizon: '' },
  universInvest: [], prefGeo: '', secteursPriv: [], secteursExcl: [],
  prefESG: '', concentrationJustifiee: false, concentrationRaison: '',
  concentrationRaisonAutre: '', liquiditePct: 20,
  suiviFrequence: '', modeConseil: '', showSynthese: false,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch { return fallback }
}
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const parseNum = (s: string | number) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }

function getProfilFromScore(score: number): { label: string; color: string; bgColor: string; textColor: string; desc: string; placements: string } {
  if (score <= 10) return { label: 'Défensif', color: '#185FA5', bgColor: '#E6F1FB', textColor: '#0C447C', desc: 'Vous privilégiez la sécurité et la préservation du capital.', placements: 'Fonds euros, livrets réglementés, obligations court terme, SCPI à capital garanti.' }
  if (score <= 14) return { label: 'Équilibré', color: '#0F6E56', bgColor: '#E1F5EE', textColor: '#085041', desc: 'Vous acceptez une part de risque modérée pour un meilleur rendement.', placements: 'Assurance-vie mixte, fonds diversifiés, SCPI de rendement, PEA modéré.' }
  if (score <= 17) return { label: 'Dynamique', color: '#D97706', bgColor: '#FEF3C7', textColor: '#92400E', desc: 'Vous recherchez la performance sur le long terme et acceptez la volatilité.', placements: 'Actions, ETF, PEA, SCPI, private equity modéré.' }
  return { label: 'Offensif', color: '#DC2626', bgColor: '#FEF2F2', textColor: '#991B1B', desc: 'Vous acceptez une volatilité élevée pour maximiser le rendement.', placements: 'Actions individuelles, ETF sectoriels, crypto, private equity, produits structurés.' }
}

// ─── Base UI ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function Field({ label, children, tooltip }: { label: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest">{label}</label>
        {tooltip && (
          <div className="group relative">
            <span className="w-4 h-4 rounded-full border border-gray-200 text-gray-400 text-[10px] flex items-center justify-center cursor-help select-none">?</span>
            <div className="absolute bottom-6 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-60 hidden group-hover:block z-20 leading-relaxed shadow-xl">
              {tooltip}<div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '', suffix }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; suffix?: string }) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all"
        style={suffix ? { paddingRight: '2.5rem' } : {}} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 pointer-events-none">{suffix}</span>}
    </div>
  )
}

function Chips({ options, value, onChange, multi = false, small = false }: { options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean; small?: boolean }) {
  const isSel = (o: string) => multi ? (value as string[]).includes(o) : value === o
  const click = (o: string) => {
    if (multi) { const a = value as string[]; onChange(a.includes(o) ? a.filter(x => x !== o) : [...a, o]) }
    else onChange(o)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => click(o)}
          className={`${small ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[12px]'} rounded-lg border transition-all font-medium ${isSel(o) ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {['Non', 'Oui'].map(l => (
        <button key={l} type="button" onClick={() => onChange(l === 'Oui')}
          className={`px-4 py-2 rounded-lg text-[13px] border transition-all ${(l === 'Oui') === value ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

function InfoCard({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'amber' | 'green' | 'red' }) {
  const s = { blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20', amber: 'bg-amber-50 text-amber-800 border-amber-200', green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20', red: 'bg-red-50 text-red-700 border-red-200' }
  return <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

// ─── MifidQuestion ────────────────────────────────────────────────────────────

interface QuestionOption { label: string; points: number }

function MifidQuestion({ numero, question, options, value, onChange }: {
  numero: number; question: string; options: QuestionOption[]
  value: number; onChange: (pts: number) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#E6F1FB] text-[#0C447C] text-[12px] font-bold flex items-center justify-center">{numero}</span>
        <p className="text-[14px] font-semibold text-gray-800 leading-snug">{question}</p>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button key={i} type="button" onClick={() => onChange(opt.points)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-[13px] ${
              value === opt.points
                ? 'bg-[#185FA5] border-[#185FA5] text-white'
                : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
            }`}>
            <span className={`font-semibold mr-2 ${value === opt.points ? 'text-blue-200' : 'text-gray-400'}`}>
              {['a', 'b', 'c'][i]})
            </span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── DragList (prioritization) ────────────────────────────────────────────────

function PriorityList({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const handleDragEnd = () => {
    if (dragging !== null && dragOver !== null && dragging !== dragOver) {
      const newItems = [...items]
      const [moved] = newItems.splice(dragging, 1)
      newItems.splice(dragOver, 0, moved)
      onChange(newItems)
    }
    setDragging(null)
    setDragOver(null)
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item}
          draggable
          onDragStart={() => setDragging(i)}
          onDragOver={e => { e.preventDefault(); setDragOver(i) }}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 cursor-grab active:cursor-grabbing transition-all ${dragOver === i && dragging !== i ? 'border-[#185FA5] bg-[#E6F1FB]' : 'border-gray-100'}`}
        >
          <span className="w-6 h-6 rounded-full bg-[#185FA5] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <span className="text-[13px] text-gray-700 font-medium flex-1">{item}</span>
          <GripVertical size={16} className="text-gray-300" />
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc6() {
  const navigate = useNavigate()

  // Données blocs précédents
  const p1Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const foyerBloc1 = loadFromStorage<{ enfants?: { prenom?: string; age?: string }[]; majeurs?: { prenom?: string; age?: string }[]; enfantsCharge?: number }>('patrisim_bloc1_foyer', {})

  const bloc5 = loadFromStorage<{
    retraiteP1?: { ageDepartSouhaite?: number; revenusCibles?: number }
    projets?: { type?: string; montant?: string; horizon?: string }[]
  }>('patrisim_bloc5', {})

  const bloc4Fiscal = loadFromStorage<{ fiscal?: { tmi?: number; rfr?: string; impotNet?: string } }>('patrisim_bloc4', {})
  const tmi = bloc4Fiscal.fiscal?.tmi || 0

  const bloc2 = loadFromStorage<{
    comptesCourants?: { solde?: string }[]
    livrets?: { solde?: string }[]
  }>('patrisim_bloc2', {})

  const epargneDisponible = [
    ...(bloc2.comptesCourants || []).map(c => parseNum(c.solde || '0')),
    ...(bloc2.livrets || []).map(l => parseNum(l.solde || '0')),
  ].reduce((a, b) => a + b, 0)

  const bloc4Charges = loadFromStorage<{ mensualitesCredits?: string; assurances?: string; abonnements?: string; loyerMensuel?: string }>('patrisim_bloc4', {})
  const chargesMensuel = parseNum(bloc4Charges.mensualitesCredits || '0') + parseNum(bloc4Charges.assurances || '0') + parseNum(bloc4Charges.abonnements || '0') + parseNum(bloc4Charges.loyerMensuel || '0')
  const coussinMin = chargesMensuel * 4
  const coussinMax = chargesMensuel * 6

  const patrimoineBrut = loadFromStorage<{ totalBrut?: number }>('patrisim_bloc2_totaux', {}).totalBrut || 0

  const enfants = foyerBloc1.enfants || []

  const [state, setState] = useState<Bloc6State>(() => {
    const s = loadFromStorage('patrisim_bloc6', defaultState())
    // Pré-remplir retraite depuis Bloc 5
    if (!s.objRetraite.ageCible && bloc5.retraiteP1?.ageDepartSouhaite) {
      s.objRetraite.ageCible = String(bloc5.retraiteP1.ageDepartSouhaite)
    }
    if (!s.objRetraite.revenusSouhaites && bloc5.retraiteP1?.revenusCibles) {
      s.objRetraite.revenusSouhaites = String(bloc5.retraiteP1.revenusCibles)
    }
    return s
  })

  const [savedAt, setSavedAt] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState(false)
  const upd = useCallback(<K extends keyof Bloc6State>(k: K, v: Bloc6State[K]) => setState(s => ({ ...s, [k]: v })), [])

  useEffect(() => {
    localStorage.setItem('patrisim_bloc6', JSON.stringify(state))
    setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [state])

  // ── Calculs ────────────────────────────────────────────────────────────────
  const score = Object.values(state.reponses).reduce((a, b) => a + b, 0)
  const nbReponses = Object.values(state.reponses).filter(v => v > 0).length
  const allAnswered = nbReponses === 7
  const profil = allAnswered ? getProfilFromScore(score) : null

  // Objectif capital
  const patrimoineCourant = patrimoineBrut
  const objectifMontant = parseNum(state.objCapital.montant)
  const gap = Math.max(0, objectifMontant - patrimoineCourant)
  const effortMensuel = state.objCapital.horizon > 0 && gap > 0
    ? Math.round(gap / (((Math.pow(1.04, state.objCapital.horizon) - 1) / (0.04 / 12))))
    : 0

  // Objectif revenus
  const capitalPourRentes = parseNum(state.objRevenus.montant) * 12 / 0.04

  // PER potentiel
  const perVers = loadFromStorage<{ pers?: { versementsVolontaires?: string }[] }>('patrisim_bloc2', {}).pers?.reduce((a, p) => a + parseNum(p.versementsVolontaires || '0'), 0) || 0
  const revProAnnuel = (() => {
    const b4 = loadFromStorage<{ p1Pro?: { salaire?: string } }>('patrisim_bloc4', {})
    return parseNum(b4.p1Pro?.salaire || '0') * 12
  })()
  const plafondPer = Math.max(0, Math.min(revProAnnuel * 0.10, 35194) - perVers)
  const econoPer = Math.round(plafondPer * tmi / 100)

  // Coussin statut
  const cousinStatut = epargneDisponible >= coussinMax ? 'green' : epargneDisponible >= coussinMin ? 'amber' : 'red'

  // Concentration Bloc 2
  const bloc2Raw = loadFromStorage<{ totalImmo?: number; totalFinancier?: number; totalAutres?: number }>('patrisim_bloc2', {})
  const totalB2 = (bloc2Raw.totalImmo || 0) + (bloc2Raw.totalFinancier || 0) + (bloc2Raw.totalAutres || 0)
  const pctImmo = totalB2 > 0 ? Math.round((bloc2Raw.totalImmo || 0) / totalB2 * 100) : 0
  const hasConcentration = pctImmo > 50

  // Sync order when objectives change
  useEffect(() => {
    const current = state.objectifsOrder.filter(o => state.objectifsSelectionnes.includes(o))
    const newOnes = state.objectifsSelectionnes.filter(o => !state.objectifsOrder.includes(o))
    upd('objectifsOrder', [...current, ...newOnes])
  }, [state.objectifsSelectionnes])

  // ── Validation ─────────────────────────────────────────────────────────────
  const handleSuivant = () => {
    const errs: string[] = []
    if (!allAnswered) errs.push('Veuillez répondre aux 7 questions MiFID II')
    if (state.objectifsSelectionnes.length === 0) errs.push('Sélectionnez au moins un objectif patrimonial')
    if (state.objectifsOrder.length === 0) errs.push('Classez vos objectifs par priorité')
    if (errs.length > 0) { setErrors(errs); return }
    setToast(true)
    setTimeout(() => navigate('/bloc7'), 1200)
  }

  // ── Questions MiFID ────────────────────────────────────────────────────────
  const questions = [
    {
      q: 'Votre portefeuille perd 20% en 3 mois. Quelle est votre réaction ?',
      opts: [
        { label: 'Je vends tout pour sécuriser ce qui reste', points: 1 },
        { label: "J'attends sans rien faire", points: 2 },
        { label: "Je renforce mes positions, c'est une opportunité", points: 3 },
      ]
    },
    {
      q: "Pour vos investissements, votre horizon de placement est :",
      opts: [
        { label: 'Moins de 3 ans', points: 1 },
        { label: 'Entre 3 et 8 ans', points: 2 },
        { label: 'Plus de 8 ans', points: 3 },
      ]
    },
    {
      q: "Votre priorité en matière d'investissement est :",
      opts: [
        { label: 'Protéger mon capital avant tout, même si le rendement est faible', points: 1 },
        { label: 'Générer des revenus réguliers avec un risque limité', points: 2 },
        { label: 'Faire croître mon capital sur le long terme', points: 3 },
      ]
    },
    {
      q: "Votre expérience en matière d'investissement financier :",
      opts: [
        { label: 'Nulle ou très limitée', points: 1 },
        { label: 'Quelques investissements sur des produits simples (livrets, AV)', points: 2 },
        { label: 'Expérience régulière sur des produits variés (actions, ETF, immobilier locatif...)', points: 3 },
      ]
    },
    {
      q: "Dans les 12 prochains mois, vous pourriez avoir besoin de mobiliser :",
      opts: [
        { label: "Plus de 50% de votre épargne", points: 1 },
        { label: 'Entre 10% et 50%', points: 2 },
        { label: 'Moins de 10%', points: 3 },
      ]
    },
    {
      q: "Une baisse temporaire de 30% de votre portefeuille vous semble :",
      opts: [
        { label: "Inacceptable — je ne peux pas supporter cette perte", points: 1 },
        { label: "Difficile mais supportable sur le court terme", points: 2 },
        { label: "Une opportunité d'achat à saisir", points: 3 },
      ]
    },
    {
      q: "En cas de perte totale de cet investissement, l'impact sur votre vie quotidienne serait :",
      opts: [
        { label: 'Catastrophique — cela affecterait gravement mon niveau de vie', points: 1 },
        { label: 'Difficile mais gérable', points: 2 },
        { label: "Négligeable — cela n'affecterait pas mon niveau de vie", points: 3 },
      ]
    },
  ]

  const qKeys: (keyof MifidReponses)[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium">
          <CheckCircle size={16} className="text-green-400" />Étape 6 enregistrée ✓
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">

        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 6 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#185FA5] rounded-full" style={{ width: '85%' }} />
            </div>
            <span className="text-[11px] text-gray-300">85%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Profil investisseur</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-xl">Ce questionnaire est obligatoire dans le cadre réglementaire MiFID II. Il permet d'adapter les recommandations à votre situation et votre tolérance au risque.</p>
        </div>

        {/* ══ A — MIFID II ══════════════════════════════════════════════════ */}
        <SectionTitle>A — Questionnaire MiFID II</SectionTitle>
        <InfoCard color="blue">
          Ce questionnaire est conforme aux exigences MiFID II. Vos réponses déterminent votre profil investisseur officiel.
        </InfoCard>

        <div className="mt-4 mb-3 flex items-center justify-between">
          <span className="text-[12px] text-gray-400">Question {Math.min(nbReponses + 1, 7)} / 7</span>
          <div className="flex gap-1">
            {qKeys.map((k, i) => (
              <div key={k} className={`w-6 h-1.5 rounded-full ${state.reponses[k] > 0 ? 'bg-[#185FA5]' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {questions.map((q, i) => (
            <MifidQuestion
              key={i} numero={i + 1} question={q.q} options={q.opts}
              value={state.reponses[qKeys[i]]}
              onChange={pts => upd('reponses', { ...state.reponses, [qKeys[i]]: pts })}
            />
          ))}
        </div>

        {/* Résultat profil */}
        {allAnswered && profil && (
          <div className="mb-8 rounded-2xl border-2 p-6 space-y-4" style={{ borderColor: profil.color, backgroundColor: profil.bgColor }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: profil.textColor }}>Votre profil investisseur</p>
                <p className="text-[24px] font-bold" style={{ color: profil.color }}>{profil.label}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: profil.textColor }}>Score MiFID II</p>
                <p className="text-[24px] font-bold" style={{ color: profil.color }}>{score} / 21</p>
              </div>
            </div>

            {/* Jauge 1-4 */}
            <div className="relative h-3 rounded-full overflow-hidden flex">
              {[{ l: 'Défensif', c: '#185FA5' }, { l: 'Équilibré', c: '#0F6E56' }, { l: 'Dynamique', c: '#D97706' }, { l: 'Offensif', c: '#DC2626' }].map((p, i) => (
                <div key={p.l} className="flex-1 transition-all" style={{ backgroundColor: i === (['Défensif','Équilibré','Dynamique','Offensif'].indexOf(profil.label)) ? p.c : `${p.c}40` }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-500 -mt-1">
              {['Défensif', 'Équilibré', 'Dynamique', 'Offensif'].map(l => <span key={l} className={l === profil.label ? 'font-bold' : ''}>{l}</span>)}
            </div>

            <p className="text-[13px]" style={{ color: profil.textColor }}>{profil.desc}</p>
            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${profil.color}15` }}>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: profil.textColor }}>Placements adaptés</p>
              <p className="text-[12px]" style={{ color: profil.textColor }}>{profil.placements}</p>
            </div>
            <p className="text-[11px] text-gray-400">Ce profil peut être ajusté par votre conseiller avec justification.</p>
          </div>
        )}

        {/* ══ B — OBJECTIFS PATRIMONIAUX ═══════════════════════════════════ */}
        <SectionTitle>B — Objectifs patrimoniaux</SectionTitle>
        <p className="text-[12px] text-gray-400 mb-4">Sélectionnez vos objectifs et définissez-les précisément. Ils guideront l'ensemble des recommandations.</p>

        <Field label="Vos objectifs">
          <Chips
            options={['Préparer ma retraite', 'Atteindre un capital cible', 'Générer des revenus complémentaires', 'Réduire mes impôts', 'Transmettre un patrimoine', 'Acquérir ma résidence principale', 'Financer les études de mes enfants', 'Autre objectif']}
            value={state.objectifsSelectionnes} onChange={v => upd('objectifsSelectionnes', v as string[])} multi small
          />
        </Field>

        <div className="mt-5 space-y-4">
          {state.objectifsSelectionnes.includes('Préparer ma retraite') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[13px] font-semibold text-gray-800">Préparer ma retraite</p>
              <InfoCard color="green">Déjà configuré en Bloc 5 ✓ — modifiez si nécessaire.</InfoCard>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Âge cible"><Input value={state.objRetraite.ageCible} onChange={v => upd('objRetraite', { ...state.objRetraite, ageCible: v })} placeholder="63" suffix="ans" /></Field>
                <Field label="Revenus souhaités"><Input value={state.objRetraite.revenusSouhaites} onChange={v => upd('objRetraite', { ...state.objRetraite, revenusSouhaites: v })} placeholder="2 000" suffix="€/mois" /></Field>
                <Field label="Déficit estimé"><Input value={state.objRetraite.deficitEstime} onChange={v => upd('objRetraite', { ...state.objRetraite, deficitEstime: v })} placeholder="500" suffix="€/mois" /></Field>
                <Field label="Capital nécessaire"><Input value={state.objRetraite.capitalNecessaire} onChange={v => upd('objRetraite', { ...state.objRetraite, capitalNecessaire: v })} placeholder="150 000" suffix="€" /></Field>
              </div>
            </div>
          )}

          {state.objectifsSelectionnes.includes('Atteindre un capital cible') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[13px] font-semibold text-gray-800">Atteindre un capital cible</p>
              <Field label="Montant cible">
                <div className="space-y-2">
                  <Chips options={['100 000 €', '250 000 €', '500 000 €', '1 000 000 €', 'Autre']}
                    value={['100 000 €','250 000 €','500 000 €','1 000 000 €'].includes(state.objCapital.montant) ? state.objCapital.montant : state.objCapital.montant ? 'Autre' : ''}
                    onChange={v => { if (v !== 'Autre') upd('objCapital', { ...state.objCapital, montant: v as string }) }} small />
                  <Input value={state.objCapital.montant} onChange={v => upd('objCapital', { ...state.objCapital, montant: v })} placeholder="500 000" suffix="€" />
                </div>
              </Field>
              <Field label="Horizon">
                <div className="space-y-1">
                  <div className="flex justify-between mb-1"><span className="text-[12px] text-gray-500">Horizon</span><span className="text-[12px] font-bold text-[#185FA5]">{state.objCapital.horizon} ans</span></div>
                  <input type="range" min={1} max={30} value={state.objCapital.horizon}
                    onChange={e => upd('objCapital', { ...state.objCapital, horizon: Number(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
                </div>
              </Field>
              {objectifMontant > 0 && (
                <InfoCard color="blue">
                  <p>Patrimoine actuel : <strong>{fmt(patrimoineCourant)} €</strong> · Objectif : <strong>{fmt(objectifMontant)} €</strong></p>
                  <p>Il vous manque : <strong>{fmt(gap)} €</strong></p>
                  <p>Effort mensuel nécessaire : <strong>{fmt(effortMensuel)} €/mois</strong> (hypothèse 4%/an)</p>
                </InfoCard>
              )}
            </div>
          )}

          {state.objectifsSelectionnes.includes('Générer des revenus complémentaires') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[13px] font-semibold text-gray-800">Générer des revenus complémentaires</p>
              <Field label="Montant souhaité"><Input value={state.objRevenus.montant} onChange={v => upd('objRevenus', { ...state.objRevenus, montant: v })} placeholder="500" suffix="€/mois" /></Field>
              <Field label="À partir de quand ?">
                <Chips options={['Maintenant', 'Dans 3 ans', 'Dans 5 ans', 'À la retraite']}
                  value={state.objRevenus.quand} onChange={v => upd('objRevenus', { ...state.objRevenus, quand: v as string })} small />
              </Field>
              {parseNum(state.objRevenus.montant) > 0 && (
                <InfoCard color="blue">Capital nécessaire pour générer <strong>{state.objRevenus.montant} €/mois</strong> en rente : <strong>{fmt(capitalPourRentes)} €</strong> (hypothèse rendement 4%)</InfoCard>
              )}
            </div>
          )}

          {state.objectifsSelectionnes.includes('Réduire mes impôts') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[13px] font-semibold text-gray-800">Réduire mes impôts</p>
              <Field label="Économie fiscale annuelle souhaitée"><Input value={state.objImpots.economie} onChange={v => upd('objImpots', { ...state.objImpots, economie: v })} placeholder="2 000" suffix="€/an" /></Field>
              {tmi > 0 && plafondPer > 0 && (
                <InfoCard color="amber">
                  <p>Avec votre TMI à <strong>{tmi}%</strong>, un versement PER de <strong>{fmt(plafondPer)} €</strong> vous économise jusqu'à <strong>{fmt(econoPer)} €/an</strong>.</p>
                  <p>Plafond PER disponible : <strong>{fmt(plafondPer)} €</strong> · Économie maximale possible : <strong>{fmt(econoPer)} €/an</strong></p>
                </InfoCard>
              )}
              <Field label="Tolérance sur la durée de blocage">
                <Chips options={['Court terme acceptable', 'Long terme uniquement', 'Peu importe']}
                  value={state.objImpots.toleranceBlockage} onChange={v => upd('objImpots', { ...state.objImpots, toleranceBlockage: v as string })} small />
              </Field>
            </div>
          )}

          {state.objectifsSelectionnes.includes('Transmettre un patrimoine') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[13px] font-semibold text-gray-800">Transmettre un patrimoine</p>
              <Field label="Montant cible à transmettre"><Input value={state.objTransmission.montant} onChange={v => upd('objTransmission', { ...state.objTransmission, montant: v })} placeholder="200 000" suffix="€" /></Field>
              <Field label="À qui">
                <Chips options={['Enfants', 'Conjoint', 'Petits-enfants', 'Association', 'Mixte']}
                  value={state.objTransmission.beneficiaires} onChange={v => upd('objTransmission', { ...state.objTransmission, beneficiaires: v as string[] })} multi small />
              </Field>
              <Field label="Horizon">
                <Chips options={['De mon vivant', 'À mon décès', 'Les deux']}
                  value={state.objTransmission.horizon} onChange={v => upd('objTransmission', { ...state.objTransmission, horizon: v as string })} small />
              </Field>
            </div>
          )}

          {state.objectifsSelectionnes.includes('Acquérir ma résidence principale') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[13px] font-semibold text-gray-800">Acquérir ma résidence principale</p>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Budget cible"><Input value={state.objRP.budget} onChange={v => upd('objRP', { ...state.objRP, budget: v })} placeholder="300 000" suffix="€" /></Field>
                <Field label="Horizon"><Input type="number" value={state.objRP.horizon} onChange={v => upd('objRP', { ...state.objRP, horizon: v })} placeholder="5" suffix="ans" /></Field>
                <Field label="Apport disponible"><Input value={state.objRP.apport} onChange={v => upd('objRP', { ...state.objRP, apport: v })} placeholder="50 000" suffix="€" /></Field>
              </div>
              {state.objRP.budget && state.objRP.apport && (
                <InfoCard color="blue">
                  Mensualité estimée : <strong>{fmt(Math.round((parseNum(state.objRP.budget) - parseNum(state.objRP.apport)) * (0.04 / 12) / (1 - Math.pow(1 + 0.04 / 12, -240))))} €/mois</strong> sur 20 ans à 4%
                </InfoCard>
              )}
            </div>
          )}

          {state.objectifsSelectionnes.includes('Financer les études de mes enfants') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[13px] font-semibold text-gray-800">Financer les études de mes enfants</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Enfant">
                  <select value={state.objEtudes.enfantPrenom} onChange={e => {
                    const enfant = enfants.find(en => en.prenom === e.target.value)
                    upd('objEtudes', { ...state.objEtudes, enfantPrenom: e.target.value, ageActuel: enfant?.age || '' })
                  }} className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] focus:outline-none focus:bg-white focus:border-[#185FA5] transition-all cursor-pointer">
                    <option value="">Sélectionnez…</option>
                    {enfants.map(en => <option key={en.prenom}>{en.prenom}</option>)}
                    <option value="Autre">Autre enfant</option>
                  </select>
                </Field>
                <Field label="Âge début études"><Input type="number" value={state.objEtudes.ageDebut} onChange={v => upd('objEtudes', { ...state.objEtudes, ageDebut: v })} placeholder="18" suffix="ans" /></Field>
              </div>
              <Field label="Budget estimé"><Input value={state.objEtudes.budget} onChange={v => upd('objEtudes', { ...state.objEtudes, budget: v })} placeholder="30 000" suffix="€" /></Field>
              {state.objEtudes.ageActuel && state.objEtudes.ageDebut && state.objEtudes.budget && (() => {
                const ansSep = Math.max(0, parseNum(state.objEtudes.ageDebut) - parseNum(state.objEtudes.ageActuel))
                const effortEtudes = ansSep > 0 ? Math.round(parseNum(state.objEtudes.budget) / (((Math.pow(1.03, ansSep) - 1) / (0.03 / 12)))) : 0
                return (
                  <InfoCard color="blue">
                    Dans <strong>{ansSep} ans</strong> vous aurez besoin de <strong>{state.objEtudes.budget} €</strong><br />
                    Effort mensuel conseillé : <strong>{fmt(effortEtudes)} €/mois</strong> (hypothèse rendement 3%/an)
                  </InfoCard>
                )
              })()}
            </div>
          )}

          {state.objectifsSelectionnes.includes('Autre objectif') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-[13px] font-semibold text-gray-800">Autre objectif</p>
              <Field label="Description"><Input value={state.objAutre.description} onChange={v => upd('objAutre', { ...state.objAutre, description: v })} placeholder="Décrivez votre objectif" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Montant cible"><Input value={state.objAutre.montant} onChange={v => upd('objAutre', { ...state.objAutre, montant: v })} placeholder="0" suffix="€" /></Field>
                <Field label="Horizon"><Input type="number" value={state.objAutre.horizon} onChange={v => upd('objAutre', { ...state.objAutre, horizon: v })} placeholder="10" suffix="ans" /></Field>
              </div>
            </div>
          )}
        </div>

        {/* Priorisation */}
        {state.objectifsOrder.length > 1 && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-[13px] font-semibold text-gray-800">Classez vos objectifs par ordre de priorité</p>
            <p className="text-[12px] text-gray-400">Faites glisser pour réorganiser</p>
            <PriorityList items={state.objectifsOrder} onChange={items => upd('objectifsOrder', items)} />
            <InfoCard color="blue">Votre objectif principal guidera l'analyse IA et les recommandations personnalisées de votre bilan.</InfoCard>
          </div>
        )}

        {/* ══ C — CONVICTIONS ══════════════════════════════════════════════ */}
        <SectionTitle>C — Convictions & préférences</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 mb-6">
          <Field label="Dans quels types de placements souhaitez-vous investir ?">
            <Chips options={['Immobilier physique', 'SCPI / OPCI', 'Bourse — actions', 'ETF / Fonds indiciels', 'Obligations', 'PEA', 'Assurance-vie', 'PER', 'Private equity', 'Infrastructure', 'Forêts / GFI', 'Or et métaux précieux', 'Cryptomonnaies', 'Produits structurés', 'ISR / ESG / Impact investing']}
              value={state.universInvest} onChange={v => upd('universInvest', v as string[])} multi small />
          </Field>
          <Field label="Préférences géographiques">
            <Chips options={['France uniquement', 'Europe', 'Monde entier', 'Marchés émergents inclus']}
              value={state.prefGeo} onChange={v => upd('prefGeo', v as string)} small />
          </Field>
          <Field label="Secteurs à privilégier (optionnel)">
            <Chips options={['Technologie', 'Santé', 'Énergie', 'Finance', 'Immobilier', 'Consommation', 'Infrastructure', 'Défense', 'Autre']}
              value={state.secteursPriv} onChange={v => upd('secteursPriv', v as string[])} multi small />
          </Field>
          <Field label="Secteurs à exclure (optionnel)">
            <Chips options={['Technologie', 'Santé', 'Énergie', 'Finance', 'Immobilier', 'Consommation', 'Infrastructure', 'Armement', 'Tabac', 'Alcool', "Jeux d'argent", 'Énergies fossiles']}
              value={state.secteursExcl} onChange={v => upd('secteursExcl', v as string[])} multi small />
          </Field>
          <Field label="Préférence ESG / ISR">
            <Chips options={['Pas de préférence particulière', 'Critères ESG importants', 'ESG prioritaire dans mes choix', 'Impact investing uniquement']}
              value={state.prefESG} onChange={v => upd('prefESG', v as string)} small />
          </Field>
        </div>

        {/* ══ D — DIVERSIFICATION & SUIVI ═════════════════════════════════ */}
        <SectionTitle>D — Diversification & suivi</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 mb-6">

          {/* Concentration */}
          {totalB2 > 0 && (
            <div>
              <InfoCard color={hasConcentration ? 'amber' : 'blue'}>
                Votre patrimoine est concentré à <strong>{pctImmo}%</strong> sur l'immobilier.
                {hasConcentration && <span> Une concentration supérieure à 50% sur un seul actif représente un risque patrimonial significatif.</span>}
              </InfoCard>
              {hasConcentration && (
                <div className="mt-3 space-y-3">
                  <Field label="Cette concentration est-elle justifiée ?">
                    <Toggle value={state.concentrationJustifiee} onChange={v => upd('concentrationJustifiee', v)} />
                  </Field>
                  {state.concentrationJustifiee && (
                    <div className="space-y-2">
                      <Chips options={['Entrepreneur / patrimoine pro dominant', 'Héritage non encore arbitré', 'Choix délibéré de conviction', 'Autre']}
                        value={state.concentrationRaison} onChange={v => upd('concentrationRaison', v as string)} small />
                      {state.concentrationRaison === 'Autre' && (
                        <Input value={state.concentrationRaisonAutre} onChange={v => upd('concentrationRaisonAutre', v)} placeholder="Précisez…" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Liquidité */}
          <Field label="Part de patrimoine à mobiliser rapidement">
            <div className="space-y-2">
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-gray-500">Liquidité souhaitée</span>
                <span className="text-[12px] font-bold text-[#185FA5]">{state.liquiditePct}% {patrimoineCourant > 0 ? `(${fmt(Math.round(patrimoineCourant * state.liquiditePct / 100))} €)` : ''}</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={state.liquiditePct}
                onChange={e => upd('liquiditePct', Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
            </div>
          </Field>

          {chargesMensuel > 0 && (
            <div className={`rounded-xl border p-4 space-y-2 ${cousinStatut === 'green' ? 'bg-[#E1F5EE] border-[#0F6E56]/20' : cousinStatut === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-[12px] font-semibold ${cousinStatut === 'green' ? 'text-[#085041]' : cousinStatut === 'amber' ? 'text-amber-800' : 'text-red-700'}`}>
                Coussin de sécurité recommandé : {cousinStatut === 'green' ? '✓ Suffisant' : cousinStatut === 'amber' ? '⚠ Insuffisant' : '⚠ Critique'}
              </p>
              <p className="text-[11px] text-gray-600">4 à 6 mois de dépenses fixes : <strong>{fmt(coussinMin)} € – {fmt(coussinMax)} €</strong></p>
              <p className="text-[11px] text-gray-600">Votre épargne disponible (livrets + CC) : <strong>{fmt(epargneDisponible)} €</strong></p>
            </div>
          )}

          <Field label="Fréquence de suivi souhaitée">
            <Chips options={['Mensuelle', 'Trimestrielle', 'Semestrielle', 'Annuelle']}
              value={state.suiviFrequence} onChange={v => upd('suiviFrequence', v as string)} small />
          </Field>

          <Field label="Mode de conseil préféré">
            <Chips options={['Autonome (je décide seul)', 'Guidé (conseils puis je décide)', 'Délégué (je fais confiance au conseiller)']}
              value={state.modeConseil} onChange={v => upd('modeConseil', v as string)} small />
          </Field>
        </div>

        {/* Erreurs */}
        {errors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1">
            {errors.map(e => <p key={e} className="text-[12px] text-red-600">⚠ {e}</p>)}
          </div>
        )}

        {/* ══ SYNTHÈSE ════════════════════════════════════════════════════ */}
        {!state.showSynthese && (
          <button type="button" onClick={() => upd('showSynthese', true)}
            className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
            Voir la synthèse →
          </button>
        )}

        {state.showSynthese && profil && (
          <div className="space-y-5 mt-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">Synthèse Bloc 6</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Carte profil */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Profil investisseur</p>
                  <p className="text-[22px] font-bold" style={{ color: profil.color }}>{profil.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Score MiFID II</p>
                  <p className="text-[22px] font-bold text-gray-800">{score} / 21</p>
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  { label: 'Objectif principal', value: state.objectifsOrder[0] || '—' },
                  { label: 'Géographie', value: state.prefGeo || '—' },
                  { label: 'ESG', value: state.prefESG || '—' },
                  { label: `Liquidité souhaitée`, value: `${state.liquiditePct}%${patrimoineCourant > 0 ? ` (${fmt(Math.round(patrimoineCourant * state.liquiditePct / 100))} €)` : ''}` },
                  { label: 'Coussin actuel', value: cousinStatut === 'green' ? 'Suffisant ✓' : cousinStatut === 'amber' ? 'Insuffisant ⚠' : 'Critique ⚠' },
                  { label: 'Suivi', value: state.suiviFrequence || '—' },
                  { label: 'Mode', value: state.modeConseil?.split(' ')[0] || '—' },
                  { label: 'Convictions', value: state.universInvest.slice(0, 3).join(' · ') || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-400">{label}</span>
                    <span className="text-[11px] font-semibold text-gray-700 text-right max-w-[55%]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recap global */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[13px] font-semibold text-gray-800 mb-3">Récapitulatif global</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Patrimoine brut', value: `${fmt(patrimoineCourant)} €` },
                  { label: 'Dettes totales', value: `${fmt(loadFromStorage<{ totalDettes?: number }>('patrisim_bloc3_calc', {}).totalDettes || 0)} €` },
                  { label: 'Patrimoine net', value: `${fmt(patrimoineCourant - (loadFromStorage<{ totalDettes?: number }>('patrisim_bloc3_calc', {}).totalDettes || 0))} €` },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">{m.label}</p>
                    <p className="text-[14px] font-bold text-gray-800">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => navigate('/bloc7')}
              className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
              Confirmer et passer au Bloc 7 — Succession & transmission →
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={() => navigate('/bloc5')} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">← Retour</button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          {allAnswered && profil && (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: profil.bgColor, color: profil.textColor }}>
              {profil.label}
            </span>
          )}
          <button type="button" onClick={handleSuivant}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}