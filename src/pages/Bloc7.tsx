import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import FadeIn from '../components/FadeIn'
import { getPrevBloc } from '../utils/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Heritier {
  id: string
  lien: string
  prenom: string
  age: string
  situation: string
  prefilled: boolean
}

interface Testament {
  aTestament: boolean
  type: string
  dateRedaction: string
  notaire: string
  derniereMAJ: string
}

interface ClauseMatrimoniale {
  aClause: boolean
  type: string
  description: string
}

interface Donation {
  id: string
  beneficiaire: string
  beneficiaireLibre: string
  type: string
  montant: string
  date: string
  acteNotarie: boolean
  declare: boolean
}

interface Demembrement {
  id: string
  bien: string
  bienLibre: string
  type: string
  usufruitier: string
  nuProprio: string
  valeurPP: string
  dateConstitution: string
  duree: string
  prefilled: boolean
}

interface ClauseAV {
  id: string
  nom: string
  compagnie: string
  valeur: string
  typeClause: string
  usufruitier: string
  nuProprios: { nom: string; pct: string }[]
  prefilled: boolean
}

interface SuccessionAttendue {
  id: string
  lienType: string
  preciser: string
  montantMode: 'precis' | 'fourchette'
  montant: string
  montantMin: string
  montantMax: string
  immo: number
  financier: number
  autre: number
  delai: string
  donationsRecues: string
  aAV: boolean
  montantAV: string
}

interface PacteDutreil {
  aPacte: boolean
  societe: string
  dateSignature: string
  engagementCollectif: boolean
  engagementIndividuel: boolean
}

