import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getNextBloc } from '../utils/navigation'
import FadeIn from '../components/FadeIn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Personne {
  prenom: string
  nom: string
  dateNaissance: string
  nationalite: string
  autrePays: string
}

interface EnfantCharge {
  prenom: string
  age: string
  gardeAlternee: boolean
  handicape: boolean
  autreUnion: boolean
  autreUnionParent: 'P1' | 'P2' | ''
}

interface EnfantMajeur {
  prenom: string
  age: string
  aCharge: boolean
  gardeAlternee: boolean
  etudes: boolean
  handicape: boolean
  autreUnion: boolean
  autreUnionParent: 'P1' | 'P2' | ''
}

interface AutreCharge {
  lien: string
  autreDesc: string
  prenom: string
  coutMensuel: string
}

interface PetitEnfant {
  prenom: string
  age: string
  parentEnfant: string
}

interface SituationPro {
  statut: string
  secteur: string
  typeContrat: string
  anciennete: string
  caissesRetraite: string
  dateDepartRetraite: string
  formeJuridique: string
}

interface ConnaissanceFinanciere {
  niveauGeneral: string
  produits: string[]
}

interface Foyer {
  statutMatrimonial: string
  unionPrecedente: boolean
  nbUnionsPrecedentes: string
  regimeMatrimonial: string
  // Logement
  typeLogement: string
  logementAutreDetail: string
  enfantsCharge: number
  enfants: EnfantCharge[]
  enfantsMajeurs: number
  majeurs: EnfantMajeur[]
  petitsEnfants: PetitEnfant[]
  autresCharges: AutreCharge[]
}

interface Errors {
  p1Prenom?: string
  p1Nom?: string
  p1Date?: string
  p2Prenom?: string
  p2Nom?: string
  p2Date?: string
  statutMatrimonial?: string
  pro1Statut?: string
  pro2Statut?: string
  cf1Niveau?: string
  cf2Niveau?: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultPersonne: Personne = {
  prenom: '', nom: '', dateNaissance: '', nationalite: 'Française', autrePays: '',
}

const defaultFoyer: Foyer = {
  statutMatrimonial: '', unionPrecedente: false, nbUnionsPrecedentes: '',
  regimeMatrimonial: '',
  typeLogement: '', logementAutreDetail: '',
  enfantsCharge: 0, enfants: [], enfantsMajeurs: 0,
  majeurs: [], petitsEnfants: [], autresCharges: [],
}

const defaultSituationPro = (): SituationPro => ({
  statut: '', secteur: '', typeContrat: '', anciennete: '',
  caissesRetraite: '', dateDepartRetraite: '', formeJuridique: '',
})

const defaultCF = (): ConnaissanceFinanciere => ({
  niveauGeneral: '', produits: [],
})

// ─── Constants ────────────────────────────────────────────────────────────────

const regimesMatrimoniaux: Record<string, string> = {
  'Communauté légale réduite aux acquêts': 'Les biens acquis pendant le mariage appartiennent aux deux époux à parts égales.',
  'Séparation de biens': "Chaque époux reste propriétaire exclusif des biens qu'il acquiert.",
  'Communauté universelle': 'Tous les biens présents et futurs sont communs aux deux époux.',
  'Participation aux acquêts': 'Régime mixte : séparation pendant le mariage, partage des gains à la dissolution.',
  'PACS — régime légal': 'Par défaut, chaque partenaire conserve ses biens propres.',
  'PACS — indivision': 'Les biens acquis ensemble appartiennent aux deux partenaires.',
}

const niveauxCF: { label: string; tooltip: string }[] = [
  { label: 'Débutant',      tooltip: "Peu ou pas d'expérience en investissement" },
  { label: 'Intermédiaire', tooltip: 'Connaissance des produits courants (AV, PEA...)' },
  { label: 'Confirmé',      tooltip: 'Expérience régulière sur marchés financiers' },
  { label: 'Expert',        tooltip: 'Professionnel ou investisseur très actif' },
]

const produitsCF = [
  'Livrets réglementés', 'PEA', 'Assurance-vie', 'PER', 'SCPI',
  'Actions & obligations', 'Produits structurés', 'Cryptomonnaies',
  'Immobilier locatif', 'Private equity', 'Épargne salariale (PEE/PERCO)',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateAge(d: string): number | null {
  if (!d) return null
  const today = new Date(), birth = new Date(d)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}

function loadFromStorage<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch { return fallback }
}

// ─── Base UI ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function Field({ label, children, tooltip, error }: {
  label: string; children: React.ReactNode; tooltip?: string; error?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest">
          {label}
        </label>
        {tooltip && (
          <div className="group relative">
            <span className="w-4 h-4 rounded-full border border-gray-200 text-gray-400 text-[10px] flex items-center justify-center cursor-help select-none">?</span>
            <div className="absolute bottom-6 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-56 hidden group-hover:block z-20 leading-relaxed shadow-xl">
              {tooltip}
              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
      {children}
      {error && <p className="mt-1.5 text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '', hasError = false }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; hasError?: boolean
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full h-10 bg-gray-50 border rounded-lg px-3 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:bg-white transition-all ${
        hasError
          ? 'border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
          : 'border-transparent focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)]'
      }`}
    />
  )
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all cursor-pointer"
    >
      {children}
    </select>
  )
}

function ChipSelector({ options, value, onChange, green = false }: {
  options: (string | number)[]; value: string | number
  onChange: (v: string | number) => void; green?: boolean
}) {
  const active = green
    ? 'bg-[#0F6E56] border-[#0F6E56] text-white'
    : 'bg-[#185FA5] border-[#185FA5] text-white'
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <motion.button key={opt} type="button" onClick={() => onChange(opt)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className={`px-4 py-2 rounded-lg text-[13px] border transition-colors ${
            value === opt ? active : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >{opt}</motion.button>
      ))}
    </div>
  )
}

