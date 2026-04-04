import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, AlertTriangle, X, ArrowDown, ArrowUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { getNextBloc } from '../utils/navigation'
import FadeIn from '../components/FadeIn'
import SyntheseButton from '../components/SyntheseButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenusPro {
  salaire: string
  remunNette: string
}

interface DCA {
  actif: string; montantMensuel: string; depuis: string; plateforme: string
}

interface DepenseMensuelle {
  id: string
  label: string
  montant: string
  emoji: string
  principal: boolean  // true = rapide + complet, false = complet uniquement
}

interface FiscalData {
  anneeRevenus: string; rfr: string; revenuImposable: string
  impotNet: string; nbParts: string; prelevementsSociaux: string
  creditsReductions: string; source: 'auto'|'manuel'|''
}

interface Bloc4State {
  // PDF
  pdfStatus: 'idle'|'loading'|'done'|'error'
  pdfFileName: string
  // Revenus
  p1Pro: RevenusPro; p2Pro: RevenusPro
  revenusFonciersB: string; revenusFinanciers: string
  aPlusValues: boolean; pvTypes: string[]; pvMontant: string
  // Dépenses
  depenses: DepenseMensuelle[]
  aPension: boolean; pensionMontant: string
  // Complet uniquement
  dcas: DCA[]
  fiscal: FiscalData
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultPro = (): RevenusPro => ({ salaire: '', remunNette: '' })

const defaultFiscal = (): FiscalData => ({
  anneeRevenus: '2024', rfr: '', revenuImposable: '', impotNet: '',
  nbParts: '', prelevementsSociaux: '', creditsReductions: '', source: '',
})

const DEPENSES_DEFAUT: Omit<DepenseMensuelle, 'montant'>[] = [
  { id: 'loyer',      label: 'Loyer / Charges habitation', emoji: '🏠', principal: true  },
  { id: 'transport',  label: 'Transports',                 emoji: '🚗', principal: true  },
  { id: 'nourriture', label: 'Alimentation',               emoji: '🛒', principal: true  },
  { id: 'invest',     label: 'Investissement / Épargne',   emoji: '📈', principal: true  },
  { id: 'loisirs',    label: 'Loisirs & sorties',          emoji: '🎭', principal: false },
  { id: 'sante',      label: 'Santé & assurances',         emoji: '🏥', principal: false },
  { id: 'abos',       label: 'Abonnements',                emoji: '📱', principal: false },
  { id: 'autres',     label: 'Autres dépenses',            emoji: '💳', principal: false },
]

const defDCA = (): DCA => ({ actif: '', montantMensuel: '', depuis: '', plateforme: '' })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T extends object>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); if (!r) return fb; return { ...fb, ...JSON.parse(r) } } catch { return fb }
}
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const pn = (s: unknown) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }

async function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = () => rej(); r.readAsDataURL(file) })
}

async function extractPDF(base64: string): Promise<Record<string, unknown>> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 800,
      messages: [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: `Extrais ces données de l'avis d'imposition français. Réponds UNIQUEMENT en JSON valide sans texte autour :
{"annee_revenus":number,"revenu_fiscal_reference":number,"revenu_imposable":number,"impot_net":number,"nombre_parts":number,"prelevements_sociaux":number,"credits_reductions_impot":number}
Si introuvable utilise null.` }
      ]}]
    })
  })
  const data = await response.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text || ''
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