interface Bloc7State {
  heritiers: Heritier[]
  testament: Testament
  mandatProtection: boolean
  clauseMatrimoniale: ClauseMatrimoniale
  aDonations: boolean
  donations: Donation[]
  aDemembrements: boolean
  demembrements: Demembrement[]
  clausesAV: ClauseAV[]
  pacteDutreil: PacteDutreil
  aSuccessionAttendue: boolean
  successionsAttendues: SuccessionAttendue[]
  showSynthese: boolean
  showModal: boolean
  montantTotalDonations: string
  estimationGlobaleSuccession: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defHeritier = (): Heritier => ({ id: crypto.randomUUID(), lien: '', prenom: '', age: '', situation: 'Vivant', prefilled: false })
const defDonation = (): Donation => ({ id: crypto.randomUUID(), beneficiaire: '', beneficiaireLibre: '', type: '', montant: '', date: '', acteNotarie: false, declare: false })
const defDemembrement = (): Demembrement => ({ id: crypto.randomUUID(), bien: '', bienLibre: '', type: '', usufruitier: '', nuProprio: '', valeurPP: '', dateConstitution: '', duree: '', prefilled: false })
const defClauseAV = (): ClauseAV => ({ id: crypto.randomUUID(), nom: '', compagnie: '', valeur: '', typeClause: 'Standard', usufruitier: '', nuProprios: [], prefilled: false })
const defSuccession = (): SuccessionAttendue => ({ id: crypto.randomUUID(), lienType: '', preciser: '', montantMode: 'precis', montant: '', montantMin: '', montantMax: '', immo: 50, financier: 40, autre: 10, delai: '', donationsRecues: '', aAV: false, montantAV: '' })

const defaultState = (): Bloc7State => ({
  heritiers: [],
  testament: { aTestament: false, type: '', dateRedaction: '', notaire: '', derniereMAJ: '' },
  mandatProtection: false,
  clauseMatrimoniale: { aClause: false, type: '', description: '' },
  aDonations: false, donations: [],
  aDemembrements: false, demembrements: [],
  clausesAV: [],
  pacteDutreil: { aPacte: false, societe: '', dateSignature: '', engagementCollectif: false, engagementIndividuel: false },
  aSuccessionAttendue: false, successionsAttendues: [],
  showSynthese: false, showModal: false,
  montantTotalDonations: '', estimationGlobaleSuccession: '',
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

function abattementLegal(lien: string): { montant: number; label: string } {
  switch (lien) {
    case 'Conjoint': case 'Partenaire PACS': return { montant: 0, label: 'Exonération totale' }
    case 'Enfant commun': case 'Enfant d\'une autre union': return { montant: 100000, label: '100 000 €' }
    case 'Petit-enfant': return { montant: 31865, label: '31 865 €' }
    case 'Frère / Sœur': return { montant: 15932, label: '15 932 €' }
    case 'Neveu / Nièce': return { montant: 7967, label: '7 967 €' }
    default: return { montant: 1594, label: '1 594 €' }
  }
}

function calcCGI669(age: number) {
  if (age < 21) return { usufruit: 90, np: 10 }
  if (age <= 30) return { usufruit: 80, np: 20 }
  if (age <= 40) return { usufruit: 70, np: 30 }
  if (age <= 50) return { usufruit: 60, np: 40 }
  if (age <= 60) return { usufruit: 50, np: 50 }
  if (age <= 70) return { usufruit: 40, np: 60 }
  if (age <= 80) return { usufruit: 30, np: 70 }
  if (age <= 90) return { usufruit: 20, np: 80 }
  return { usufruit: 10, np: 90 }
}

function yearsAgo(dateStr: string): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function dateIn15Years(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + 15)
  return d.toLocaleDateString('fr-FR')
}

// Estimation droits succession (barème 2025 enfants)
function estimerDroits(baseImposable: number): number {
  if (baseImposable <= 0) return 0
  const tranches = [
    { seuil: 8072, taux: 0.05 },
    { seuil: 12109, taux: 0.10 },
    { seuil: 15932, taux: 0.15 },
    { seuil: 552324, taux: 0.20 },
    { seuil: 902838, taux: 0.30 },
    { seuil: 1805677, taux: 0.40 },
    { seuil: Infinity, taux: 0.45 },
  ]
  let droits = 0, reste = baseImposable, prev = 0
  for (const t of tranches) {
    const tranche = Math.min(reste, t.seuil - prev)
    if (tranche <= 0) break
    droits += tranche * t.taux
    reste -= tranche
    prev = t.seuil
    if (reste <= 0) break
  }
  return Math.round(droits)
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

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all cursor-pointer">
      {children}
    </select>
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

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-[13px] text-gray-400 hover:border-[#185FA5] hover:text-[#185FA5] transition-colors font-medium">
      + {label}
    </button>
  )
}

function CardWrap({ title, subtitle, onRemove, children, prefilled }: { title: string; subtitle?: string; onRemove?: () => void; children: React.ReactNode; prefilled?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-gray-800">{title}</span>
          {subtitle && <span className="text-[12px] font-medium text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded-full">{subtitle}</span>}
          {prefilled && <span className="text-[10px] text-[#085041] bg-[#E1F5EE] px-2 py-0.5 rounded-full font-semibold">Pré-rempli</span>}
        </div>
        <div className="flex items-center gap-3">
          {onRemove && <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="text-[11px] text-red-400 hover:text-red-600 font-medium">Supprimer</button>}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
      {open && <div className="px-5 py-4 space-y-4">{children}</div>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc7() {
  const navigate = useNavigate()

  // ── Lecture blocs précédents ───────────────────────────────────────────────
  const p1Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const p2Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p2', {})
  const p1Label = p1Data.prenom?.trim() || 'Personne 1'
  const p2Label = p2Data.prenom?.trim() || 'Personne 2'
  const bloc1Mode = loadFromStorage<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const isCouple = bloc1Mode === 'couple'

  const foyerBloc1 = loadFromStorage<{
    statutMatrimonial?: string
    regimeMatrimonial?: string
    enfants?: { prenom?: string; age?: string }[]
    majeurs?: { prenom?: string; age?: string }[]
    enfantsCharge?: number
    enfantsMajeurs?: number
  }>('patrisim_bloc1_foyer', {})

  const isMarieOuPacse = ['Marié(e)', 'Pacsé(e)'].includes(foyerBloc1.statutMatrimonial || '')

  // Biens Bloc 2
  const bloc2 = loadFromStorage<{
    rp?: { typeBien?: string; ville?: string }; proprietaireRP?: boolean
    biens?: { typeBien?: string; ville?: string }[]
    avs?: { id?: string; nom?: string; compagnie?: string; valeurRachat?: string; clauseBeneficiaire?: string }[]
    partsSociales?: { nomSociete?: string; valeur?: string }[]
    demembrements?: { id?: string; bien?: string; type?: string; dateConstitution?: string; valeurPP?: string }[]
  }>('patrisim_bloc2', {})

  const biensBloc2 = [
    ...(bloc2.proprietaireRP && bloc2.rp ? [[bloc2.rp.typeBien, bloc2.rp.ville].filter(Boolean).join(' — ') || 'Résidence principale'] : []),
    ...(bloc2.biens || []).map((b, i) => [b.typeBien, b.ville].filter(Boolean).join(' — ') || `Bien ${i + 1}`),
  ]

  const avsBloc2 = bloc2.avs || []
  const partsSocialesBloc2 = bloc2.partsSociales || []

  // Patrimoine net
  const patrimoineBrut = (() => {
    const b2 = loadFromStorage<{ totalImmo?: number; totalFinancier?: number; totalAutres?: number }>('patrisim_bloc2', {})
    return (b2.totalImmo || 0) + (b2.totalFinancier || 0) + (b2.totalAutres || 0)
  })()
  const totalDettes = loadFromStorage<{ totalDettes?: number }>('patrisim_bloc3_calc', {}).totalDettes || 0
  const patrimoineNet = patrimoineBrut - totalDettes

  // Personnes déclarées (pour selects)
  const personnesDeclarees = [p1Label, ...(isCouple ? [p2Label] : []),
    ...(foyerBloc1.enfants || []).map(e => e.prenom).filter(Boolean) as string[],
    ...(foyerBloc1.majeurs || []).map(e => e.prenom).filter(Boolean) as string[],
  ]

  const [state, setState] = useState<Bloc7State>(() => {
    const s = loadFromStorage('patrisim_bloc7', defaultState())

    // Pré-remplir héritiers depuis Bloc 1 si liste vide
    if (s.heritiers.length === 0) {
      const auto: Heritier[] = []
      if (isCouple) {
        auto.push({ id: crypto.randomUUID(), lien: foyerBloc1.statutMatrimonial === 'Pacsé(e)' ? 'Partenaire PACS' : 'Conjoint', prenom: p2Label, age: '', situation: 'Vivant', prefilled: true })
      }
      ;(foyerBloc1.enfants || []).forEach(e => {
        auto.push({ id: crypto.randomUUID(), lien: 'Enfant commun', prenom: e.prenom || '', age: e.age || '', situation: 'Vivant', prefilled: true })
      })
      ;(foyerBloc1.majeurs || []).forEach(e => {
        auto.push({ id: crypto.randomUUID(), lien: 'Enfant commun', prenom: e.prenom || '', age: e.age || '', situation: 'Vivant', prefilled: true })
      })
      if (auto.length > 0) s.heritiers = auto
    }

    // Pré-remplir AV depuis Bloc 2
    if (s.clausesAV.length === 0 && avsBloc2.length > 0) {
      s.clausesAV = avsBloc2.map(av => ({
        id: av.id || crypto.randomUUID(),
        nom: av.nom || '', compagnie: av.compagnie || '',
        valeur: av.valeurRachat || '',
        typeClause: av.clauseBeneficiaire === 'Personnalisée' ? 'Personnalisée' : av.clauseBeneficiaire === 'Démembrée' ? 'Démembrée' : 'Standard',
        usufruitier: '', nuProprios: [], prefilled: true,
      }))
    }

    return s
  })

  const [savedAt, setSavedAt] = useState('')
  const upd = useCallback(<K extends keyof Bloc7State>(k: K, v: Bloc7State[K]) => setState(s => ({ ...s, [k]: v })), [])

  useEffect(() => {
    localStorage.setItem('patrisim_bloc7', JSON.stringify(state))
    setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [state])

  // ── Calculs synthèse ───────────────────────────────────────────────────────
  const totalAbattements = state.heritiers.reduce((a, h) => {
    const { montant } = abattementLegal(h.lien)
    return a + montant + (h.situation === 'Handicapé' ? 159325 : 0)
  }, 0)

  const totalDonne = state.donations.reduce((a, d) => a + parseNum(d.montant), 0)
  const avClausesNommees = state.clausesAV.filter(av => av.typeClause !== 'Standard').length

  // Prochain rappel fiscal
  const prochainRappel = state.donations.length > 0
    ? state.donations
        .filter(d => d.date)
        .map(d => dateIn15Years(d.date))
        .sort()[0] || '—'
    : '—'

  // Base imposable simplifiée (patrimoine net - abattements - AV hors succession)
  const avHorsSuccession = state.clausesAV.reduce((a, av) => a + Math.min(parseNum(av.valeur), 152500), 0)
  const baseImposable = Math.max(0, patrimoineNet - totalAbattements - avHorsSuccession - totalDonne)
  const droitsEstimes = estimerDroits(baseImposable / Math.max(1, state.heritiers.filter(h => h.lien !== 'Conjoint' && h.lien !== 'Partenaire PACS').length))

  const montantSuccAttendues = state.successionsAttendues.reduce((a, s) => a + parseNum(s.montantMode === 'precis' ? s.montant : s.montantMax), 0)

  const bloc0 = loadFromStorage<{ niveauDetail?: 'rapide' | 'complet' }>('patrisim_bloc0', {})
  const isRapide = (bloc0.niveauDetail || 'complet') === 'rapide'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F8F6]">

      {/* Modal confirmation */}
      {state.showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#E6F1FB] flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-[#185FA5]" />
            </div>
            <h2 className="text-[20px] font-bold text-gray-900">Votre profil est complet</h2>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              L'analyse IA va maintenant traiter l'ensemble de vos données pour générer votre bilan patrimonial personnalisé.<br /><br />
              <strong>Durée estimée : 15–30 secondes</strong>
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => upd('showModal', false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button type="button" onClick={() => navigate('/analyse')}
                className="flex-1 py-3 rounded-xl bg-[#185FA5] text-white text-[13px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.3)]">
                Lancer l'analyse →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">

        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 7 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#185FA5] rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
            <span className="text-[11px] text-[#0F6E56] font-semibold">100%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Succession & transmission</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-xl">Ces informations permettent d'analyser votre situation successorale et d'identifier les optimisations possibles.</p>
          <div className="mt-3">
            <InfoCard color="blue">Les données saisies dans les blocs précédents sont automatiquement intégrées ici pour éviter toute double saisie.</InfoCard>
          </div>
          <div className="mt-2">
            <InfoCard color="green">Renseignez ce qui vous concerne. Ces informations peuvent être complétées ultérieurement.</InfoCard>
          </div>
        </div>

        {/* ══ A — SITUATION SUCCESSORALE ══════════════════════════════════ */}
        <FadeIn delay={0}>
        <SectionTitle>A — Héritiers & dispositions</SectionTitle>

        {/* Héritiers */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-gray-800">Vos héritiers</p>
            {!isRapide && <button type="button" onClick={() => upd('heritiers', [...state.heritiers, defHeritier()])}
              className="text-[12px] text-[#185FA5] hover:text-[#0C447C] font-medium">+ Ajouter un héritier</button>}
          </div>
          <div className="space-y-3">
            {state.heritiers.map(h => {
              const { montant, label: abLabel } = abattementLegal(h.lien)
              const isExonere = montant === 0
              const yearsTesta = yearsAgo(h.age ? '' : '')
              return (
                <CardWrap key={h.id}
                  title={h.prenom || 'Héritier'}
                  subtitle={h.lien || undefined}
                  onRemove={!h.prefilled ? () => upd('heritiers', state.heritiers.filter(x => x.id !== h.id)) : undefined}
                  prefilled={h.prefilled}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Lien de parenté">
                      <Select value={h.lien} onChange={v => upd('heritiers', state.heritiers.map(x => x.id === h.id ? { ...x, lien: v } : x))}>
                        <option value="">Sélectionnez…</option>
                        {['Conjoint', 'Partenaire PACS', 'Enfant commun', "Enfant d'une autre union", 'Petit-enfant', 'Parent', 'Frère / Sœur', 'Neveu / Nièce', 'Autre'].map(o => <option key={o}>{o}</option>)}
                      </Select>
                    </Field>
                    <Field label="Prénom">
                      <Input value={h.prenom} onChange={v => upd('heritiers', state.heritiers.map(x => x.id === h.id ? { ...x, prenom: v } : x))} placeholder="Prénom" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Âge">
                      <Input type="number" value={h.age} onChange={v => upd('heritiers', state.heritiers.map(x => x.id === h.id ? { ...x, age: v } : x))} placeholder="35" suffix="ans" />
                    </Field>
                    <Field label="Situation">
                      <Chips options={['Vivant', 'Prédécédé', 'Handicapé']}
                        value={h.situation} onChange={v => upd('heritiers', state.heritiers.map(x => x.id === h.id ? { ...x, situation: v as string } : x))} small />
                    </Field>
                  </div>
                  {h.situation === 'Handicapé' && (
                    <InfoCard color="green">Abattement spécifique : <strong>159 325 €</strong> en plus de l'abattement légal</InfoCard>
                  )}
                  {h.lien && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${isExonere ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>
                        {isExonere ? 'Exonération totale' : `Abattement : ${abLabel}`}
                      </span>
                      <span className="text-[10px] text-gray-400">Renouvelable tous les 15 ans</span>
                    </div>
                  )}
                </CardWrap>
              )
            })}
            {!isRapide && <AddBtn onClick={() => upd('heritiers', [...state.heritiers, defHeritier()])} label="Ajouter un héritier" />}
          </div>
        </div>

        {/* Testament */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-5">
          <Field label="Avez-vous rédigé un testament ?">
            <Toggle value={state.testament.aTestament} onChange={v => upd('testament', { ...state.testament, aTestament: v })} />
          </Field>
          {state.testament.aTestament ? (
            <div className="space-y-4 pl-2 border-l-2 border-[#E6F1FB]">
              <Field label="Type">
                <Chips options={['Olographe (manuscrit)', 'Authentique (notaire)', 'Mystique']}
                  value={state.testament.type} onChange={v => upd('testament', { ...state.testament, type: v as string })} small />
              </Field>
              {!isRapide && <div className="grid grid-cols-2 gap-4">
                <Field label="Date de rédaction">
                  <div className="space-y-1">
                    <Input type="date" value={state.testament.dateRedaction} onChange={v => upd('testament', { ...state.testament, dateRedaction: v })} />
                    {state.testament.dateRedaction && (yearsAgo(state.testament.dateRedaction) || 0) > 5 && (
                      <InfoCard color="amber">Votre testament date de plus de 5 ans. Il est conseillé de le réviser régulièrement.</InfoCard>
                    )}
                  </div>
                </Field>
                <Field label="Notaire (optionnel)">
                  <Input value={state.testament.notaire} onChange={v => upd('testament', { ...state.testament, notaire: v })} placeholder="Maître Dupont" />
                </Field>
              </div>}
              {!isRapide && <Field label="Dernière mise à jour (optionnel)">
                <Input type="date" value={state.testament.derniereMAJ} onChange={v => upd('testament', { ...state.testament, derniereMAJ: v })} />
              </Field>}
            </div>
          ) : (
            patrimoineNet > 0 && (
              <InfoCard color="amber">Sans testament, votre succession sera répartie selon les règles légales. Pour un patrimoine de <strong>{fmt(patrimoineNet)} €</strong>, cela peut ne pas correspondre à vos souhaits.</InfoCard>
            )
          )}
        </div>

        {/* Mandat protection future */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 mb-5">
          <Field label="Avez-vous un mandat de protection future ?" tooltip="Permet de désigner à l'avance la personne qui gérera votre patrimoine si vous devenez incapable d'y pourvoir.">
            <Toggle value={state.mandatProtection} onChange={v => upd('mandatProtection', v)} />
          </Field>
          {!state.mandatProtection && (
            <InfoCard color="blue">Le mandat de protection future est recommandé dès 50 ans pour anticiper toute perte d'autonomie.</InfoCard>
          )}
        </div>

        {/* Clause matrimoniale */}
        {isMarieOuPacse && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-5">
            <Field label="Votre régime matrimonial comporte-t-il une clause particulière ?">
              <Toggle value={state.clauseMatrimoniale.aClause} onChange={v => upd('clauseMatrimoniale', { ...state.clauseMatrimoniale, aClause: v })} />
            </Field>
            {state.clauseMatrimoniale.aClause && (
              <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
                <Field label="Type">
                  <Chips options={['Clause de préciput', 'Attribution intégrale', 'Autre']}
                    value={state.clauseMatrimoniale.type} onChange={v => upd('clauseMatrimoniale', { ...state.clauseMatrimoniale, type: v as string })} small />
                </Field>
                <Field label="Description libre">
                  <Input value={state.clauseMatrimoniale.description} onChange={v => upd('clauseMatrimoniale', { ...state.clauseMatrimoniale, description: v })} placeholder="Précisez…" />
                </Field>
              </div>
            )}
          </div>
        )}

        </FadeIn>

        {/* ══ B — OPÉRATIONS RÉALISÉES ════════════════════════════════════ */}
        <FadeIn delay={0.08}>
        <SectionTitle>B — Opérations déjà réalisées</SectionTitle>

        {/* Donations */}
        <div className="mb-5">
          <Field label="Avez-vous déjà réalisé des donations ?">
            <Toggle value={state.aDonations} onChange={v => upd('aDonations', v)} />
          </Field>
          {state.aDonations && (
            isRapide ? (
              <div className="mt-4">
                <Field label="Montant total des donations effectuées">
                  <Input value={state.montantTotalDonations} onChange={v => upd('montantTotalDonations', v)} placeholder="0" suffix="€" />
                </Field>
              </div>
            ) : (
            <div className="mt-4 space-y-3">
              {state.donations.map(d => {
                const benef = state.heritiers.find(h => h.prenom === d.beneficiaire)
                const abatt = benef ? abattementLegal(benef.lien).montant : 100000
                const abattUtilise = Math.min(parseNum(d.montant), abatt)
                const abattRestant = Math.max(0, abatt - parseNum(d.montant))
                return (
                  <CardWrap key={d.id} title={d.beneficiaire || 'Donation'} subtitle={d.montant ? `${fmt(parseNum(d.montant))} €` : undefined}
                    onRemove={() => upd('donations', state.donations.filter(x => x.id !== d.id))}>
                    <Field label="Bénéficiaire">
                      <Select value={d.beneficiaire} onChange={v => upd('donations', state.donations.map(x => x.id === d.id ? { ...x, beneficiaire: v } : x))}>
                        <option value="">Sélectionnez…</option>
                        {state.heritiers.map(h => <option key={h.id}>{h.prenom || h.lien}</option>)}
                        <option value="Autre personne">Autre personne</option>
                      </Select>
                    </Field>
                    {d.beneficiaire === 'Autre personne' && (
                      <Field label="Précisez">
                        <Input value={d.beneficiaireLibre} onChange={v => upd('donations', state.donations.map(x => x.id === d.id ? { ...x, beneficiaireLibre: v } : x))} placeholder="Prénom Nom" />
                      </Field>
                    )}
                    <Field label="Type">
                      <Chips options={['Don manuel', 'Donation-partage', 'Donation avec réserve d\'usufruit', 'Don familial de sommes d\'argent', "Présent d'usage"]}
                        value={d.type} onChange={v => upd('donations', state.donations.map(x => x.id === d.id ? { ...x, type: v as string } : x))} small />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Montant"><Input value={d.montant} onChange={v => upd('donations', state.donations.map(x => x.id === d.id ? { ...x, montant: v } : x))} placeholder="0" suffix="€" /></Field>
                      <Field label="Date">
                        <Input type="date" value={d.date} onChange={v => upd('donations', state.donations.map(x => x.id === d.id ? { ...x, date: v } : x))} />
                      </Field>
                    </div>
                    {d.montant && d.date && (
                      <InfoCard color="blue">
                        <p>Abattement utilisé : <strong>{fmt(abattUtilise)} €</strong> · Abattement restant : <strong>{fmt(abattRestant)} €</strong></p>
                        <p>Reconstitution complète le : <strong>{dateIn15Years(d.date)}</strong></p>
                      </InfoCard>
                    )}
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={d.acteNotarie} onChange={e => upd('donations', state.donations.map(x => x.id === d.id ? { ...x, acteNotarie: e.target.checked } : x))} className="rounded border-gray-300 text-[#185FA5]" />
                        <span className="text-[12px] text-gray-600">Acte notarié</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={d.declare} onChange={e => upd('donations', state.donations.map(x => x.id === d.id ? { ...x, declare: e.target.checked } : x))} className="rounded border-gray-300 text-[#185FA5]" />
                        <span className="text-[12px] text-gray-600">Déclarée aux impôts</span>
                      </label>
                    </div>
                    {!d.declare && parseNum(d.montant) > 0 && (
                      <InfoCard color="amber">Une donation non déclarée peut entraîner des pénalités fiscales. Consultez un notaire pour régulariser la situation.</InfoCard>
                    )}
                  </CardWrap>
                )
              })}
              <AddBtn onClick={() => upd('donations', [...state.donations, defDonation()])} label="Ajouter une donation" />
            </div>
            )
          )}
        </div>

        {/* Démembrements */}
        {!isRapide && <div className="mb-5">
          <Field label="Avez-vous réalisé des démembrements de propriété ?">
            <Toggle value={state.aDemembrements} onChange={v => upd('aDemembrements', v)} />
          </Field>
          {state.aDemembrements && (
            <div className="mt-4 space-y-3">
              {state.demembrements.length === 0 && (
                <InfoCard color="blue">Aucun démembrement détecté depuis le Bloc 2. Ajoutez-en un ci-dessous si nécessaire.</InfoCard>
              )}
              {state.demembrements.map(d => {
                const valeur = parseNum(d.valeurPP)
                const ageUsuf = 65
                const cgi = calcCGI669(ageUsuf)
                return (
                  <CardWrap key={d.id} title={d.bien || 'Démembrement'} onRemove={!d.prefilled ? () => upd('demembrements', state.demembrements.filter(x => x.id !== d.id)) : undefined} prefilled={d.prefilled}>
                    <Field label="Bien concerné">
                      <Select value={d.bien} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, bien: v } : x))}>
                        <option value="">Sélectionnez…</option>
                        {biensBloc2.map(b => <option key={b}>{b}</option>)}
                        <option value="Bien non renseigné">Bien non renseigné</option>
                      </Select>
                    </Field>
                    {d.bien === 'Bien non renseigné' && (
                      <Field label="Précisez"><Input value={d.bienLibre} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, bienLibre: v } : x))} placeholder="Description du bien" /></Field>
                    )}
                    <Field label="Type">
                      <Chips options={['Démembrement classique', 'Démembrement temporaire', 'Quasi-usufruit']}
                        value={d.type} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, type: v as string } : x))} small />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Usufruitier">
                        <Select value={d.usufruitier} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, usufruitier: v } : x))}>
                          <option value="">Sélectionnez…</option>
                          {personnesDeclarees.map(p => <option key={p}>{p}</option>)}
                          <option value="Autre">Autre</option>
                        </Select>
                      </Field>
                      <Field label="Nu-propriétaire">
                        <Select value={d.nuProprio} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, nuProprio: v } : x))}>
                          <option value="">Sélectionnez…</option>
                          {personnesDeclarees.map(p => <option key={p}>{p}</option>)}
                          <option value="Autre">Autre</option>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Valeur pleine propriété">
                      <Input value={d.valeurPP} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, valeurPP: v } : x))} placeholder="0" suffix="€" />
                    </Field>
                    {valeur > 0 && (
                      <InfoCard color="blue">
                        Valeur usufruit : <strong>{cgi.usufruit}% = {fmt(valeur * cgi.usufruit / 100)} €</strong><br />
                        Valeur nue-propriété : <strong>{cgi.np}% = {fmt(valeur * cgi.np / 100)} €</strong><br />
                        <span className="text-[10px]">(Barème fiscal CGI art. 669)</span>
                      </InfoCard>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Date de constitution"><Input type="date" value={d.dateConstitution} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, dateConstitution: v } : x))} /></Field>
                      {d.type === 'Démembrement temporaire' && (
                        <Field label="Durée"><Input type="number" value={d.duree} onChange={v => upd('demembrements', state.demembrements.map(x => x.id === d.id ? { ...x, duree: v } : x))} placeholder="10" suffix="ans" /></Field>
                      )}
                    </div>
                  </CardWrap>
                )
              })}
              <AddBtn onClick={() => upd('demembrements', [...state.demembrements, defDemembrement()])} label="Ajouter un démembrement" />
            </div>
          )}
        </div>}

        {/* Assurances-vie */}
        {state.clausesAV.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[13px] font-semibold text-gray-800">Assurances-vie</p>
              <span className="text-[11px] text-[#085041] bg-[#E1F5EE] px-2 py-0.5 rounded-full font-semibold">{state.clausesAV.length} contrat(s) détecté(s) depuis le Bloc 2</span>
            </div>
            <div className="space-y-3">
              {state.clausesAV.map(av => {
                const valeur = parseNum(av.valeur)
                return (
                  <CardWrap key={av.id} title={av.nom || av.compagnie || 'Assurance-vie'} subtitle={valeur > 0 ? `${fmt(valeur)} €` : undefined} prefilled={av.prefilled}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nom du contrat"><Input value={av.nom} onChange={v => upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, nom: v } : x))} placeholder="Floriane 2" /></Field>
                      <Field label="Valeur de rachat"><Input value={av.valeur} onChange={v => upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, valeur: v } : x))} placeholder="0" suffix="€" /></Field>
                    </div>
                    {!isRapide && <Field label="Type de clause bénéficiaire">
                      <Chips options={['Standard', 'Personnalisée', 'Démembrée']}
                        value={av.typeClause} onChange={v => upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, typeClause: v as string } : x))} />
                    </Field>}
                    {!isRapide && av.typeClause === 'Standard' && (
                      <InfoCard color="amber">Une clause bénéficiaire démembrée peut optimiser la transmission. Exemple : usufruit au conjoint, nue-propriété aux enfants. Ce point sera analysé dans votre bilan succession.</InfoCard>
                    )}
                    {!isRapide && av.typeClause === 'Démembrée' && (
                      <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
                        <Field label="Usufruitier">
                          <Select value={av.usufruitier} onChange={v => upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, usufruitier: v } : x))}>
                            <option value="">Sélectionnez…</option>
                            {personnesDeclarees.map(p => <option key={p}>{p}</option>)}
                            <option value="Autre">Autre</option>
                          </Select>
                        </Field>
                        <div className="space-y-2">
                          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Nu-propriétaires</label>
                          {av.nuProprios.map((np, i) => (
                            <div key={i} className="flex gap-3 items-center">
                              <div className="flex-1"><Input value={np.nom} onChange={v => { const a = [...av.nuProprios]; a[i] = { ...a[i], nom: v }; upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, nuProprios: a } : x)) }} placeholder="Prénom Nom" /></div>
                              <div className="w-20"><Input value={np.pct} onChange={v => { const a = [...av.nuProprios]; a[i] = { ...a[i], pct: v }; upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, nuProprios: a } : x)) }} suffix="%" placeholder="50" /></div>
                              <button type="button" onClick={() => { const a = av.nuProprios.filter((_, j) => j !== i); upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, nuProprios: a } : x)) }} className="text-red-400 hover:text-red-600 text-[11px]">✕</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => { const a = [...av.nuProprios, { nom: '', pct: '' }]; upd('clausesAV', state.clausesAV.map(x => x.id === av.id ? { ...x, nuProprios: a } : x)) }} className="text-[12px] text-[#185FA5] hover:text-[#0C447C] font-medium">+ Ajouter</button>
                        </div>
                      </div>
                    )}
                    {valeur > 0 && (
                      <InfoCard color="green">Transmission hors succession : jusqu'à <strong>152 500 €</strong> par bénéficiaire (primes versées avant 70 ans)</InfoCard>
                    )}
                  </CardWrap>
                )
              })}
            </div>
          </div>
        )}

        {/* Pacte Dutreil */}
        {partsSocialesBloc2.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-5">
            <Field label="Un pacte Dutreil est-il en place ?">
              <Toggle value={state.pacteDutreil.aPacte} onChange={v => upd('pacteDutreil', { ...state.pacteDutreil, aPacte: v })} />
            </Field>
            {state.pacteDutreil.aPacte ? (
              <div className="space-y-4 pl-2 border-l-2 border-[#E6F1FB]">
                <Field label="Société concernée">
                  <Select value={state.pacteDutreil.societe} onChange={v => upd('pacteDutreil', { ...state.pacteDutreil, societe: v })}>
                    <option value="">Sélectionnez…</option>
                    {partsSocialesBloc2.map(p => <option key={p.nomSociete}>{p.nomSociete}</option>)}
                  </Select>
                </Field>
                <Field label="Date de signature"><Input type="date" value={state.pacteDutreil.dateSignature} onChange={v => upd('pacteDutreil', { ...state.pacteDutreil, dateSignature: v })} /></Field>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={state.pacteDutreil.engagementCollectif} onChange={e => upd('pacteDutreil', { ...state.pacteDutreil, engagementCollectif: e.target.checked })} className="rounded border-gray-300 text-[#185FA5]" />
                    <span className="text-[12px] text-gray-600">Engagement collectif en cours</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={state.pacteDutreil.engagementIndividuel} onChange={e => upd('pacteDutreil', { ...state.pacteDutreil, engagementIndividuel: e.target.checked })} className="rounded border-gray-300 text-[#185FA5]" />
                    <span className="text-[12px] text-gray-600">Engagement individuel en cours</span>
                  </label>
                </div>
                {state.pacteDutreil.societe && (() => {
                  const soc = partsSocialesBloc2.find(p => p.nomSociete === state.pacteDutreil.societe)
                  const valSoc = parseNum(soc?.valeur || '0')
                  const baseReduite = valSoc * 0.25
                  const economieDroits = estimerDroits(baseReduite)
                  return (
                    <InfoCard color="green">
                      Exonération applicable : <strong>75%</strong><br />
                      Base taxable réduite : <strong>{fmt(baseReduite)} €</strong><br />
                      Économie estimée sur droits : <strong>{fmt(estimerDroits(valSoc) - economieDroits)} €</strong>
                    </InfoCard>
                  )
                })()}
              </div>
            ) : (
              partsSocialesBloc2[0] && (() => {
                const valSoc = parseNum(partsSocialesBloc2[0].valeur || '0')
                return (
                  <InfoCard color="blue">
                    Le pacte Dutreil permet une exonération de 75% des droits de succession sur les parts professionnelles.
                    Pour votre société estimée à <strong>{fmt(valSoc)} €</strong>, l'économie potentielle serait de <strong>~{fmt(estimerDroits(valSoc * 0.75))} € de droits</strong>.
                    Ce point sera analysé dans votre bilan succession.
                  </InfoCard>
                )
              })()
            )}
          </div>
        )}

        </FadeIn>

        {/* ══ C — SUCCESSION À RECEVOIR ══════════════════════════════════ */}
        <FadeIn delay={0.16}>
        <SectionTitle>C — Succession à recevoir</SectionTitle>
        <div className="mb-6">
          <Field label="Êtes-vous susceptible de recevoir une succession ou donation ?">
            <Toggle value={state.aSuccessionAttendue} onChange={v => upd('aSuccessionAttendue', v)} />
          </Field>
          {state.aSuccessionAttendue && (
            isRapide ? (
              <div className="mt-4">
                <Field label="Estimation globale de la succession à recevoir">
                  <Input value={state.estimationGlobaleSuccession} onChange={v => upd('estimationGlobaleSuccession', v)} placeholder="0" suffix="€" />
                </Field>
              </div>
            ) : (
            <div className="mt-4 space-y-3">
              {state.successionsAttendues.map(s => {
                const montantAffiche = s.montantMode === 'precis' ? parseNum(s.montant) : (parseNum(s.montantMin) + parseNum(s.montantMax)) / 2
                const abattBase = 100000
                const abattRestant = Math.max(0, abattBase - parseNum(s.donationsRecues))
                return (
                  <CardWrap key={s.id} title={s.preciser || s.lienType || 'Succession attendue'}
                    subtitle={montantAffiche > 0 ? `~${fmt(montantAffiche)} €` : undefined}
                    onRemove={() => upd('successionsAttendues', state.successionsAttendues.filter(x => x.id !== s.id))}>
                    <Field label="De qui">
                      <Chips options={['Parent', 'Grand-parent', 'Oncle-Tante', 'Autre']}
                        value={s.lienType} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, lienType: v as string } : x))} small />
                    </Field>
                    <Field label="Préciser">
                      <Select value={s.preciser} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, preciser: v } : x))}>
                        <option value="">Sélectionnez ou laissez vide…</option>
                        {personnesDeclarees.map(p => <option key={p}>{p}</option>)}
                        <option value="Autre personne">Autre personne</option>
                      </Select>
                    </Field>
                    <Field label="Estimation du patrimoine transmissible">
                      <div className="space-y-2">
                        <div className="flex gap-2 mb-2">
                          {['precis', 'fourchette'].map(m => (
                            <button key={m} type="button" onClick={() => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, montantMode: m as 'precis' | 'fourchette' } : x))}
                              className={`px-3 py-1.5 rounded-lg text-[11px] border font-medium ${s.montantMode === m ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                              {m === 'precis' ? 'Montant précis' : 'Fourchette'}
                            </button>
                          ))}
                        </div>
                        {s.montantMode === 'precis' ? (
                          <Input value={s.montant} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, montant: v } : x))} placeholder="0" suffix="€" />
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <Input value={s.montantMin} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, montantMin: v } : x))} placeholder="Min" suffix="€" />
                            <Input value={s.montantMax} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, montantMax: v } : x))} placeholder="Max" suffix="€" />
                          </div>
                        )}
                      </div>
                    </Field>
                    {/* Composition */}
                    <Field label="Composition estimée (total = 100%)">
                      <div className="space-y-2">
                        {[['immo', 'Immobilier'], ['financier', 'Financier'], ['autre', 'Autre']].map(([k, label]) => (
                          <div key={k} className="flex items-center gap-3">
                            <span className="text-[12px] text-gray-500 w-24">{label}</span>
                            <input type="range" min={0} max={100} value={s[k as keyof SuccessionAttendue] as number}
                              onChange={e => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, [k]: Number(e.target.value) } : x))}
                              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
                            <span className="text-[11px] font-semibold text-[#185FA5] w-8 text-right">{s[k as keyof SuccessionAttendue]}%</span>
                          </div>
                        ))}
                      </div>
                    </Field>
                    <Field label="Délai estimé">
                      <Chips options={['Court terme (< 5 ans)', 'Moyen terme (5–15 ans)', 'Long terme (15 ans+)', 'Indéterminé']}
                        value={s.delai} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, delai: v as string } : x))} small />
                    </Field>
                    <Field label="Donations déjà reçues de cette personne">
                      <div className="space-y-1.5">
                        <Input value={s.donationsRecues} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, donationsRecues: v } : x))} placeholder="0" suffix="€" />
                        {s.donationsRecues && <p className="text-[11px] text-gray-400">Abattement restant disponible : <strong className="text-gray-700">{fmt(abattRestant)} €</strong></p>}
                      </div>
                    </Field>
                    <Field label="Êtes-vous bénéficiaire d'une assurance-vie de cette personne ?">
                      <Toggle value={s.aAV} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, aAV: v } : x))} />
                    </Field>
                    {s.aAV && (
                      <div className="space-y-2 pl-2 border-l-2 border-[#E6F1FB]">
                        <Field label="Montant estimé">
                          <Input value={s.montantAV} onChange={v => upd('successionsAttendues', state.successionsAttendues.map(x => x.id === s.id ? { ...x, montantAV: v } : x))} placeholder="0" suffix="€" />
                        </Field>
                        <InfoCard color="blue">Les AV transmises bénéficient d'un abattement de <strong>152 500 €</strong> par bénéficiaire (primes versées avant 70 ans)</InfoCard>
                      </div>
                    )}
                  </CardWrap>
                )
              })}
              <AddBtn onClick={() => upd('successionsAttendues', [...state.successionsAttendues, defSuccession()])} label="Ajouter une succession attendue" />
            </div>
            )
          )}
        </div>

        </FadeIn>

        {/* ══ SYNTHÈSE ════════════════════════════════════════════════════ */}
        {!state.showSynthese && (
          <button type="button" onClick={() => upd('showSynthese', true)}
            className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
            Voir la synthèse →
          </button>
        )}

        {state.showSynthese && (
          <div className="space-y-5 mt-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">Synthèse Bloc 7</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Situation successorale */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                <p className="text-[12px] font-semibold text-gray-800 mb-3">Situation successorale</p>
                {[
                  { label: 'Héritiers identifiés', value: `${state.heritiers.length}` },
                  { label: 'Abattements disponibles', value: `${fmt(totalAbattements)} €` },
                  { label: 'Testament', value: state.testament.aTestament ? 'Oui' : 'Non' },
                  ...(state.testament.aTestament ? [{ label: 'Type', value: state.testament.type || '—' }] : []),
                  { label: 'Mandat protection', value: state.mandatProtection ? 'Oui' : 'Non' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-400">{label}</span>
                    <span className="text-[11px] font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
              </div>

              {/* Opérations réalisées */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                <p className="text-[12px] font-semibold text-gray-800 mb-3">Opérations réalisées</p>
                {[
                  { label: 'Donations effectuées', value: `${state.donations.length}` },
                  { label: 'Total donné', value: `${fmt(totalDonne)} €` },
                  { label: 'Démembrements actifs', value: `${state.demembrements.length}` },
                  { label: 'AV avec clause nommée', value: `${avClausesNommees}` },
                  { label: 'Prochain rappel fiscal', value: prochainRappel },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-400">{label}</span>
                    <span className="text-[11px] font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
              </div>

              {/* Succession à recevoir */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                <p className="text-[12px] font-semibold text-gray-800 mb-3">Succession à recevoir</p>
                {[
                  { label: 'Successions attendues', value: `${state.successionsAttendues.length}` },
                  { label: 'Montant estimé', value: `~${fmt(montantSuccAttendues)} €` },
                  { label: 'Horizon principal', value: state.successionsAttendues[0]?.delai || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-[11px] text-gray-400">{label}</span>
                    <span className="text-[11px] font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimation droits */}
            {patrimoineNet > 0 && (
              <InfoCard color="amber">
                <p className="font-semibold mb-1">Estimation des droits de succession</p>
                <p>Sur la base de votre patrimoine net de <strong>{fmt(patrimoineNet)} €</strong>, les droits de succession estimés avant optimisation s'élèvent à environ <strong>{fmt(droitsEstimes)} €</strong>.</p>
                <p className="text-[10px] mt-1 opacity-70">L'analyse détaillée et les optimisations possibles seront disponibles dans votre Dashboard Succession.</p>
              </InfoCard>
            )}

            {/* CTA final */}
            <button type="button" onClick={() => upd('showModal', true)}
              className="w-full py-5 rounded-2xl bg-[#185FA5] text-white text-[15px] font-bold hover:bg-[#0C447C] transition-colors shadow-[0_4px_20px_rgba(24,95,165,0.35)]">
              Terminer l'onboarding et générer mon analyse IA →
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={() => navigate(getPrevBloc(7))} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">← Retour</button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          <button type="button" onClick={() => upd('showModal', true)}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium">
            Terminer →
          </button>
        </div>
      </div>
    </div>
  )
}