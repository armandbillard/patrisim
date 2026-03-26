import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertTriangle, X, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenusPro {
  salaire: string
  aPrimes: boolean
  primesAnnuelles: string
  primesPeriode: string
  tauxCroissance: number
  horizonProjection: number
  aAvantages: boolean
  avantagesTypes: string[]
  avantageValeurs: Record<string, string>
  // TNS
  remunNette: string
  dividendesSociete: string
  cotisationsSociales: string
  // Remplacement
  aRemplacement: boolean
  remplacementType: string
  remplacementMontant: string
}

interface ChargeFixe { id: string; description: string; montant: string }

interface FiscalData {
  anneeRevenus: string
  rfr: string
  revenuImposable: string
  impotNet: string
  tauxMoyen: string
  nbParts: string
  prelevementsSociaux: string
  creditsReductions: string
  situationFamille: string
  source: 'auto' | 'manuel' | ''
  fieldsAuto: string[]
}

interface PdfUpload {
  annee: string
  fileName: string
  status: 'idle' | 'loading' | 'done' | 'error'
  errorMsg: string
}

interface Bloc4State {
  affichageMode: 'Mensuel' | 'Annuel'
  // Revenus pro
  p1Pro: RevenusPro
  p2Pro: RevenusPro
  // Revenus patrimoniaux
  revenusFonciersB: string
  chargesLocativesOui: boolean
  travauxDed: string
  interetsEmprunt: string
  taxeFonciere: string
  fraisGestion: string
  assurancesPNO: string
  autresChargesDed: string
  revenusFinanciers: string
  dividendesCoupons: string
  interetsLivrets: string
  aPlusValues: boolean
  pvTypes: string[]
  pvMontant: string
  // Autres revenus
  aAutresRevenus: boolean
  autresRevenusTypes: string[]
  autresRevenusMontants: Record<string, string>
  autresRevenusDesc: string
  // Charges fixes
  loyerMensuel: string
  chargesLocatives: string
  mensualitesCredits: string
  assurances: string
  abonnements: string
  fraisScolarite: string
  aPension: boolean
  pensionMontant: string
  autresCharges: ChargeFixe[]
  // Fiscal
  fiscal: FiscalData
  multiAnnees: boolean
  pdfsAnnuels: PdfUpload[]
  // UI
  showSynthese: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultPro = (): RevenusPro => ({
  salaire: '', aPrimes: false, primesAnnuelles: '', primesPeriode: '',
  tauxCroissance: 1.5, horizonProjection: 10,
  aAvantages: false, avantagesTypes: [], avantageValeurs: {},
  remunNette: '', dividendesSociete: '', cotisationsSociales: '',
  aRemplacement: false, remplacementType: '', remplacementMontant: '',
})

const defaultFiscal = (): FiscalData => ({
  anneeRevenus: '2024', rfr: '', revenuImposable: '', impotNet: '',
  tauxMoyen: '', nbParts: '', prelevementsSociaux: '', creditsReductions: '',
  situationFamille: '', source: '', fieldsAuto: [],
})

const defaultState = (): Bloc4State => ({
  affichageMode: 'Mensuel',
  p1Pro: defaultPro(), p2Pro: defaultPro(),
  revenusFonciersB: '', chargesLocativesOui: false,
  travauxDed: '', interetsEmprunt: '', taxeFonciere: '',
  fraisGestion: '', assurancesPNO: '', autresChargesDed: '',
  revenusFinanciers: '', dividendesCoupons: '', interetsLivrets: '',
  aPlusValues: false, pvTypes: [], pvMontant: '',
  aAutresRevenus: false, autresRevenusTypes: [], autresRevenusMontants: {}, autresRevenusDesc: '',
  loyerMensuel: '', chargesLocatives: '', mensualitesCredits: '',
  assurances: '', abonnements: '', fraisScolarite: '',
  aPension: false, pensionMontant: '', autresCharges: [],
  fiscal: defaultFiscal(), multiAnnees: false,
  pdfsAnnuels: [
    { annee: '2024', fileName: '', status: 'idle', errorMsg: '' },
    { annee: '2023', fileName: '', status: 'idle', errorMsg: '' },
    { annee: '2022', fileName: '', status: 'idle', errorMsg: '' },
  ],
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

function calcTMI(revImp: number, nbParts: number): { tmi: number; tranche: string; resteAvant: number; depuisMontant: number } {
  const qi = nbParts > 0 ? revImp / nbParts : revImp
  const tranches = [
    { seuil: 11497, taux: 0 },
    { seuil: 29315, taux: 11 },
    { seuil: 83823, taux: 30 },
    { seuil: 177106, taux: 41 },
    { seuil: Infinity, taux: 45 },
  ]
  let tmi = 0, depuisMontant = 0, resteAvant = 0, tranche = '0%'
  for (let i = 0; i < tranches.length; i++) {
    if (qi <= tranches[i].seuil) {
      tmi = tranches[i].taux
      tranche = `${tranches[i].taux}%`
      depuisMontant = i > 0 ? tranches[i - 1].seuil * nbParts : 0
      resteAvant = i < tranches.length - 1 ? (tranches[i].seuil - qi) * nbParts : 0
      break
    }
  }
  return { tmi, tranche, resteAvant, depuisMontant }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(',')[1])
    r.onerror = () => rej(new Error('Lecture impossible'))
    r.readAsDataURL(file)
  })
}

async function extractFromPDF(base64: string): Promise<Partial<FiscalData>> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `Tu es un assistant fiscal français expert.
Extrais UNIQUEMENT les informations suivantes de cet avis d'imposition français et retourne-les UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "annee_revenus": number,
  "revenu_fiscal_reference": number,
  "revenu_imposable": number,
  "impot_net": number,
  "taux_moyen_imposition": number,
  "nombre_parts": number,
  "prelevements_sociaux": number,
  "credits_reductions_impot": number,
  "situation_famille": string
}
Si une valeur est introuvable, utilise null.`,
          },
        ],
      }],
    }),
  })
  const data = await response.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text || ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ─── Base UI ──────────────────────────────────────────────────────────────────

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

