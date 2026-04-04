import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import FadeIn from '../components/FadeIn'
import { getNextBloc, getPrevBloc, isLastBloc } from '../utils/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditImmo {
  id: string
  taux: string
  crd: string
  mensualiteTotale: string        // mensualité totale avec assurance
  dureeRestante: string           // durée restante directe
  dureeRestanteUnite: 'Mois' | 'Années'
}

interface CreditConso {
  id: string
  crd: string
  mensualite: string
}

interface PretEtudiant {
  id: string
  crd: string
  mensualite: string
}

interface DecouvertBancaire {
  id: string
  montantUtilise: string
}

interface DetteFamiliale {
  id: string
  montantDu: string
  mensualite: string
}

interface AutreDette {
  id: string
  montantDu: string
  mensualite: string
}

interface Bloc3State {
  aDettes: boolean
  typesSelectionnes: string[]
  // Rapide mode — saisie directe
  montantTotalDettesSaisi: string
  mensualitesTotalesSaisies: string
  // Complet mode — détail
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
  id: crypto.randomUUID(), taux: '', crd: '', mensualiteTotale: '',
  dureeRestante: '', dureeRestanteUnite: 'Années',
})
const defCC = (): CreditConso => ({ id: crypto.randomUUID(), crd: '', mensualite: '' })
const defPE = (): PretEtudiant => ({ id: crypto.randomUUID(), crd: '', mensualite: '' })
const defDB = (): DecouvertBancaire => ({ id: crypto.randomUUID(), montantUtilise: '' })
const defDF = (): DetteFamiliale => ({ id: crypto.randomUUID(), montantDu: '', mensualite: '' })
const defAD = (): AutreDette => ({ id: crypto.randomUUID(), montantDu: '', mensualite: '' })