function Checkbox({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          checked ? 'bg-[#185FA5] border-[#185FA5]' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-[13px] text-gray-600">{label}</span>
    </label>
  )
}

function ToggleYesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {(['Non', 'Oui'] as const).map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt === 'Oui')}
          className={`px-5 py-2 rounded-lg text-[13px] border transition-all ${
            (opt === 'Oui') === value
              ? 'bg-[#185FA5] border-[#185FA5] text-white'
              : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >{opt}</button>
      ))}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium animate-[fadeSlideDown_0.3s_ease]">
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  )
}

// ─── PersonneCard ─────────────────────────────────────────────────────────────

function PersonneCard({ personne, onChange, isP2 = false, errors = {} }: {
  personne: Personne; onChange: (p: Personne) => void
  isP2?: boolean; errors?: { prenom?: string; nom?: string; date?: string }
}) {
  const age = calculateAge(personne.dateNaissance)
  const displayName = personne.prenom.trim() || (isP2 ? 'Personne 2' : 'Personne 1')
  const badgeBg = isP2 ? 'bg-[#E1F5EE]' : 'bg-[#E6F1FB]'
  const badgeText = isP2 ? 'text-[#085041]' : 'text-[#0C447C]'
  const dot = isP2 ? 'bg-[#0F6E56]' : 'bg-[#185FA5]'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeBg} ${badgeText} text-[11px] font-semibold mb-5`}>
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />{displayName}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Prénom" error={errors.prenom}>
          <Input value={personne.prenom} onChange={v => onChange({ ...personne, prenom: v })} placeholder="Marie" hasError={!!errors.prenom} />
        </Field>
        <Field label="Nom" error={errors.nom}>
          <Input value={personne.nom} onChange={v => onChange({ ...personne, nom: v })} placeholder="Dupont" hasError={!!errors.nom} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Date de naissance" error={errors.date}>
          <div className="relative">
            <Input type="date" value={personne.dateNaissance} onChange={v => onChange({ ...personne, dateNaissance: v })} hasError={!!errors.date} />
            {age !== null && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded-full pointer-events-none">
                {age} ans
              </span>
            )}
          </div>
        </Field>
        <Field label="Nationalité">
          <Select value={personne.nationalite} onChange={v => onChange({ ...personne, nationalite: v, autrePays: '' })}>
            <option>Française</option><option>Autre</option>
          </Select>
        </Field>
      </div>
      {personne.nationalite === 'Autre' && (
        <Field label="Précisez le pays">
          <Input value={personne.autrePays} onChange={v => onChange({ ...personne, autrePays: v })} placeholder="Belgique, Suisse…" />
        </Field>
      )}
    </div>
  )
}

// ─── EnfantChargeCard ─────────────────────────────────────────────────────────

function EnfantChargeCard({ enfant, index, isCouple, p1Label, p2Label, onChange }: {
  enfant: EnfantCharge; index: number; isCouple: boolean
  p1Label: string; p2Label: string; onChange: (e: EnfantCharge) => void
}) {
  const label = enfant.prenom.trim() || `Enfant ${index + 1}`
  const upd = <K extends keyof EnfantCharge>(k: K, v: EnfantCharge[K]) => onChange({ ...enfant, [k]: v })
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="text-[12px] font-semibold text-[#185FA5] mb-3">{label}</div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Prénom"><Input value={enfant.prenom} onChange={v => upd('prenom', v)} placeholder="Emma" /></Field>
        <Field label="Âge"><Input type="number" value={enfant.age} onChange={v => upd('age', v)} placeholder="8" /></Field>
      </div>
      <div className="flex flex-wrap gap-4">
        <Checkbox checked={enfant.gardeAlternee} onChange={v => upd('gardeAlternee', v)} label="Garde alternée" />
        <Checkbox checked={enfant.handicape} onChange={v => upd('handicape', v)} label="Situation de handicap" />
        {isCouple && <Checkbox checked={enfant.autreUnion} onChange={v => upd('autreUnion', v)} label="Issu(e) d'une autre union" />}
      </div>
      {isCouple && enfant.autreUnion && (
        <div className="mt-3">
          <Field label="Union de">
            <ChipSelector
              options={[p1Label, p2Label]}
              value={enfant.autreUnionParent === 'P1' ? p1Label : enfant.autreUnionParent === 'P2' ? p2Label : ''}
              onChange={v => upd('autreUnionParent', v === p1Label ? 'P1' : 'P2')}
            />
          </Field>
        </div>
      )}
    </div>
  )
}

// ─── EnfantMajeurCard ─────────────────────────────────────────────────────────

