import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { getNextBloc } from '../utils/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditImmo {
  id: string
  bienFinance: string
  bienLibre: string
  etablissement: string
  typePret: string
  taux: string
  typeTaux: string
  montantInitial: string
  crd: string
  crdInconnu: boolean
  dateDebut: string
  dureeInitiale: string
  dureeUnite: 'Mois' | 'Années'
  mensualiteHA: string
  mensualiteAssurance: string
  modulation: boolean
  modulationDesc: string
  garantie: string
  emprunteurs: string
  quotiteP1: string
  quotiteP2: string
}

interface CreditConso {
  id: string
  type: string
  etablissement: string
  objet: string
  montantInitial: string
  crd: string
  taeg: string
  mensualite: string
  dateFin: string
  emprunteur: string
}

interface PretEtudiant {
  id: string
  etablissement: string
  montantInitial: string
  crd: string
  taux: string
  mensualite: string
  differe: boolean
  dateDebutRemboursement: string
  dateFin: string
  emprunteur: string
}

interface DecouvertBancaire {
  id: string
  etablissement: string
  montantAutorise: string
  montantUtilise: string
  tauxAgios: string
  caractere: string
  titulaire: string
}

interface DetteFamiliale {
  id: string
  creancier: string
  creancierLibre: string
  lien: string
  montantDu: string
  remboursementPrevu: boolean
  echeance: string
  mensualite: string
  taux: string
  acteNotarie: boolean
}

interface AutreDette {
  id: string
  description: string
  montantDu: string
  echeance: string
  mensualite: string
  creancier: string
}

interface Bloc3State {
  aDettes: boolean
  typesSelectionnes: string[]
  creditsImmo: CreditImmo[]
  creditsConso: CreditConso[]
  pretsEtudiants: PretEtudiant[]
  decouvertsBancaires: DecouvertBancaire[]
  dettesFamiliales: DetteFamiliale[]
  autresDettes: AutreDette[]
  showSynthese: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defCI = (): CreditImmo => ({
  id: crypto.randomUUID(), bienFinance: '', bienLibre: '', etablissement: '',
  typePret: '', taux: '', typeTaux: '', montantInitial: '', crd: '', crdInconnu: false,
  dateDebut: '', dureeInitiale: '', dureeUnite: 'Années', mensualiteHA: '',
  mensualiteAssurance: '', modulation: false, modulationDesc: '', garantie: '',
  emprunteurs: '', quotiteP1: '50', quotiteP2: '50',
})
const defCC = (): CreditConso => ({
  id: crypto.randomUUID(), type: '', etablissement: '', objet: '', montantInitial: '',
  crd: '', taeg: '', mensualite: '', dateFin: '', emprunteur: '',
})
const defPE = (): PretEtudiant => ({
  id: crypto.randomUUID(), etablissement: '', montantInitial: '', crd: '',
  taux: '', mensualite: '', differe: false, dateDebutRemboursement: '', dateFin: '', emprunteur: '',
})
const defDB = (): DecouvertBancaire => ({
  id: crypto.randomUUID(), etablissement: '', montantAutorise: '',
  montantUtilise: '', tauxAgios: '', caractere: '', titulaire: '',
})
const defDF = (): DetteFamiliale => ({
  id: crypto.randomUUID(), creancier: '', creancierLibre: '', lien: '',
  montantDu: '', remboursementPrevu: false, echeance: '', mensualite: '',
  taux: '0', acteNotarie: false,
})
const defAD = (): AutreDette => ({
  id: crypto.randomUUID(), description: '', montantDu: '', echeance: '',
  mensualite: '', creancier: '',
})
const defaultState = (): Bloc3State => ({
  aDettes: false, typesSelectionnes: [], creditsImmo: [], creditsConso: [],
  pretsEtudiants: [], decouvertsBancaires: [], dettesFamiliales: [],
  autresDettes: [], showSynthese: false,
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
const parseNum = (s: string) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }

function monthsUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24 * 30.44)))
}