const defaultState = (): Bloc3State => ({
  aDettes: false, typesSelectionnes: [],
  montantTotalDettesSaisi: '', mensualitesTotalesSaisies: '',
  creditsImmo: [], creditsConso: [], pretsEtudiants: [],
  decouvertsBancaires: [], dettesFamiliales: [], autresDettes: [],
  showSynthese: false,
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

function Chips({ options, value, onChange, small = false }: { options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean; small?: boolean }) {
  const multi = Array.isArray(value)
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

  const bloc0 = loadFromStorage<{ niveauDetail?: 'rapide' | 'complet' }>('patrisim_bloc0', {})
  const niveauDetail = bloc0.niveauDetail || 'complet'
  const isRapide = niveauDetail === 'rapide'

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
  const totalDettesComplet = totalImmo + totalConso + totalEtudiant + totalDecouvert + totalFamilial + totalAutre

  const mensualiteImmo = state.creditsImmo.reduce((a, c) => a + parseNum(c.mensualiteTotale), 0)
  const mensualiteConso = state.creditsConso.reduce((a, c) => a + parseNum(c.mensualite), 0)
  const mensualiteEtudiant = state.pretsEtudiants.reduce((a, p) => a + parseNum(p.mensualite), 0)
  const mensualiteFamilial = state.dettesFamiliales.reduce((a, d) => a + parseNum(d.mensualite), 0)
  const mensualiteAutre = state.autresDettes.reduce((a, d) => a + parseNum(d.mensualite), 0)
  const totalMensualitesComplet = mensualiteImmo + mensualiteConso + mensualiteEtudiant + mensualiteFamilial + mensualiteAutre

  const totalDettes = isRapide ? parseNum(state.montantTotalDettesSaisi) : totalDettesComplet
  const totalMensualites = isRapide ? parseNum(state.mensualitesTotalesSaisies) : totalMensualitesComplet

  // Durée résiduelle moyenne (complet uniquement)
  const dureesAns = state.creditsImmo
    .map(c => {
      const n = parseInt(c.dureeRestante)
      if (isNaN(n)) return null
      return c.dureeRestanteUnite === 'Années' ? n : Math.round(n / 12)
    }).filter(Boolean) as number[]
  const dureeMoyenne = dureesAns.length ? Math.round(dureesAns.reduce((a, b) => a + b, 0) / dureesAns.length) : 0

  const bloc2State = loadFromStorage<Record<string, unknown>>('patrisim_bloc2', {})
  const patrimoineBrut = parseNum(String(bloc2State['totalBrut'] || '0'))
  const tauxEndettementPatrimoine = patrimoineBrut > 0 ? Math.round(totalDettes / patrimoineBrut * 100) : 0
  const patrimoineNet = patrimoineBrut - totalDettes

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
        <FadeIn delay={0}>
        <div className="mb-8">
          <Field label="Avez-vous des dettes ?">
            <Toggle value={state.aDettes} onChange={v => upd('aDettes', v)} />
          </Field>
        </div>
        </FadeIn>

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

        {/* Si oui — MODE RAPIDE */}
        {state.aDettes && isRapide && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Montant total des dettes">
                <Input value={state.montantTotalDettesSaisi} onChange={v => upd('montantTotalDettesSaisi', v)} placeholder="0" suffix="€" />
              </Field>
              <Field label="Mensualités totales">
                <Input value={state.mensualitesTotalesSaisies} onChange={v => upd('mensualitesTotalesSaisies', v)} placeholder="0" suffix="€/mois" />
              </Field>
            </div>
            {(totalDettes > 0 || totalMensualites > 0) && (
              <button type="button" onClick={() => navigate(getNextBloc(3))}
                className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
                Confirmer et passer au Bloc 4 →
              </button>
            )}
          </div>
        )}

        {/* Si oui — MODE COMPLET */}
        {state.aDettes && !isRapide && (
          <>
            {/* Sélection des types */}
            <div className="mb-8">
              <Field label="Quels types de dettes avez-vous ?">
                <Chips
                  options={['Crédit immobilier', 'Crédit conso / étudiant', 'Découvert bancaire', 'Dettes familiales / autres']}
                  value={state.typesSelectionnes} onChange={v => upd('typesSelectionnes', v as string[])}
                />
              </Field>
            </div>

            {/* ── CRÉDIT IMMOBILIER ─────────────────────────────────────────── */}
            {state.typesSelectionnes.includes('Crédit immobilier') && (
              <>
                <SectionDivider label="Crédit immobilier" />
                <div className="space-y-3 mb-6">
                  <AnimatePresence>
                  {state.creditsImmo.map((c, idx) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                    <CardWrap
                      title={`Crédit immobilier ${state.creditsImmo.length > 1 ? idx + 1 : ''}`}
                      subtitle={parseNum(c.crd) > 0 ? `${fmt(parseNum(c.crd))} € restants` : undefined}
                      onRemove={() => removeCI(c.id)}
                    >
                      <Field label="Capital restant dû (CRD)">
                        <Input value={c.crd} onChange={v => updateCI(c.id, { ...c, crd: v })} placeholder="150 000" suffix="€" />
                      </Field>

                      <Field label="Mensualité totale (avec assurance)">
                        <Input value={c.mensualiteTotale} onChange={v => updateCI(c.id, { ...c, mensualiteTotale: v })} placeholder="985" suffix="€" />
                      </Field>

                      <Field label="Taux">
                        <Input type="number" value={c.taux} onChange={v => updateCI(c.id, { ...c, taux: v })} placeholder="3.50" suffix="%" />
                      </Field>

                      <Field label="Durée restante">
                        <div className="flex gap-2">
                          <Input type="number" value={c.dureeRestante} onChange={v => updateCI(c.id, { ...c, dureeRestante: v })} placeholder="15" />
                          <Chips options={['Mois', 'Années']} value={c.dureeRestanteUnite} onChange={v => updateCI(c.id, { ...c, dureeRestanteUnite: v as 'Mois' | 'Années' })} small />
                        </div>
                      </Field>
                    </CardWrap>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                  <AddBtn onClick={addCI} label="Ajouter un crédit immobilier" />
                </div>
              </>
            )}

            {/* ── CRÉDIT CONSO / ÉTUDIANT ───────────────────────────────────── */}
            {state.typesSelectionnes.includes('Crédit conso / étudiant') && (
              <>
                <SectionDivider label="Crédit conso / étudiant" />
                <div className="space-y-3 mb-6">
                  <AnimatePresence>
                  {state.creditsConso.map((c, idx) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                    <CardWrap
                      title={`Crédit conso ${state.creditsConso.length > 1 ? idx + 1 : ''}`}
                      subtitle={parseNum(c.crd) > 0 ? `${fmt(parseNum(c.crd))} €` : undefined}
                      onRemove={() => removeCC(c.id)}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Capital restant dû">
                          <Input value={c.crd} onChange={v => updateCC(c.id, { ...c, crd: v })} placeholder="0" suffix="€" />
                        </Field>
                        <Field label="Mensualité">
                          <Input value={c.mensualite} onChange={v => updateCC(c.id, { ...c, mensualite: v })} placeholder="0" suffix="€" />
                        </Field>
                      </div>
                    </CardWrap>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                  <AddBtn onClick={addCC} label="Ajouter un crédit conso" />

                  <AnimatePresence>
                  {state.pretsEtudiants.map((p, idx) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                    <CardWrap
                      title={`Prêt étudiant ${state.pretsEtudiants.length > 1 ? idx + 1 : ''}`}
                      subtitle={parseNum(p.crd) > 0 ? `${fmt(parseNum(p.crd))} €` : undefined}
                      onRemove={() => removePE(p.id)}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Capital restant dû">
                          <Input value={p.crd} onChange={v => updatePE(p.id, { ...p, crd: v })} placeholder="0" suffix="€" />
                        </Field>
                        <Field label="Mensualité">
                          <Input value={p.mensualite} onChange={v => updatePE(p.id, { ...p, mensualite: v })} placeholder="0" suffix="€" />
                        </Field>
                      </div>
                    </CardWrap>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                  <AddBtn onClick={addPE} label="Ajouter un prêt étudiant" />
                </div>
              </>
            )}

            {/* ── DÉCOUVERT BANCAIRE ────────────────────────────────────────── */}
            {state.typesSelectionnes.includes('Découvert bancaire') && (
              <>
                <SectionDivider label="Découvert bancaire" />
                <div className="space-y-3 mb-6">
                  <AnimatePresence>
                  {state.decouvertsBancaires.map((d, idx) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                    <CardWrap
                      title={`Découvert ${state.decouvertsBancaires.length > 1 ? idx + 1 : ''}`}
                      subtitle={d.montantUtilise ? `${fmt(parseNum(d.montantUtilise))} € utilisés` : undefined}
                      onRemove={() => removeDB(d.id)}
                    >
                      <Field label="Montant utilisé actuellement">
                        <Input value={d.montantUtilise} onChange={v => updateDB(d.id, { ...d, montantUtilise: v })} placeholder="0" suffix="€" />
                      </Field>
                    </CardWrap>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                  <AddBtn onClick={addDB} label="Ajouter un découvert" />
                </div>
              </>
            )}

            {/* ── DETTES FAMILIALES / AUTRES ────────────────────────────────── */}
            {state.typesSelectionnes.includes('Dettes familiales / autres') && (
              <>
                <SectionDivider label="Dettes familiales / autres" />
                <div className="space-y-3 mb-6">
                  <AnimatePresence>
                  {state.dettesFamiliales.map((d, idx) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                    <CardWrap
                      title={`Dette familiale ${state.dettesFamiliales.length > 1 ? idx + 1 : ''}`}
                      subtitle={d.montantDu ? `${fmt(parseNum(d.montantDu))} €` : undefined}
                      onRemove={() => removeDF(d.id)}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Montant dû">
                          <Input value={d.montantDu} onChange={v => updateDF(d.id, { ...d, montantDu: v })} placeholder="0" suffix="€" />
                        </Field>
                        <Field label="Mensualité (si existante)">
                          <Input value={d.mensualite} onChange={v => updateDF(d.id, { ...d, mensualite: v })} placeholder="0" suffix="€" />
                        </Field>
                      </div>
                    </CardWrap>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                  <AddBtn onClick={addDF} label="Ajouter une dette familiale" />

                  <AnimatePresence>
                  {state.autresDettes.map((d, idx) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                    <CardWrap
                      title={`Autre dette ${state.autresDettes.length > 1 ? idx + 1 : ''}`}
                      subtitle={d.montantDu ? `${fmt(parseNum(d.montantDu))} €` : undefined}
                      onRemove={() => removeAD(d.id)}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Montant dû">
                          <Input value={d.montantDu} onChange={v => updateAD(d.id, { ...d, montantDu: v })} placeholder="0" suffix="€" />
                        </Field>
                        <Field label="Mensualité (si existante)">
                          <Input value={d.mensualite} onChange={v => updateAD(d.id, { ...d, mensualite: v })} placeholder="0" suffix="€" />
                        </Field>
                      </div>
                    </CardWrap>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                  <AddBtn onClick={addAD} label="Ajouter une autre dette" />
                </div>
              </>
            )}

            {/* ══ SYNTHÈSE ══════════════════════════════════════════════════ */}
            {totalDettesComplet > 0 && !state.showSynthese && (
              <button type="button" onClick={() => upd('showSynthese', true)}
                className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
                Voir la synthèse →
              </button>
            )}

            {state.showSynthese && totalDettesComplet > 0 && (
              <div className="space-y-6 mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">Synthèse Bloc 3</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Row 1 — métriques */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Total dettes</p>
                    <p className="text-[22px] font-bold text-red-600">{fmt(totalDettesComplet)} €</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Mensualités totales</p>
                    <p className="text-[22px] font-bold text-gray-800">{fmt(totalMensualitesComplet)} €<span className="text-[14px] text-gray-400 font-normal">/mois</span></p>
                  </div>
                  {dureeMoyenne > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Durée résiduelle moyenne</p>
                      <p className="text-[22px] font-bold text-gray-800">{dureeMoyenne} an{dureeMoyenne > 1 ? 's' : ''}</p>
                      <p className="text-[11px] text-gray-400 mt-1">Crédits immobiliers</p>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Patrimoine net provisoire</p>
                    <p className={`text-[22px] font-bold ${patrimoineNet >= 0 ? 'text-[#0F6E56]' : 'text-red-600'}`}>{patrimoineNet >= 0 ? '+' : ''}{fmt(patrimoineNet)} €</p>
                    <p className="text-[11px] text-gray-400 mt-1">Actif Bloc 2 − Passif Bloc 3</p>
                  </div>
                </div>

                {/* Taux endettement */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-semibold text-gray-800">Ratio dette / actif brut</p>
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${
                      tauxEndettementPatrimoine < 33 ? 'bg-[#E1F5EE] text-[#085041]'
                      : tauxEndettementPatrimoine < 50 ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                    }`}>
                      {tauxEndettementPatrimoine}%
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

                {/* Barres par type */}
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
                          <span className="text-[10px] text-gray-400">({Math.round(d.value / totalDettesComplet * 100)}%)</span>
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
        <button type="button" onClick={() => navigate(getPrevBloc(3))} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">← Retour</button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          <button type="button" onClick={() => navigate(getNextBloc(3))}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium">
            {isLastBloc(3) ? 'Lancer l\'analyse →' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}