function EnfantMajeurCard({ enfant, index, isCouple, p1Label, p2Label, onChange }: {
  enfant: EnfantMajeur; index: number; isCouple: boolean
  p1Label: string; p2Label: string; onChange: (e: EnfantMajeur) => void
}) {
  const label = enfant.prenom.trim() || `Enfant ${index + 1}`
  const upd = <K extends keyof EnfantMajeur>(k: K, v: EnfantMajeur[K]) => onChange({ ...enfant, [k]: v })
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="text-[12px] font-semibold text-[#185FA5] mb-3">{label}</div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Prénom"><Input value={enfant.prenom} onChange={v => upd('prenom', v)} placeholder="Lucas" /></Field>
        <Field label="Âge"><Input type="number" value={enfant.age} onChange={v => upd('age', v)} placeholder="22" /></Field>
      </div>
      <div className="flex flex-wrap gap-4">
        <Checkbox checked={enfant.aCharge} onChange={v => upd('aCharge', v)} label="À charge" />
        <Checkbox checked={enfant.gardeAlternee} onChange={v => upd('gardeAlternee', v)} label="Garde alternée" />
        <Checkbox checked={enfant.etudes} onChange={v => upd('etudes', v)} label="Études en cours" />
        <Checkbox checked={enfant.handicape} onChange={v => upd('handicape', v)} label="Situation de handicap" />
        {isCouple && <Checkbox checked={enfant.autreUnion} onChange={v => upd('autreUnion', v)} label="Issu(e) d'une autre union" />}
      </div>
      {isCouple && enfant.autreUnion && (
        <div className="mt-3">
          <Field label="Union de">
            <ChipSelector
              options={[p1Label, p2Label]}
              value={enfant.autreUnionParent === 'P1' ? p1Label : enfant.autreUnionParent === 'P2' ? p2Label : ''}
              onChange={v => upd('autreUnionParent', v === p1Label ? 'P1' : 'P2')}
            />
          </Field>
        </div>
      )}
    </div>
  )
}

// ─── SituationProCard ─────────────────────────────────────────────────────────

