import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { getNextBloc } from '../utils/navigation'
import FadeIn from '../components/FadeIn'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModeDetention = 'Pleine propriété' | 'Indivision' | 'SCI' | 'Démembrement' | ''
type RoleUsufruit = 'Usufruitier' | 'Nu-propriétaire' | ''

interface Demembrement {
  role: RoleUsufruit; valeurConnue: boolean; valeurNP: string
  ageUsufruitier: string; dateConstitution: string; beneficiaire: string
}
interface BailInfo { typeBail: string; dateDebut: string }
interface LocationInfo {
  meuble: 'Non meublé' | 'Meublé' | ''
  regimeFiscalNM: string; dispositif: string
  statutLMNP: 'LMNP' | 'LMP' | ''; regimeFiscalM: string
  loyerMensuel: string; tauxOccupation: string; chargesAnnuelles: string
  bailEnCours: boolean; bail: BailInfo
}
interface BienImmobilier {
  id: string; typeBien: string; ville: string; codePostal: string
  surface: string; anneeAchat: string; prixAchat: string; travaux: string
  modeFinancement: string; natureJuridique: string; valeurEstimee: string
  dateEvaluation: string; modeDetention: ModeDetention
  quotePartIndivision: string; sciNom: string; sciParts: string
  demembrement: Demembrement; loue: boolean; location: LocationInfo; collapsed: boolean
}
interface ScpiDirecte {
  id: string; nom: string; societeGestion: string; type: string
  nbParts: string; prixSouscription: string; prixRetrait: string
  dividendesAnnuels: string; natureJuridique: string
  modeDetention: 'Pleine propriété' | 'Démembrement' | ''; demembrement: Demembrement
}

// ── Actif financier types ─────────────────────────────────────────────────────
interface CompteCourant {
  id: string; etablissement: string; solde: string
  titulaire: string
}
interface Livret {
  id: string; type: string; taux: string; etablissement: string
  solde: string; dateOuverture: string; dateEcheance: string
  titulaire: string
}
interface Pea {
  id: string; titulaire: string; etablissement: string
  dateOuverture: string; valeur: string; versements: string
  composition: string[]; rendement: string; risque: string
  aPeaPme: boolean; peaPmeEtab: string; peaPmeValeur: string; peaPmeVersements: string
}
interface Cto {
  id: string; etablissement: string; valeur: string; prixRevient: string
  titulaire: string; composition: string[]
  rendement: string; risque: string; secteur: string
}
interface Beneficiaire { nom: string; pct: string }
interface AssuranceVie {
  id: string; nom: string; compagnie: string; dateOuverture: string
  valeurRachat: string; versements: string; fondsEurosPct: number
  ucDetail: string[]; rendement: string; risque: string
  clauseBeneficiaire: string; beneficiaires: Beneficiaire[]
  avancesRachats: boolean; montantRachete: string; titulaire: string
}
interface Per {
  id: string; type: string; etablissement: string; valeur: string
  versementsVolontaires: string; versementsEmployeur: string
  fondsEurosPct: number; ucDetail: string[]; rendement: string; risque: string
  modeSortie: string; deblocage: boolean; montantDebloque: string; motifDeblocage: string
  titulaire: string
}
interface EpargneSalariale {
  type: string; entreprise: string; valeur: string
  disponibilite: string; dateDeblocage: string; titulaire: string
}
interface Crypto {
  valeur: string; prixRevient: string; plateformeDeclaree: boolean
  composition: string[]; titulaire: string
}
interface AutrePlacement {
  orPhysique: boolean; orForme: string; orValeur: string
  produitStructure: boolean; psEmetteur: string; psValeur: string
  psEcheance: string; psGaranti: boolean; psRendement: string; psRisque: string
  pretTiers: boolean; pretBeneficiaire: string; pretMontant: string
  pretTaux: string; pretEcheance: string
  autre: boolean; autreDesc: string; autreValeur: string
  autreRendement: string; autreRisque: string
}

// ── Autres actifs types ───────────────────────────────────────────────────────
interface Vehicule { id: string; marque: string; modele: string; annee: string; valeur: string }
interface OeuvreArt { description: string; valeur: string; expertise: boolean; dateExpertise: string; montantExpertise: string }
interface ForetTerre { surface: string; departement: string; valeur: string }
interface PartSociale { id: string; nomSociete: string; formeJuridique: string; pctDetenu: string; valeur: string; methodeValorisation: string; dateValorisation: string; natureJuridique: string }
interface AutreActif { description: string; valeur: string }

interface OriginePatrimoine {
  epargne: number; heritage: number; cessionImmo: number
  cessionEntreprise: number; pvFinancieres: number; indemnites: number; autre: number
}

interface Bloc2State {
  // A - Immobilier
  proprietaireRP: boolean; rp: BienImmobilier
  autresBiens: boolean; biens: BienImmobilier[]
  aScpi: boolean; scpis: ScpiDirecte[]
  // B - Financier
  aComptesCourants: boolean; comptesCourants: CompteCourant[]
  aLivrets: boolean; livrets: Livret[]
  aPea: boolean; peas: Pea[]
  aCto: boolean; ctos: Cto[]
  aAv: boolean; avs: AssuranceVie[]
  aPer: boolean; pers: Per[]
  aEpargneSalariale: boolean; epargneSalariale: EpargneSalariale[]
  aCrypto: boolean; crypto: Crypto
  aAutresPlacements: boolean; autresPlacements: AutrePlacement
  // C - Autres actifs
  aAutresActifs: boolean; typesAutresActifs: string[]
  vehicules: Vehicule[]; oeuvreArt: OeuvreArt; foretTerre: ForetTerre
  partsSociales: PartSociale[]; autreActif: AutreActif
  // D - Origine
  origine: OriginePatrimoine
  // UI
  showSynthese: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultDemembrement = (): Demembrement => ({ role: '', valeurConnue: false, valeurNP: '', ageUsufruitier: '', dateConstitution: '', beneficiaire: '' })
const defaultLocation = (): LocationInfo => ({ meuble: '', regimeFiscalNM: '', dispositif: '', statutLMNP: '', regimeFiscalM: '', loyerMensuel: '', tauxOccupation: '100', chargesAnnuelles: '', bailEnCours: false, bail: { typeBail: '', dateDebut: '' } })
const defaultBien = (): BienImmobilier => ({ id: crypto.randomUUID(), typeBien: '', ville: '', codePostal: '', surface: '', anneeAchat: '', prixAchat: '', travaux: '0', modeFinancement: '', natureJuridique: '', valeurEstimee: '', dateEvaluation: '', modeDetention: '', quotePartIndivision: '50', sciNom: '', sciParts: '', demembrement: defaultDemembrement(), loue: false, location: defaultLocation(), collapsed: false })
const defaultScpi = (): ScpiDirecte => ({ id: crypto.randomUUID(), nom: '', societeGestion: '', type: '', nbParts: '', prixSouscription: '', prixRetrait: '', dividendesAnnuels: '', natureJuridique: '', modeDetention: '', demembrement: defaultDemembrement() })
const defaultCC = (): CompteCourant => ({ id: crypto.randomUUID(), etablissement: '', solde: '', titulaire: '' })
const defaultLivret = (): Livret => ({ id: crypto.randomUUID(), type: '', taux: '', etablissement: '', solde: '', dateOuverture: '', dateEcheance: '', titulaire: '' })
const defaultPea = (): Pea => ({ id: crypto.randomUUID(), titulaire: '', etablissement: '', dateOuverture: '', valeur: '', versements: '', composition: [], rendement: '', risque: '', aPeaPme: false, peaPmeEtab: '', peaPmeValeur: '', peaPmeVersements: '' })
const defaultCto = (): Cto => ({ id: crypto.randomUUID(), etablissement: '', valeur: '', prixRevient: '', titulaire: '', composition: [], rendement: '', risque: '', secteur: '' })
const defaultAv = (): AssuranceVie => ({ id: crypto.randomUUID(), nom: '', compagnie: '', dateOuverture: '', valeurRachat: '', versements: '', fondsEurosPct: 80, ucDetail: [], rendement: '', risque: '', clauseBeneficiaire: '', beneficiaires: [], avancesRachats: false, montantRachete: '', titulaire: '' })
const defaultPer = (): Per => ({ id: crypto.randomUUID(), type: '', etablissement: '', valeur: '', versementsVolontaires: '', versementsEmployeur: '', fondsEurosPct: 60, ucDetail: [], rendement: '', risque: '', modeSortie: '', deblocage: false, montantDebloque: '', motifDeblocage: '', titulaire: '' })
const defaultES = (): EpargneSalariale => ({ type: '', entreprise: '', valeur: '', disponibilite: '', dateDeblocage: '', titulaire: '' })
const defaultCrypto = (): Crypto => ({ valeur: '', prixRevient: '', plateformeDeclaree: false, composition: [], titulaire: '' })
const defaultAutrePlacement = (): AutrePlacement => ({ orPhysique: false, orForme: '', orValeur: '', produitStructure: false, psEmetteur: '', psValeur: '', psEcheance: '', psGaranti: false, psRendement: '', psRisque: '', pretTiers: false, pretBeneficiaire: '', pretMontant: '', pretTaux: '', pretEcheance: '', autre: false, autreDesc: '', autreValeur: '', autreRendement: '', autreRisque: '' })
const defaultOrigine = (): OriginePatrimoine => ({ epargne: 0, heritage: 0, cessionImmo: 0, cessionEntreprise: 0, pvFinancieres: 0, indemnites: 0, autre: 0 })
const defaultPartSociale = (): PartSociale => ({ id: crypto.randomUUID(), nomSociete: '', formeJuridique: '', pctDetenu: '', valeur: '', methodeValorisation: '', dateValorisation: '', natureJuridique: '' })
const defaultVehicule = (): Vehicule => ({ id: crypto.randomUUID(), marque: '', modele: '', annee: '', valeur: '' })

const defaultState = (): Bloc2State => ({
  proprietaireRP: false, rp: defaultBien(), autresBiens: false, biens: [], aScpi: false, scpis: [],
  aComptesCourants: false, comptesCourants: [], aLivrets: false, livrets: [],
  aPea: false, peas: [], aCto: false, ctos: [], aAv: false, avs: [], aPer: false, pers: [],
  aEpargneSalariale: false, epargneSalariale: [],
  aCrypto: false, crypto: defaultCrypto(), aAutresPlacements: false, autresPlacements: defaultAutrePlacement(),
  aAutresActifs: false, typesAutresActifs: [], vehicules: [],
  oeuvreArt: { description: '', valeur: '', expertise: false, dateExpertise: '', montantExpertise: '' },
  foretTerre: { surface: '', departement: '', valeur: '' },
  partsSociales: [], autreActif: { description: '', valeur: '' },
  origine: defaultOrigine(), showSynthese: false,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch { return fallback }
}
function fmt(n: number) { return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) }
function parseNum(s: string) { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }
function detectZone(cp: string) {
  if (!cp || cp.length < 2) return null
  const d = cp.substring(0, 2)
  if (['75','92','93','94'].includes(d)) return { label: 'Zone Paris', taux: 0.025 }
  if (['13','31','33','34','44','59','67','69','76'].includes(d)) return { label: 'Grande métropole', taux: 0.02 }
  return { label: 'Zone rurale', taux: 0.01 }
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
function autoEstimate(bien: BienImmobilier) {
  const achat = parseNum(bien.prixAchat), travaux = parseNum(bien.travaux), annee = parseInt(bien.anneeAchat)
  if (!achat || !annee) return null
  const zone = detectZone(bien.codePostal), taux = zone?.taux ?? 0.01
  const annees = new Date().getFullYear() - annee
  if (annees < 0) return null
  return Math.round((achat + travaux) * Math.pow(1 + taux, annees))
}
function bienValeur(bien: BienImmobilier) { return bien.valeurEstimee ? parseNum(bien.valeurEstimee) : (autoEstimate(bien) ?? 0) }

const TAUX_LIVRETS: Record<string, string> = {
  'Livret A': '1.50', 'LDDS': '1.50', 'LEP': '2.50', 'Livret Jeune': '1.50',
  'PEL': '2.00', 'CEL': '1.00', 'Livret bancaire ordinaire': '',
}

function yearsAgo(dateStr: string) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return Math.floor(diff)
}

// ─── Base UI ──────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-8">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}
function SubTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
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
        style={suffix ? { paddingRight: '2.5rem' } : {}}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 pointer-events-none">{suffix}</span>}
    </div>
  )
}
function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all cursor-pointer"
    >{children}</select>
  )
}
function Chips({ options, value, onChange, multi = false, small = false }: { options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean; small?: boolean }) {
  const isSelected = (opt: string) => multi ? (value as string[]).includes(opt) : value === opt
  const handleClick = (opt: string) => {
    if (multi) { const arr = value as string[]; onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]) }
    else onChange(opt)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => handleClick(opt)}
          className={`${small ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[12px]'} rounded-lg border transition-all font-medium ${
            isSelected(opt) ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >{opt}</button>
      ))}
    </div>
  )
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {['Non', 'Oui'].map(lbl => (
        <button key={lbl} type="button" onClick={() => onChange(lbl === 'Oui')}
          className={`px-4 py-2 rounded-lg text-[13px] border transition-all ${(lbl === 'Oui') === value ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}
        >{lbl}</button>
      ))}
    </div>
  )
}
function InfoCard({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'amber' | 'green' }) {
  const s = { blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20', amber: 'bg-amber-50 text-amber-800 border-amber-200', green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20' }
  return <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}