function Input({ value, onChange, type = 'text', placeholder = '', suffix, disabled = false }: {
  value: string; onChange: (v: string) => void; type?: string
  placeholder?: string; suffix?: string; disabled?: boolean
}) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className={`w-full h-10 border rounded-lg px-3 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 border-transparent'}`}
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

function Chips({ options, value, onChange, multi = false, small = false }: {
  options: string[]; value: string | string[]
  onChange: (v: string | string[]) => void; multi?: boolean; small?: boolean
}) {
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
  const s = {
    blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function PersonneBadge({ label, isP2 }: { label: string; isP2?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4 ${isP2 ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isP2 ? 'bg-[#0F6E56]' : 'bg-[#185FA5]'}`} />
      {label}
    </div>
  )
}

function AutoBadge() {
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#085041] bg-[#E1F5EE] px-2 py-0.5 rounded-full ml-2"><CheckCircle size={10} />Extrait auto</span>
}

// ─── RevenuProForm ─────────────────────────────────────────────────────────────

function RevenuProForm({ pro, onChange, label, isP2, statutPro }: {
  pro: RevenusPro; onChange: (p: RevenusPro) => void
  label: string; isP2?: boolean; statutPro?: string
}) {
  const upd = <K extends keyof RevenusPro>(k: K, v: RevenusPro[K]) => onChange({ ...pro, [k]: v })
  const isTNS = statutPro === 'TNS (indépendant)' || statutPro === "Profession libérale" || statutPro === "Chef(fe) d'entreprise"
  const isRetraite = statutPro === 'Retraité(e)'
  const salEstime = parseNum(pro.salaire) * Math.pow(1 + pro.tauxCroissance / 100, pro.horizonProjection)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <PersonneBadge label={label} isP2={isP2} />

      {isTNS ? (
        <>
          <Field label="Rémunération nette annuelle">
            <Input value={pro.remunNette} onChange={v => upd('remunNette', v)} placeholder="60 000" suffix="€/an" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dividendes perçus via société">
              <Input value={pro.dividendesSociete} onChange={v => upd('dividendesSociete', v)} placeholder="0" suffix="€/an" />
            </Field>
            <Field label="Cotisations sociales annuelles" tooltip="En tant que TNS, vos charges sociales représentent environ 45% de votre rémunération nette.">
              <Input value={pro.cotisationsSociales} onChange={v => upd('cotisationsSociales', v)} placeholder="0" suffix="€/an" />
            </Field>
          </div>
        </>
      ) : (
        <Field label="Salaire net mensuel après prélèvement à la source" tooltip="Votre salaire après impôt à la source, tel qu'il apparaît sur votre virement bancaire.">
          <Input value={pro.salaire} onChange={v => upd('salaire', v)} placeholder="2 500" suffix="€/mois" />
        </Field>
      )}

      {/* Primes */}
      <Field label="Avez-vous des primes ou bonus ?">
        <Toggle value={pro.aPrimes} onChange={v => upd('aPrimes', v)} />
      </Field>
      {pro.aPrimes && (
        <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Montant net annuel">
              <Input value={pro.primesAnnuelles} onChange={v => upd('primesAnnuelles', v)} placeholder="3 000" suffix="€/an" />
            </Field>
            <Field label="Périodicité">
              <Chips options={['Annuelle', 'Trimestrielle', 'Variable']} value={pro.primesPeriode} onChange={v => upd('primesPeriode', v as string)} small />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Taux de croissance estimé">
              <div className="space-y-1">
                <input type="range" min={0} max={10} step={0.5} value={pro.tauxCroissance}
                  onChange={e => upd('tauxCroissance', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
                <p className="text-[11px] text-gray-400 text-right">{pro.tauxCroissance}%/an</p>
              </div>
            </Field>
            <Field label="Horizon de projection">
              <div className="space-y-1">
                <input type="range" min={1} max={20} value={pro.horizonProjection}
                  onChange={e => upd('horizonProjection', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
                <p className="text-[11px] text-gray-400 text-right">{pro.horizonProjection} ans</p>
              </div>
            </Field>
          </div>
          {pro.salaire && pro.tauxCroissance > 0 && (
            <InfoCard color="blue">
              Dans {pro.horizonProjection} ans, votre salaire estimé : <strong>{fmt(salEstime)} €/mois</strong> (hypothèse +{pro.tauxCroissance}%/an)
            </InfoCard>
          )}
        </div>
      )}

      {/* Avantages en nature */}
      <Field label="Avez-vous des avantages en nature ?">
        <Toggle value={pro.aAvantages} onChange={v => upd('aAvantages', v)} />
      </Field>
      {pro.aAvantages && (
        <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
          <Chips options={['Voiture de fonction', 'Logement de fonction', 'Tickets restaurant', 'Autre']}
            value={pro.avantagesTypes} onChange={v => upd('avantagesTypes', v as string[])} multi small />
          {pro.avantagesTypes.map(type => (
            <Field key={type} label={`Valeur mensuelle — ${type}`}>
              <Input value={pro.avantageValeurs[type] || ''} onChange={v => upd('avantageValeurs', { ...pro.avantageValeurs, [type]: v })} placeholder="0" suffix="€/mois" />
            </Field>
          ))}
        </div>
      )}

      {/* Revenus de remplacement */}
      <Field label="Avez-vous des revenus de remplacement ?">
        <Toggle value={pro.aRemplacement} onChange={v => upd('aRemplacement', v)} />
      </Field>
      {pro.aRemplacement && (
        <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
          <Field label="Type">
            <Chips options={['Allocations chômage', 'Pension invalidité', 'Arrêt maladie longue durée', 'Retraite déjà perçue']}
              value={pro.remplacementType} onChange={v => upd('remplacementType', v as string)} small />
          </Field>
          <Field label="Montant mensuel net">
            <Input value={pro.remplacementMontant} onChange={v => upd('remplacementMontant', v)} placeholder="0" suffix="€/mois" />
          </Field>
        </div>
      )}
    </div>
  )
}

// ─── PDF Upload Zone ───────────────────────────────────────────────────────────

function PdfUploadZone({ annee, status, fileName, errorMsg, onFile }: {
  annee: string; status: PdfUpload['status']
  fileName: string; errorMsg: string; onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') return
    onFile(file)
  }

  return (
    <div
      onClick={() => status === 'idle' && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragging ? 'border-[#185FA5] bg-[#E6F1FB]'
        : status === 'done' ? 'border-[#0F6E56] bg-[#E1F5EE] cursor-default'
        : status === 'error' ? 'border-red-300 bg-red-50'
        : status === 'loading' ? 'border-[#185FA5] bg-[#E6F1FB] cursor-wait'
        : 'border-[#185FA5]/40 bg-[#E6F1FB]/40 hover:bg-[#E6F1FB] hover:border-[#185FA5]'
      }`}
    >
      <input ref={inputRef} type="file" accept=".pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {status === 'idle' && (
        <>
          <Upload className="w-8 h-8 text-[#185FA5] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#0C447C]">Avis d'imposition {annee}</p>
          <p className="text-[12px] text-[#185FA5] mt-1">Glissez votre PDF ici ou cliquez pour sélectionner</p>
          <p className="text-[11px] text-gray-400 mt-1">Format PDF · Taille max 10 Mo</p>
        </>
      )}
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#0C447C] font-medium">Analyse IA en cours…</p>
          <p className="text-[11px] text-gray-400">Extraction des données fiscales</p>
        </div>
      )}
      {status === 'done' && (
        <>
          <CheckCircle className="w-8 h-8 text-[#0F6E56] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#085041]">Analyse terminée</p>
          <p className="text-[12px] text-[#0F6E56] mt-1">{fileName}</p>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-red-700">Extraction impossible</p>
          <p className="text-[11px] text-red-500 mt-1">{errorMsg || 'Veuillez saisir manuellement'}</p>
        </>
      )}
    </div>
  )
}