function SituationProCard({ pro, onChange, isP2 = false, personneLabel, errorStatut }: {
  pro: SituationPro; onChange: (p: SituationPro) => void
  isP2?: boolean; personneLabel: string; errorStatut?: string
}) {
  const upd = <K extends keyof SituationPro>(k: K, v: SituationPro[K]) => onChange({ ...pro, [k]: v })
  const isSalarie = pro.statut === "Salarié(e) du privé" || pro.statut === "Fonctionnaire"
  const isRetraite = pro.statut === "Retraité(e)"
  const isTNS = pro.statut === "TNS (indépendant)" || pro.statut === "Chef(fe) d'entreprise"
  const badgeBg = isP2 ? 'bg-[#E1F5EE]' : 'bg-[#E6F1FB]'
  const badgeText = isP2 ? 'text-[#085041]' : 'text-[#0C447C]'
  const dot = isP2 ? 'bg-[#0F6E56]' : 'bg-[#185FA5]'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeBg} ${badgeText} text-[11px] font-semibold mb-5`}>
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />{personneLabel}
      </div>
      <div className="space-y-4">
        <Field label="Statut professionnel" error={errorStatut}>
          <Select value={pro.statut} onChange={v => onChange({ ...defaultSituationPro(), statut: v })}>
            <option value="">Sélectionnez…</option>
            <option>Salarié(e) du privé</option><option>Fonctionnaire</option>
            <option>TNS (indépendant)</option><option>Profession libérale</option>
            <option>Chef(fe) d'entreprise</option><option>Retraité(e)</option>
            <option>Demandeur(se) d'emploi</option><option>Sans activité</option>
            <option>Étudiant(e)</option>
          </Select>
        </Field>
        <Field label="Secteur d'activité (optionnel)">
          <Input value={pro.secteur} onChange={v => upd('secteur', v)} placeholder="Finance, Santé, Industrie…" />
        </Field>
        {isSalarie && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type de contrat">
              <Select value={pro.typeContrat} onChange={v => upd('typeContrat', v)}>
                <option value="">Sélectionnez…</option>
                <option>CDI</option><option>CDD</option>
                <option>Titulaire</option><option>Contractuel</option><option>Autre</option>
              </Select>
            </Field>
            <Field label="Ancienneté">
              <Select value={pro.anciennete} onChange={v => upd('anciennete', v)}>
                <option value="">Sélectionnez…</option>
                <option>{"< 1 an"}</option><option>1–5 ans</option>
                <option>5–15 ans</option><option>+ 15 ans</option>
              </Select>
            </Field>
          </div>
        )}
        {isRetraite && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Caisse(s) de retraite" tooltip="Ex : CNAV, AGIRC-ARRCO, CIPAV…">
              <Input value={pro.caissesRetraite} onChange={v => upd('caissesRetraite', v)} placeholder="CNAV, AGIRC-ARRCO…" />
            </Field>
            <Field label="Date de départ">
              <Input type="date" value={pro.dateDepartRetraite} onChange={v => upd('dateDepartRetraite', v)} />
            </Field>
          </div>
        )}
        {isTNS && (
          <Field label="Forme juridique">
            <Select value={pro.formeJuridique} onChange={v => upd('formeJuridique', v)}>
              <option value="">Sélectionnez…</option>
              <option>EI</option><option>EURL</option><option>SARL</option>
              <option>SAS</option><option>SASU</option><option>SA</option><option>Autre</option>
            </Select>
          </Field>
        )}
      </div>
    </div>
  )
}

// ─── ConnaissanceFinanciereCard ────────────────────────────────────────────────

function ConnaissanceFinanciereCard({ cf, onChange, isP2 = false, personneLabel, errorNiveau }: {
  cf: ConnaissanceFinanciere; onChange: (c: ConnaissanceFinanciere) => void
  isP2?: boolean; personneLabel: string; errorNiveau?: string
}) {
  const badgeBg = isP2 ? 'bg-[#E1F5EE]' : 'bg-[#E6F1FB]'
  const badgeText = isP2 ? 'text-[#085041]' : 'text-[#0C447C]'
  const dot = isP2 ? 'bg-[#0F6E56]' : 'bg-[#185FA5]'

  const toggleProduit = (p: string) => {
    const next = cf.produits.includes(p)
      ? cf.produits.filter(x => x !== p)
      : [...cf.produits, p]
    onChange({ ...cf, produits: next })
  }

  // Chip style for multi-select produits
  const chipSelected = isP2
    ? 'bg-[#E1F5EE] border-[#0F6E56] text-[#085041]'
    : 'bg-[#E6F1FB] border-[#185FA5] text-[#0C447C]'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {/* Badge */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeBg} ${badgeText} text-[11px] font-semibold mb-2`}>
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />{personneLabel}
      </div>

      <div className="space-y-5">
        {/* Niveau général */}
        <Field label="Niveau de connaissance financière" error={errorNiveau}>
          <div className="flex flex-wrap gap-2 mt-1">
            {niveauxCF.map(({ label, tooltip }) => (
              <div key={label} className="group relative">
                <button
                  type="button"
                  onClick={() => onChange({ ...cf, niveauGeneral: label })}
                  className={`px-4 py-2 rounded-lg text-[13px] border transition-all ${
                    cf.niveauGeneral === label
                      ? isP2
                        ? 'bg-[#0F6E56] border-[#0F6E56] text-white'
                        : 'bg-[#185FA5] border-[#185FA5] text-white'
                      : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
                {/* Tooltip au survol */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-48 hidden group-hover:block z-20 leading-relaxed shadow-xl text-center pointer-events-none">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            ))}
          </div>
        </Field>

        {/* Produits */}
        <Field label="Produits déjà détenus ou utilisés" tooltip="Sélectionnez tous les produits que vous connaissez ou avez déjà utilisés.">
          <div className="flex flex-wrap gap-2 mt-1">
            {produitsCF.map(p => {
              const selected = cf.produits.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProduit(p)}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] border transition-all ${
                    selected
                      ? chipSelected
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
          {cf.produits.length > 0 && (
            <p className="mt-2 text-[11px] text-gray-400">
              {cf.produits.length} produit{cf.produits.length > 1 ? 's' : ''} sélectionné{cf.produits.length > 1 ? 's' : ''}
            </p>
          )}
        </Field>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Bloc1() {
  const navigate = useNavigate()

  const [mode, setMode] = useState<'seul' | 'couple'>(() =>
    loadFromStorage<{ v: 'seul' | 'couple' }>('patrisim_bloc1_mode', { v: 'seul' }).v ?? 'seul'
  )
  const [p1, setP1] = useState<Personne>(() => loadFromStorage('patrisim_bloc1_p1', defaultPersonne))
  const [p2, setP2] = useState<Personne>(() => loadFromStorage('patrisim_bloc1_p2', defaultPersonne))
  const [foyer, setFoyer] = useState<Foyer>(() => loadFromStorage('patrisim_bloc1_foyer', defaultFoyer))
  const [pro1, setPro1] = useState<SituationPro>(() => loadFromStorage('patrisim_bloc1_pro1', defaultSituationPro()))
  const [pro2, setPro2] = useState<SituationPro>(() => loadFromStorage('patrisim_bloc1_pro2', defaultSituationPro()))
  const [cf1, setCf1] = useState<ConnaissanceFinanciere>(() => loadFromStorage('patrisim_bloc1_cf1', defaultCF()))
  const [cf2, setCf2] = useState<ConnaissanceFinanciere>(() => loadFromStorage('patrisim_bloc1_cf2', defaultCF()))
  const [savedAt, setSavedAt] = useState<string>('')
  const [errors, setErrors] = useState<Errors>({})
  const [showToast, setShowToast] = useState(false)

  const isCouple = mode === 'couple'
  const p1Label = p1.prenom.trim() || 'Personne 1'
  const p2Label = p2.prenom.trim() || 'Personne 2'
  const showRegime = foyer.statutMatrimonial === 'Marié(e)' || foyer.statutMatrimonial === 'Pacsé(e)'

  // Auto-save
  useEffect(() => {
    localStorage.setItem('patrisim_bloc1_mode', JSON.stringify({ v: mode }))
    localStorage.setItem('patrisim_bloc1_p1', JSON.stringify(p1))
    localStorage.setItem('patrisim_bloc1_p2', JSON.stringify(p2))
    localStorage.setItem('patrisim_bloc1_foyer', JSON.stringify(foyer))
    localStorage.setItem('patrisim_bloc1_pro1', JSON.stringify(pro1))
    localStorage.setItem('patrisim_bloc1_pro2', JSON.stringify(pro2))
    localStorage.setItem('patrisim_bloc1_cf1', JSON.stringify(cf1))
    localStorage.setItem('patrisim_bloc1_cf2', JSON.stringify(cf2))
    const now = new Date()
    setSavedAt(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [mode, p1, p2, foyer, pro1, pro2, cf1, cf2])

  // Handlers
  const handleEnfantsCharge = (n: number) => {
    const enfants = Array(n).fill(null).map((_, i) =>
      foyer.enfants[i] || { prenom: '', age: '', gardeAlternee: false, handicape: false, autreUnion: false, autreUnionParent: '' as '' }
    )
    setFoyer({ ...foyer, enfantsCharge: n, enfants })
  }

  const handleEnfantsMajeurs = (n: number) => {
    const majeurs = Array(n).fill(null).map((_, i) =>
      foyer.majeurs[i] || { prenom: '', age: '', aCharge: false, gardeAlternee: false, etudes: false, handicape: false, autreUnion: false, autreUnionParent: '' as '' }
    )
    setFoyer({ ...foyer, enfantsMajeurs: n, majeurs })
  }

  const updateEnfant = (i: number, u: EnfantCharge) => {
    const e = [...foyer.enfants]; e[i] = u; setFoyer({ ...foyer, enfants: e })
  }
  const updateMajeur = (i: number, u: EnfantMajeur) => {
    const m = [...foyer.majeurs]; m[i] = u; setFoyer({ ...foyer, majeurs: m })
  }
  const addPetitEnfant = () => setFoyer({ ...foyer, petitsEnfants: [...foyer.petitsEnfants, { prenom: '', age: '', parentEnfant: '' }] })
  const updatePetitEnfant = (i: number, k: keyof PetitEnfant, v: string) => {
    const a = [...foyer.petitsEnfants]; a[i] = { ...a[i], [k]: v }; setFoyer({ ...foyer, petitsEnfants: a })
  }
  const removePetitEnfant = (i: number) => setFoyer({ ...foyer, petitsEnfants: foyer.petitsEnfants.filter((_, j) => j !== i) })
  const addAutreCharge = () => setFoyer({ ...foyer, autresCharges: [...foyer.autresCharges, { lien: '', autreDesc: '', prenom: '', coutMensuel: '' }] })
  const updateAutreCharge = (i: number, k: keyof AutreCharge, v: string) => {
    const a = [...foyer.autresCharges]; a[i] = { ...a[i], [k]: v }; setFoyer({ ...foyer, autresCharges: a })
  }
  const removeAutreCharge = (i: number) => setFoyer({ ...foyer, autresCharges: foyer.autresCharges.filter((_, j) => j !== i) })

  // Validation
  const validate = (): boolean => {
    const e: Errors = {}
    if (!p1.prenom.trim()) e.p1Prenom = 'Ce champ est requis'
    if (!p1.dateNaissance) e.p1Date = 'Ce champ est requis'
    if (isCouple) {
      if (!p2.prenom.trim()) e.p2Prenom = 'Ce champ est requis'
      if (!p2.dateNaissance) e.p2Date = 'Ce champ est requis'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSuivant = () => {
    if (!validate()) {
      // Scroll vers la première erreur
      setTimeout(() => {
        const el = document.querySelector('[data-error="true"]')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    setShowToast(true)
    setTimeout(() => navigate(getNextBloc(1)), 1200)
  }

  const handleAnnuler = () => {
    if (window.confirm('Réinitialiser toutes les données du Bloc 1 ?')) {
      setMode('seul'); setP1(defaultPersonne); setP2(defaultPersonne)
      setFoyer(defaultFoyer); setPro1(defaultSituationPro()); setPro2(defaultSituationPro())
      setCf1(defaultCF()); setCf2(defaultCF()); setErrors({})
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {showToast && <Toast message="Étape 1 enregistrée ✓" onDone={() => setShowToast(false)} />}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-28">

        {/* ── En-tête ── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 1 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#185FA5] rounded-full" initial={{ width: '0%' }} animate={{ width: '14%' }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
            <span className="text-[11px] text-gray-300">14%</span>
            {savedAt && (
              <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Brouillon enregistré · {savedAt}
              </span>
            )}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Profil civil & familial</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 leading-relaxed max-w-xl">
            Ces informations permettent de structurer votre analyse patrimoniale et de personnaliser chaque recommandation.
          </p>
        </div>

        {/* ── Mode de saisie ── */}
        <FadeIn delay={0}>
        <div className="mb-8">
          <SectionTitle>Mode de saisie</SectionTitle>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[
              { key: 'seul' as const, label: 'Personne seule', sub: 'Bilan individuel' },
              { key: 'couple' as const, label: 'Couple', sub: 'Saisie pour les deux' },
            ].map(opt => (
              <button key={opt.key} type="button" onClick={() => setMode(opt.key)}
                className={`p-4 rounded-xl text-left transition-all ${
                  mode === opt.key
                    ? 'bg-[#185FA5] shadow-[0_4px_14px_rgba(24,95,165,0.25)]'
                    : 'bg-white border border-gray-100 hover:border-gray-200 shadow-sm'
                }`}
              >
                <div className={`text-[13px] font-semibold ${mode === opt.key ? 'text-white' : 'text-gray-800'}`}>{opt.label}</div>
                <div className={`text-[11px] mt-0.5 ${mode === opt.key ? 'text-blue-200' : 'text-gray-400'}`}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
        </FadeIn>

        {/* ── Identité ── */}
        <FadeIn delay={0.08}>
        <div className="mb-8">
          <SectionTitle>Identité</SectionTitle>
          {isCouple ? (
            <div className="grid grid-cols-2 gap-4">
              <PersonneCard personne={p1} onChange={p => { setP1(p); setErrors(e => ({ ...e, p1Prenom: undefined, p1Nom: undefined, p1Date: undefined })) }}
                isP2={false} errors={{ prenom: errors.p1Prenom, nom: errors.p1Nom, date: errors.p1Date }} />
              <PersonneCard personne={p2} onChange={p => { setP2(p); setErrors(e => ({ ...e, p2Prenom: undefined, p2Nom: undefined, p2Date: undefined })) }}
                isP2={true} errors={{ prenom: errors.p2Prenom, nom: errors.p2Nom, date: errors.p2Date }} />
            </div>
          ) : (
            <PersonneCard personne={p1} onChange={p => { setP1(p); setErrors(e => ({ ...e, p1Prenom: undefined, p1Nom: undefined, p1Date: undefined })) }}
              isP2={false} errors={{ prenom: errors.p1Prenom, nom: errors.p1Nom, date: errors.p1Date }} />
          )}
        </div>
        </FadeIn>

        {/* ── Situation familiale ── */}
        <FadeIn delay={0.16}>
        <div className="mb-8">
          <SectionTitle>Situation familiale du foyer</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">

            <Field label="Statut matrimonial actuel" error={errors.statutMatrimonial}>
              <Select value={foyer.statutMatrimonial}
                onChange={v => { setFoyer({ ...foyer, statutMatrimonial: v, regimeMatrimonial: '' }); setErrors(e => ({ ...e, statutMatrimonial: undefined })) }}
              >
                <option value="">Sélectionnez…</option>
                <option>Célibataire</option><option>Marié(e)</option><option>Pacsé(e)</option>
                <option>En concubinage</option><option>Veuf(ve)</option>
              </Select>
            </Field>

            <AnimatePresence>
            {foyer.statutMatrimonial && foyer.statutMatrimonial !== 'Veuf(ve)' && (
              <motion.div key="unions-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="space-y-3">
                <Field label="Avez-vous déjà été marié(e) ou pacsé(e) précédemment ?">
                  <ToggleYesNo value={foyer.unionPrecedente} onChange={v => setFoyer({ ...foyer, unionPrecedente: v, nbUnionsPrecedentes: '' })} />
                </Field>
                {foyer.unionPrecedente && (
                  <Field label="Nombre d'unions précédentes">
                    <ChipSelector options={['1', '2', '3+']} value={foyer.nbUnionsPrecedentes}
                      onChange={v => setFoyer({ ...foyer, nbUnionsPrecedentes: String(v) })} />
                  </Field>
                )}
              </div>
              </motion.div>
            )}
            </AnimatePresence>

            <AnimatePresence>
            {showRegime && (
              <motion.div key="regime-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="space-y-2">
                <Field label="Régime matrimonial" tooltip="Le régime matrimonial détermine la répartition des biens entre époux.">
                  <Select value={foyer.regimeMatrimonial} onChange={v => setFoyer({ ...foyer, regimeMatrimonial: v })}>
                    <option value="">Sélectionnez…</option>
                    {Object.keys(regimesMatrimoniaux).map(r => <option key={r}>{r}</option>)}
                  </Select>
                </Field>
                {foyer.regimeMatrimonial && (
                  <div className="text-[12px] text-[#0C447C] bg-[#E6F1FB] px-4 py-2.5 rounded-lg leading-relaxed">
                    {regimesMatrimoniaux[foyer.regimeMatrimonial]}
                  </div>
                )}
              </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Logement du foyer */}
            <div className="space-y-3">
              <Field label="Situation de logement du foyer" tooltip="Cette information permet d'intégrer les charges de logement dans votre analyse financière au Bloc 4.">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'Propriétaire', icon: '🏠', sub: 'Résidence principale' },
                    { value: 'Locataire', icon: '🔑', sub: 'Loyer à renseigner en Bloc 4' },
                    { value: 'Hébergé à titre gratuit', icon: '🤝', sub: 'Pas de charge de logement' },
                    { value: 'Maison de retraite / EHPAD', icon: '🏥', sub: 'Coût mensuel en Bloc 4' },
                    { value: "Logé par l'employeur", icon: '🏢', sub: 'Avantage en nature' },
                    { value: 'Autre', icon: '📋', sub: 'À préciser' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFoyer({ ...foyer, typeLogement: opt.value, logementAutreDetail: '' })}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        foyer.typeLogement === opt.value
                          ? 'bg-[#185FA5] border-[#185FA5] text-white shadow-[0_2px_8px_rgba(24,95,165,0.2)]'
                          : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-[16px]">{opt.icon}</span>
                      <div>
                        <div className={`text-[12px] font-semibold leading-tight ${foyer.typeLogement === opt.value ? 'text-white' : 'text-gray-800'}`}>
                          {opt.value}
                        </div>
                        <div className={`text-[10px] mt-0.5 leading-tight ${foyer.typeLogement === opt.value ? 'text-blue-200' : 'text-gray-400'}`}>
                          {opt.sub}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              {foyer.typeLogement === 'Autre' && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">Précisez</label>
                  <input
                    type="text"
                    value={foyer.logementAutreDetail}
                    onChange={e => setFoyer({ ...foyer, logementAutreDetail: e.target.value })}
                    placeholder="Ex : logement de fonction, colocation…"
                    className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all"
                  />
                </div>
              )}

              {foyer.typeLogement === 'Locataire' && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[12px] text-amber-700 leading-relaxed">
                    Le montant de votre loyer sera renseigné au <strong>Bloc 4 — Flux & fiscalité</strong>, dans vos charges fixes mensuelles.
                  </p>
                </div>
              )}

              {foyer.typeLogement === 'Maison de retraite / EHPAD' && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[12px] text-amber-700 leading-relaxed">
                    Le coût mensuel de la maison de retraite sera renseigné au <strong>Bloc 4 — Flux & fiscalité</strong>, dans vos charges fixes.
                  </p>
                </div>
              )}
            </div>

            {/* Enfants à charge */}
            <div>
              <Field label="Enfants à charge (moins de 18 ans)">
                <ChipSelector options={[0,1,2,3,4,5,6]} value={foyer.enfantsCharge} onChange={v => handleEnfantsCharge(Number(v))} />
              </Field>
              {foyer.enfantsCharge > 0 && (
                <div className="mt-4 space-y-3">
                  {foyer.enfants.map((e, i) => (
                    <EnfantChargeCard key={i} enfant={e} index={i} isCouple={isCouple} p1Label={p1Label} p2Label={p2Label} onChange={u => updateEnfant(i, u)} />
                  ))}
                </div>
              )}
            </div>

            {/* Enfants majeurs */}
            <div>
              <Field label="Enfants majeurs (18 ans et plus)">
                <ChipSelector options={[0,1,2,3,4,5,6]} value={foyer.enfantsMajeurs} onChange={v => handleEnfantsMajeurs(Number(v))} />
              </Field>
              {foyer.enfantsMajeurs > 0 && (
                <div className="mt-4 space-y-3">
                  {foyer.majeurs.map((m, i) => (
                    <EnfantMajeurCard key={i} enfant={m} index={i} isCouple={isCouple} p1Label={p1Label} p2Label={p2Label} onChange={u => updateMajeur(i, u)} />
                  ))}
                </div>
              )}
            </div>

            {/* Petits-enfants */}
            {foyer.majeurs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Petits-enfants</label>
                  <button type="button" onClick={addPetitEnfant}
                    className="text-[12px] text-[#185FA5] hover:text-[#0C447C] font-medium flex items-center gap-1 transition-colors">
                    <span className="text-[16px] leading-none">+</span> Ajouter un petit-enfant
                  </button>
                </div>
                {foyer.petitsEnfants.length === 0 && (
                  <div className="text-[13px] text-gray-400 bg-gray-50 rounded-xl px-4 py-3">Aucun petit-enfant déclaré.</div>
                )}
                <div className="space-y-3">
                  {foyer.petitsEnfants.map((pe, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[12px] font-semibold text-[#185FA5]">{pe.prenom.trim() || `Petit-enfant ${i + 1}`}</span>
                        <button type="button" onClick={() => removePetitEnfant(i)} className="text-[12px] text-red-400 hover:text-red-600 transition-colors">Supprimer</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <Field label="Prénom"><Input value={pe.prenom} onChange={v => updatePetitEnfant(i, 'prenom', v)} placeholder="Léo" /></Field>
                        <Field label="Âge"><Input type="number" value={pe.age} onChange={v => updatePetitEnfant(i, 'age', v)} placeholder="3" /></Field>
                      </div>
                      <Field label="Enfant parent" tooltip="De quel enfant majeur ce petit-enfant est-il issu ?">
                        <Select value={pe.parentEnfant} onChange={v => updatePetitEnfant(i, 'parentEnfant', v)}>
                          <option value="">Sélectionnez…</option>
                          {foyer.majeurs.map((m, j) => (
                            <option key={j} value={m.prenom || `Enfant ${j + 1}`}>{m.prenom.trim() || `Enfant ${j + 1}`}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Autres personnes à charge */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Autres personnes à charge</label>
                <button type="button" onClick={addAutreCharge}
                  className="text-[12px] text-[#185FA5] hover:text-[#0C447C] font-medium flex items-center gap-1 transition-colors">
                  <span className="text-[16px] leading-none">+</span> Ajouter une personne
                </button>
              </div>
              {foyer.autresCharges.length === 0 && (
                <div className="text-[13px] text-gray-400 bg-gray-50 rounded-xl px-4 py-3">Aucune autre personne à charge déclarée.</div>
              )}
              <div className="space-y-3">
                {foyer.autresCharges.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[12px] font-semibold text-[#185FA5]">{c.prenom.trim() || `Personne ${i + 1}`}</span>
                      <button type="button" onClick={() => removeAutreCharge(i)} className="text-[12px] text-red-400 hover:text-red-600 transition-colors">Supprimer</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Field label="Lien de parenté">
                        <Select value={c.lien} onChange={v => updateAutreCharge(i, 'lien', v)}>
                          <option value="">Sélectionnez…</option>
                          <option>Parent</option><option>Beau-parent</option><option>Grand-parent</option>
                          <option>Beau-fils</option><option>Belle-fille</option>
                          <option>Enfant d'une autre union</option><option>Autre</option>
                        </Select>
                      </Field>
                      <Field label="Prénom"><Input value={c.prenom} onChange={v => updateAutreCharge(i, 'prenom', v)} placeholder="Geneviève" /></Field>
                    </div>
                    {c.lien === 'Autre' && (
                      <div className="mb-3">
                        <Field label="Précisez"><Input value={c.autreDesc} onChange={v => updateAutreCharge(i, 'autreDesc', v)} placeholder="Tuteur légal, ami…" /></Field>
                      </div>
                    )}
                    <Field label="Coût mensuel estimé (€)" tooltip="Sera intégré automatiquement dans vos charges au Bloc 4.">
                      <Input type="number" value={c.coutMensuel} onChange={v => updateAutreCharge(i, 'coutMensuel', v)} placeholder="500" />
                    </Field>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
        </FadeIn>

        {/* ── Situation professionnelle ── */}
        <FadeIn delay={0.24}>
        <div className="mb-8">
          <SectionTitle>Situation professionnelle</SectionTitle>
          {isCouple ? (
            <div className="grid grid-cols-2 gap-4">
              <SituationProCard pro={pro1} onChange={p => { setPro1(p); setErrors(e => ({ ...e, pro1Statut: undefined })) }}
                isP2={false} personneLabel={p1Label} errorStatut={errors.pro1Statut} />
              <SituationProCard pro={pro2} onChange={p => { setPro2(p); setErrors(e => ({ ...e, pro2Statut: undefined })) }}
                isP2={true} personneLabel={p2Label} errorStatut={errors.pro2Statut} />
            </div>
          ) : (
            <SituationProCard pro={pro1} onChange={p => { setPro1(p); setErrors(e => ({ ...e, pro1Statut: undefined })) }}
              isP2={false} personneLabel={p1Label} errorStatut={errors.pro1Statut} />
          )}
        </div>
        </FadeIn>

        {/* ── Connaissance financière ── */}
        <FadeIn delay={0.32}>
        <div className="mb-8">
          <SectionTitle>Connaissance financière</SectionTitle>
          {isCouple ? (
            <div className="grid grid-cols-2 gap-4">
              <ConnaissanceFinanciereCard cf={cf1} onChange={c => { setCf1(c); setErrors(e => ({ ...e, cf1Niveau: undefined })) }}
                isP2={false} personneLabel={p1Label} errorNiveau={errors.cf1Niveau} />
              <ConnaissanceFinanciereCard cf={cf2} onChange={c => { setCf2(c); setErrors(e => ({ ...e, cf2Niveau: undefined })) }}
                isP2={true} personneLabel={p2Label} errorNiveau={errors.cf2Niveau} />
            </div>
          ) : (
            <ConnaissanceFinanciereCard cf={cf1} onChange={c => { setCf1(c); setErrors(e => ({ ...e, cf1Niveau: undefined })) }}
              isP2={false} personneLabel={p1Label} errorNiveau={errors.cf1Niveau} />
          )}
        </div>
        </FadeIn>

        {/* Erreurs globales */}
        {Object.keys(errors).length > 0 && (
          <div data-error="true" className="mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-[12px] text-red-600">Certains champs obligatoires sont manquants. Veuillez les compléter avant de continuer.</p>
          </div>
        )}

      </div>

      {/* ── Footer fixe ── */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={handleAnnuler} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
          Annuler
        </button>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-[11px] text-gray-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Brouillon enregistré · {savedAt}
            </span>
          )}
          <button type="button"
            onClick={() => {
              localStorage.setItem('patrisim_bloc1_mode', JSON.stringify({ v: mode }))
              localStorage.setItem('patrisim_bloc1_p1', JSON.stringify(p1))
              localStorage.setItem('patrisim_bloc1_p2', JSON.stringify(p2))
              localStorage.setItem('patrisim_bloc1_foyer', JSON.stringify(foyer))
              localStorage.setItem('patrisim_bloc1_pro1', JSON.stringify(pro1))
              localStorage.setItem('patrisim_bloc1_pro2', JSON.stringify(pro2))
              localStorage.setItem('patrisim_bloc1_cf1', JSON.stringify(cf1))
              localStorage.setItem('patrisim_bloc1_cf2', JSON.stringify(cf2))
              const now = new Date()
              setSavedAt(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
            }}
            className="text-[13px] text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Enregistrer le brouillon
          </button>
          <motion.button type="button" onClick={handleSuivant}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="text-[13px] text-white px-6 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)] font-medium"
          >
            Suivant →
          </motion.button>
        </div>
      </div>
    </div>
  )
}