function calcTMI(revImp: number, nbParts: number) {
  const qi = nbParts > 0 ? revImp / nbParts : revImp
  const tr = [{ s: 11497, t: 0 }, { s: 29315, t: 11 }, { s: 83823, t: 30 }, { s: 177106, t: 41 }, { s: Infinity, t: 45 }]
  for (let i = 0; i < tr.length; i++) if (qi <= tr[i].s) return { tmi: tr[i].t }
  return { tmi: 45 }
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
        {tooltip && <div className="group relative"><span className="w-4 h-4 rounded-full border border-gray-200 text-gray-400 text-[10px] flex items-center justify-center cursor-help">?</span><div className="absolute bottom-6 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-56 hidden group-hover:block z-20 shadow-xl">{tooltip}</div></div>}
      </div>
      {children}
    </div>
  )
}
function Input({ value, onChange, type = 'text', placeholder = '', suffix, disabled = false }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; suffix?: string; disabled?: boolean }) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className={`w-full h-10 border rounded-lg px-3 text-[13px] placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 border-transparent text-gray-800'}`}
        style={suffix ? { paddingRight: '2.5rem' } : {}} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 pointer-events-none">{suffix}</span>}
    </div>
  )
}
function Chips({ options, value, onChange, multi = false, small = false }: { options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean; small?: boolean }) {
  const isSel = (o: string) => multi ? (value as string[]).includes(o) : value === o
  const click = (o: string) => { if (multi) { const a = value as string[]; onChange(a.includes(o) ? a.filter(x => x !== o) : [...a, o]) } else onChange(o) }
  return <div className="flex flex-wrap gap-2">{options.map(o => <button key={o} type="button" onClick={() => click(o)} className={`${small ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[12px]'} rounded-lg border transition-all font-medium ${isSel(o) ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{o}</button>)}</div>
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex gap-2">{['Non', 'Oui'].map(l => <button key={l} type="button" onClick={() => onChange(l === 'Oui')} className={`px-4 py-2 rounded-lg text-[13px] border transition-all ${(l === 'Oui') === value ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}>{l}</button>)}</div>
}
function InfoCard({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'amber' | 'green' | 'red' }) {
  const s = { blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20', amber: 'bg-amber-50 text-amber-800 border-amber-200', green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20', red: 'bg-red-50 text-red-700 border-red-200' }
  return <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

// ─── Visualisation flux ───────────────────────────────────────────────────────

function FluxVisuel({ revenus, depenses, capacite }: { revenus: number; depenses: number; capacite: number }) {
  const max = Math.max(revenus, depenses, 1)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[13px] font-semibold text-gray-800 mb-4">Vue d'ensemble de vos flux</p>
      <div className="flex gap-6 items-end">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown size={14} className="text-[#0F6E56]" />
            <span className="text-[11px] font-semibold text-[#0F6E56] uppercase tracking-wider">Entrées</span>
          </div>
          <div className="bg-[#E1F5EE] rounded-xl overflow-hidden" style={{ height: Math.max(40, revenus / max * 160) }}>
            <div className="h-full bg-[#0F6E56]/80 flex items-end justify-center pb-2">
              <span className="text-white text-[12px] font-bold">{fmt(revenus)} €</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 text-center">Revenus nets</p>
        </div>
        <div className="flex flex-col items-center gap-1 pb-6">
          <div className="w-px h-8 bg-gray-200" />
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">→</div>
          <div className="w-px h-8 bg-gray-200" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp size={14} className="text-red-500" />
            <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">Sorties</span>
          </div>
          <div className="bg-red-50 rounded-xl overflow-hidden" style={{ height: Math.max(40, depenses / max * 160) }}>
            <div className="h-full bg-red-400/80 flex items-end justify-center pb-2">
              <span className="text-white text-[12px] font-bold">{fmt(depenses)} €</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 text-center">Charges totales</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${capacite > 0 ? 'text-[#185FA5]' : 'text-red-600'}`}>
              {capacite > 0 ? 'Épargne' : 'Déficit'}
            </span>
          </div>
          <div className={`rounded-xl overflow-hidden ${capacite > 0 ? 'bg-[#E6F1FB]' : 'bg-red-50'}`}
            style={{ height: Math.max(40, Math.abs(capacite) / max * 160) }}>
            <div className={`h-full flex items-end justify-center pb-2 ${capacite > 0 ? 'bg-[#185FA5]/80' : 'bg-red-500/80'}`}>
              <span className="text-white text-[12px] font-bold">{capacite >= 0 ? '+' : ''}{fmt(capacite)} €</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 text-center">Capacité d'épargne</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc4() {
  const navigate = useNavigate()

  const bloc0 = loadLS<{ niveauDetail?: 'rapide' | 'complet' }>('patrisim_bloc0', {})
  const niveauDetail = bloc0.niveauDetail || 'complet'
  const isRapide = niveauDetail === 'rapide'

  const bloc1Mode = loadLS<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const isCouple = bloc1Mode === 'couple'
  const p1Data = loadLS<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const p2Data = loadLS<{ prenom?: string }>('patrisim_bloc1_p2', {})
  const p1Label = p1Data.prenom?.trim() || 'Personne 1'
  const p2Label = p2Data.prenom?.trim() || 'Personne 2'
  const pro1Bloc1 = loadLS<{ statut?: string }>('patrisim_bloc1_pro1', {})
  const pro2Bloc1 = loadLS<{ statut?: string }>('patrisim_bloc1_pro2', {})
  const foyerBloc1 = loadLS<{ enfantsCharge?: number }>('patrisim_bloc1_foyer', {})
  const nbEnfants = foyerBloc1.enfantsCharge || 0

  // Pré-remplissage mensualités Bloc3
  const bloc3 = loadLS<{ creditsImmo?: { mensualiteTotale?: string }[]; creditsConso?: { mensualite?: string }[] }>('patrisim_bloc3', {})
  const mensualitesBloc3 = (bloc3.creditsImmo || []).reduce((a, c) => a + pn(c.mensualiteTotale), 0) + (bloc3.creditsConso || []).reduce((a, c) => a + pn(c.mensualite), 0)

  // Pré-remplissage revenus Bloc2
  const bloc2 = loadLS<{ biens?: { loue?: boolean; location?: { loyerMensuel?: string; tauxOccupation?: string } }[] }>('patrisim_bloc2', {})
  const loyersBloc2 = (bloc2.biens || []).filter(b => b.loue).reduce((a, b) => a + pn(b.location?.loyerMensuel || '0') * 12 * (pn(b.location?.tauxOccupation || '100') / 100), 0)

  const nbPartsAuto = isCouple ? (2 + nbEnfants * 0.5).toFixed(1) : (1 + nbEnfants * 0.5).toFixed(1)

  const [state, setState] = useState<Bloc4State>(() =>
    loadLS<Bloc4State>('patrisim_bloc4', {
      pdfStatus: 'idle', pdfFileName: '',
      p1Pro: defaultPro(), p2Pro: defaultPro(),
      revenusFonciersB: loyersBloc2 > 0 ? String(Math.round(loyersBloc2)) : '',
      revenusFinanciers: '',
      aPlusValues: false, pvTypes: [], pvMontant: '',
      depenses: DEPENSES_DEFAUT.map(d => ({
        ...d,
        montant: d.id === 'loyer' && mensualitesBloc3 > 0 ? String(Math.round(mensualitesBloc3)) : '',
      })),
      aPension: false, pensionMontant: '',
      dcas: [],
      fiscal: { ...defaultFiscal(), nbParts: nbPartsAuto },
    })
  )
  const [savedAt, setSavedAt] = useState('')
  const [toast, setToast] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const upd = useCallback(<K extends keyof Bloc4State>(k: K, v: Bloc4State[K]) => setState(s => ({ ...s, [k]: v })), [])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { localStorage.setItem('patrisim_bloc4', JSON.stringify(state)); setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })) }, [state])

  // ── Calculs ────────────────────────────────────────────────────────────────
  const isTNS = (s?: string) => ['TNS (indépendant)', 'Profession libérale', "Chef(fe) d'entreprise"].includes(s || '')
  const revP1 = isTNS(pro1Bloc1.statut) ? pn(state.p1Pro.remunNette) / 12 : pn(state.p1Pro.salaire)
  const revP2 = isCouple ? (isTNS(pro2Bloc1.statut) ? pn(state.p2Pro.remunNette) / 12 : pn(state.p2Pro.salaire)) : 0
  const revenusPatrimo = pn(state.revenusFonciersB) / 12 + pn(state.revenusFinanciers) / 12
  const revenusTotaux = revP1 + revP2 + revenusPatrimo

  const depensesVisibles = isRapide ? state.depenses.filter(d => d.principal) : state.depenses
  const totalDepenses = depensesVisibles.reduce((a, d) => a + pn(d.montant), 0) + (state.aPension ? pn(state.pensionMontant) : 0)
  const capacite = revenusTotaux - totalDepenses

  // Fiscal (complet uniquement)
  const rfr = pn(state.fiscal.rfr)
  const ir = pn(state.fiscal.impotNet)
  const ps = pn(state.fiscal.prelevementsSociaux)
  const nb = pn(state.fiscal.nbParts) || 1
  const revImp = pn(state.fiscal.revenuImposable)
  const tauxMoyen = rfr > 0 ? Math.round(ir / rfr * 1000) / 10 : 0
  const { tmi } = calcTMI(revImp, nb)
  const plafondPer = Math.min((revP1 + revP2) * 12 * 0.10, 35194)
  const economiePer = Math.round(plafondPer * tmi / 100)

  // ── PDF Handler ────────────────────────────────────────────────────────────
  const handlePDF = async (file: File) => {
    if (file.type !== 'application/pdf') return
    upd('pdfStatus', 'loading')
    upd('pdfFileName', file.name)
    try {
      const b64 = await fileToBase64(file)
      const result = await extractPDF(b64)
      upd('fiscal', {
        ...state.fiscal,
        anneeRevenus: result.annee_revenus ? String(result.annee_revenus) : state.fiscal.anneeRevenus,
        rfr: result.revenu_fiscal_reference ? String(result.revenu_fiscal_reference) : state.fiscal.rfr,
        revenuImposable: result.revenu_imposable ? String(result.revenu_imposable) : state.fiscal.revenuImposable,
        impotNet: result.impot_net ? String(result.impot_net) : state.fiscal.impotNet,
        nbParts: result.nombre_parts ? String(result.nombre_parts) : state.fiscal.nbParts,
        prelevementsSociaux: result.prelevements_sociaux ? String(result.prelevements_sociaux) : state.fiscal.prelevementsSociaux,
        creditsReductions: result.credits_reductions_impot ? String(result.credits_reductions_impot) : state.fiscal.creditsReductions,
        source: 'auto',
      })
      upd('pdfStatus', 'done')
    } catch {
      upd('pdfStatus', 'error')
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const handleSuivant = () => {
    const e: string[] = []
    if (!state.p1Pro.salaire && !state.p1Pro.remunNette) e.push(`Renseignez le revenu de ${p1Label}`)
    if (isCouple && !state.p2Pro.salaire && !state.p2Pro.remunNette) e.push(`Renseignez le revenu de ${p2Label}`)
    if (e.length) { setErrors(e); return }
    setToast(true)
    setTimeout(() => navigate(getNextBloc(4)), 1200)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {toast && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium"><CheckCircle size={16} className="text-green-400" />Étape 4 enregistrée ✓</div>}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">

        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 4 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden"><motion.div className="h-full bg-[#185FA5] rounded-full" initial={{ width: '0%' }} animate={{ width: '57%' }} transition={{ duration: 0.6, ease: 'easeOut' }} /></div>
            <span className="text-[11px] text-gray-300">57%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Brouillon · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Flux & fiscalité</h1>
          <p className="text-[14px] text-gray-400 mt-1">Revenus, dépenses et situation fiscale.</p>
        </div>

        {/* ══ A — REVENUS ══════════════════════════════════════════════════ */}
        <FadeIn delay={0}>
        <SectionTitle>A — Revenus</SectionTitle>

        {/* Salaires */}
        {isCouple ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { pro: state.p1Pro, setPro: (p: RevenusPro) => upd('p1Pro', p), label: p1Label, isP2: false, statut: pro1Bloc1.statut },
              { pro: state.p2Pro, setPro: (p: RevenusPro) => upd('p2Pro', p), label: p2Label, isP2: true, statut: pro2Bloc1.statut },
            ].map(({ pro, setPro, label, isP2, statut }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${isP2 ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isP2 ? 'bg-[#0F6E56]' : 'bg-[#185FA5]'}`} />{label}
                </div>
                {isTNS(statut) ? (
                  <Field label="Rémunération nette annuelle"><Input value={pro.remunNette} onChange={v => setPro({ ...pro, remunNette: v })} placeholder="60 000" suffix="€/an" /></Field>
                ) : (
                  <Field label="Salaire net mensuel" tooltip="Après prélèvement à la source">
                    <Input value={pro.salaire} onChange={v => setPro({ ...pro, salaire: v })} placeholder="2 500" suffix="€/mois" />
                  </Field>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E6F1FB] text-[#0C447C]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#185FA5]" />{p1Label}
            </div>
            {isTNS(pro1Bloc1.statut) ? (
              <Field label="Rémunération nette annuelle"><Input value={state.p1Pro.remunNette} onChange={v => upd('p1Pro', { ...state.p1Pro, remunNette: v })} placeholder="60 000" suffix="€/an" /></Field>
            ) : (
              <Field label="Salaire net mensuel après prélèvement à la source">
                <Input value={state.p1Pro.salaire} onChange={v => upd('p1Pro', { ...state.p1Pro, salaire: v })} placeholder="2 500" suffix="€/mois" />
              </Field>
            )}
          </div>
        )}

        {/* Revenus patrimoniaux */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
          <InfoCard color="blue">Ces données sont pré-remplies depuis le Bloc 2. Vérifiez et ajustez si nécessaire.</InfoCard>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Revenus fonciers bruts annuels"><Input value={state.revenusFonciersB} onChange={v => upd('revenusFonciersB', v)} placeholder="0" suffix="€/an" /></Field>
            <Field label="Revenus financiers annuels"><Input value={state.revenusFinanciers} onChange={v => upd('revenusFinanciers', v)} placeholder="0" suffix="€/an" /></Field>
          </div>
          <Field label="Plus-values cette année ?"><Toggle value={state.aPlusValues} onChange={v => upd('aPlusValues', v)} /></Field>
          {state.aPlusValues && (
            <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
              <Chips options={['Immobilière', 'Mobilière', 'Crypto', 'Cession de parts']} value={state.pvTypes} onChange={v => upd('pvTypes', v as string[])} multi small />
              <Field label="Montant total"><Input value={state.pvMontant} onChange={v => upd('pvMontant', v)} placeholder="0" suffix="€" /></Field>
            </div>
          )}
        </div>
        </FadeIn>

        {/* ══ B — DÉPENSES ═════════════════════════════════════════════════ */}
        <FadeIn delay={0.08}>
        <SectionTitle>B — Dépenses mensuelles</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 mb-6">
          {mensualitesBloc3 > 0 && (
            <InfoCard color="blue">Les mensualités de crédits sont pré-remplies depuis le Bloc 3.</InfoCard>
          )}

          {/* Dépenses principales (rapide + complet) */}
          <div className="space-y-2">
            {state.depenses.filter(d => d.principal).map((d, _i) => {
              const idx = state.depenses.findIndex(x => x.id === d.id)
              return (
                <div key={d.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <span className="text-[18px] flex-shrink-0">{d.emoji}</span>
                  <span className="text-[12px] font-medium text-gray-700 w-44 flex-shrink-0">{d.label}</span>
                  <div className="w-36">
                    <Input value={d.montant} onChange={v => upd('depenses', state.depenses.map((x, j) => j === idx ? { ...x, montant: v } : x))} placeholder="0" suffix="€/mois" />
                  </div>
                  {revenusTotaux > 0 && (
                    <>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#185FA5] rounded-full transition-all" style={{ width: `${Math.min(100, pn(d.montant) / revenusTotaux * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400 w-8 text-right">{Math.round(pn(d.montant) / revenusTotaux * 100)}%</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Dépenses secondaires (complet uniquement) */}
          {!isRapide && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {state.depenses.filter(d => !d.principal).map((d) => {
                const idx = state.depenses.findIndex(x => x.id === d.id)
                return (
                  <div key={d.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <span className="text-[18px] flex-shrink-0">{d.emoji}</span>
                    <span className="text-[12px] font-medium text-gray-700 w-44 flex-shrink-0">{d.label}</span>
                    <div className="w-36">
                      <Input value={d.montant} onChange={v => upd('depenses', state.depenses.map((x, j) => j === idx ? { ...x, montant: v } : x))} placeholder="0" suffix="€/mois" />
                    </div>
                    {revenusTotaux > 0 && (
                      <>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#185FA5] rounded-full transition-all" style={{ width: `${Math.min(100, pn(d.montant) / revenusTotaux * 100)}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-400 w-8 text-right">{Math.round(pn(d.montant) / revenusTotaux * 100)}%</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pension alimentaire */}
          <div className="pt-2 border-t border-gray-100">
            <Field label="Pension alimentaire versée ?">
              <Toggle value={state.aPension} onChange={v => upd('aPension', v)} />
            </Field>
            {state.aPension && <div className="mt-3"><Field label="Montant mensuel"><Input value={state.pensionMontant} onChange={v => upd('pensionMontant', v)} placeholder="0" suffix="€/mois" /></Field></div>}
          </div>
        </div>
        </FadeIn>

        {/* ══ VUE D'ENSEMBLE FLUX ════════════════════════════════════════════ */}
        {revenusTotaux > 0 && (
          <FadeIn delay={0.12}>
          <div className="mb-8">
            <SectionTitle>Vue d'ensemble des flux</SectionTitle>
            <FluxVisuel revenus={revenusTotaux} depenses={totalDepenses} capacite={capacite} />
          </div>
          </FadeIn>
        )}

        {/* ══ DCA (complet uniquement) ════════════════════════════════════ */}
        {!isRapide && (
          <FadeIn delay={0.16}>
          <SectionTitle>DCA en place</SectionTitle>
          <div className="mb-6 space-y-3">
            <InfoCard color="blue">
              Un DCA (Dollar-Cost Averaging) est un investissement automatique et régulier, quelle que soit l'évolution des marchés.
            </InfoCard>
            {state.dcas.map((dca, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-semibold text-gray-800">DCA {i + 1}</p>
                  <button type="button" onClick={() => upd('dcas', state.dcas.filter((_, j) => j !== i))} className="text-[11px] text-red-400 hover:text-red-600">Supprimer</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Actif ciblé"><Input value={dca.actif} onChange={v => upd('dcas', state.dcas.map((x, j) => j === i ? { ...x, actif: v } : x))} placeholder="ETF MSCI World, Bitcoin…" /></Field>
                  <Field label="Montant mensuel"><Input value={dca.montantMensuel} onChange={v => upd('dcas', state.dcas.map((x, j) => j === i ? { ...x, montantMensuel: v } : x))} placeholder="100" suffix="€/mois" /></Field>
                  <Field label="Depuis (date)"><Input type="date" value={dca.depuis} onChange={v => upd('dcas', state.dcas.map((x, j) => j === i ? { ...x, depuis: v } : x))} /></Field>
                  <Field label="Plateforme"><Input value={dca.plateforme} onChange={v => upd('dcas', state.dcas.map((x, j) => j === i ? { ...x, plateforme: v } : x))} placeholder="Trade Republic, Boursorama…" /></Field>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => upd('dcas', [...state.dcas, defDCA()])}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-[13px] text-gray-400 hover:border-[#185FA5] hover:text-[#185FA5] transition-colors font-medium">
              + Ajouter un DCA
            </button>
          </div>
          </FadeIn>
        )}

        {/* ══ C — FISCALITÉ (complet uniquement) ══════════════════════════ */}
        {!isRapide && (
          <FadeIn delay={0.24}>
          <SectionTitle>C — Données fiscales</SectionTitle>

          {/* Import PDF avis d'imposition */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 space-y-4">
            <div>
              <p className="text-[14px] font-semibold text-gray-800 mb-1">Importez votre avis d'imposition (PDF)</p>
              <p className="text-[12px] text-gray-400">L'IA extraira automatiquement vos données fiscales.</p>
            </div>

            {state.pdfStatus === 'idle' && (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePDF(f) }}
                className="border-2 border-dashed border-[#185FA5]/40 bg-[#E6F1FB]/40 hover:bg-[#E6F1FB] hover:border-[#185FA5] rounded-2xl p-8 text-center cursor-pointer transition-all"
              >
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePDF(f) }} />
                <Upload className="w-7 h-7 text-[#185FA5] mx-auto mb-2" />
                <p className="text-[13px] font-semibold text-[#0C447C]">Glissez votre PDF ici ou cliquez</p>
              </div>
            )}

            {state.pdfStatus === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-7 h-7 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
                <p className="text-[13px] text-[#0C447C] font-medium">Analyse IA en cours…</p>
              </div>
            )}

            {state.pdfStatus === 'done' && (
              <div className="flex items-center gap-3 bg-[#E1F5EE] border border-[#0F6E56]/20 rounded-xl px-5 py-4">
                <CheckCircle className="w-6 h-6 text-[#0F6E56]" />
                <div>
                  <p className="text-[13px] font-semibold text-[#085041]">Données extraites automatiquement ✓</p>
                  <p className="text-[11px] text-[#0F6E56]">{state.pdfFileName} — vérifiez les champs ci-dessous</p>
                </div>
                <button type="button" onClick={() => upd('pdfStatus', 'idle')} className="ml-auto text-[11px] text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            )}

            {state.pdfStatus === 'error' && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-[13px] text-red-700 font-medium">Extraction impossible — saisissez manuellement ci-dessous</p>
              </div>
            )}
          </div>

          {/* Champs fiscaux */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
            {state.pdfStatus === 'done' && (
              <InfoCard color="green">Données pré-remplies depuis votre avis d'imposition — vérifiez et corrigez si nécessaire.</InfoCard>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Année des revenus">
                <select value={state.fiscal.anneeRevenus} onChange={e => upd('fiscal', { ...state.fiscal, anneeRevenus: e.target.value })}
                  className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] focus:outline-none focus:border-[#185FA5] cursor-pointer">
                  <option>2022</option><option>2023</option><option>2024</option><option>2025</option>
                </select>
              </Field>
              <Field label="Nombre de parts" tooltip={`Calculé automatiquement : ${nbPartsAuto}. Vérifiez sur votre avis.`}>
                <Input value={state.fiscal.nbParts} onChange={v => upd('fiscal', { ...state.fiscal, nbParts: v })} placeholder={nbPartsAuto} />
              </Field>
              <Field label="Revenu fiscal de référence" tooltip="Case 1BK de votre avis d'imposition">
                <Input value={state.fiscal.rfr} onChange={v => upd('fiscal', { ...state.fiscal, rfr: v })} placeholder="45 000" suffix="€" />
              </Field>
              <Field label="Revenu imposable">
                <Input value={state.fiscal.revenuImposable} onChange={v => upd('fiscal', { ...state.fiscal, revenuImposable: v })} placeholder="40 000" suffix="€" />
              </Field>
              <Field label="Impôt sur le revenu net">
                <Input value={state.fiscal.impotNet} onChange={v => upd('fiscal', { ...state.fiscal, impotNet: v })} placeholder="0" suffix="€" />
              </Field>
              <Field label="Prélèvements sociaux">
                <Input value={state.fiscal.prelevementsSociaux} onChange={v => upd('fiscal', { ...state.fiscal, prelevementsSociaux: v })} placeholder="0" suffix="€" />
              </Field>
            </div>

            {/* Calculs automatiques */}
            {rfr > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Taux moyen</p>
                  <p className="text-[18px] font-bold text-[#185FA5]">{tauxMoyen}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">TMI estimé</p>
                  <p className="text-[18px] font-bold text-gray-800">{tmi}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Pression fiscale</p>
                  <p className="text-[16px] font-bold text-gray-800">{fmt(ir + ps)} €/an</p>
                </div>
              </div>
            )}
            {plafondPer > 0 && tmi >= 30 && (
              <InfoCard color="amber">💡 Plafond PER disponible : <strong>{fmt(plafondPer)} €</strong> — économie estimée : <strong>{fmt(economiePer)} €/an</strong> (TMI {tmi}%)</InfoCard>
            )}
          </div>
          </FadeIn>
        )}

      </div>

      {/* Footer sticky */}
      <SyntheseButton
        onSuivant={handleSuivant}
        onRetour={() => navigate('/bloc3')}
        labelSuivant="Suivant — Projets & retraite →"
        savedAt={savedAt}
        errors={errors}
        items={[
          { label: 'Revenus nets', value: `${fmt(revenusTotaux)} €/mois`, color: 'text-[#185FA5]' },
          { label: 'Charges totales', value: `${fmt(totalDepenses)} €/mois` },
          { label: "Capacité d'épargne", value: `${capacite >= 0 ? '+' : ''}${fmt(capacite)} €/mois`, color: capacite > 500 ? 'text-[#0F6E56]' : capacite >= 0 ? 'text-amber-600' : 'text-red-600' },
          { label: "Taux d'épargne", value: revenusTotaux > 0 ? `${Math.round(Math.max(0, capacite) / revenusTotaux * 100)}%` : '—', color: 'text-gray-600' },
          ...(!isRapide && rfr > 0 ? [{ label: 'TMI', value: `${tmi}%` }, { label: 'Taux moyen', value: `${tauxMoyen}%` }] : []),
          ...(!isRapide && state.dcas.length > 0 ? [{ label: 'Investissement mensuel', value: `${fmt(state.dcas.reduce((a, d) => a + pn(d.montantMensuel), 0))} €/mois`, color: 'text-[#0F6E56]' }] : []),
        ]}
      />
    </div>
  )
}