// ─── Bracket Bar ──────────────────────────────────────────────────────────────

function BracketBar({ revenuImposable, nbParts }: { revenuImposable: number; nbParts: number }) {
  const tranches = [
    { label: '0%', max: 11497, color: 'bg-gray-200', width: 8 },
    { label: '11%', max: 29315, color: 'bg-blue-200', width: 13 },
    { label: '30%', max: 83823, color: 'bg-[#185FA5]', width: 40 },
    { label: '41%', max: 177106, color: 'bg-amber-500', width: 27 },
    { label: '45%', max: Infinity, color: 'bg-red-500', width: 12 },
  ]
  const qi = nbParts > 0 ? revenuImposable / nbParts : revenuImposable
  const { tmi } = calcTMI(revenuImposable, nbParts)

  // Position du curseur en %
  const maxAffiche = 200000
  const pos = Math.min(revenuImposable / maxAffiche * 100, 99)

  return (
    <div className="space-y-3">
      <div className="relative h-8 flex rounded-xl overflow-hidden">
        {tranches.map(t => (
          <div key={t.label} className={`${t.color} flex items-center justify-center`} style={{ width: `${t.width}%` }}>
            <span className="text-[9px] text-white font-bold">{t.label}</span>
          </div>
        ))}
        {revenuImposable > 0 && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${pos}%` }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white" />
          </div>
        )}
      </div>
      {revenuImposable > 0 && (
        <p className="text-[12px] text-gray-700">
          Votre TMI : <strong className="text-[#185FA5]">{tmi}%</strong> — Vous êtes dans la tranche à {tmi}% depuis <strong>{fmt(calcTMI(revenuImposable, nbParts).depuisMontant)} €</strong>
          {calcTMI(revenuImposable, nbParts).resteAvant > 0 && <> · il vous reste <strong>{fmt(calcTMI(revenuImposable, nbParts).resteAvant)} €</strong> avant la tranche suivante</>}
        </p>
      )}
    </div>
  )
}

// ─── FiscalInputField ─────────────────────────────────────────────────────────

function FiscalInputField({ label, value, onChange, tooltip, fieldKey, auto }: {
  label: string; value: string; onChange: (v: string) => void
  tooltip?: string; fieldKey: string; auto: boolean
}) {
  return (
    <Field label={<>{label}{auto && <AutoBadge />}</> as unknown as string} tooltip={tooltip}>
      <Input value={value} onChange={onChange} placeholder="—" suffix="€" />
    </Field>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc4() {
  const navigate = useNavigate()

  // Données Blocs précédents
  const p1Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const p2Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p2', {})
  const p1Label = p1Data.prenom?.trim() || 'Personne 1'
  const p2Label = p2Data.prenom?.trim() || 'Personne 2'
  const bloc1Mode = loadFromStorage<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const isCouple = bloc1Mode === 'couple'

  const foyerBloc1 = loadFromStorage<{
    typeLogement?: string; statutMatrimonial?: string
    enfantsCharge?: number; enfants?: { prenom?: string }[]
  }>('patrisim_bloc1_foyer', {})
  const isLocataire = foyerBloc1.typeLogement === 'Locataire'
  const nbEnfants = foyerBloc1.enfantsCharge || 0

  const pro1Bloc1 = loadFromStorage<{ statut?: string }>('patrisim_bloc1_pro1', {})
  const pro2Bloc1 = loadFromStorage<{ statut?: string }>('patrisim_bloc1_pro2', {})

  // Pré-remplissage depuis Bloc 2 (revenus fonciers, financiers)
  const bloc2 = loadFromStorage<{
    biens?: { loue?: boolean; location?: { loyerMensuel?: string; tauxOccupation?: string; chargesAnnuelles?: string } }[]
    livrets?: { type?: string; taux?: string; solde?: string }[]
    peas?: { valeur?: string; rendement?: string }[]
    avs?: { valeurRachat?: string; rendement?: string }[]
    pers?: { valeur?: string; rendement?: string }[]
    ctos?: { valeur?: string; rendement?: string; dividendes?: string }[]
  }>('patrisim_bloc2', {})

  const loyers = (bloc2.biens || []).filter(b => b.loue)
    .reduce((a, b) => a + parseNum(b.location?.loyerMensuel || '0') * 12 * parseNum(b.location?.tauxOccupation || '100') / 100 - parseNum(b.location?.chargesAnnuelles || '0'), 0)

  const revenusFinanciersAuto = (() => {
    let t = 0
    ;(bloc2.peas || []).forEach(p => { t += parseNum(p.valeur || '0') * parseNum(p.rendement || '0') / 100 })
    ;(bloc2.avs || []).forEach(av => { t += parseNum(av.valeurRachat || '0') * parseNum(av.rendement || '0') / 100 })
    ;(bloc2.pers || []).forEach(p => { t += parseNum(p.valeur || '0') * parseNum(p.rendement || '0') / 100 })
    return Math.round(t)
  })()

  const interetsLivretsAuto = (bloc2.livrets || [])
    .filter(l => l.type === 'PEL' || l.type === 'CEL' || l.type === 'Livret bancaire ordinaire')
    .reduce((a, l) => a + parseNum(l.solde || '0') * parseNum(l.taux || '0') / 100, 0)

  // Pré-remplissage depuis Bloc 3 (mensualités)
  const bloc3 = loadFromStorage<{
    creditsImmo?: { mensualiteHA?: string; mensualiteAssurance?: string }[]
    creditsConso?: { mensualite?: string }[]
    pretsEtudiants?: { mensualite?: string }[]
  }>('patrisim_bloc3', {})

  const mensualitesAuto = (() => {
    let t = 0
    ;(bloc3.creditsImmo || []).forEach(c => { t += parseNum(c.mensualiteHA || '0') + parseNum(c.mensualiteAssurance || '0') })
    ;(bloc3.creditsConso || []).forEach(c => { t += parseNum(c.mensualite || '0') })
    ;(bloc3.pretsEtudiants || []).forEach(p => { t += parseNum(p.mensualite || '0') })
    return Math.round(t)
  })()

  // Nombre de parts auto
  const nbPartsAuto = (() => {
    let p = isCouple ? 2 : 1
    p += nbEnfants * 0.5
    return p.toFixed(1)
  })()

  const [state, setState] = useState<Bloc4State>(() => {
    const s = loadFromStorage('patrisim_bloc4', defaultState())
    // Pré-remplissage si champs vides
    if (!s.revenusFonciersB && loyers > 0) s.revenusFonciersB = String(Math.round(loyers))
    if (!s.revenusFinanciers && revenusFinanciersAuto > 0) s.revenusFinanciers = String(revenusFinanciersAuto)
    if (!s.interetsLivrets && interetsLivretsAuto > 0) s.interetsLivrets = String(Math.round(interetsLivretsAuto))
    if (!s.mensualitesCredits && mensualitesAuto > 0) s.mensualitesCredits = String(mensualitesAuto)
    if (!s.fiscal.nbParts) s.fiscal = { ...s.fiscal, nbParts: nbPartsAuto }
    return s
  })
  const [savedAt, setSavedAt] = useState('')
  const [errors, setErrors] = useState<{ p1?: string; p2?: string }>({})
  const [toast, setToast] = useState(false)
  const upd = useCallback(<K extends keyof Bloc4State>(k: K, v: Bloc4State[K]) => setState(s => ({ ...s, [k]: v })), [])

  useEffect(() => {
    localStorage.setItem('patrisim_bloc4', JSON.stringify(state))
    setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [state])

  // ── Calculs ────────────────────────────────────────────────────────────────
  const factor = state.affichageMode === 'Annuel' ? 12 : 1

  const revenuP1 = (() => {
    const p = state.p1Pro
    if (pro1Bloc1.statut === 'TNS (indépendant)' || pro1Bloc1.statut === "Profession libérale" || pro1Bloc1.statut === "Chef(fe) d'entreprise") {
      return parseNum(p.remunNette) / 12 + parseNum(p.dividendesSociete) / 12
    }
    return parseNum(p.salaire) + parseNum(p.primesAnnuelles) / 12 + parseNum(p.remplacementMontant)
  })()

  const revenuP2 = (() => {
    if (!isCouple) return 0
    const p = state.p2Pro
    if (pro2Bloc1.statut === 'TNS (indépendant)' || pro2Bloc1.statut === "Profession libérale" || pro2Bloc1.statut === "Chef(fe) d'entreprise") {
      return parseNum(p.remunNette) / 12 + parseNum(p.dividendesSociete) / 12
    }
    return parseNum(p.salaire) + parseNum(p.primesAnnuelles) / 12 + parseNum(p.remplacementMontant)
  })()

  const chargesDed = state.chargesLocativesOui
    ? parseNum(state.travauxDed) + parseNum(state.interetsEmprunt) + parseNum(state.taxeFonciere) + parseNum(state.fraisGestion) + parseNum(state.assurancesPNO) + parseNum(state.autresChargesDed)
    : 0
  const revenusFonciersNets = parseNum(state.revenusFonciersB) - chargesDed

  const revenusAutresMensuel = Object.values(state.autresRevenusMontants).reduce((a, v) => a + parseNum(v), 0)
  const revenusPatrimoMensuel = revenusFonciersNets / 12 + parseNum(state.revenusFinanciers) / 12 + parseNum(state.dividendesCoupons) / 12
  const revenusTotauxMensuel = revenuP1 + revenuP2 + revenusPatrimoMensuel + revenusAutresMensuel

  const chargesFixesMensuel = (isLocataire ? parseNum(state.loyerMensuel) + parseNum(state.chargesLocatives) : 0)
    + parseNum(state.mensualitesCredits)
    + parseNum(state.assurances)
    + parseNum(state.abonnements)
    + (nbEnfants > 0 ? parseNum(state.fraisScolarite) : 0)
    + (state.aPension ? parseNum(state.pensionMontant) : 0)
    + state.autresCharges.reduce((a, c) => a + parseNum(c.montant), 0)

  const capaciteEpargne = revenusTotauxMensuel - chargesFixesMensuel

  // Fiscal
  const rfr = parseNum(state.fiscal.rfr)
  const revImp = parseNum(state.fiscal.revenuImposable)
  const ir = parseNum(state.fiscal.impotNet)
  const ps = parseNum(state.fiscal.prelevementsSociaux)
  const nb = parseNum(state.fiscal.nbParts) || 1
  const tauxMoyenCalc = rfr > 0 ? Math.round(ir / rfr * 1000) / 10 : 0
  const pressionFiscale = ir + ps
  const { tmi, tranche } = calcTMI(revImp, nb)

  // PER plafond
  const revProAnnuel = (revenuP1 + revenuP2) * 12
  const perVersements = (loadFromStorage<{ pers?: { versementsVolontaires?: string }[] }>('patrisim_bloc2', {})).pers?.reduce((a, p) => a + parseNum(p.versementsVolontaires || '0'), 0) || 0
  const plafondPer = Math.min(revProAnnuel * 0.10, 35194) - perVersements
  const economiePer = Math.max(0, plafondPer) * tmi / 100

  // Taux endettement réel
  const tauxEndetReels = revenusTotauxMensuel > 0 ? Math.round(parseNum(state.mensualitesCredits) / revenusTotauxMensuel * 100) : 0

  // ── PDF handler ───────────────────────────────────────────────────────────
  const handlePdf = async (file: File, idx: number) => {
    const newPdfs = [...state.pdfsAnnuels]
    newPdfs[idx] = { ...newPdfs[idx], status: 'loading', fileName: file.name }
    upd('pdfsAnnuels', newPdfs)
    try {
      const base64 = await fileToBase64(file)
      const result = await extractFromPDF(base64)
      const newFiscal: FiscalData = {
        ...state.fiscal,
        anneeRevenus: result.annee_revenus ? String(result.annee_revenus) : state.fiscal.anneeRevenus,
        rfr: result.revenu_fiscal_reference ? String(result.revenu_fiscal_reference) : state.fiscal.rfr,
        revenuImposable: result.revenu_imposable ? String(result.revenu_imposable) : state.fiscal.revenuImposable,
        impotNet: result.impot_net ? String(result.impot_net) : state.fiscal.impotNet,
        tauxMoyen: result.taux_moyen_imposition ? String(result.taux_moyen_imposition) : state.fiscal.tauxMoyen,
        nbParts: result.nombre_parts ? String(result.nombre_parts) : state.fiscal.nbParts,
        prelevementsSociaux: result.prelevements_sociaux ? String(result.prelevements_sociaux) : state.fiscal.prelevementsSociaux,
        creditsReductions: result.credits_reductions_impot ? String(result.credits_reductions_impot) : state.fiscal.creditsReductions,
        situationFamille: result.situation_famille || state.fiscal.situationFamille,
        source: 'auto',
        fieldsAuto: Object.entries(result).filter(([, v]) => v !== null).map(([k]) => k),
      }
      upd('fiscal', newFiscal)
      const updatedPdfs = [...state.pdfsAnnuels]
      updatedPdfs[idx] = { ...updatedPdfs[idx], status: 'done' }
      upd('pdfsAnnuels', updatedPdfs)
    } catch (e) {
      const updatedPdfs = [...state.pdfsAnnuels]
      updatedPdfs[idx] = { ...updatedPdfs[idx], status: 'error', errorMsg: 'Extraction échouée — saisissez manuellement' }
      upd('pdfsAnnuels', updatedPdfs)
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const handleSuivant = () => {
    const e: typeof errors = {}
    if (!state.p1Pro.salaire && !state.p1Pro.remunNette && !state.p1Pro.remplacementMontant) e.p1 = 'Ce champ est requis'
    if (isCouple && !state.p2Pro.salaire && !state.p2Pro.remunNette && !state.p2Pro.remplacementMontant) e.p2 = 'Ce champ est requis'
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setToast(true)
    setTimeout(() => navigate('/bloc5'), 1200)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium">
          <CheckCircle size={16} className="text-green-400" />Étape 4 enregistrée ✓
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">

        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 4 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#185FA5] rounded-full" style={{ width: '57%' }} />
            </div>
            <span className="text-[11px] text-gray-300">57%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Flux & fiscalité</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-xl">Renseignez vos revenus, charges et situation fiscale. Ces données sont essentielles pour calculer votre capacité d'épargne réelle.</p>

          {/* Toggle Mensuel / Annuel */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[12px] text-gray-500">Afficher les montants en :</span>
            <Chips options={['Mensuel', 'Annuel']} value={state.affichageMode} onChange={v => upd('affichageMode', v as 'Mensuel' | 'Annuel')} small />
          </div>
        </div>

        {/* ══ A — REVENUS ══════════════════════════════════════════════════ */}
        <SectionTitle>A — Revenus professionnels</SectionTitle>

        {errors.p1 && <p className="text-[12px] text-red-500 mb-3">⚠ Veuillez renseigner le revenu de {p1Label}</p>}
        {isCouple ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <RevenuProForm pro={state.p1Pro} onChange={p => upd('p1Pro', p)} label={p1Label} isP2={false} statutPro={pro1Bloc1.statut} />
            <RevenuProForm pro={state.p2Pro} onChange={p => upd('p2Pro', p)} label={p2Label} isP2 statutPro={pro2Bloc1.statut} />
          </div>
        ) : (
          <div className="mb-6">
            <RevenuProForm pro={state.p1Pro} onChange={p => upd('p1Pro', p)} label={p1Label} isP2={false} statutPro={pro1Bloc1.statut} />
          </div>
        )}

        {/* Revenus patrimoniaux */}
        <SectionTitle>Revenus patrimoniaux</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
          <InfoCard color="blue">Ces données sont pré-remplies depuis votre Bloc 2. Vérifiez et ajustez si nécessaire.</InfoCard>

          <Field label="Revenus fonciers bruts annuels">
            <Input value={state.revenusFonciersB} onChange={v => upd('revenusFonciersB', v)} placeholder="0" suffix="€/an" />
          </Field>

          <Field label="Charges déductibles sur biens locatifs ?">
            <Toggle value={state.chargesLocativesOui} onChange={v => upd('chargesLocativesOui', v)} />
          </Field>
          {state.chargesLocativesOui && (
            <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Travaux déductibles"><Input value={state.travauxDed} onChange={v => upd('travauxDed', v)} placeholder="0" suffix="€/an" /></Field>
                <Field label="Intérêts d'emprunt"><Input value={state.interetsEmprunt} onChange={v => upd('interetsEmprunt', v)} placeholder="0" suffix="€/an" /></Field>
                <Field label="Taxe foncière totale"><Input value={state.taxeFonciere} onChange={v => upd('taxeFonciere', v)} placeholder="0" suffix="€/an" /></Field>
                <Field label="Frais de gestion locative"><Input value={state.fraisGestion} onChange={v => upd('fraisGestion', v)} placeholder="0" suffix="€/an" /></Field>
                <Field label="Assurances PNO"><Input value={state.assurancesPNO} onChange={v => upd('assurancesPNO', v)} placeholder="0" suffix="€/an" /></Field>
                <Field label="Autres charges déductibles"><Input value={state.autresChargesDed} onChange={v => upd('autresChargesDed', v)} placeholder="0" suffix="€/an" /></Field>
              </div>
              {revenusFonciersNets !== 0 && (
                <div className={`rounded-lg px-4 py-2.5 ${revenusFonciersNets >= 0 ? 'bg-[#E6F1FB]' : 'bg-red-50'}`}>
                  <p className="text-[12px] font-medium">Revenus fonciers nets : <strong>{fmt(revenusFonciersNets)} €/an</strong></p>
                </div>
              )}
            </div>
          )}

          <Field label="Revenus financiers annuels estimés"
            tooltip={revenusFinanciersAuto > 0 ? `Calculé depuis le Bloc 2 : ${fmt(revenusFinanciersAuto)} €` : undefined}>
            <Input value={state.revenusFinanciers} onChange={v => upd('revenusFinanciers', v)} placeholder="0" suffix="€/an" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dividendes et coupons">
              <Input value={state.dividendesCoupons} onChange={v => upd('dividendesCoupons', v)} placeholder="0" suffix="€/an" />
            </Field>
            <Field label="Intérêts livrets non défiscalisés">
              <Input value={state.interetsLivrets} onChange={v => upd('interetsLivrets', v)} placeholder="0" suffix="€/an" />
            </Field>
          </div>

          <Field label="Avez-vous réalisé des plus-values cette année ?">
            <Toggle value={state.aPlusValues} onChange={v => upd('aPlusValues', v)} />
          </Field>
          {state.aPlusValues && (
            <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
              <Field label="Type"><Chips options={['Immobilière', 'Mobilière', 'Crypto', 'Cession de parts']} value={state.pvTypes} onChange={v => upd('pvTypes', v as string[])} multi small /></Field>
              <Field label="Montant total"><Input value={state.pvMontant} onChange={v => upd('pvMontant', v)} placeholder="0" suffix="€" /></Field>
            </div>
          )}
        </div>

        {/* Autres revenus */}
        <SectionTitle>Autres revenus</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
          <Field label="Avez-vous d'autres revenus réguliers ?">
            <Toggle value={state.aAutresRevenus} onChange={v => upd('aAutresRevenus', v)} />
          </Field>
          {state.aAutresRevenus && (
            <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
              <Chips options={['Pensions alimentaires reçues', 'Rentes viagères', 'Revenus locatifs meublés', 'Autre']}
                value={state.autresRevenusTypes} onChange={v => upd('autresRevenusTypes', v as string[])} multi small />
              {state.autresRevenusTypes.map(type => (
                <div key={type} className="space-y-2">
                  <Field label={`Montant mensuel — ${type}`}>
                    <Input value={state.autresRevenusMontants[type] || ''} onChange={v => upd('autresRevenusMontants', { ...state.autresRevenusMontants, [type]: v })} placeholder="0" suffix="€/mois" />
                  </Field>
                  {type === 'Autre' && <Field label="Description"><Input value={state.autresRevenusDesc} onChange={v => upd('autresRevenusDesc', v)} placeholder="Décrivez…" /></Field>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ B — CHARGES FIXES ════════════════════════════════════════════ */}
        <SectionTitle>B — Charges fixes</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
          {isLocataire && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Loyer mensuel"><Input value={state.loyerMensuel} onChange={v => upd('loyerMensuel', v)} placeholder="0" suffix="€/mois" /></Field>
              <Field label="Charges locatives"><Input value={state.chargesLocatives} onChange={v => upd('chargesLocatives', v)} placeholder="0" suffix="€/mois" /></Field>
            </div>
          )}

          <Field label="Mensualités crédit(s)"
            tooltip={mensualitesAuto > 0 ? `Pré-rempli depuis le Bloc 3 : ${fmt(mensualitesAuto)} €/mois` : undefined}>
            <Input value={state.mensualitesCredits} onChange={v => upd('mensualitesCredits', v)} placeholder="0" suffix="€/mois" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Assurances (auto, habitation, santé…)"><Input value={state.assurances} onChange={v => upd('assurances', v)} placeholder="0" suffix="€/mois" /></Field>
            <Field label="Abonnements (téléphone, internet, streaming…)"><Input value={state.abonnements} onChange={v => upd('abonnements', v)} placeholder="0" suffix="€/mois" /></Field>
          </div>

          {nbEnfants > 0 && (
            <Field label="Frais de scolarité / garde d'enfants"><Input value={state.fraisScolarite} onChange={v => upd('fraisScolarite', v)} placeholder="0" suffix="€/mois" /></Field>
          )}

          <Field label="Pension alimentaire versée ?">
            <Toggle value={state.aPension} onChange={v => upd('aPension', v)} />
          </Field>
          {state.aPension && (
            <Field label="Montant mensuel"><Input value={state.pensionMontant} onChange={v => upd('pensionMontant', v)} placeholder="0" suffix="€/mois" /></Field>
          )}

          {/* Autres charges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Autres charges fixes</label>
              <button type="button"
                onClick={() => upd('autresCharges', [...state.autresCharges, { id: crypto.randomUUID(), description: '', montant: '' }])}
                className="text-[12px] text-[#185FA5] hover:text-[#0C447C] font-medium">
                + Ajouter une charge
              </button>
            </div>
            <div className="space-y-2">
              {state.autresCharges.map(c => (
                <div key={c.id} className="flex gap-3 items-center">
                  <div className="flex-1"><Input value={c.description} onChange={v => upd('autresCharges', state.autresCharges.map(x => x.id === c.id ? { ...x, description: v } : x))} placeholder="Description" /></div>
                  <div className="w-32"><Input value={c.montant} onChange={v => upd('autresCharges', state.autresCharges.map(x => x.id === c.id ? { ...x, montant: v } : x))} placeholder="0" suffix="€/mois" /></div>
                  <button type="button" onClick={() => upd('autresCharges', state.autresCharges.filter(x => x.id !== c.id))} className="text-gray-300 hover:text-red-400 transition-colors"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Capacité d'épargne */}
          {revenusTotauxMensuel > 0 && (
            <div className={`rounded-2xl p-5 mt-2 ${capaciteEpargne > 500 ? 'bg-[#E1F5EE]' : capaciteEpargne >= 0 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Capacité d'épargne mensuelle</p>
              <p className={`text-[28px] font-bold ${capaciteEpargne > 500 ? 'text-[#0F6E56]' : capaciteEpargne >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
                {capaciteEpargne >= 0 ? '+' : ''}{fmt(capaciteEpargne)} €/mois
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Revenus {fmt(revenusTotauxMensuel)} € − Charges {fmt(chargesFixesMensuel)} €</p>
            </div>
          )}
        </div>

        {/* ══ C — FISCALITÉ ════════════════════════════════════════════════ */}
        <SectionTitle>C — Analyse fiscale</SectionTitle>
        <div className="space-y-4 mb-6">

          {/* Upload PDF */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-[14px] font-semibold text-gray-800 mb-1">Import automatique</p>
              <p className="text-[12px] text-gray-400">Importez votre avis d'imposition PDF pour une extraction automatique par IA.</p>
            </div>

            <Toggle value={state.multiAnnees} onChange={v => upd('multiAnnees', v)} />
            <p className="text-[11px] text-gray-400 -mt-2">Importer plusieurs années pour analyser l'évolution</p>

            {!state.multiAnnees ? (
              <PdfUploadZone
                annee={state.pdfsAnnuels[0].annee}
                status={state.pdfsAnnuels[0].status}
                fileName={state.pdfsAnnuels[0].fileName}
                errorMsg={state.pdfsAnnuels[0].errorMsg}
                onFile={f => handlePdf(f, 0)}
              />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {state.pdfsAnnuels.map((pdf, i) => (
                  <PdfUploadZone key={pdf.annee} annee={pdf.annee} status={pdf.status} fileName={pdf.fileName} errorMsg={pdf.errorMsg} onFile={f => handlePdf(f, i)} />
                ))}
              </div>
            )}
          </div>

          {/* Saisie manuelle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button"
              onClick={() => {}}
              className="w-full flex items-center justify-between px-5 py-4 text-left">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-[#185FA5]" />
                <span className="text-[13px] font-semibold text-gray-800">Saisie manuelle</span>
                {state.fiscal.source === 'auto' && <span className="text-[11px] bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full font-semibold">Pré-rempli par IA</span>}
                {state.fiscal.source === 'manuel' && <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Saisie manuelle</span>}
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
              <InfoCard color="blue">
                <strong>Comment lire votre avis d'imposition :</strong> RFR = case 1BK · Impôt net = montant final page 1 · Nombre de parts = case TL ou TN
              </InfoCard>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Année des revenus">
                  <Select value={state.fiscal.anneeRevenus} onChange={v => upd('fiscal', { ...state.fiscal, anneeRevenus: v, source: 'manuel' })}>
                    <option>2022</option><option>2023</option><option>2024</option><option>2025</option>
                  </Select>
                </Field>
                <Field label="Nombre de parts (quotient familial)" tooltip={`1 part = célibataire · 2 parts = couple · +0.5 par enfant à charge. Auto-calculé : ${nbPartsAuto}`}>
                  <Input value={state.fiscal.nbParts} onChange={v => upd('fiscal', { ...state.fiscal, nbParts: v, source: 'manuel' })} placeholder={nbPartsAuto} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Revenu fiscal de référence (RFR)" tooltip="Case 1BK de votre avis d'imposition">
                  <div className="relative">
                    <Input value={state.fiscal.rfr} onChange={v => upd('fiscal', { ...state.fiscal, rfr: v, source: state.fiscal.source || 'manuel' })} placeholder="45 000" suffix="€" />
                    {state.fiscal.fieldsAuto.includes('revenu_fiscal_reference') && <AutoBadge />}
                  </div>
                </Field>
                <Field label="Revenu imposable" tooltip="Après abattements et déductions">
                  <Input value={state.fiscal.revenuImposable} onChange={v => upd('fiscal', { ...state.fiscal, revenuImposable: v, source: state.fiscal.source || 'manuel' })} placeholder="40 000" suffix="€" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Impôt sur le revenu net" tooltip="Montant final après réductions et crédits d'impôt">
                  <Input value={state.fiscal.impotNet} onChange={v => upd('fiscal', { ...state.fiscal, impotNet: v, source: state.fiscal.source || 'manuel' })} placeholder="4 500" suffix="€" />
                </Field>
                <Field label="Prélèvements sociaux">
                  <Input value={state.fiscal.prelevementsSociaux} onChange={v => upd('fiscal', { ...state.fiscal, prelevementsSociaux: v, source: state.fiscal.source || 'manuel' })} placeholder="0" suffix="€" />
                </Field>
              </div>

              <Field label="Crédits et réductions d'impôt">
                <Input value={state.fiscal.creditsReductions} onChange={v => upd('fiscal', { ...state.fiscal, creditsReductions: v, source: state.fiscal.source || 'manuel' })} placeholder="0" suffix="€" />
              </Field>
            </div>
          </div>

          {/* Calculs automatiques */}
          {(state.fiscal.rfr || state.fiscal.impotNet) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <p className="text-[14px] font-semibold text-gray-800">Analyse fiscale automatique</p>

              {/* Taux moyen */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Taux moyen réel</p>
                  <p className="text-[24px] font-bold text-[#185FA5]">{tauxMoyenCalc}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">TMI estimé</p>
                  <p className="text-[24px] font-bold text-gray-800">{tmi}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Pression fiscale</p>
                  <p className="text-[18px] font-bold text-gray-800">{fmt(pressionFiscale)} €/an</p>
                  <p className="text-[10px] text-gray-400">{fmt(pressionFiscale / 12)} €/mois</p>
                </div>
              </div>

              {/* Barre tranches */}
              {revImp > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-2">Tranches d'imposition 2025</p>
                  <BracketBar revenuImposable={revImp} nbParts={nb} />
                  {tauxMoyenCalc > 0 && (
                    <p className="text-[12px] text-gray-500 mt-2">
                      Écart taux moyen / TMI : votre taux moyen est de <strong>{tauxMoyenCalc}%</strong> alors que votre TMI est à <strong>{tmi}%</strong> — écart de <strong>{Math.abs(tmi - tauxMoyenCalc).toFixed(1)} points</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Plafond PER */}
              {plafondPer > 0 && (
                <InfoCard color="amber">
                  <p className="font-semibold mb-1">💡 Plafond PER disponible : {fmt(Math.max(0, plafondPer))} €</p>
                  <p>Un versement de <strong>{fmt(Math.max(0, plafondPer))} €</strong> sur votre PER vous économiserait jusqu'à <strong>{fmt(economiePer)} €</strong> d'impôt (TMI {tmi}%)</p>
                  <p className="text-[10px] mt-1 opacity-70">Informatif — non contractuel</p>
                </InfoCard>
              )}
            </div>
          )}
        </div>

        {/* ══ SYNTHÈSE ════════════════════════════════════════════════════ */}
        {!state.showSynthese && (
          <button type="button" onClick={() => upd('showSynthese', true)}
            className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
            Voir la synthèse →
          </button>
        )}

        {state.showSynthese && (
          <div className="space-y-6 mt-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">Synthèse Bloc 4</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Row 1 — 6 métriques */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Revenus nets foyer', value: `${fmt(revenusTotauxMensuel)} €/mois`, color: 'text-[#185FA5]' },
                { label: 'Charges fixes totales', value: `${fmt(chargesFixesMensuel)} €/mois`, color: 'text-gray-800' },
                { label: 'Mensualités crédits', value: `${fmt(parseNum(state.mensualitesCredits))} €/mois`, color: 'text-gray-800' },
                { label: 'Capacité d\'épargne', value: `${capaciteEpargne >= 0 ? '+' : ''}${fmt(capaciteEpargne)} €/mois`, color: capaciteEpargne > 500 ? 'text-[#0F6E56]' : capaciteEpargne >= 0 ? 'text-amber-600' : 'text-red-600' },
                { label: 'Taux endettement réel', value: `${tauxEndetReels}%`, color: tauxEndetReels < 33 ? 'text-[#0F6E56]' : tauxEndetReels <= 35 ? 'text-amber-600' : 'text-red-600' },
                { label: 'Pression fiscale', value: `${fmt(pressionFiscale)} €/an`, color: 'text-gray-800' },
              ].map(m => (
                <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">{m.label}</p>
                  <p className={`text-[16px] font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Row 2 — RFR / TMI / taux moyen */}
            {state.fiscal.rfr && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">RFR</p>
                  <p className="text-[18px] font-bold text-gray-800">{fmt(rfr)} €</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">TMI</p>
                  <p className="text-[18px] font-bold text-[#185FA5]">{tmi}%</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Taux moyen réel</p>
                  <p className="text-[18px] font-bold text-gray-800">{tauxMoyenCalc}%</p>
                </div>
              </div>
            )}

            {/* Row 3 — Revenu disponible */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-[#185FA5]/30 shadow-sm p-5">
                <p className="text-[11px] text-gray-400 uppercase mb-2">Revenu disponible actuel</p>
                <p className="text-[26px] font-bold text-[#185FA5]">{fmt(Math.max(0, capaciteEpargne))} €/mois</p>
                <p className="text-[11px] text-gray-400 mt-1">Après revenus, charges et impôts</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[11px] text-gray-400 uppercase mb-2">Revenu disponible à la retraite</p>
                <p className="text-[26px] font-bold text-gray-400">—</p>
                <p className="text-[11px] text-gray-400 mt-1">Sera affiné après le Bloc 5</p>
              </div>
            </div>

            <button type="button" onClick={() => navigate('/bloc5')}
              className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
              Confirmer et passer au Bloc 5 — Projets & retraite →
            </button>
          </div>
        )}
      </div>

      {/* Barre sticky */}
      <div className="fixed bottom-[72px] left-[220px] right-0 bg-white border-t border-gray-100 px-8 py-2.5 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">Revenus nets</span><span className="text-[13px] font-bold text-[#185FA5]">{fmt(revenusTotauxMensuel)} €/mois</span></div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">Charges</span><span className="text-[13px] font-bold text-gray-700">{fmt(chargesFixesMensuel)} €/mois</span></div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Capacité d'épargne</span>
            <span className={`text-[13px] font-bold ${capaciteEpargne > 500 ? 'text-[#0F6E56]' : capaciteEpargne >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {capaciteEpargne >= 0 ? '+' : ''}{fmt(capaciteEpargne)} €/mois
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={() => navigate('/bloc3')} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">← Retour</button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          <button type="button" onClick={handleSuivant}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}