function Badge({ children, color }: { children: React.ReactNode; color: 'green' | 'amber' | 'red' | 'blue' }) {
  const s = { green: 'bg-[#E1F5EE] text-[#085041]', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', blue: 'bg-[#E6F1FB] text-[#0C447C]' }
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s[color]}`}>{children}</span>
}
function PvBadge({ pv }: { pv: number }) {
  if (pv === 0) return null
  return <Badge color={pv > 0 ? 'green' : 'red'}>{pv > 0 ? '+' : ''}{fmt(pv)} €</Badge>
}
function CardWrap({ title, subtitle, onRemove, children }: { title: string; subtitle?: string; onRemove?: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 cursor-pointer" onClick={() => setOpen(!open)}>
        <div>
          <span className="text-[13px] font-semibold text-gray-800">{title}</span>
          {subtitle && <span className="ml-2 text-[12px] text-gray-400">{subtitle}</span>}
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
function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-[13px] text-gray-400 hover:border-[#185FA5] hover:text-[#185FA5] transition-colors font-medium">
      + {label}
    </button>
  )
}
function MetricCard({ label, value, sub, color = 'default' }: { label: string; value: string; sub?: string; color?: 'default' | 'blue' | 'green' }) {
  const vc = color === 'blue' ? 'text-[#185FA5]' : color === 'green' ? 'text-[#0F6E56]' : 'text-gray-800'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-[22px] font-bold ${vc}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── DemembrementFields ───────────────────────────────────────────────────────
function DemembrementFields({ d, onChange, valeurRef }: { d: Demembrement; onChange: (d: Demembrement) => void; valeurRef: number }) {
  const upd = <K extends keyof Demembrement>(k: K, v: Demembrement[K]) => onChange({ ...d, [k]: v })
  const age = parseInt(d.ageUsufruitier)
  const cgi = !isNaN(age) && age > 0 ? calcCGI669(age) : null
  return (
    <div className="space-y-4 pt-3 border-t border-gray-100">
      <Field label="Votre rôle"><Chips options={['Usufruitier', 'Nu-propriétaire']} value={d.role} onChange={v => upd('role', v as RoleUsufruit)} /></Field>
      <Field label="Valeur connue ?"><Toggle value={d.valeurConnue} onChange={v => upd('valeurConnue', v)} /></Field>
      {d.valeurConnue ? (
        <Field label="Valeur nue-propriété (€)"><Input value={d.valeurNP} onChange={v => upd('valeurNP', v)} placeholder="0" suffix="€" /></Field>
      ) : (
        <div className="space-y-3">
          <Field label="Âge de l'usufruitier"><Input type="number" value={d.ageUsufruitier} onChange={v => upd('ageUsufruitier', v)} placeholder="65" suffix="ans" /></Field>
          {cgi && valeurRef > 0 && (
            <InfoCard color="blue">
              <p className="font-semibold mb-1">Barème fiscal CGI art. 669</p>
              <p>Usufruit : {cgi.usufruit}% = <strong>{fmt(valeurRef * cgi.usufruit / 100)} €</strong></p>
              <p>Nue-propriété : {cgi.np}% = <strong>{fmt(valeurRef * cgi.np / 100)} €</strong></p>
            </InfoCard>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date de constitution"><Input type="date" value={d.dateConstitution} onChange={v => upd('dateConstitution', v)} /></Field>
        <Field label="Bénéficiaire de l'autre droit"><Input value={d.beneficiaire} onChange={v => upd('beneficiaire', v)} placeholder="Prénom Nom" /></Field>
      </div>
    </div>
  )
}

// ─── LocationFields ───────────────────────────────────────────────────────────
function LocationFields({ loc, onChange }: { loc: LocationInfo; onChange: (l: LocationInfo) => void }) {
  const upd = <K extends keyof LocationInfo>(k: K, v: LocationInfo[K]) => onChange({ ...loc, [k]: v })
  return (
    <div className="space-y-4 pt-3 border-t border-gray-100">
      <Field label="Meublé ou non meublé ?">
        <Chips options={['Non meublé', 'Meublé']} value={loc.meuble} onChange={v => onChange({ ...defaultLocation(), meuble: v as LocationInfo['meuble'], tauxOccupation: '100' })} />
      </Field>
      {loc.meuble === 'Non meublé' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Régime fiscal">
              <Select value={loc.regimeFiscalNM} onChange={v => upd('regimeFiscalNM', v)}>
                <option value="">Sélectionnez…</option>
                <option>Micro-foncier (abattement 30%)</option><option>Régime réel</option><option>Déficit foncier</option>
              </Select>
            </Field>
            <Field label="Dispositif fiscal">
              <Select value={loc.dispositif} onChange={v => upd('dispositif', v)}>
                <option value="">Aucun</option>
                <option>Pinel</option><option>Malraux</option><option>Déficit foncier</option><option>Denormandie</option><option>Autre</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Loyer brut / mois"><Input value={loc.loyerMensuel} onChange={v => upd('loyerMensuel', v)} placeholder="0" suffix="€" /></Field>
            <Field label="Taux d'occupation"><Input type="number" value={loc.tauxOccupation} onChange={v => upd('tauxOccupation', v)} placeholder="100" suffix="%" /></Field>
            <Field label="Charges annuelles" tooltip="Taxe foncière + charges copro + assurance PNO"><Input value={loc.chargesAnnuelles} onChange={v => upd('chargesAnnuelles', v)} placeholder="0" suffix="€" /></Field>
          </div>
          <Field label="Bail en cours ?"><Toggle value={loc.bailEnCours} onChange={v => upd('bailEnCours', v)} /></Field>
          {loc.bailEnCours && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type de bail">
                <Select value={loc.bail.typeBail} onChange={v => upd('bail', { ...loc.bail, typeBail: v })}>
                  <option value="">Sélectionnez…</option>
                  <option>Bail vide 3 ans</option><option>Bail étudiant 9 mois</option><option>Bail mobilité 1-10 mois</option>
                </Select>
              </Field>
              <Field label="Date de début"><Input type="date" value={loc.bail.dateDebut} onChange={v => upd('bail', { ...loc.bail, dateDebut: v })} /></Field>
            </div>
          )}
        </div>
      )}
      {loc.meuble === 'Meublé' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Statut"><Chips options={['LMNP', 'LMP']} value={loc.statutLMNP} onChange={v => upd('statutLMNP', v as 'LMNP' | 'LMP')} /></Field>
            <Field label="Régime fiscal">
              <Select value={loc.regimeFiscalM} onChange={v => upd('regimeFiscalM', v)}>
                <option value="">Sélectionnez…</option>
                <option>Micro-BIC (abattement 50%)</option><option>Réel LMNP</option><option>Réel LMP</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Loyer brut / mois"><Input value={loc.loyerMensuel} onChange={v => upd('loyerMensuel', v)} placeholder="0" suffix="€" /></Field>
            <Field label="Taux d'occupation"><Input type="number" value={loc.tauxOccupation} onChange={v => upd('tauxOccupation', v)} placeholder="100" suffix="%" /></Field>
            <Field label="Charges annuelles"><Input value={loc.chargesAnnuelles} onChange={v => upd('chargesAnnuelles', v)} placeholder="0" suffix="€" /></Field>
          </div>
          <Field label="Bail en cours ?"><Toggle value={loc.bailEnCours} onChange={v => upd('bailEnCours', v)} /></Field>
          {loc.bailEnCours && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type de bail">
                <Select value={loc.bail.typeBail} onChange={v => upd('bail', { ...loc.bail, typeBail: v })}>
                  <option value="">Sélectionnez…</option>
                  <option>Bail meublé classique 1 an</option><option>Bail mobilité 1-10 mois</option><option>Bail étudiant 9 mois</option>
                </Select>
              </Field>
              <Field label="Date de début"><Input type="date" value={loc.bail.dateDebut} onChange={v => upd('bail', { ...loc.bail, dateDebut: v })} /></Field>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── BienCard ─────────────────────────────────────────────────────────────────
function BienCard({ bien, onChange, isRP = false, regimeMatrimonial = '', statutMatrimonial = '', p1Label = 'Personne 1', p2Label = 'Personne 2' }: { bien: BienImmobilier; onChange: (b: BienImmobilier) => void; isRP?: boolean; regimeMatrimonial?: string; statutMatrimonial?: string; p1Label?: string; p2Label?: string }) {
  const upd = <K extends keyof BienImmobilier>(k: K, v: BienImmobilier[K]) => onChange({ ...bien, [k]: v })
  const zone = bien.codePostal.length >= 2 ? detectZone(bien.codePostal) : null
  const estimation = autoEstimate(bien)
  const valeurAffichee = bien.valeurEstimee ? parseNum(bien.valeurEstimee) : (estimation ?? 0)
  const summaryLabel = [bien.typeBien, bien.ville].filter(Boolean).join(' · ')
  const summaryVal = valeurAffichee > 0 ? `${fmt(valeurAffichee)} €` : ''
  const propre1 = `Bien propre ${p1Label}`, propre2 = `Bien propre ${p2Label}`
  const defaultNature = (() => {
    if (statutMatrimonial === 'Célibataire' || !statutMatrimonial) return propre1
    if (regimeMatrimonial.includes('Communauté')) return 'Bien commun'
    return propre1
  })()
  const typesBienRP = ['Appartement ancien', 'Appartement neuf', 'Maison ancienne', 'Maison neuve']
  const typesBienAutre = [...typesBienRP, 'Terrain', 'Parking / Garage', 'Local commercial', 'Bureaux']
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => upd('collapsed', !bien.collapsed)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-gray-800">{summaryLabel || (isRP ? 'Résidence principale' : 'Nouveau bien')}</span>
          {summaryVal && <span className="text-[12px] font-semibold text-[#185FA5] bg-[#E6F1FB] px-2.5 py-0.5 rounded-full">{summaryVal}</span>}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${bien.collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {!bien.collapsed && (
        <div className="px-6 pb-6 space-y-5 border-t border-gray-50">
          <div className="pt-4"><Field label="Type de bien"><Chips options={isRP ? typesBienRP : typesBienAutre} value={bien.typeBien} onChange={v => upd('typeBien', v as string)} /></Field></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><Field label="Ville"><Input value={bien.ville} onChange={v => upd('ville', v)} placeholder="Lyon" /></Field></div>
            <Field label="Code postal">
              <div className="space-y-1.5">
                <Input value={bien.codePostal} onChange={v => upd('codePostal', v)} placeholder="69000" />
                {zone && <Badge color="blue">{zone.label} · +{(zone.taux*100).toFixed(1)}%/an</Badge>}
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Surface (optionnel)"><Input type="number" value={bien.surface} onChange={v => upd('surface', v)} placeholder="80" suffix="m²" /></Field>
            <Field label="Année d'achat"><Input type="number" value={bien.anneeAchat} onChange={v => upd('anneeAchat', v)} placeholder="2015" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix d'achat"><Input value={bien.prixAchat} onChange={v => upd('prixAchat', v)} placeholder="200 000" suffix="€" /></Field>
            <Field label="Travaux réalisés"><Input value={bien.travaux} onChange={v => upd('travaux', v)} placeholder="0" suffix="€" /></Field>
          </div>
          <Field label="Mode de financement"><Chips options={['Comptant', 'Crédit', 'Mixte']} value={bien.modeFinancement} onChange={v => upd('modeFinancement', v as string)} /></Field>
          <Field label="Nature juridique"><Chips options={[propre1, propre2, 'Bien commun']} value={bien.natureJuridique || defaultNature} onChange={v => upd('natureJuridique', v as string)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valeur estimée actuelle">
              <div className="space-y-1.5">
                <Input value={bien.valeurEstimee} onChange={v => upd('valeurEstimee', v)} placeholder="—" suffix="€" />
                {!bien.valeurEstimee && estimation !== null && <p className="text-[11px] text-gray-400 italic">Auto : <strong className="text-gray-600">{fmt(estimation)} €</strong>{zone ? ` · +${(zone.taux*100).toFixed(1)}%/an depuis ${bien.anneeAchat}` : ''}</p>}
              </div>
            </Field>
            <Field label="Date dernière évaluation (optionnel)"><Input type="date" value={bien.dateEvaluation} onChange={v => upd('dateEvaluation', v)} /></Field>
          </div>
          <Field label="Mode de détention"><Chips options={['Pleine propriété', 'Indivision', 'SCI', 'Démembrement']} value={bien.modeDetention} onChange={v => upd('modeDetention', v as ModeDetention)} /></Field>
          {bien.modeDetention === 'Indivision' && <Field label="Quote-part (%)"><Input type="number" value={bien.quotePartIndivision} onChange={v => upd('quotePartIndivision', v)} placeholder="50" suffix="%" /></Field>}
          {bien.modeDetention === 'SCI' && <div className="grid grid-cols-2 gap-4"><Field label="Nom de la SCI"><Input value={bien.sciNom} onChange={v => upd('sciNom', v)} placeholder="SCI Dupont" /></Field><Field label="% parts détenues"><Input type="number" value={bien.sciParts} onChange={v => upd('sciParts', v)} placeholder="50" suffix="%" /></Field></div>}
          {bien.modeDetention === 'Démembrement' && <DemembrementFields d={bien.demembrement} onChange={d => upd('demembrement', d)} valeurRef={valeurAffichee} />}
          {!isRP && (
            <div className="pt-2">
              <Field label="Ce bien est-il loué ?"><Toggle value={bien.loue} onChange={v => upd('loue', v)} /></Field>
              {bien.loue && <LocationFields loc={bien.location} onChange={l => upd('location', l)} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ScpiCard ─────────────────────────────────────────────────────────────────
function ScpiCard({ scpi, onChange, onRemove, p1Label = 'Personne 1', p2Label = 'Personne 2' }: { scpi: ScpiDirecte; onChange: (s: ScpiDirecte) => void; onRemove: () => void; p1Label?: string; p2Label?: string }) {
  const upd = <K extends keyof ScpiDirecte>(k: K, v: ScpiDirecte[K]) => onChange({ ...scpi, [k]: v })
  const nb = parseNum(scpi.nbParts), ps = parseNum(scpi.prixSouscription), pr = parseNum(scpi.prixRetrait)
  const valAchat = nb * ps, valActuelle = nb * pr, pv = valActuelle - valAchat
  return (
    <CardWrap title={scpi.nom || 'Nouvelle SCPI'} subtitle={valActuelle > 0 ? `${fmt(valActuelle)} €` : undefined} onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de la SCPI"><Input value={scpi.nom} onChange={v => upd('nom', v)} placeholder="Immorente" /></Field>
        <Field label="Société de gestion"><Input value={scpi.societeGestion} onChange={v => upd('societeGestion', v)} placeholder="Sofidy" /></Field>
      </div>
      <Field label="Type"><Chips options={['SCPI de rendement', 'SCPI de plus-value', 'SCPI fiscale (Pinel/Malraux/Déficit)']} value={scpi.type} onChange={v => upd('type', v as string)} small /></Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Nombre de parts"><Input type="number" value={scpi.nbParts} onChange={v => upd('nbParts', v)} placeholder="100" /></Field>
        <Field label="Prix souscription / part"><Input value={scpi.prixSouscription} onChange={v => upd('prixSouscription', v)} placeholder="1 000" suffix="€" /></Field>
        <Field label="Prix retrait / part"><Input value={scpi.prixRetrait} onChange={v => upd('prixRetrait', v)} placeholder="1 050" suffix="€" /></Field>
      </div>
      {valActuelle > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Valeur achat</p><p className="text-[13px] font-semibold text-gray-700">{fmt(valAchat)} €</p></div>
          <div className="bg-[#E6F1FB] rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Valeur actuelle</p><p className="text-[13px] font-semibold text-[#185FA5]">{fmt(valActuelle)} €</p></div>
          <div className={`rounded-xl p-3 text-center ${pv >= 0 ? 'bg-[#E1F5EE]' : 'bg-red-50'}`}><p className="text-[10px] text-gray-400 uppercase mb-1">Plus-value</p><p className={`text-[13px] font-semibold ${pv >= 0 ? 'text-[#0F6E56]' : 'text-red-600'}`}>{pv >= 0 ? '+' : ''}{fmt(pv)} €</p></div>
        </div>
      )}
      <Field label="Dividendes annuels perçus"><Input value={scpi.dividendesAnnuels} onChange={v => upd('dividendesAnnuels', v)} placeholder="0" suffix="€/an" /></Field>
      <Field label="Nature juridique"><Chips options={[`Bien propre ${p1Label}`, `Bien propre ${p2Label}`, 'Bien commun']} value={scpi.natureJuridique} onChange={v => upd('natureJuridique', v as string)} small /></Field>
      <Field label="Mode de détention"><Chips options={['Pleine propriété', 'Démembrement']} value={scpi.modeDetention} onChange={v => upd('modeDetention', v as ScpiDirecte['modeDetention'])} /></Field>
      {scpi.modeDetention === 'Démembrement' && <DemembrementFields d={scpi.demembrement} onChange={d => upd('demembrement', d)} valeurRef={valActuelle} />}
    </CardWrap>
  )
}

// ─── CompositionFonds (AV / PER slider) ──────────────────────────────────────
function CompositionFonds({ pct, onChange, valeur, ucDetail, onUcChange }: { pct: number; onChange: (n: number) => void; valeur: number; ucDetail: string[]; onUcChange: (v: string[]) => void }) {
  const ucPct = 100 - pct
  const feVal = valeur * pct / 100, ucVal = valeur * ucPct / 100
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] text-gray-500 mb-1">
        <span>Fonds euros : <strong>{pct}%</strong>{valeur > 0 ? ` (${fmt(feVal)} €)` : ''}</span>
        <span>UC : <strong>{ucPct}%</strong>{valeur > 0 ? ` (${fmt(ucVal)} €)` : ''}</span>
      </div>
      <input type="range" min={0} max={100} value={pct} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
      {ucPct > 0 && (
        <Field label="Détail UC">
          <Chips options={['ETF', 'SCPI en UC', 'Private equity', 'Immobilier pierre-papier', 'Actions', 'Obligations', 'Produits structurés', 'Autres']} value={ucDetail} onChange={v => onUcChange(v as string[])} multi small />
        </Field>
      )}
    </div>
  )
}

// ─── OrigineSliders ───────────────────────────────────────────────────────────
function OrigineSliders({ origine, onChange }: { origine: OriginePatrimoine; onChange: (o: OriginePatrimoine) => void }) {
  const items: { key: keyof OriginePatrimoine; label: string }[] = [
    { key: 'epargne', label: 'Épargne sur revenus professionnels' },
    { key: 'heritage', label: 'Héritage ou donation reçue' },
    { key: 'cessionImmo', label: 'Cession immobilière' },
    { key: 'cessionEntreprise', label: "Cession d'entreprise ou de parts" },
    { key: 'pvFinancieres', label: 'Plus-values financières' },
    { key: 'indemnites', label: 'Indemnités (licenciement, accident…)' },
    { key: 'autre', label: 'Autre' },
  ]
  const total = Object.values(origine).reduce((a, b) => a + b, 0)
  const isComplete = total === 100
  const restant = 100 - total
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-[15px] font-semibold text-gray-800 mb-1">Comment votre patrimoine s'est-il constitué ?</h3>
      <p className="text-[12px] text-gray-400 mb-5">Répartissez en % — le total doit atteindre 100%</p>
      <div className="space-y-4">
        {items.map(({ key, label }) => {
          const maxVal = Math.max(0, origine[key] + restant)
          return (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-gray-600">{label}</span>
                <span className="text-[12px] font-semibold text-[#185FA5]">{origine[key]}%</span>
              </div>
              <input type="range" min={0} max={maxVal} value={origine[key]}
                onChange={e => onChange({ ...origine, [key]: Number(e.target.value) })}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]"
              />
            </div>
          )
        })}
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-gray-500">Total</span>
          <span className={`font-bold ${isComplete ? 'text-[#0F6E56]' : 'text-amber-600'}`}>
            {total}%
          </span>
        </div>
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-gray-400">Répartition restante</span>
          <span className={`font-semibold ${isComplete ? 'text-[#0F6E56]' : 'text-amber-600'}`}>
            {restant}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-[#0F6E56]' : 'bg-[#185FA5]'}`} style={{ width: `${Math.min(total, 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Bloc2() {
  const navigate = useNavigate()

  const foyer1 = loadFromStorage<{ regimeMatrimonial?: string; statutMatrimonial?: string }>('patrisim_bloc1_foyer', {})
  const p1Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const p2Data = loadFromStorage<{ prenom?: string }>('patrisim_bloc1_p2', {})
  const modeData = loadFromStorage<{ v?: string }>('patrisim_bloc1_mode', {})
  const isCouple = modeData.v === 'couple'
  const p1Label = p1Data.prenom?.trim() || 'Personne 1'
  const p2Label = p2Data.prenom?.trim() || 'Personne 2'
  const regimeMatrimonial = foyer1.regimeMatrimonial ?? ''
  const statutMatrimonial = foyer1.statutMatrimonial ?? ''
  const titulairesOptions = isCouple ? [p1Label, p2Label, 'Joint'] : [p1Label]
  const titulairesP1P2 = isCouple ? [p1Label, p2Label] : [p1Label]

  const [state, setState] = useState<Bloc2State>(() => loadFromStorage('patrisim_bloc2', defaultState()))
  const [savedAt, setSavedAt] = useState<string>('')
  const upd = useCallback(<K extends keyof Bloc2State>(k: K, v: Bloc2State[K]) => setState(s => ({ ...s, [k]: v })), [])

  useEffect(() => {
    localStorage.setItem('patrisim_bloc2', JSON.stringify(state))
    setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [state])

  // ── Calculs patrimoine ─────────────────────────────────────────────────────
  const totalImmo = (() => {
    let t = state.proprietaireRP ? bienValeur(state.rp) : 0
    t += state.biens.reduce((a, b) => a + bienValeur(b), 0)
    t += state.scpis.reduce((a, s) => a + parseNum(s.nbParts) * parseNum(s.prixRetrait), 0)
    return t
  })()
  const totalFinancier = (() => {
    let t = state.comptesCourants.reduce((a, c) => a + parseNum(c.solde), 0)
    t += state.livrets.reduce((a, l) => a + parseNum(l.solde), 0)
    t += state.peas.reduce((a, p) => a + parseNum(p.valeur), 0)
    t += state.ctos.reduce((a, c) => a + parseNum(c.valeur), 0)
    t += state.avs.reduce((a, av) => a + parseNum(av.valeurRachat), 0)
    t += state.pers.reduce((a, p) => a + parseNum(p.valeur), 0)
    t += state.epargneSalariale.reduce((a, e) => a + parseNum(e.valeur), 0)
    if (state.aCrypto) t += parseNum(state.crypto.valeur)
    if (state.aAutresPlacements) {
      if (state.autresPlacements.orPhysique) t += parseNum(state.autresPlacements.orValeur)
      if (state.autresPlacements.produitStructure) t += parseNum(state.autresPlacements.psValeur)
      if (state.autresPlacements.pretTiers) t += parseNum(state.autresPlacements.pretMontant)
      if (state.autresPlacements.autre) t += parseNum(state.autresPlacements.autreValeur)
    }
    return t
  })()
  const totalAutres = (() => {
    let t = state.vehicules.reduce((a, v) => a + parseNum(v.valeur), 0)
    t += parseNum(state.oeuvreArt.valeur) + parseNum(state.foretTerre.valeur)
    t += state.partsSociales.reduce((a, p) => a + parseNum(p.valeur), 0)
    t += parseNum(state.autreActif.valeur)
    return t
  })()
  const totalBrut = totalImmo + totalFinancier + totalAutres

  const pvLatentes = (() => {
    let t = state.peas.reduce((a, p) => a + (parseNum(p.valeur) - parseNum(p.versements)), 0)
    t += state.ctos.reduce((a, c) => a + (parseNum(c.valeur) - parseNum(c.prixRevient)), 0)
    t += state.avs.reduce((a, av) => a + (parseNum(av.valeurRachat) - parseNum(av.versements)), 0)
    if (state.aCrypto) t += parseNum(state.crypto.valeur) - parseNum(state.crypto.prixRevient)
    t += state.scpis.reduce((a, s) => { const nb = parseNum(s.nbParts); return a + nb * parseNum(s.prixRetrait) - nb * parseNum(s.prixSouscription) }, 0)
    return t
  })()

  const revenuPatrimoniaux = (() => {
    let t = state.biens.filter(b => b.loue).reduce((a, b) => a + parseNum(b.location.loyerMensuel) * 12 * parseNum(b.location.tauxOccupation) / 100 - parseNum(b.location.chargesAnnuelles), 0)
    t += state.scpis.reduce((a, s) => a + parseNum(s.dividendesAnnuels), 0)
    t += state.livrets.filter(l => l.type === 'PEL' || l.type === 'CEL' || l.type === 'Livret bancaire ordinaire').reduce((a, l) => a + parseNum(l.solde) * parseNum(l.taux) / 100, 0)
    return t
  })()

  const nbActifs = [
    state.proprietaireRP ? 1 : 0,
    state.biens.length, state.scpis.length,
    state.comptesCourants.length, state.livrets.length, state.peas.length,
    state.ctos.length, state.avs.length, state.pers.length,
    state.epargneSalariale.length,
    state.aCrypto ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const origineTotal = Object.values(state.origine).reduce((a, b) => a + b, 0)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const addBien = () => upd('biens', [...state.biens, defaultBien()])
  const updateBien = (id: string, b: BienImmobilier) => upd('biens', state.biens.map(x => x.id === id ? b : x))
  const removeBien = (id: string) => upd('biens', state.biens.filter(b => b.id !== id))
  const addScpi = () => upd('scpis', [...state.scpis, defaultScpi()])
  const updateScpi = (id: string, s: ScpiDirecte) => upd('scpis', state.scpis.map(x => x.id === id ? s : x))
  const removeScpi = (id: string) => upd('scpis', state.scpis.filter(s => s.id !== id))

  const addCC = () => upd('comptesCourants', [...state.comptesCourants, defaultCC()])
  const updateCC = (id: string, c: CompteCourant) => upd('comptesCourants', state.comptesCourants.map(x => x.id === id ? c : x))
  const removeCC = (id: string) => upd('comptesCourants', state.comptesCourants.filter(c => c.id !== id))

  const addLivret = () => upd('livrets', [...state.livrets, defaultLivret()])
  const updateLivret = (id: string, l: Livret) => upd('livrets', state.livrets.map(x => x.id === id ? l : x))
  const removeLivret = (id: string) => upd('livrets', state.livrets.filter(l => l.id !== id))

  const addPea = () => upd('peas', [...state.peas, defaultPea()])
  const updatePea = (id: string, p: Pea) => upd('peas', state.peas.map(x => x.id === id ? p : x))
  const removePea = (id: string) => upd('peas', state.peas.filter(p => p.id !== id))

  const addCto = () => upd('ctos', [...state.ctos, defaultCto()])
  const updateCto = (id: string, c: Cto) => upd('ctos', state.ctos.map(x => x.id === id ? c : x))
  const removeCto = (id: string) => upd('ctos', state.ctos.filter(c => c.id !== id))

  const addAv = () => upd('avs', [...state.avs, defaultAv()])
  const updateAv = (id: string, av: AssuranceVie) => upd('avs', state.avs.map(x => x.id === id ? av : x))
  const removeAv = (id: string) => upd('avs', state.avs.filter(av => av.id !== id))

  const addPer = () => upd('pers', [...state.pers, defaultPer()])
  const updatePer = (id: string, p: Per) => upd('pers', state.pers.map(x => x.id === id ? p : x))
  const removePer = (id: string) => upd('pers', state.pers.filter(p => p.id !== id))

  const addES = () => upd('epargneSalariale', [...state.epargneSalariale, defaultES()])
  const updateES = (i: number, e: EpargneSalariale) => upd('epargneSalariale', state.epargneSalariale.map((x, j) => j === i ? e : x))
  const removeES = (i: number) => upd('epargneSalariale', state.epargneSalariale.filter((_, j) => j !== i))

  const addPS = () => upd('partsSociales', [...state.partsSociales, defaultPartSociale()])
  const updatePS = (id: string, p: PartSociale) => upd('partsSociales', state.partsSociales.map(x => x.id === id ? p : x))
  const removePS = (id: string) => upd('partsSociales', state.partsSociales.filter(p => p.id !== id))

  const addVehicule = () => upd('vehicules', [...state.vehicules, defaultVehicule()])
  const updateVehicule = (id: string, v: Vehicule) => upd('vehicules', state.vehicules.map(x => x.id === id ? v : x))
  const removeVehicule = (id: string) => upd('vehicules', state.vehicules.filter(v => v.id !== id))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">

        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 2 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#185FA5] rounded-full" initial={{ width: '0%' }} animate={{ width: '28%' }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
            <span className="text-[11px] text-gray-300">28%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Actif patrimonial</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-xl">Renseignez l'ensemble de vos biens et placements. Répondez uniquement aux sections qui vous concernent.</p>
        </div>

        {/* ══ A — IMMOBILIER ══════════════════════════════════════════════════ */}
        <FadeIn delay={0}>
        <SectionDivider label="A — Immobilier" />
        <SubTitle>Résidence principale</SubTitle>
        <div className="mb-6">
          <Field label="Êtes-vous propriétaire de votre résidence principale ?"><Toggle value={state.proprietaireRP} onChange={v => upd('proprietaireRP', v)} /></Field>
          {state.proprietaireRP && <div className="mt-4"><BienCard bien={state.rp} onChange={b => upd('rp', b)} isRP p1Label={p1Label} p2Label={p2Label} regimeMatrimonial={regimeMatrimonial} statutMatrimonial={statutMatrimonial} /></div>}
        </div>
        <SubTitle>Autres biens immobiliers</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous d'autres biens immobiliers ?"><Toggle value={state.autresBiens} onChange={v => { upd('autresBiens', v); if (!v) upd('biens', []) }} /></Field>
          {state.autresBiens && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {state.biens.map(b => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }} className="relative">
                  <BienCard bien={b} onChange={nb => updateBien(b.id, nb)} p1Label={p1Label} p2Label={p2Label} regimeMatrimonial={regimeMatrimonial} statutMatrimonial={statutMatrimonial} />
                  <button type="button" onClick={() => removeBien(b.id)} className="absolute top-4 right-14 text-[11px] text-red-400 hover:text-red-600 font-medium">Supprimer</button>
                </motion.div>
              ))}
              </AnimatePresence>
              <AddBtn onClick={addBien} label="Ajouter un bien" />
            </div>
          )}
        </div>
        <SubTitle>SCPI en direct</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous des parts de SCPI en direct ?"><Toggle value={state.aScpi} onChange={v => { upd('aScpi', v); if (!v) upd('scpis', []) }} /></Field>
          {state.aScpi && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {state.scpis.map(s => <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}><ScpiCard scpi={s} onChange={ns => updateScpi(s.id, ns)} onRemove={() => removeScpi(s.id)} p1Label={p1Label} p2Label={p2Label} /></motion.div>)}
              </AnimatePresence>
              <AddBtn onClick={addScpi} label="Ajouter une SCPI" />
            </div>
          )}
        </div>

        </FadeIn>

        {/* ══ B — ACTIF FINANCIER ═════════════════════════════════════════════ */}
        <FadeIn delay={0.08}>
        <SectionDivider label="B — Actif financier" />

        {/* Comptes courants */}
        <SubTitle>Comptes courants</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous un ou plusieurs comptes courants ?"><Toggle value={state.aComptesCourants} onChange={v => { upd('aComptesCourants', v); if (!v) upd('comptesCourants', []) }} /></Field>
          {state.aComptesCourants && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {state.comptesCourants.map(c => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                <CardWrap title={c.etablissement || 'Compte courant'} subtitle={c.solde ? `${fmt(parseNum(c.solde))} €` : undefined} onRemove={() => removeCC(c.id)}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Établissement"><Input value={c.etablissement} onChange={v => updateCC(c.id, { ...c, etablissement: v })} placeholder="BNP Paribas" /></Field>
                    <Field label="Solde moyen estimé"><Input value={c.solde} onChange={v => updateCC(c.id, { ...c, solde: v })} placeholder="0" suffix="€" /></Field>
                  </div>
                  <Field label="Titulaire"><Chips options={titulairesOptions} value={c.titulaire} onChange={v => updateCC(c.id, { ...c, titulaire: v as string })} /></Field>
                  <InfoCard color="amber">L'argent sur un compte courant n'est pas rémunéré. Un CGP recommande de ne conserver que 1–2 mois de dépenses sur ce type de compte.</InfoCard>
                </CardWrap>
                </motion.div>
              ))}
              </AnimatePresence>
              <AddBtn onClick={addCC} label="Ajouter un compte courant" />
            </div>
          )}
        </div>

        {/* Livrets */}
        <SubTitle>Livrets et épargne réglementée</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous des livrets d'épargne ?"><Toggle value={state.aLivrets} onChange={v => { upd('aLivrets', v); if (!v) upd('livrets', []) }} /></Field>
          {state.aLivrets && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {state.livrets.map(l => {
                const isPelCel = l.type === 'PEL' || l.type === 'CEL'
                const annees = yearsAgo(l.dateOuverture)
                const pelAvantage = l.type === 'PEL' && l.dateOuverture && new Date(l.dateOuverture).getFullYear() < 2018
                return (
                  <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                  <CardWrap title={l.type || 'Livret'} subtitle={l.solde ? `${fmt(parseNum(l.solde))} €` : undefined} onRemove={() => removeLivret(l.id)}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Type de livret">
                        <Select value={l.type} onChange={v => {
                          const taux = TAUX_LIVRETS[v] ?? ''
                          updateLivret(l.id, { ...l, type: v, taux })
                        }}>
                          <option value="">Sélectionnez…</option>
                          {Object.keys(TAUX_LIVRETS).map(t => <option key={t}>{t}</option>)}
                        </Select>
                      </Field>
                      <Field label="Taux" tooltip={l.type === 'PEL' ? "Vérifiez sur votre relevé. Varie de 1% à 6% selon l'année d'ouverture. PEL ouvert en 2026 : 2.00%" : undefined}>
                        <Input type="number" value={l.taux} onChange={v => updateLivret(l.id, { ...l, taux: v })} placeholder="1.50" suffix="%" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Établissement"><Input value={l.etablissement} onChange={v => updateLivret(l.id, { ...l, etablissement: v })} placeholder="Caisse d'Épargne" /></Field>
                      <Field label="Solde actuel"><Input value={l.solde} onChange={v => updateLivret(l.id, { ...l, solde: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                    {isPelCel && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Date d'ouverture">
                          <div className="space-y-1.5">
                            <Input type="date" value={l.dateOuverture} onChange={v => updateLivret(l.id, { ...l, dateOuverture: v })} />
                            {annees !== null && (
                              pelAvantage
                                ? <Badge color="green">Exonéré d'impôt</Badge>
                                : l.type === 'PEL' ? <Badge color="amber">Soumis à la flat tax</Badge> : null
                            )}
                          </div>
                        </Field>
                        <Field label="Date d'échéance (optionnel)"><Input type="date" value={l.dateEcheance} onChange={v => updateLivret(l.id, { ...l, dateEcheance: v })} /></Field>
                      </div>
                    )}
                    <Field label="Titulaire"><Chips options={titulairesOptions} value={l.titulaire} onChange={v => updateLivret(l.id, { ...l, titulaire: v as string })} /></Field>
                  </CardWrap>
                  </motion.div>
                )
              })}
              </AnimatePresence>
              <AddBtn onClick={addLivret} label="Ajouter un livret" />
            </div>
          )}
        </div>

        {/* PEA */}
        <SubTitle>PEA</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous un PEA ?"><Toggle value={state.aPea} onChange={v => { upd('aPea', v); if (!v) upd('peas', []) }} /></Field>
          {state.aPea && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {state.peas.map(p => {
                const ans = yearsAgo(p.dateOuverture)
                const valeur = parseNum(p.valeur), versements = parseNum(p.versements)
                const pv = valeur - versements
                const plafondUtilise = Math.min(versements, 150000)
                const plafondPct = Math.round(plafondUtilise / 150000 * 100)
                const peaPmeVers = parseNum(p.peaPmeVersements)
                const plafondPmeDispo = Math.max(0, 225000 - versements - peaPmeVers)
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                  <CardWrap title={p.etablissement || 'PEA'} subtitle={valeur > 0 ? `${fmt(valeur)} €` : undefined} onRemove={() => removePea(p.id)}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Titulaire"><Chips options={titulairesP1P2} value={p.titulaire} onChange={v => updatePea(p.id, { ...p, titulaire: v as string })} /></Field>
                      <Field label="Établissement"><Input value={p.etablissement} onChange={v => updatePea(p.id, { ...p, etablissement: v })} placeholder="Bourse Direct" /></Field>
                    </div>
                    <Field label="Date d'ouverture">
                      <div className="space-y-1.5">
                        <Input type="date" value={p.dateOuverture} onChange={v => updatePea(p.id, { ...p, dateOuverture: v })} />
                        {ans !== null && (ans >= 5
                          ? <Badge color="green">✓ Avantage fiscal actif · exonération IR sur plus-values</Badge>
                          : <Badge color="amber">Avantage fiscal dans {5 - ans} an{5 - ans > 1 ? 's' : ''}</Badge>
                        )}
                      </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Valeur actuelle"><Input value={p.valeur} onChange={v => updatePea(p.id, { ...p, valeur: v })} placeholder="0" suffix="€" /></Field>
                      <Field label="Versements totaux" tooltip="Montant total que vous avez versé depuis l'ouverture">
                        <Input value={p.versements} onChange={v => updatePea(p.id, { ...p, versements: v })} placeholder="0" suffix="€" />
                      </Field>
                    </div>
                    {valeur > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Plus-value latente</p><PvBadge pv={pv} /></div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Plafond utilisé</p><p className="text-[12px] font-semibold text-gray-700">{plafondPct}%</p></div>
                        <div className="bg-[#E6F1FB] rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Capacité restante</p><p className="text-[12px] font-semibold text-[#185FA5]">{fmt(150000 - plafondUtilise)} €</p></div>
                      </div>
                    )}
                    <Field label="Composition"><Chips options={['ETF', 'Actions françaises', 'Actions européennes', 'Fonds actifs', 'Liquidités']} value={p.composition} onChange={v => updatePea(p.id, { ...p, composition: v as string[] })} multi small /></Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Rendement annuel estimé (optionnel)"><Input type="number" value={p.rendement} onChange={v => updatePea(p.id, { ...p, rendement: v })} placeholder="—" suffix="%" /></Field>
                      <Field label="Niveau de risque"><Chips options={['Faible', 'Modéré', 'Élevé', 'Très élevé']} value={p.risque} onChange={v => updatePea(p.id, { ...p, risque: v as string })} small /></Field>
                    </div>
                    <Field label="PEA-PME associé ?"><Toggle value={p.aPeaPme} onChange={v => updatePea(p.id, { ...p, aPeaPme: v })} /></Field>
                    {p.aPeaPme && (
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Établissement PEA-PME"><Input value={p.peaPmeEtab} onChange={v => updatePea(p.id, { ...p, peaPmeEtab: v })} placeholder="…" /></Field>
                          <Field label="Valeur"><Input value={p.peaPmeValeur} onChange={v => updatePea(p.id, { ...p, peaPmeValeur: v })} placeholder="0" suffix="€" /></Field>
                        </div>
                        <Field label="Versements PEA-PME"><Input value={p.peaPmeVersements} onChange={v => updatePea(p.id, { ...p, peaPmeVersements: v })} placeholder="0" suffix="€" /></Field>
                        <InfoCard color="blue">Plafond PEA-PME disponible : <strong>{fmt(plafondPmeDispo)} €</strong> (225 000 € − versements PEA − versements PEA-PME)</InfoCard>
                      </div>
                    )}
                  </CardWrap>
                  </motion.div>
                )
              })}
              </AnimatePresence>
              <AddBtn onClick={addPea} label="Ajouter un PEA" />
            </div>
          )}
        </div>

        {/* CTO */}
        <SubTitle>Compte-titres ordinaire (CTO)</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous un ou plusieurs CTO ?"><Toggle value={state.aCto} onChange={v => { upd('aCto', v); if (!v) upd('ctos', []) }} /></Field>
          {state.aCto && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {state.ctos.map(c => {
                const pv = parseNum(c.valeur) - parseNum(c.prixRevient)
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                  <CardWrap title={c.etablissement || 'CTO'} subtitle={c.valeur ? `${fmt(parseNum(c.valeur))} €` : undefined} onRemove={() => removeCto(c.id)}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Établissement"><Input value={c.etablissement} onChange={v => updateCto(c.id, { ...c, etablissement: v })} placeholder="Saxo Bank" /></Field>
                      <Field label="Titulaire"><Chips options={titulairesOptions} value={c.titulaire} onChange={v => updateCto(c.id, { ...c, titulaire: v as string })} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Valeur actuelle"><Input value={c.valeur} onChange={v => updateCto(c.id, { ...c, valeur: v })} placeholder="0" suffix="€" /></Field>
                      <Field label="Prix de revient total">
                        <div className="space-y-1.5">
                          <Input value={c.prixRevient} onChange={v => updateCto(c.id, { ...c, prixRevient: v })} placeholder="0" suffix="€" />
                          {c.valeur && c.prixRevient && <PvBadge pv={pv} />}
                        </div>
                      </Field>
                    </div>
                    <Field label="Composition"><Chips options={['Actions FR', 'Actions étrangères', 'Obligations', 'ETF', 'Fonds', 'Produits structurés', 'Liquidités']} value={c.composition} onChange={v => updateCto(c.id, { ...c, composition: v as string[] })} multi small /></Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Rendement annuel estimé"><Input type="number" value={c.rendement} onChange={v => updateCto(c.id, { ...c, rendement: v })} placeholder="—" suffix="%" /></Field>
                      <Field label="Niveau de risque"><Chips options={['Faible', 'Modéré', 'Élevé', 'Très élevé']} value={c.risque} onChange={v => updateCto(c.id, { ...c, risque: v as string })} small /></Field>
                    </div>
                    <Field label="Secteur principal (optionnel)"><Chips options={['Technologie', 'Santé', 'Énergie', 'Finance', 'Immobilier', 'Diversifié', 'Autre']} value={c.secteur} onChange={v => updateCto(c.id, { ...c, secteur: v as string })} small /></Field>
                  </CardWrap>
                  </motion.div>
                )
              })}
              </AnimatePresence>
              <AddBtn onClick={addCto} label="Ajouter un CTO" />
            </div>
          )}
        </div>

        {/* Assurance-vie */}
        <SubTitle>Assurance-vie</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous une ou plusieurs assurances-vie ?"><Toggle value={state.aAv} onChange={v => { upd('aAv', v); if (!v) upd('avs', []) }} /></Field>
          {state.aAv && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {(state.avs || []).map(av => {
                const ans = yearsAgo(av.dateOuverture)
                const pv = parseNum(av.valeurRachat) - parseNum(av.versements)
                const ucPct = 100 - av.fondsEurosPct
                const valeur = parseNum(av.valeurRachat)
                const totalBenef = (av.beneficiaires || []).reduce((a, b) => a + parseNum(b.pct), 0)
                return (
                  <motion.div key={av.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                  <CardWrap title={av.nom || av.compagnie || 'Assurance-vie'} subtitle={av.valeurRachat ? `${fmt(valeur)} €` : undefined} onRemove={() => removeAv(av.id)}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nom du contrat"><Input value={av.nom} onChange={v => updateAv(av.id, { ...av, nom: v })} placeholder="Floriane 2" /></Field>
                      <Field label="Compagnie"><Input value={av.compagnie} onChange={v => updateAv(av.id, { ...av, compagnie: v })} placeholder="Générali" /></Field>
                    </div>
                    <Field label="Date d'ouverture">
                      <div className="space-y-1.5">
                        <Input type="date" value={av.dateOuverture} onChange={v => updateAv(av.id, { ...av, dateOuverture: v })} />
                        {ans !== null && (ans >= 8
                          ? <Badge color="green">✓ Avantage fiscal actif · +8 ans</Badge>
                          : <Badge color="amber">Fiscalité pleine · avantage dans {8 - ans} an{8 - ans > 1 ? 's' : ''}</Badge>
                        )}
                      </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Valeur de rachat"><Input value={av.valeurRachat} onChange={v => updateAv(av.id, { ...av, valeurRachat: v })} placeholder="0" suffix="€" /></Field>
                      <Field label="Versements totaux" tooltip="Total des primes versées depuis l'ouverture">
                        <div className="space-y-1.5">
                          <Input value={av.versements} onChange={v => updateAv(av.id, { ...av, versements: v })} placeholder="0" suffix="€" />
                          {av.valeurRachat && av.versements && <PvBadge pv={pv} />}
                        </div>
                      </Field>
                    </div>
                    <Field label="Composition (fonds euros / UC)">
                      <CompositionFonds pct={av.fondsEurosPct} onChange={v => updateAv(av.id, { ...av, fondsEurosPct: v })} valeur={valeur} ucDetail={av.ucDetail || []} onUcChange={v => updateAv(av.id, { ...av, ucDetail: v })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Rendement annuel estimé"><Input type="number" value={av.rendement} onChange={v => updateAv(av.id, { ...av, rendement: v })} placeholder="—" suffix="%" /></Field>
                      <Field label="Niveau de risque global"><Chips options={['Faible', 'Modéré', 'Élevé', 'Très élevé']} value={av.risque} onChange={v => updateAv(av.id, { ...av, risque: v as string })} small /></Field>
                    </div>
                    <Field label="Clause bénéficiaire">
                      <Chips options={['Standard (conjoint puis enfants)', 'Personnalisée', 'Démembrée']} value={av.clauseBeneficiaire} onChange={v => updateAv(av.id, { ...av, clauseBeneficiaire: v as string, beneficiaires: [] })} small />
                    </Field>
                    {(av.clauseBeneficiaire === 'Personnalisée' || av.clauseBeneficiaire === 'Démembrée') && (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        {(av.beneficiaires || []).map((b, i) => (
                          <div key={i} className="flex gap-3 items-center">
                            <div className="flex-1"><Input value={b.nom} onChange={v => { const bs = [...(av.beneficiaires || [])]; bs[i] = { ...b, nom: v }; updateAv(av.id, { ...av, beneficiaires: bs }) }} placeholder="Prénom Nom" /></div>
                            <div className="w-20"><Input value={b.pct} onChange={v => { const bs = [...(av.beneficiaires || [])]; bs[i] = { ...b, pct: v }; updateAv(av.id, { ...av, beneficiaires: bs }) }} suffix="%" placeholder="50" /></div>
                            <button type="button" onClick={() => { const bs = (av.beneficiaires || []).filter((_, j) => j !== i); updateAv(av.id, { ...av, beneficiaires: bs }) }} className="text-red-400 hover:text-red-600 text-[11px]">✕</button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => updateAv(av.id, { ...av, beneficiaires: [...(av.beneficiaires || []), { nom: '', pct: '' }] })} className="text-[12px] text-[#185FA5] hover:text-[#0C447C] font-medium">+ Ajouter un bénéficiaire</button>
                          {(av.beneficiaires || []).length > 0 && <span className={`text-[11px] font-semibold ${totalBenef === 100 ? 'text-[#0F6E56]' : 'text-amber-600'}`}>Total : {totalBenef}%</span>}
                        </div>
                      </div>
                    )}
                    <Field label="Avances ou rachats partiels ?"><Toggle value={av.avancesRachats} onChange={v => updateAv(av.id, { ...av, avancesRachats: v })} /></Field>
                    {av.avancesRachats && <Field label="Montant total racheté"><Input value={av.montantRachete} onChange={v => updateAv(av.id, { ...av, montantRachete: v })} placeholder="0" suffix="€" /></Field>}
                    <Field label="Titulaire"><Chips options={titulairesP1P2} value={av.titulaire} onChange={v => updateAv(av.id, { ...av, titulaire: v as string })} /></Field>
                  </CardWrap>
                  </motion.div>
                )
              })}
              </AnimatePresence>
              <AddBtn onClick={addAv} label="Ajouter un contrat" />
            </div>
          )}
        </div>

        {/* PER */}
        <SubTitle>PER — Plan d'épargne retraite</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous un PER ?"><Toggle value={state.aPer} onChange={v => { upd('aPer', v); if (!v) upd('pers', []) }} /></Field>
          {state.aPer && (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
              {state.pers.map(p => {
                const valeur = parseNum(p.valeur)
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                  <CardWrap title={p.etablissement || p.type || 'PER'} subtitle={p.valeur ? `${fmt(valeur)} €` : undefined} onRemove={() => removePer(p.id)}>
                    <Field label="Type"><Chips options={['PER individuel', 'PER collectif (PERCOL)', 'PER obligatoire (PERO)']} value={p.type} onChange={v => updatePer(p.id, { ...p, type: v as string })} small /></Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Établissement"><Input value={p.etablissement} onChange={v => updatePer(p.id, { ...p, etablissement: v })} placeholder="Amundi" /></Field>
                      <Field label="Valeur actuelle"><Input value={p.valeur} onChange={v => updatePer(p.id, { ...p, valeur: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Versements volontaires cumulés" tooltip="Ces versements ont été déduits de vos revenus imposables">
                        <Input value={p.versementsVolontaires} onChange={v => updatePer(p.id, { ...p, versementsVolontaires: v })} placeholder="0" suffix="€" />
                      </Field>
                      {p.type === 'PER collectif (PERCOL)' && (
                        <Field label="Versements employeur cumulés"><Input value={p.versementsEmployeur} onChange={v => updatePer(p.id, { ...p, versementsEmployeur: v })} placeholder="0" suffix="€" /></Field>
                      )}
                    </div>
                    <Field label="Composition (fonds euros / UC)">
                      <CompositionFonds pct={p.fondsEurosPct} onChange={v => updatePer(p.id, { ...p, fondsEurosPct: v })} valeur={valeur} ucDetail={p.ucDetail} onUcChange={v => updatePer(p.id, { ...p, ucDetail: v })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Rendement annuel estimé"><Input type="number" value={p.rendement} onChange={v => updatePer(p.id, { ...p, rendement: v })} placeholder="—" suffix="%" /></Field>
                      <Field label="Niveau de risque"><Chips options={['Faible', 'Modéré', 'Élevé', 'Très élevé']} value={p.risque} onChange={v => updatePer(p.id, { ...p, risque: v as string })} small /></Field>
                    </div>
                    <Field label="Mode de sortie envisagé"><Chips options={['Rente viagère', 'Capital', 'Mixte']} value={p.modeSortie} onChange={v => updatePer(p.id, { ...p, modeSortie: v as string })} /></Field>
                    <Field label="Déjà débloqué partiellement ?"><Toggle value={p.deblocage} onChange={v => updatePer(p.id, { ...p, deblocage: v })} /></Field>
                    {p.deblocage && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Montant débloqué"><Input value={p.montantDebloque} onChange={v => updatePer(p.id, { ...p, montantDebloque: v })} placeholder="0" suffix="€" /></Field>
                        <Field label="Motif">
                          <Select value={p.motifDeblocage} onChange={v => updatePer(p.id, { ...p, motifDeblocage: v })}>
                            <option value="">Sélectionnez…</option>
                            <option>Retraite</option><option>Achat RP</option><option>Invalidité</option>
                            <option>Décès conjoint</option><option>Surendettement</option><option>Autre</option>
                          </Select>
                        </Field>
                      </div>
                    )}
                    <Field label="Titulaire"><Chips options={titulairesP1P2} value={p.titulaire} onChange={v => updatePer(p.id, { ...p, titulaire: v as string })} /></Field>
                  </CardWrap>
                  </motion.div>
                )
              })}
              </AnimatePresence>
              <AddBtn onClick={addPer} label="Ajouter un PER" />
            </div>
          )}
        </div>

        {/* Épargne salariale */}
        <SubTitle>Épargne salariale</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous de l'épargne salariale ?"><Toggle value={state.aEpargneSalariale} onChange={v => { upd('aEpargneSalariale', v); if (!v) upd('epargneSalariale', []) }} /></Field>
          {state.aEpargneSalariale && (
            <div className="mt-4 space-y-3">
              {state.epargneSalariale.map((e, i) => (
                <CardWrap key={i} title={e.type || 'Épargne salariale'} subtitle={e.valeur ? `${fmt(parseNum(e.valeur))} €` : undefined} onRemove={() => removeES(i)}>
                  <Field label="Type">
                    <Select value={e.type} onChange={v => updateES(i, { ...e, type: v })}>
                      <option value="">Sélectionnez…</option>
                      <option>PEE</option><option>PERCO</option><option>PERO</option><option>Intéressement non investi</option>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Entreprise"><Input value={e.entreprise} onChange={v => updateES(i, { ...e, entreprise: v })} placeholder="Nom de l'entreprise" /></Field>
                    <Field label="Valeur actuelle"><Input value={e.valeur} onChange={v => updateES(i, { ...e, valeur: v })} placeholder="0" suffix="€" /></Field>
                  </div>
                  <Field label="Disponibilité"><Chips options={['Disponible', 'Bloqué']} value={e.disponibilite} onChange={v => updateES(i, { ...e, disponibilite: v as string })} /></Field>
                  {e.disponibilite === 'Bloqué' && <Field label="Date de déblocage"><Input type="date" value={e.dateDeblocage} onChange={v => updateES(i, { ...e, dateDeblocage: v })} /></Field>}
                  <Field label="Titulaire"><Chips options={titulairesP1P2} value={e.titulaire} onChange={v => updateES(i, { ...e, titulaire: v as string })} /></Field>
                </CardWrap>
              ))}
              <AddBtn onClick={addES} label="Ajouter une épargne salariale" />
            </div>
          )}
        </div>

        {/* Crypto */}
        <SubTitle>Cryptomonnaies</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous des cryptomonnaies ?"><Toggle value={state.aCrypto} onChange={v => upd('aCrypto', v)} /></Field>
          {state.aCrypto && (
            <div className="mt-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Valeur totale actuelle"><Input value={state.crypto.valeur} onChange={v => upd('crypto', { ...state.crypto, valeur: v })} placeholder="0" suffix="€" /></Field>
                  <Field label="Prix de revient global">
                    <div className="space-y-1.5">
                      <Input value={state.crypto.prixRevient} onChange={v => upd('crypto', { ...state.crypto, prixRevient: v })} placeholder="0" suffix="€" />
                      {state.crypto.valeur && state.crypto.prixRevient && <PvBadge pv={parseNum(state.crypto.valeur) - parseNum(state.crypto.prixRevient)} />}
                    </div>
                  </Field>
                </div>
                <Field label="Plateformes déclarées (formulaire 3916-bis) ?"><Toggle value={state.crypto.plateformeDeclaree} onChange={v => upd('crypto', { ...state.crypto, plateformeDeclaree: v })} /></Field>
                {!state.crypto.plateformeDeclaree && (
                  <InfoCard color="amber">Les comptes crypto détenus sur plateformes étrangères doivent être déclarés chaque année (formulaire 3916-bis). Une omission peut entraîner des pénalités.</InfoCard>
                )}
                <Field label="Composition (optionnel)"><Chips options={['Bitcoin', 'Ethereum', 'Stablecoins', 'Altcoins', 'Autres']} value={state.crypto.composition} onChange={v => upd('crypto', { ...state.crypto, composition: v as string[] })} multi small /></Field>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider">Niveau de risque</span>
                  <Badge color="red">Très élevé</Badge>
                  <span className="text-[11px] text-gray-400">— par nature</span>
                </div>
                <Field label="Titulaire"><Chips options={titulairesOptions} value={state.crypto.titulaire} onChange={v => upd('crypto', { ...state.crypto, titulaire: v as string })} /></Field>
              </div>
            </div>
          )}
        </div>

        {/* Autres placements */}
        <SubTitle>Autres placements financiers</SubTitle>
        <div className="mb-6">
          <Field label="Avez-vous d'autres placements financiers ?"><Toggle value={state.aAutresPlacements} onChange={v => upd('aAutresPlacements', v)} /></Field>
          {state.aAutresPlacements && (
            <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              {/* Or */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={state.autresPlacements.orPhysique} onChange={e => upd('autresPlacements', { ...state.autresPlacements, orPhysique: e.target.checked })} className="rounded border-gray-300 text-[#185FA5]" />
                  <span className="text-[13px] font-medium text-gray-700">Or physique</span>
                </label>
                {state.autresPlacements.orPhysique && (
                  <div className="space-y-3 pl-6">
                    <Field label="Forme"><Chips options={['Lingots', 'Pièces', 'Certificats or']} value={state.autresPlacements.orForme} onChange={v => upd('autresPlacements', { ...state.autresPlacements, orForme: v as string })} /></Field>
                    <Field label="Valeur estimée"><Input value={state.autresPlacements.orValeur} onChange={v => upd('autresPlacements', { ...state.autresPlacements, orValeur: v })} placeholder="0" suffix="€" /></Field>
                  </div>
                )}
              </div>
              {/* Produits structurés */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={state.autresPlacements.produitStructure} onChange={e => upd('autresPlacements', { ...state.autresPlacements, produitStructure: e.target.checked })} className="rounded border-gray-300 text-[#185FA5]" />
                  <span className="text-[13px] font-medium text-gray-700">Produits structurés</span>
                </label>
                {state.autresPlacements.produitStructure && (
                  <div className="space-y-3 pl-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Émetteur"><Input value={state.autresPlacements.psEmetteur} onChange={v => upd('autresPlacements', { ...state.autresPlacements, psEmetteur: v })} placeholder="Société Générale" /></Field>
                      <Field label="Valeur nominale"><Input value={state.autresPlacements.psValeur} onChange={v => upd('autresPlacements', { ...state.autresPlacements, psValeur: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Échéance"><Input type="date" value={state.autresPlacements.psEcheance} onChange={v => upd('autresPlacements', { ...state.autresPlacements, psEcheance: v })} /></Field>
                      <Field label="Capital garanti ?"><Toggle value={state.autresPlacements.psGaranti} onChange={v => upd('autresPlacements', { ...state.autresPlacements, psGaranti: v })} /></Field>
                      <Field label="Rendement cible"><Input type="number" value={state.autresPlacements.psRendement} onChange={v => upd('autresPlacements', { ...state.autresPlacements, psRendement: v })} placeholder="—" suffix="%" /></Field>
                    </div>
                  </div>
                )}
              </div>
              {/* Prêts */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={state.autresPlacements.pretTiers} onChange={e => upd('autresPlacements', { ...state.autresPlacements, pretTiers: e.target.checked })} className="rounded border-gray-300 text-[#185FA5]" />
                  <span className="text-[13px] font-medium text-gray-700">Prêts consentis à des tiers</span>
                </label>
                {state.autresPlacements.pretTiers && (
                  <div className="space-y-3 pl-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Bénéficiaire"><Input value={state.autresPlacements.pretBeneficiaire} onChange={v => upd('autresPlacements', { ...state.autresPlacements, pretBeneficiaire: v })} placeholder="Prénom Nom" /></Field>
                      <Field label="Montant restant dû"><Input value={state.autresPlacements.pretMontant} onChange={v => upd('autresPlacements', { ...state.autresPlacements, pretMontant: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Taux"><Input type="number" value={state.autresPlacements.pretTaux} onChange={v => upd('autresPlacements', { ...state.autresPlacements, pretTaux: v })} placeholder="0" suffix="%" /></Field>
                      <Field label="Échéance"><Input type="date" value={state.autresPlacements.pretEcheance} onChange={v => upd('autresPlacements', { ...state.autresPlacements, pretEcheance: v })} /></Field>
                    </div>
                  </div>
                )}
              </div>
              {/* Autre */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={state.autresPlacements.autre} onChange={e => upd('autresPlacements', { ...state.autresPlacements, autre: e.target.checked })} className="rounded border-gray-300 text-[#185FA5]" />
                  <span className="text-[13px] font-medium text-gray-700">Autre actif financier</span>
                </label>
                {state.autresPlacements.autre && (
                  <div className="space-y-3 pl-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Description"><Input value={state.autresPlacements.autreDesc} onChange={v => upd('autresPlacements', { ...state.autresPlacements, autreDesc: v })} placeholder="…" /></Field>
                      <Field label="Valeur"><Input value={state.autresPlacements.autreValeur} onChange={v => upd('autresPlacements', { ...state.autresPlacements, autreValeur: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Rendement estimé"><Input type="number" value={state.autresPlacements.autreRendement} onChange={v => upd('autresPlacements', { ...state.autresPlacements, autreRendement: v })} placeholder="—" suffix="%" /></Field>
                      <Field label="Niveau de risque"><Chips options={['Faible', 'Modéré', 'Élevé', 'Très élevé']} value={state.autresPlacements.autreRisque} onChange={v => upd('autresPlacements', { ...state.autresPlacements, autreRisque: v as string })} small /></Field>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        </FadeIn>

        {/* ══ C — AUTRES ACTIFS ══════════════════════════════════════════════ */}
        <FadeIn delay={0.16}>
        <SectionDivider label="C — Autres actifs" />
        <div className="mb-6">
          <Field label="Possédez-vous des actifs non financiers et non immobiliers ?"><Toggle value={state.aAutresActifs} onChange={v => upd('aAutresActifs', v)} /></Field>
          {state.aAutresActifs && (
            <div className="mt-4 space-y-5">
              <Field label="Types d'actifs">
                <Chips options={['Véhicules', "Œuvres d'art & collection", 'Forêts & terres agricoles', 'Parts sociales & equity non coté', 'Autre']} value={state.typesAutresActifs} onChange={v => upd('typesAutresActifs', v as string[])} multi />
              </Field>

              {/* Véhicules */}
              {state.typesAutresActifs.includes('Véhicules') && (
                <div className="space-y-3">
                  <SubTitle>Véhicules</SubTitle>
                  {state.vehicules.map(v => (
                    <CardWrap key={v.id} title={[v.marque, v.modele, v.annee].filter(Boolean).join(' ') || 'Véhicule'} subtitle={v.valeur ? `${fmt(parseNum(v.valeur))} €` : undefined} onRemove={() => removeVehicule(v.id)}>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Marque"><Input value={v.marque} onChange={x => updateVehicule(v.id, { ...v, marque: x })} placeholder="Tesla" /></Field>
                        <Field label="Modèle"><Input value={v.modele} onChange={x => updateVehicule(v.id, { ...v, modele: x })} placeholder="Model 3" /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Année"><Input type="number" value={v.annee} onChange={x => updateVehicule(v.id, { ...v, annee: x })} placeholder="2022" /></Field>
                        <Field label="Valeur estimée"><Input value={v.valeur} onChange={x => updateVehicule(v.id, { ...v, valeur: x })} placeholder="0" suffix="€" /></Field>
                      </div>
                    </CardWrap>
                  ))}
                  <AddBtn onClick={addVehicule} label="Ajouter un véhicule" />
                </div>
              )}

              {/* Œuvres d'art */}
              {state.typesAutresActifs.includes("Œuvres d'art & collection") && (
                <div>
                  <SubTitle>Œuvres d'art & collection</SubTitle>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Description"><Input value={state.oeuvreArt.description} onChange={v => upd('oeuvreArt', { ...state.oeuvreArt, description: v })} placeholder="Tableau, sculpture…" /></Field>
                      <Field label="Valeur estimée"><Input value={state.oeuvreArt.valeur} onChange={v => upd('oeuvreArt', { ...state.oeuvreArt, valeur: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                    <Field label="Expertise récente ?"><Toggle value={state.oeuvreArt.expertise} onChange={v => upd('oeuvreArt', { ...state.oeuvreArt, expertise: v })} /></Field>
                    {state.oeuvreArt.expertise && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Date d'expertise"><Input type="date" value={state.oeuvreArt.dateExpertise} onChange={v => upd('oeuvreArt', { ...state.oeuvreArt, dateExpertise: v })} /></Field>
                        <Field label="Montant expertisé"><Input value={state.oeuvreArt.montantExpertise} onChange={v => upd('oeuvreArt', { ...state.oeuvreArt, montantExpertise: v })} placeholder="0" suffix="€" /></Field>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Forêts */}
              {state.typesAutresActifs.includes('Forêts & terres agricoles') && (
                <div>
                  <SubTitle>Forêts & terres agricoles</SubTitle>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Surface"><Input value={state.foretTerre.surface} onChange={v => upd('foretTerre', { ...state.foretTerre, surface: v })} placeholder="10" suffix="ha" /></Field>
                      <Field label="Département"><Input value={state.foretTerre.departement} onChange={v => upd('foretTerre', { ...state.foretTerre, departement: v })} placeholder="Creuse (23)" /></Field>
                      <Field label="Valeur estimée"><Input value={state.foretTerre.valeur} onChange={v => upd('foretTerre', { ...state.foretTerre, valeur: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Parts sociales */}
              {state.typesAutresActifs.includes('Parts sociales & equity non coté') && (
                <div className="space-y-3">
                  <SubTitle>Parts sociales & equity non coté</SubTitle>
                  {state.partsSociales.map(p => (
                    <CardWrap key={p.id} title={p.nomSociete || 'Société'} subtitle={p.valeur ? `${fmt(parseNum(p.valeur))} €` : undefined} onRemove={() => removePS(p.id)}>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Nom de la société"><Input value={p.nomSociete} onChange={v => updatePS(p.id, { ...p, nomSociete: v })} placeholder="Ma Société SAS" /></Field>
                        <Field label="Forme juridique">
                          <Select value={p.formeJuridique} onChange={v => updatePS(p.id, { ...p, formeJuridique: v })}>
                            <option value="">Sélectionnez…</option>
                            <option>EI</option><option>EURL</option><option>SARL</option><option>SAS</option>
                            <option>SASU</option><option>SA</option><option>SCI</option><option>Autre</option>
                          </Select>
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="% détenu"><Input type="number" value={p.pctDetenu} onChange={v => updatePS(p.id, { ...p, pctDetenu: v })} placeholder="100" suffix="%" /></Field>
                        <Field label="Valeur estimée"><Input value={p.valeur} onChange={v => updatePS(p.id, { ...p, valeur: v })} placeholder="0" suffix="€" /></Field>
                      </div>
                      <Field label="Méthode de valorisation"><Chips options={['EBE × multiple', 'Actif net', 'Autre']} value={p.methodeValorisation} onChange={v => updatePS(p.id, { ...p, methodeValorisation: v as string })} /></Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Date dernière valorisation"><Input type="date" value={p.dateValorisation} onChange={v => updatePS(p.id, { ...p, dateValorisation: v })} /></Field>
                        <Field label="Nature juridique"><Chips options={[`Bien propre ${p1Label}`, `Bien propre ${p2Label}`, 'Bien commun']} value={p.natureJuridique} onChange={v => updatePS(p.id, { ...p, natureJuridique: v as string })} small /></Field>
                      </div>
                    </CardWrap>
                  ))}
                  <AddBtn onClick={addPS} label="Ajouter une société" />
                </div>
              )}

              {/* Autre */}
              {state.typesAutresActifs.includes('Autre') && (
                <div>
                  <SubTitle>Autre actif</SubTitle>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Description"><Input value={state.autreActif.description} onChange={v => upd('autreActif', { ...state.autreActif, description: v })} placeholder="…" /></Field>
                      <Field label="Valeur"><Input value={state.autreActif.valeur} onChange={v => upd('autreActif', { ...state.autreActif, valeur: v })} placeholder="0" suffix="€" /></Field>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        </FadeIn>

        {/* ══ D — ORIGINE DU PATRIMOINE ════════════════════════════════════════ */}
        <FadeIn delay={0.24}>
        <SectionDivider label="D — Origine du patrimoine" />
        <div className="mb-8">
          <OrigineSliders origine={state.origine} onChange={o => upd('origine', o)} />
        </div>
        </FadeIn>

        {/* ══ SYNTHÈSE ════════════════════════════════════════════════════════ */}
        {!state.showSynthese && (
          <button type="button" onClick={() => upd('showSynthese', true)}
            className={`w-full py-4 rounded-2xl text-[14px] font-semibold transition-all ${origineTotal === 100 ? 'bg-[#185FA5] text-white hover:bg-[#0C447C] shadow-[0_4px_14px_rgba(24,95,165,0.25)]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            disabled={origineTotal !== 100}>
            {origineTotal === 100 ? 'Voir la synthèse →' : `Complétez l'origine du patrimoine (${origineTotal}/100%)`}
          </button>
        )}

        {state.showSynthese && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">Synthèse Bloc 2</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* 4 métriques */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Patrimoine brut total" value={`${fmt(totalBrut)} €`} color="blue" />
              <MetricCard label="Plus-values latentes" value={`${pvLatentes >= 0 ? '+' : ''}${fmt(pvLatentes)} €`} color={pvLatentes >= 0 ? 'green' : 'default'} />
              <MetricCard label="Revenus patrimoniaux annuels" value={`${fmt(revenuPatrimoniaux)} €`} sub="Loyers nets + dividendes SCPI + intérêts" />
              <MetricCard label="Nombre d'actifs saisis" value={String(nbActifs)} sub="tous types confondus" />
            </div>

            {/* Donut chart */}
            {totalBrut > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-[14px] font-semibold text-gray-800 mb-4">Répartition du patrimoine brut</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Immobilier', value: totalImmo, color: '#185FA5' },
                      { name: 'Financier', value: totalFinancier, color: '#0F6E56' },
                      { name: 'Autres actifs', value: totalAutres, color: '#6B7280' },
                    ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                      dataKey="value"
                    >
                      {[totalImmo, totalFinancier, totalAutres].filter((v) => v > 0).map((_, i) => (
                        <Cell key={i} fill={['#185FA5', '#0F6E56', '#6B7280'][i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
                    <Legend formatter={(v) => <span className="text-[12px] text-gray-600">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { label: 'Immobilier', value: totalImmo, color: 'bg-[#185FA5]' },
                    { label: 'Financier', value: totalFinancier, color: 'bg-[#0F6E56]' },
                    { label: 'Autres', value: totalAutres, color: 'bg-gray-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-1`} />
                      <p className="text-[11px] text-gray-500">{label}</p>
                      <p className="text-[13px] font-semibold text-gray-800">{fmt(value)} €</p>
                      {totalBrut > 0 && <p className="text-[10px] text-gray-400">{Math.round(value / totalBrut * 100)}%</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={() => navigate(getNextBloc(2))}
              className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
              Confirmer et passer au Bloc 3 — Passif & dettes →
            </button>
          </div>
        )}

      </div>

      {/* Barre sticky */}
      <div className="fixed bottom-[72px] left-[220px] right-0 bg-white border-t border-gray-100 px-8 py-2.5 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">Immobilier</span><span className="text-[13px] font-semibold text-gray-700">{fmt(totalImmo)} €</span></div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">Financier</span><span className="text-[13px] font-semibold text-gray-700">{fmt(totalFinancier)} €</span></div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">Autres</span><span className="text-[13px] font-semibold text-gray-700">{fmt(totalAutres)} €</span></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">Total actif</span>
            <span className="text-[18px] font-bold text-[#185FA5]">{fmt(totalBrut)} €</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={() => navigate('/bloc1')} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">← Retour</button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          <button type="button" onClick={() => navigate(getNextBloc(2))}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}