function dateFinPret(dateDebut: string, duree: string, unite: 'Mois' | 'Années'): string | null {
  if (!dateDebut || !duree) return null
  const d = new Date(dateDebut)
  const n = parseInt(duree)
  if (isNaN(n)) return null
  if (unite === 'Années') d.setFullYear(d.getFullYear() + n)
  else d.setMonth(d.getMonth() + n)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function anneesRestantes(dateDebut: string, duree: string, unite: 'Mois' | 'Années'): string | null {
  if (!dateDebut || !duree) return null
  const debut = new Date(dateDebut)
  const n = parseInt(duree)
  if (isNaN(n)) return null
  const fin = new Date(debut)
  if (unite === 'Années') fin.setFullYear(fin.getFullYear() + n)
  else fin.setMonth(fin.getMonth() + n)
  const msRestants = fin.getTime() - Date.now()
  if (msRestants <= 0) return 'Terminé'
  const moisRestants = Math.round(msRestants / (1000 * 60 * 60 * 24 * 30.44))
  const ans = Math.floor(moisRestants / 12)
  const mois = moisRestants % 12
  return ans > 0 ? `dans ${ans} an${ans > 1 ? 's' : ''}${mois > 0 ? ` et ${mois} mois` : ''}` : `dans ${mois} mois`
}

// CRD auto-estimé par amortissement
function estimateCRD(montant: string, taux: string, mensualite: string, dateDebut: string, duree: string, unite: 'Mois' | 'Années'): number | null {
  const M = parseNum(montant), r = parseNum(taux) / 100 / 12, m = parseNum(mensualite)
  if (!M || !dateDebut) return null
  const debut = new Date(dateDebut)
  const moisEcoules = Math.round((Date.now() - debut.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (moisEcoules < 0) return null
  if (r === 0) {
    const dureeM = unite === 'Années' ? parseInt(duree) * 12 : parseInt(duree)
    return Math.max(0, M - (m || M / dureeM) * moisEcoules)
  }
  let crd = M
  for (let i = 0; i < moisEcoules && crd > 0; i++) {
    const interets = crd * r
    const amort = (m || 0) - interets
    crd = Math.max(0, crd - amort)
  }
  return Math.round(crd)
}

// ─── Base UI ──────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full whitespace-nowrap">{label}</span>
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
            <div className="absolute bottom-6 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-56 hidden group-hover:block z-20 leading-relaxed shadow-xl">
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
  const isSelected = (o: string) => multi ? (value as string[]).includes(o) : value === o
  const handleClick = (o: string) => {
    if (multi) { const a = value as string[]; onChange(a.includes(o) ? a.filter(x => x !== o) : [...a, o]) }
    else onChange(o)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => handleClick(o)}
          className={`${small ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[12px]'} rounded-lg border transition-all font-medium ${
            isSelected(o) ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}>
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

function InfoCard({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'amber' | 'green' }) {
  const s = { blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20', amber: 'bg-amber-50 text-amber-800 border-amber-200', green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20' }
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

function CardWrap({ title, subtitle, onRemove, children }: { title: string; subtitle?: string; onRemove?: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 cursor-pointer" onClick={() => setOpen(!open)}>
        <div>
          <span className="text-[13px] font-semibold text-gray-800">{title}</span>
          {subtitle && <span className="ml-2 text-[12px] font-medium text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded-full">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-3">
          {onRemove && <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="text-[11px] text-red-400 hover:text-red-600 font-medium">Supprimer</button>}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {open && <div className="px-5 py-4 space-y-4">{children}</div>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc3() {
  const navigate = useNavigate()

  // Lire données Bloc 1 et Bloc 2
  const p1Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const p2Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p2', {})
  const modeData = loadFromStorage<{ v?: string }>('patrisim_bloc1_mode', {})
  const isCouple = modeData.v === 'couple'
  const p1Label = p1Data.prenom?.trim() || 'Personne 1'
  const p2Label = p2Data.prenom?.trim() || 'Personne 2'

  // Biens Bloc 2 pour le select "bien financé"
  const bloc2 = loadFromStorage<{ rp?: { ville?: string; typeBien?: string }; biens?: { ville?: string; typeBien?: string }[]; proprietaireRP?: boolean }>('patrisim_bloc2', {})
  const biensBloc2: string[] = []
  if (bloc2.proprietaireRP && bloc2.rp) {
    biensBloc2.push([bloc2.rp.typeBien, bloc2.rp.ville].filter(Boolean).join(' — ') || 'Résidence principale')
  }
  ;(bloc2.biens || []).forEach((b, i) => {
    biensBloc2.push([b.typeBien, b.ville].filter(Boolean).join(' — ') || `Bien ${i + 1}`)
  })

  // Personnes Bloc 1 pour créanciers
  const foyerBloc1 = loadFromStorage<{ autresCharges?: { prenom?: string; lien?: string }[] }>('patrisim_bloc1_foyer', {})
  const personnesConnues = [p1Label, p2Label, ...(foyerBloc1.autresCharges || []).map(c => c.prenom).filter(Boolean) as string[]]

  const [state, setState] = useState<Bloc3State>(() => loadFromStorage('patrisim_bloc3', defaultState()))
  const [savedAt, setSavedAt] = useState('')
  const upd = useCallback(<K extends keyof Bloc3State>(k: K, v: Bloc3State[K]) => setState(s => ({ ...s, [k]: v })), [])

  useEffect(() => {
    localStorage.setItem('patrisim_bloc3', JSON.stringify(state))
    setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [state])

  // ── Calculs ────────────────────────────────────────────────────────────────
  const totalImmo = state.creditsImmo.reduce((a, c) => a + parseNum(c.crd), 0)
  const totalConso = state.creditsConso.reduce((a, c) => a + parseNum(c.crd), 0)
  const totalEtudiant = state.pretsEtudiants.reduce((a, p) => a + parseNum(p.crd), 0)
  const totalDecouvert = state.decouvertsBancaires.reduce((a, d) => a + parseNum(d.montantUtilise), 0)
  const totalFamilial = state.dettesFamiliales.reduce((a, d) => a + parseNum(d.montantDu), 0)
  const totalAutre = state.autresDettes.reduce((a, d) => a + parseNum(d.montantDu), 0)
  const totalDettes = totalImmo + totalConso + totalEtudiant + totalDecouvert + totalFamilial + totalAutre

  const mensualiteImmo = state.creditsImmo.reduce((a, c) => a + parseNum(c.mensualiteHA) + parseNum(c.mensualiteAssurance), 0)
  const mensualiteAssurance = state.creditsImmo.reduce((a, c) => a + parseNum(c.mensualiteAssurance), 0)
  const mensualiteConso = state.creditsConso.reduce((a, c) => a + parseNum(c.mensualite), 0)
  const mensualiteEtudiant = state.pretsEtudiants.reduce((a, p) => a + parseNum(p.mensualite), 0)
  const mensualiteFamilial = state.dettesFamiliales.filter(d => d.remboursementPrevu).reduce((a, d) => a + parseNum(d.mensualite), 0)
  const mensualiteAutre = state.autresDettes.reduce((a, d) => a + parseNum(d.mensualite), 0)
  const totalMensualites = mensualiteImmo + mensualiteConso + mensualiteEtudiant + mensualiteFamilial + mensualiteAutre

  // Durée résiduelle moyenne crédit immo
  const dureesMois = state.creditsImmo
    .map(c => {
      if (!c.dateDebut || !c.dureeInitiale) return null
      const fin = new Date(c.dateDebut)
      if (c.dureeUnite === 'Années') fin.setFullYear(fin.getFullYear() + parseInt(c.dureeInitiale))
      else fin.setMonth(fin.getMonth() + parseInt(c.dureeInitiale))
      return Math.max(0, Math.round((fin.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25)))
    }).filter(Boolean) as number[]
  const dureeMoyenne = dureesMois.length ? Math.round(dureesMois.reduce((a, b) => a + b, 0) / dureesMois.length) : 0

  const bloc2State = loadFromStorage<{ showSynthese?: boolean }>('patrisim_bloc2', {})
  const patrimoineBrut = (() => {
    const b2 = loadFromStorage<Record<string, unknown>>('patrisim_bloc2', {})
    const parseB2Val = (key: string) => parseNum(String(b2[key] || '0'))
    // Simple sum — we use what's available
    return parseB2Val('totalBrut') || 0
  })()

  const tauxEndettementPatrimoine = patrimoineBrut > 0 ? Math.round(totalDettes / patrimoineBrut * 100) : 0
  const patrimoineNet = patrimoineBrut - totalDettes

  const typesSelectionnes = state.typesSelectionnes

  // ── Handlers ──────────────────────────────────────────────────────────────
  const addCI = () => upd('creditsImmo', [...state.creditsImmo, defCI()])
  const updateCI = (id: string, c: CreditImmo) => upd('creditsImmo', state.creditsImmo.map(x => x.id === id ? c : x))
  const removeCI = (id: string) => upd('creditsImmo', state.creditsImmo.filter(x => x.id !== id))

  const addCC = () => upd('creditsConso', [...state.creditsConso, defCC()])
  const updateCC = (id: string, c: CreditConso) => upd('creditsConso', state.creditsConso.map(x => x.id === id ? c : x))
  const removeCC = (id: string) => upd('creditsConso', state.creditsConso.filter(x => x.id !== id))

  const addPE = () => upd('pretsEtudiants', [...state.pretsEtudiants, defPE()])
  const updatePE = (id: string, p: PretEtudiant) => upd('pretsEtudiants', state.pretsEtudiants.map(x => x.id === id ? p : x))
  const removePE = (id: string) => upd('pretsEtudiants', state.pretsEtudiants.filter(x => x.id !== id))

  const addDB = () => upd('decouvertsBancaires', [...state.decouvertsBancaires, defDB()])
  const updateDB = (id: string, d: DecouvertBancaire) => upd('decouvertsBancaires', state.decouvertsBancaires.map(x => x.id === id ? d : x))
  const removeDB = (id: string) => upd('decouvertsBancaires', state.decouvertsBancaires.filter(x => x.id !== id))

  const addDF = () => upd('dettesFamiliales', [...state.dettesFamiliales, defDF()])
  const updateDF = (id: string, d: DetteFamiliale) => upd('dettesFamiliales', state.dettesFamiliales.map(x => x.id === id ? d : x))
  const removeDF = (id: string) => upd('dettesFamiliales', state.dettesFamiliales.filter(x => x.id !== id))

  const addAD = () => upd('autresDettes', [...state.autresDettes, defAD()])
  const updateAD = (id: string, d: AutreDette) => upd('autresDettes', state.autresDettes.map(x => x.id === id ? d : x))
  const removeAD = (id: string) => upd('autresDettes', state.autresDettes.filter(x => x.id !== id))

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = [
    { name: 'Crédit immo', value: totalImmo, color: '#185FA5' },
    { name: 'Crédit conso', value: totalConso, color: '#0F6E56' },
    { name: 'Prêt étudiant', value: totalEtudiant, color: '#6B7280' },
    { name: 'Autres', value: totalDecouvert + totalFamilial + totalAutre, color: '#D97706' },
  ].filter(d => d.value > 0)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">

        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 3 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#185FA5] rounded-full" initial={{ width: '0%' }} animate={{ width: '42%' }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
            <span className="text-[11px] text-gray-300">42%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Passif & dettes</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-xl">Renseignez l'ensemble de vos crédits et dettes en cours. Répondez uniquement aux sections qui vous concernent.</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-[#E6F1FB] text-[#0C447C] text-[12px] px-3 py-1.5 rounded-lg">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Renseignez uniquement vos dettes actuelles. Vous pourrez modifier ces informations ultérieurement.
          </div>
        </div>

        {/* Question d'entrée */}
        <div className="mb-8">
          <Field label="Avez-vous des crédits ou dettes en cours ?">
            <Toggle value={state.aDettes} onChange={v => upd('aDettes', v)} />
          </Field>
        </div>

        {/* Si non */}
        {!state.aDettes && (
          <div className="mb-8">
            <InfoCard color="green">
              <p className="font-semibold mb-1">Aucune dette déclarée.</p>
              <p>Votre patrimoine net = patrimoine brut.</p>
            </InfoCard>
            <button type="button" onClick={() => navigate(getNextBloc(3))}
              className="mt-4 w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
              Confirmer et passer au Bloc 4 →
            </button>
          </div>
        )}

        {/* Si oui */}
        {state.aDettes && (
          <>
            {/* Sélection des types */}
            <div className="mb-8">
              <Field label="Quels types de dettes avez-vous ?">
                <Chips
                  options={['Crédit immobilier', 'Crédit à la consommation', 'Prêt étudiant', 'Découvert bancaire', 'Dettes familiales', 'Autre']}
                  value={typesSelectionnes} onChange={v => upd('typesSelectionnes', v as string[])} multi
                />
              </Field>
            </div>

            {/* ── CRÉDIT IMMOBILIER ─────────────────────────────────────────── */}
            {typesSelectionnes.includes('Crédit immobilier') && (
              <>
                <SectionDivider label="Crédit immobilier" />
                <div className="space-y-3 mb-6">
                  {state.creditsImmo.map(c => {
                    const totalMens = parseNum(c.mensualiteHA) + parseNum(c.mensualiteAssurance)
                    const finLabel = dateFinPret(c.dateDebut, c.dureeInitiale, c.dureeUnite)
                    const restantLabel = anneesRestantes(c.dateDebut, c.dureeInitiale, c.dureeUnite)
                    const crdEstime = c.crdInconnu ? estimateCRD(c.montantInitial, c.taux, c.mensualiteHA, c.dateDebut, c.dureeInitiale, c.dureeUnite) : null
                    const crdAffiche = c.crd || (crdEstime !== null ? String(Math.round(crdEstime)) : '')
                    const summaryTitle = [c.etablissement, c.bienFinance !== 'Bien non renseigné en Bloc 2' ? c.bienFinance : c.bienLibre].filter(Boolean).join(' · ') || 'Crédit immobilier'
                    const summaryVal = parseNum(crdAffiche) > 0 ? `${fmt(parseNum(crdAffiche))} € restants` : undefined

                    return (
                      <CardWrap key={c.id} title={summaryTitle} subtitle={summaryVal} onRemove={() => removeCI(c.id)}>
                        {/* Bien financé */}
                        <Field label="Bien financé">
                          <Select value={c.bienFinance} onChange={v => updateCI(c.id, { ...c, bienFinance: v })}>
                            <option value="">Sélectionnez…</option>
                            {biensBloc2.map(b => <option key={b}>{b}</option>)}
                            <option value="Bien non renseigné en Bloc 2">Bien non renseigné en Bloc 2</option>
                          </Select>
                        </Field>
                        {c.bienFinance === 'Bien non renseigné en Bloc 2' && (
                          <Field label="Précisez le bien">
                            <Input value={c.bienLibre} onChange={v => updateCI(c.id, { ...c, bienLibre: v })} placeholder="Ex : appartement Paris 75011" />
                          </Field>
                        )}

                        <Field label="Établissement prêteur">
                          <Input value={c.etablissement} onChange={v => updateCI(c.id, { ...c, etablissement: v })} placeholder="BNP Paribas" />
                        </Field>

                        <Field label="Type de prêt">
                          <Chips options={['Prêt amortissable classique', 'PTZ (Prêt à taux zéro)', 'Prêt in fine', 'Prêt relais', 'Prêt employeur (1% logement)']}
                            value={c.typePret} onChange={v => updateCI(c.id, { ...c, typePret: v as string })} small />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Taux">
                            <Input type="number" value={c.taux} onChange={v => updateCI(c.id, { ...c, taux: v })} placeholder="3.50" suffix="%" />
                          </Field>
                          <Field label="Type de taux">
                            <Chips options={['Fixe', 'Variable', 'Mixte']} value={c.typeTaux} onChange={v => updateCI(c.id, { ...c, typeTaux: v as string })} />
                          </Field>
                        </div>

                        <Field label="Montant emprunté initial">
                          <Input value={c.montantInitial} onChange={v => updateCI(c.id, { ...c, montantInitial: v })} placeholder="200 000" suffix="€" />
                        </Field>

                        {/* CRD */}
                        <div className="space-y-2">
                          <Field label="Capital restant dû (CRD)">
                            {!c.crdInconnu && (
                              <Input value={c.crd} onChange={v => updateCI(c.id, { ...c, crd: v })} placeholder="150 000" suffix="€" />
                            )}
                          </Field>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={c.crdInconnu} onChange={e => updateCI(c.id, { ...c, crdInconnu: e.target.checked, crd: '' })}
                              className="rounded border-gray-300 text-[#185FA5] focus:ring-[#185FA5]" />
                            <span className="text-[12px] text-gray-500">Je ne connais pas mon CRD</span>
                          </label>
                          {c.crdInconnu && crdEstime !== null && (
                            <div className="bg-gray-50 rounded-lg px-4 py-2.5">
                              <p className="text-[12px] text-gray-500 italic">Estimation CRD : <strong className="text-gray-700">{fmt(crdEstime)} €</strong> · basée sur vos données</p>
                            </div>
                          )}
                        </div>

                        {/* Mensualités */}
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Mensualité hors assurance">
                            <Input value={c.mensualiteHA} onChange={v => updateCI(c.id, { ...c, mensualiteHA: v })} placeholder="900" suffix="€" />
                          </Field>
                          <Field label="Mensualité assurance emprunteur">
                            <Input value={c.mensualiteAssurance} onChange={v => updateCI(c.id, { ...c, mensualiteAssurance: v })} placeholder="85" suffix="€" />
                          </Field>
                        </div>
                        {totalMens > 0 && (
                          <div className="bg-[#E6F1FB] rounded-lg px-4 py-2.5">
                            <p className="text-[12px] text-[#0C447C] font-medium">Total mensualité : <strong>{fmt(totalMens)} €/mois</strong>{parseNum(c.mensualiteAssurance) > 0 ? ` (dont ${fmt(parseNum(c.mensualiteAssurance))} € assurance)` : ''}</p>
                          </div>
                        )}

                        {/* Durée */}
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Date de début du prêt">
                            <Input type="date" value={c.dateDebut} onChange={v => updateCI(c.id, { ...c, dateDebut: v })} />
                          </Field>
                          <Field label="Durée initiale">
                            <div className="flex gap-2">
                              <Input type="number" value={c.dureeInitiale} onChange={v => updateCI(c.id, { ...c, dureeInitiale: v })} placeholder="20" />
                              <Chips options={['Mois', 'Années']} value={c.dureeUnite} onChange={v => updateCI(c.id, { ...c, dureeUnite: v as 'Mois' | 'Années' })} small />
                            </div>
                          </Field>
                        </div>
                        {finLabel && (
                          <div className="bg-gray-50 rounded-lg px-4 py-2.5">
                            <p className="text-[12px] text-gray-500">Fin prévue : <strong className="text-gray-700">{finLabel}</strong> <span className="text-gray-400">({restantLabel})</span></p>
                          </div>
                        )}

                        <Field label="Modulation ou report effectué ?">
                          <Toggle value={c.modulation} onChange={v => updateCI(c.id, { ...c, modulation: v })} />
                        </Field>
                        {c.modulation && (
                          <Field label="Précisez">
                            <Input value={c.modulationDesc} onChange={v => updateCI(c.id, { ...c, modulationDesc: v })} placeholder="Report de 3 mois en 2023…" />
                          </Field>
                        )}

                        <Field label="Garantie">
                          <Chips options={['Hypothèque', 'Caution (Crédit Logement)', 'PPD (Privilège de prêteur de deniers)', 'Autre']}
                            value={c.garantie} onChange={v => updateCI(c.id, { ...c, garantie: v as string })} small />
                        </Field>

                        <Field label="Emprunteur(s)">
                          <Chips options={isCouple ? [`${p1Label} seul`, `${p2Label} seul`, 'Les deux'] : [`${p1Label} seul`]}
                            value={c.emprunteurs} onChange={v => updateCI(c.id, { ...c, emprunteurs: v as string })} />
                        </Field>
                        {c.emprunteurs === 'Les deux' && (
                          <div className="grid grid-cols-2 gap-4">
                            <Field label={`Quotité ${p1Label} (%)`}>
                              <Input type="number" value={c.quotiteP1} onChange={v => updateCI(c.id, { ...c, quotiteP1: v, quotiteP2: String(100 - parseNum(v)) })} placeholder="50" suffix="%" />
                            </Field>
                            <Field label={`Quotité ${p2Label} (%)`}>
                              <Input type="number" value={c.quotiteP2} onChange={v => updateCI(c.id, { ...c, quotiteP2: v, quotiteP1: String(100 - parseNum(v)) })} placeholder="50" suffix="%" />
                            </Field>
                          </div>
                        )}
                      </CardWrap>
                    )
                  })}
                  <AddBtn onClick={addCI} label="Ajouter un crédit immobilier" />
                </div>
              </>
            )}

            {/* ── CRÉDIT CONSO ──────────────────────────────────────────────── */}
            {typesSelectionnes.includes('Crédit à la consommation') && (
              <>
                <SectionDivider label="Crédit à la consommation" />
                <div className="space-y-3 mb-6">
                  {state.creditsConso.map(c => {
                    const moisRestants = monthsUntil(c.dateFin)
                    return (
                      <CardWrap key={c.id} title={[c.type, c.etablissement].filter(Boolean).join(' · ') || 'Crédit conso'} subtitle={c.crd ? `${fmt(parseNum(c.crd))} €` : undefined} onRemove={() => removeCC(c.id)}>
                        <Field label="Type">
                          <Chips options={['Crédit auto', 'Crédit travaux', 'Crédit personnel', 'Revolving', 'Autre']}
                            value={c.type} onChange={v => updateCC(c.id, { ...c, type: v as string })} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Établissement"><Input value={c.etablissement} onChange={v => updateCC(c.id, { ...c, etablissement: v })} placeholder="Cetelem" /></Field>
                          <Field label="Objet du crédit (optionnel)"><Input value={c.objet} onChange={v => updateCC(c.id, { ...c, objet: v })} placeholder="Voiture, travaux…" /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Montant initial"><Input value={c.montantInitial} onChange={v => updateCC(c.id, { ...c, montantInitial: v })} placeholder="0" suffix="€" /></Field>
                          <Field label="Capital restant dû"><Input value={c.crd} onChange={v => updateCC(c.id, { ...c, crd: v })} placeholder="0" suffix="€" /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <Field label="Taux TAEG"><Input type="number" value={c.taeg} onChange={v => updateCC(c.id, { ...c, taeg: v })} placeholder="5.90" suffix="%" /></Field>
                          <Field label="Mensualité"><Input value={c.mensualite} onChange={v => updateCC(c.id, { ...c, mensualite: v })} placeholder="0" suffix="€" /></Field>
                          <Field label="Date de fin">
                            <div className="space-y-1.5">
                              <Input type="date" value={c.dateFin} onChange={v => updateCC(c.id, { ...c, dateFin: v })} />
                              {moisRestants !== null && <p className="text-[11px] text-gray-400">Il vous reste <strong className="text-gray-600">{moisRestants} mois</strong></p>}
                            </div>
                          </Field>
                        </div>
                        <Field label="Emprunteur">
                          <Chips options={isCouple ? [p1Label, p2Label, 'Les deux'] : [p1Label]} value={c.emprunteur} onChange={v => updateCC(c.id, { ...c, emprunteur: v as string })} />
                        </Field>
                      </CardWrap>
                    )
                  })}
                  <AddBtn onClick={addCC} label="Ajouter un crédit à la consommation" />
                </div>
              </>
            )}

            {/* ── PRÊT ÉTUDIANT ─────────────────────────────────────────────── */}
            {typesSelectionnes.includes('Prêt étudiant') && (
              <>
                <SectionDivider label="Prêt étudiant" />
                <div className="space-y-3 mb-6">
                  {state.pretsEtudiants.map(p => {
                    const moisAvantRembours = monthsUntil(p.dateDebutRemboursement)
                    return (
                      <CardWrap key={p.id} title={p.etablissement || 'Prêt étudiant'} subtitle={p.crd ? `${fmt(parseNum(p.crd))} €` : undefined} onRemove={() => removePE(p.id)}>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Établissement"><Input value={p.etablissement} onChange={v => updatePE(p.id, { ...p, etablissement: v })} placeholder="BPI France" /></Field>
                          <Field label="Montant initial"><Input value={p.montantInitial} onChange={v => updatePE(p.id, { ...p, montantInitial: v })} placeholder="0" suffix="€" /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <Field label="Capital restant dû"><Input value={p.crd} onChange={v => updatePE(p.id, { ...p, crd: v })} placeholder="0" suffix="€" /></Field>
                          <Field label="Taux"><Input type="number" value={p.taux} onChange={v => updatePE(p.id, { ...p, taux: v })} placeholder="1.50" suffix="%" /></Field>
                          <Field label="Mensualité"><Input value={p.mensualite} onChange={v => updatePE(p.id, { ...p, mensualite: v })} placeholder="0" suffix="€" /></Field>
                        </div>
                        <Field label="En période de différé ?"><Toggle value={p.differe} onChange={v => updatePE(p.id, { ...p, differe: v })} /></Field>
                        {p.differe && (
                          <Field label="Date de début de remboursement">
                            <div className="space-y-1.5">
                              <Input type="date" value={p.dateDebutRemboursement} onChange={v => updatePE(p.id, { ...p, dateDebutRemboursement: v })} />
                              {moisAvantRembours !== null && <p className="text-[11px] text-gray-400">Remboursement dans <strong className="text-gray-600">{moisAvantRembours} mois</strong></p>}
                            </div>
                          </Field>
                        )}
                        <Field label="Date de fin"><Input type="date" value={p.dateFin} onChange={v => updatePE(p.id, { ...p, dateFin: v })} /></Field>
                        <Field label="Emprunteur"><Chips options={isCouple ? [p1Label, p2Label] : [p1Label]} value={p.emprunteur} onChange={v => updatePE(p.id, { ...p, emprunteur: v as string })} /></Field>
                      </CardWrap>
                    )
                  })}
                  <AddBtn onClick={addPE} label="Ajouter un prêt étudiant" />
                </div>
              </>
            )}

            {/* ── DÉCOUVERT BANCAIRE ────────────────────────────────────────── */}
            {typesSelectionnes.includes('Découvert bancaire') && (
              <>
                <SectionDivider label="Découvert bancaire" />
                <div className="space-y-3 mb-6">
                  {state.decouvertsBancaires.map(d => {
                    const pctUtil = parseNum(d.montantAutorise) > 0 ? Math.round(parseNum(d.montantUtilise) / parseNum(d.montantAutorise) * 100) : 0
                    return (
                      <CardWrap key={d.id} title={d.etablissement || 'Découvert'} subtitle={d.montantUtilise ? `${fmt(parseNum(d.montantUtilise))} € utilisés` : undefined} onRemove={() => removeDB(d.id)}>
                        <Field label="Établissement"><Input value={d.etablissement} onChange={v => updateDB(d.id, { ...d, etablissement: v })} placeholder="Crédit Agricole" /></Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Découvert autorisé"><Input value={d.montantAutorise} onChange={v => updateDB(d.id, { ...d, montantAutorise: v })} placeholder="500" suffix="€" /></Field>
                          <Field label="Montant utilisé actuellement">
                            <div className="space-y-1.5">
                              <Input value={d.montantUtilise} onChange={v => updateDB(d.id, { ...d, montantUtilise: v })} placeholder="0" suffix="€" />
                              {d.montantAutorise && d.montantUtilise && <p className="text-[11px] text-gray-400">Utilisation : <strong className="text-gray-700">{pctUtil}%</strong></p>}
                            </div>
                          </Field>
                        </div>
                        <Field label="Taux d'agios"><Input type="number" value={d.tauxAgios} onChange={v => updateDB(d.id, { ...d, tauxAgios: v })} placeholder="14.00" suffix="%" /></Field>
                        <Field label="Caractère">
                          <Chips options={['Ponctuel', 'Structurel']} value={d.caractere} onChange={v => updateDB(d.id, { ...d, caractere: v as string })} />
                        </Field>
                        {d.caractere === 'Structurel' && (
                          <InfoCard color="amber">Un découvert structurel peut indiquer un déséquilibre budgétaire. Ce point sera analysé dans votre bilan.</InfoCard>
                        )}
                        <Field label="Titulaire">
                          <Chips options={isCouple ? [p1Label, p2Label, 'Joint'] : [p1Label]} value={d.titulaire} onChange={v => updateDB(d.id, { ...d, titulaire: v as string })} />
                        </Field>
                      </CardWrap>
                    )
                  })}
                  <AddBtn onClick={addDB} label="Ajouter un découvert" />
                </div>
              </>
            )}

            {/* ── DETTES FAMILIALES ─────────────────────────────────────────── */}
            {typesSelectionnes.includes('Dettes familiales') && (
              <>
                <SectionDivider label="Dettes familiales" />
                <div className="space-y-3 mb-6">
                  {state.dettesFamiliales.map(d => (
                    <CardWrap key={d.id} title={d.creancier || 'Dette familiale'} subtitle={d.montantDu ? `${fmt(parseNum(d.montantDu))} €` : undefined} onRemove={() => removeDF(d.id)}>
                      <Field label="Créancier">
                        <Select value={d.creancier} onChange={v => updateDF(d.id, { ...d, creancier: v })}>
                          <option value="">Sélectionnez…</option>
                          {personnesConnues.map(p => <option key={p}>{p}</option>)}
                          <option value="Autre personne">Autre personne</option>
                        </Select>
                      </Field>
                      {d.creancier === 'Autre personne' && (
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Prénom / Nom"><Input value={d.creancierLibre} onChange={v => updateDF(d.id, { ...d, creancierLibre: v })} placeholder="Prénom Nom" /></Field>
                          <Field label="Lien de parenté"><Input value={d.lien} onChange={v => updateDF(d.id, { ...d, lien: v })} placeholder="Oncle, ami…" /></Field>
                        </div>
                      )}
                      <Field label="Montant total dû"><Input value={d.montantDu} onChange={v => updateDF(d.id, { ...d, montantDu: v })} placeholder="0" suffix="€" /></Field>
                      <Field label="Remboursement prévu ?"><Toggle value={d.remboursementPrevu} onChange={v => updateDF(d.id, { ...d, remboursementPrevu: v })} /></Field>
                      {d.remboursementPrevu && (
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Échéance"><Input type="date" value={d.echeance} onChange={v => updateDF(d.id, { ...d, echeance: v })} /></Field>
                          <Field label="Mensualité estimée"><Input value={d.mensualite} onChange={v => updateDF(d.id, { ...d, mensualite: v })} placeholder="0" suffix="€" /></Field>
                        </div>
                      )}
                      <Field label="Taux convenu" tooltip="Laissez à 0% si prêt sans intérêt">
                        <Input type="number" value={d.taux} onChange={v => updateDF(d.id, { ...d, taux: v })} placeholder="0" suffix="%" />
                      </Field>
                      <Field label="Acte notarié ou reconnaissance de dette ?">
                        <Toggle value={d.acteNotarie} onChange={v => updateDF(d.id, { ...d, acteNotarie: v })} />
                      </Field>
                      {!d.acteNotarie && parseNum(d.montantDu) > 0 && (
                        <InfoCard color="amber">Sans document écrit, cette dette peut être difficile à faire valoir juridiquement.</InfoCard>
                      )}
                    </CardWrap>
                  ))}
                  <AddBtn onClick={addDF} label="Ajouter une dette familiale" />
                </div>
              </>
            )}

            {/* ── AUTRE DETTE ───────────────────────────────────────────────── */}
            {typesSelectionnes.includes('Autre') && (
              <>
                <SectionDivider label="Autre dette" />
                <div className="space-y-3 mb-6">
                  {state.autresDettes.map(d => (
                    <CardWrap key={d.id} title={d.description || 'Autre dette'} subtitle={d.montantDu ? `${fmt(parseNum(d.montantDu))} €` : undefined} onRemove={() => removeAD(d.id)}>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Description"><Input value={d.description} onChange={v => updateAD(d.id, { ...d, description: v })} placeholder="Décrivez la dette" /></Field>
                        <Field label="Créancier (optionnel)"><Input value={d.creancier} onChange={v => updateAD(d.id, { ...d, creancier: v })} placeholder="Nom" /></Field>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Montant dû"><Input value={d.montantDu} onChange={v => updateAD(d.id, { ...d, montantDu: v })} placeholder="0" suffix="€" /></Field>
                        <Field label="Mensualité (optionnel)"><Input value={d.mensualite} onChange={v => updateAD(d.id, { ...d, mensualite: v })} placeholder="0" suffix="€" /></Field>
                        <Field label="Échéance (optionnel)"><Input type="date" value={d.echeance} onChange={v => updateAD(d.id, { ...d, echeance: v })} /></Field>
                      </div>
                    </CardWrap>
                  ))}
                  <AddBtn onClick={addAD} label="Ajouter une autre dette" />
                </div>
              </>
            )}

            {/* ══ SYNTHÈSE ══════════════════════════════════════════════════ */}
            {totalDettes > 0 && !state.showSynthese && (
              <button type="button" onClick={() => upd('showSynthese', true)}
                className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
                Voir la synthèse →
              </button>
            )}

            {state.showSynthese && totalDettes > 0 && (
              <div className="space-y-6 mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">Synthèse Bloc 3</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Row 1 — 4 métriques */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Total dettes */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Total dettes</p>
                    <p className="text-[22px] font-bold text-red-600">{fmt(totalDettes)} €</p>
                  </div>
                  {/* Mensualités */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Mensualités totales</p>
                    <p className="text-[22px] font-bold text-gray-800">{fmt(totalMensualites)} €<span className="text-[14px] text-gray-400 font-normal">/mois</span></p>
                    {mensualiteAssurance > 0 && <p className="text-[11px] text-gray-400 mt-1">dont {fmt(mensualiteAssurance)} € assurance</p>}
                  </div>
                  {/* Durée résiduelle */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Durée résiduelle moyenne</p>
                    <p className="text-[22px] font-bold text-gray-800">{dureeMoyenne > 0 ? `${dureeMoyenne} an${dureeMoyenne > 1 ? 's' : ''}` : '—'}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Crédits immobiliers</p>
                  </div>
                  {/* Patrimoine net provisoire */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Patrimoine net provisoire</p>
                    <p className={`text-[22px] font-bold ${patrimoineNet >= 0 ? 'text-[#0F6E56]' : 'text-red-600'}`}>{patrimoineNet >= 0 ? '+' : ''}{fmt(patrimoineNet)} €</p>
                    <p className="text-[11px] text-gray-400 mt-1">Actif Bloc 2 − Passif Bloc 3</p>
                  </div>
                </div>

                {/* Row 2 — Taux endettement */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-semibold text-gray-800">Ratio dette / actif brut</p>
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${
                      tauxEndettementPatrimoine < 33 ? 'bg-[#E1F5EE] text-[#085041]'
                      : tauxEndettementPatrimoine < 50 ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                    }`}>
                      Taux d'endettement : {tauxEndettementPatrimoine}%
                    </span>
                  </div>
                  <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      tauxEndettementPatrimoine < 33 ? 'bg-[#0F6E56]'
                      : tauxEndettementPatrimoine < 50 ? 'bg-amber-500'
                      : 'bg-red-500'
                    }`} style={{ width: `${Math.min(tauxEndettementPatrimoine, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>0%</span><span>100%</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Le taux d'endettement réel sera calculé sur vos revenus une fois le Bloc 4 complété.</p>
                </div>

                {/* Row 3 — Barres par type */}
                {chartData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[13px] font-semibold text-gray-800 mb-4">Détail par type de crédit</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 60 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#6B7280' }} />
                        <Tooltip formatter={(v: number) => [`${fmt(v)} €`, 'Montant']} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {chartData.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-[11px] text-gray-500">{d.name}</span>
                          <span className="text-[11px] font-semibold text-gray-700 ml-auto">{fmt(d.value)} €</span>
                          <span className="text-[10px] text-gray-400">({Math.round(d.value / totalDettes * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => navigate(getNextBloc(3))}
                  className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
                  Confirmer et passer au Bloc 4 — Flux & fiscalité →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Barre sticky */}
      <div className="fixed bottom-[72px] left-[220px] right-0 bg-white border-t border-gray-100 px-8 py-2.5 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Dettes totales</span>
            <span className="text-[15px] font-bold text-red-600">{fmt(totalDettes)} €</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Mensualités</span>
            <span className="text-[15px] font-bold text-gray-700">{fmt(totalMensualites)} €/mois</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={() => navigate('/bloc2')} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">← Retour</button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          <button type="button" onClick={() => navigate(getNextBloc(3))}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}