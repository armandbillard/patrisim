import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { getNextBloc } from '../utils/navigation'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetraitePersonne {
  ageDepartSouhaite: number
  regimes: string[]
  pensionConnue: boolean
  pensionBase: string
  aComplementaire: boolean
  pensionComplementaire: string
  revenusCibles: number
  patrimoineCouvrir: string
  aTransmission: boolean
  montantTransmission: string
}

interface Projet {
  id: string
  horizon: string
  type: string
  description: string
  budgetMode: 'precis' | 'fourchette'
  montant: string
  montantMin: string
  montantMax: string
  financement: string[]
  priorite: string
  collapsed: boolean
}

interface Repartition {
  precaution: number
  projetsCT: number
  retraite: number
  transmission: number
}

interface Bloc5State {
  retraiteP1: RetraitePersonne
  retraiteP2: RetraitePersonne
  aProjects: boolean
  projets: Projet[]
  capaciteEpargne: string
  repartition: Repartition
  effortSupp: number
  horizonInvest: string
  showSynthese: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultRetraite = (): RetraitePersonne => ({
  ageDepartSouhaite: 63,
  regimes: [],
  pensionConnue: false,
  pensionBase: '',
  aComplementaire: false,
  pensionComplementaire: '',
  revenusCibles: 0,
  patrimoineCouvrir: '',
  aTransmission: false,
  montantTransmission: '',
})

const defaultProjet = (): Projet => ({
  id: crypto.randomUUID(),
  horizon: '', type: '', description: '',
  budgetMode: 'precis', montant: '', montantMin: '', montantMax: '',
  financement: [], priorite: '', collapsed: false,
})

const defaultRepartition = (): Repartition => ({ precaution: 25, projetsCT: 25, retraite: 40, transmission: 10 })

const defaultState = (): Bloc5State => ({
  retraiteP1: defaultRetraite(),
  retraiteP2: defaultRetraite(),
  aProjects: false,
  projets: [],
  capaciteEpargne: '',
  repartition: defaultRepartition(),
  effortSupp: 0,
  horizonInvest: '',
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
const parseNum = (s: string | number) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }

function ageActuel(dateStr: string): number | null {
  if (!dateStr) return null
  const today = new Date()
  const birth = new Date(dateStr)
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return age
}

function capitalFuteur(mensuel: number, taux: number, annees: number): number {
  if (taux === 0) return mensuel * 12 * annees
  const r = taux / 100 / 12
  const n = annees * 12
  return mensuel * ((Math.pow(1 + r, n) - 1) / r)
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

function Input({ value, onChange, type = 'text', placeholder = '', suffix }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; suffix?: string
}) {
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
  const s = { blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20', amber: 'bg-amber-50 text-amber-800 border-amber-200', green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20', red: 'bg-red-50 text-red-700 border-red-200' }
  return <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

function PersonneBadge({ label, isP2 }: { label: string; isP2?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4 ${isP2 ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isP2 ? 'bg-[#0F6E56]' : 'bg-[#185FA5]'}`} />{label}
    </div>
  )
}

// ─── RetraiteCard ─────────────────────────────────────────────────────────────

function RetraiteCard({ retraite, onChange, label, isP2, dateNaissance, revenusMensuel, errorAge }: {
  retraite: RetraitePersonne; onChange: (r: RetraitePersonne) => void
  label: string; isP2?: boolean; dateNaissance?: string; revenusMensuel: number; errorAge?: string
}) {
  const upd = <K extends keyof RetraitePersonne>(k: K, v: RetraitePersonne[K]) => onChange({ ...retraite, [k]: v })
  const age = dateNaissance ? ageActuel(dateNaissance) : null
  const annesAvantRetraite = age !== null ? Math.max(0, retraite.ageDepartSouhaite - age) : null
  const anneeRetraite = annesAvantRetraite !== null ? new Date().getFullYear() + annesAvantRetraite : null
  const dureeEstimee = age !== null ? Math.max(0, retraite.ageDepartSouhaite - age) : null

  const pensionBrute = parseNum(retraite.pensionBase) + (retraite.aComplementaire ? parseNum(retraite.pensionComplementaire) : 0)
  const pensionNette = Math.round(pensionBrute * 0.83)
  const pensionAuto = Math.round(revenusMensuel * 0.5)

  const pensionEffective = retraite.pensionConnue ? pensionNette : pensionAuto
  const gap = retraite.revenusCibles - pensionEffective
  const capitalNecessaire = gap > 0 ? Math.round(gap * 12 / 0.04 * (1 - Math.pow(1.04, -25))) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <PersonneBadge label={label} isP2={isP2} />

      {/* Âge de départ */}
      <Field label="Âge de départ souhaité">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-bold text-[#185FA5]">{retraite.ageDepartSouhaite} ans</span>
            {anneeRetraite && <span className="text-[12px] text-gray-400">Année {anneeRetraite}</span>}
          </div>
          <input type="range" min={55} max={72} value={retraite.ageDepartSouhaite}
            onChange={e => upd('ageDepartSouhaite', Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
          <div className="flex justify-between text-[10px] text-gray-400"><span>55 ans</span><span>72 ans</span></div>
          {annesAvantRetraite !== null && (
            <div className="flex gap-3 mt-1">
              <span className="text-[12px] text-gray-500">Dans <strong className="text-gray-700">{annesAvantRetraite} ans</strong></span>
              {dureeEstimee !== null && <span className="text-[12px] text-gray-500">· Cotisation restante : <strong className="text-gray-700">~{dureeEstimee} ans</strong></span>}
            </div>
          )}
          {errorAge && <p className="text-[11px] text-red-500">{errorAge}</p>}
        </div>
      </Field>

      {/* Régimes */}
      <Field label="Régime(s) de retraite">
        <Chips options={['Régime général (CNAV)', 'AGIRC-ARRCO', 'MSA (agricole)', 'SSI (ex-RSI)', 'CNRACL', 'SRE (fonctionnaires État)', 'CIPAV', 'Autre régime spécial']}
          value={retraite.regimes} onChange={v => upd('regimes', v as string[])} multi small />
      </Field>

      {/* Pension estimée */}
      <Field label="Connaissez-vous votre pension estimée ?">
        <Toggle value={retraite.pensionConnue} onChange={v => upd('pensionConnue', v)} />
      </Field>

      {retraite.pensionConnue ? (
        <div className="space-y-3 pl-2 border-l-2 border-[#E6F1FB]">
          <Field label="Pension de base mensuelle brute" tooltip="Disponible sur info-retraite.fr rubrique 'Ma retraite estimée'">
            <Input value={retraite.pensionBase} onChange={v => upd('pensionBase', v)} placeholder="1 200" suffix="€/mois" />
          </Field>
          <Field label="Avez-vous une retraite complémentaire estimée ?">
            <Toggle value={retraite.aComplementaire} onChange={v => upd('aComplementaire', v)} />
          </Field>
          {retraite.aComplementaire && (
            <Field label="Retraite complémentaire mensuelle brute" tooltip="Points AGIRC-ARRCO disponibles sur agirc-arrco.fr">
              <Input value={retraite.pensionComplementaire} onChange={v => upd('pensionComplementaire', v)} placeholder="600" suffix="€/mois" />
            </Field>
          )}
          {pensionBrute > 0 && (
            <div className="bg-[#E6F1FB] rounded-xl p-3 space-y-1">
              <p className="text-[12px] text-[#0C447C]">Pension brute totale : <strong>{fmt(pensionBrute)} €/mois</strong></p>
              <p className="text-[12px] text-[#0C447C] font-semibold">Pension nette estimée : <strong>{fmt(pensionNette)} €/mois</strong> <span className="font-normal text-[11px]">(× 0.83 charges sociales)</span></p>
            </div>
          )}
        </div>
      ) : (
        <InfoCard color="amber">
          <p className="font-semibold mb-1">Estimation automatique</p>
          <p className="italic text-gray-600">Pension estimée approximative : ~{fmt(pensionAuto)} €/mois</p>
          <p className="text-[10px] mt-1">⚠ Estimation très approximative (50% revenus actuels). Consultez info-retraite.fr pour une simulation personnalisée.</p>
        </InfoCard>
      )}

      {/* Objectifs à la retraite */}
      <Field label="Revenus mensuels nets cibles à la retraite">
        <div className="space-y-2">
          <div className="flex justify-between mb-1">
            <span className="text-[13px] font-bold text-[#185FA5]">{fmt(retraite.revenusCibles)} €/mois</span>
            {revenusMensuel > 0 && <span className="text-[11px] text-gray-400">Recommandé : {fmt(Math.round(revenusMensuel * 0.75))} €/mois (75%)</span>}
          </div>
          <input type="range" min={0} max={Math.max(revenusMensuel * 2, 5000)} step={50}
            value={retraite.revenusCibles}
            onChange={e => upd('revenusCibles', Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
        </div>
      </Field>

      {/* Gap */}
      {retraite.revenusCibles > 0 && (
        <div className={`rounded-xl p-4 ${gap <= 0 ? 'bg-[#E1F5EE]' : gap <= 500 ? 'bg-amber-50' : 'bg-red-50'}`}>
          {gap <= 0 ? (
            <p className={`text-[13px] font-semibold text-[#085041]`}>✓ Votre pension couvre vos besoins</p>
          ) : gap <= 500 ? (
            <p className="text-[13px] font-semibold text-amber-700">Déficit mensuel à couvrir : {fmt(gap)} €/mois</p>
          ) : (
            <div>
              <p className="text-[13px] font-semibold text-red-700 mb-1">Déficit mensuel important : {fmt(gap)} €/mois</p>
              <p className="text-[12px] text-red-600">Capital nécessaire estimé : <strong>{fmt(capitalNecessaire)} €</strong> <span className="text-[10px]">(rendement 4% · durée 25 ans)</span></p>
            </div>
          )}
        </div>
      )}

      <Field label="Patrimoine cible à la retraite (optionnel)" tooltip="Capital total que vous souhaitez avoir constitué à votre départ en retraite">
        <Input value={retraite.patrimoineCouvrir} onChange={v => upd('patrimoineCouvrir', v)} placeholder="500 000" suffix="€" />
      </Field>

      <Field label="Souhaitez-vous transmettre un capital à vos héritiers ?">
        <Toggle value={retraite.aTransmission} onChange={v => upd('aTransmission', v)} />
      </Field>
      {retraite.aTransmission && (
        <Field label="Montant cible à transmettre">
          <Input value={retraite.montantTransmission} onChange={v => upd('montantTransmission', v)} placeholder="200 000" suffix="€" />
        </Field>
      )}
    </div>
  )
}

// ─── ProjetCard ────────────────────────────────────────────────────────────────

function ProjetCard({ projet, onChange, onRemove }: {
  projet: Projet; onChange: (p: Projet) => void; onRemove: () => void
}) {
  const upd = <K extends keyof Projet>(k: K, v: Projet[K]) => onChange({ ...projet, [k]: v })
  const budgetAffiche = projet.budgetMode === 'precis'
    ? (projet.montant ? `${fmt(parseNum(projet.montant))} €` : '')
    : (projet.montantMin && projet.montantMax ? `Entre ${fmt(parseNum(projet.montantMin))} € et ${fmt(parseNum(projet.montantMax))} €` : '')
  const summaryTitle = [projet.type || 'Nouveau projet', budgetAffiche].filter(Boolean).join(' · ')
  const prioriteColor = projet.priorite === 'Essentiel' ? 'text-red-600 bg-red-50' : projet.priorite === 'Important' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => upd('collapsed', !projet.collapsed)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-[13px] font-semibold text-gray-800">{summaryTitle}</span>
          {projet.horizon && <span className="text-[11px] text-gray-400">{projet.horizon}</span>}
          {projet.priorite && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prioriteColor}`}>{projet.priorite}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="text-[11px] text-red-400 hover:text-red-600 font-medium">Supprimer</button>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${projet.collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      {!projet.collapsed && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Field label="Horizon temporel">
              <Chips options={['Court terme (0–3 ans)', 'Moyen terme (3–8 ans)', 'Long terme (8 ans+)']}
                value={projet.horizon} onChange={v => upd('horizon', v as string)} small />
            </Field>
            <Field label="Type de projet">
              <Select value={projet.type} onChange={v => upd('type', v)}>
                <option value="">Sélectionnez…</option>
                <option>Achat résidence principale</option>
                <option>Achat résidence secondaire</option>
                <option>Investissement locatif</option>
                <option>Travaux / Rénovation</option>
                <option>Création ou reprise d'entreprise</option>
                <option>Mariage / PACS</option>
                <option>Naissance / Adoption</option>
                <option>Financement études enfants</option>
                <option>Voyage / Projet personnel</option>
                <option>Don à un proche</option>
                <option>Autre</option>
              </Select>
            </Field>
          </div>

          <Field label="Description libre (optionnel)">
            <Input value={projet.description} onChange={v => upd('description', v)} placeholder="Précisez votre projet…" />
          </Field>

          <Field label="Budget estimé">
            <div className="space-y-3">
              <div className="flex gap-2">
                {['precis', 'fourchette'].map(m => (
                  <button key={m} type="button" onClick={() => upd('budgetMode', m as 'precis' | 'fourchette')}
                    className={`px-3.5 py-2 rounded-lg text-[12px] border font-medium transition-all ${projet.budgetMode === m ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {m === 'precis' ? 'Montant précis' : 'Fourchette'}
                  </button>
                ))}
              </div>
              {projet.budgetMode === 'precis' ? (
                <Input value={projet.montant} onChange={v => upd('montant', v)} placeholder="50 000" suffix="€" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Input value={projet.montantMin} onChange={v => upd('montantMin', v)} placeholder="Min" suffix="€" />
                  <Input value={projet.montantMax} onChange={v => upd('montantMax', v)} placeholder="Max" suffix="€" />
                </div>
              )}
            </div>
          </Field>

          <Field label="Financement envisagé">
            <Chips options={['Épargne existante', 'Effort d\'épargne futur', 'Crédit', 'Cession d\'un actif', 'Héritage attendu', 'Mixte']}
              value={projet.financement} onChange={v => upd('financement', v as string[])} multi small />
          </Field>

          <Field label="Priorité">
            <Chips options={['Essentiel', 'Important', 'Souhaitable']}
              value={projet.priorite} onChange={v => upd('priorite', v as string)} />
          </Field>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc5() {
  const navigate = useNavigate()

  // Données Blocs précédents
  const p1Data = loadFromStorage<{ prenom?: string; dateNaissance?: string }>('patrisim_bloc1_p1', {})
  const p2Data = loadFromStorage<{ prenom?: string; dateNaissance?: string }>('patrisim_bloc1_p2', {})
  const p1Label = p1Data.prenom?.trim() || 'Personne 1'
  const p2Label = p2Data.prenom?.trim() || 'Personne 2'
  const bloc1Mode = loadFromStorage<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const isCouple = bloc1Mode === 'couple'

  const bloc4 = loadFromStorage<{
    p1Pro?: { salaire?: string; remunNette?: string }
    p2Pro?: { salaire?: string; remunNette?: string }
  }>('patrisim_bloc4', {})
  const revenuP1Mensuel = parseNum(bloc4.p1Pro?.salaire || '0') || parseNum(bloc4.p1Pro?.remunNette || '0') / 12
  const revenuP2Mensuel = isCouple ? (parseNum(bloc4.p2Pro?.salaire || '0') || parseNum(bloc4.p2Pro?.remunNette || '0') / 12) : 0

  const bloc4Charges = loadFromStorage<{ mensualitesCredits?: string; assurances?: string; abonnements?: string }>('patrisim_bloc4', {})
  const capaciteBloc4 = loadFromStorage<{ capaciteEpargne?: number }>('patrisim_bloc4_calc', {}).capaciteEpargne

  const [state, setState] = useState<Bloc5State>(() => {
    const s = loadFromStorage('patrisim_bloc5', defaultState())
    // Pré-remplir capacité depuis Bloc 4
    if (!s.capaciteEpargne) {
      const revTotaux = revenuP1Mensuel + revenuP2Mensuel
      const charges = parseNum(bloc4Charges.mensualitesCredits || '0') + parseNum(bloc4Charges.assurances || '0') + parseNum(bloc4Charges.abonnements || '0')
      const cap = Math.max(0, revTotaux - charges)
      if (cap > 0) s.capaciteEpargne = String(Math.round(cap))
    }
    // Pré-remplir revenus cibles (75% revenus actuels)
    if (s.retraiteP1.revenusCibles === 0 && revenuP1Mensuel > 0) {
      s.retraiteP1 = { ...s.retraiteP1, revenusCibles: Math.round(revenuP1Mensuel * 0.75) }
    }
    if (isCouple && s.retraiteP2.revenusCibles === 0 && revenuP2Mensuel > 0) {
      s.retraiteP2 = { ...s.retraiteP2, revenusCibles: Math.round(revenuP2Mensuel * 0.75) }
    }
    return s
  })

  const [savedAt, setSavedAt] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState(false)
  const upd = useCallback(<K extends keyof Bloc5State>(k: K, v: Bloc5State[K]) => setState(s => ({ ...s, [k]: v })), [])

  useEffect(() => {
    localStorage.setItem('patrisim_bloc5', JSON.stringify(state))
    setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [state])

  // ── Calculs ────────────────────────────────────────────────────────────────
  const ageP1 = ageActuel(p1Data.dateNaissance || '')
  const ageP2 = ageActuel(p2Data.dateNaissance || '')
  const annesAvantP1 = ageP1 !== null ? Math.max(0, state.retraiteP1.ageDepartSouhaite - ageP1) : null
  const annesAvantP2 = ageP2 !== null && isCouple ? Math.max(0, state.retraiteP2.ageDepartSouhaite - ageP2) : null

  const pensionNettP1 = state.retraiteP1.pensionConnue
    ? Math.round((parseNum(state.retraiteP1.pensionBase) + (state.retraiteP1.aComplementaire ? parseNum(state.retraiteP1.pensionComplementaire) : 0)) * 0.83)
    : Math.round(revenuP1Mensuel * 0.5)

  const pensionNettP2 = isCouple ? (state.retraiteP2.pensionConnue
    ? Math.round((parseNum(state.retraiteP2.pensionBase) + (state.retraiteP2.aComplementaire ? parseNum(state.retraiteP2.pensionComplementaire) : 0)) * 0.83)
    : Math.round(revenuP2Mensuel * 0.5)) : 0

  const capacite = parseNum(state.capaciteEpargne)
  const totalEpargne = capacite + state.effortSupp

  // Capital projeté à la retraite
  const annees = annesAvantP1 ?? 20
  const capitalProjecte = capitalFuteur(totalEpargne, 4, annees)

  // Budget projets
  const budgetCT = state.projets.filter(p => p.horizon === 'Court terme (0–3 ans)').reduce((a, p) => a + parseNum(p.budgetMode === 'precis' ? p.montant : p.montantMax), 0)
  const budgetMT = state.projets.filter(p => p.horizon === 'Moyen terme (3–8 ans)').reduce((a, p) => a + parseNum(p.budgetMode === 'precis' ? p.montant : p.montantMax), 0)
  const budgetLT = state.projets.filter(p => p.horizon === 'Long terme (8 ans+)').reduce((a, p) => a + parseNum(p.budgetMode === 'precis' ? p.montant : p.montantMax), 0)
  const budgetTotal = budgetCT + budgetMT + budgetLT

  const repartTotal = state.repartition.precaution + state.repartition.projetsCT + state.repartition.retraite + state.repartition.transmission

  // Projection chart data
  const chartData = (() => {
    const data = []
    const today = new Date().getFullYear()
    const retraiteAn = today + (annesAvantP1 ?? 20)
    const espVie = retraiteAn + 25
    let capital = 0
    for (let year = today; year <= espVie; year++) {
      if (year < retraiteAn) {
        capital += totalEpargne * 12 * 1.04
      } else {
        const deficit = Math.max(0, (state.retraiteP1.revenusCibles - pensionNettP1 + (isCouple ? state.retraiteP2.revenusCibles - pensionNettP2 : 0)))
        capital = Math.max(0, capital - deficit * 12)
        capital *= 1.03
      }
      data.push({
        annee: year,
        capitalProjecte: Math.round(capital),
        objectif: parseNum(state.retraiteP1.patrimoineCouvrir) || undefined,
      })
    }
    return data
  })()

  // ── Validation ─────────────────────────────────────────────────────────────
  const handleSuivant = () => {
    setErrors({})
    setToast(true)
    setTimeout(() => navigate(getNextBloc(5)), 1200)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium">
          <CheckCircle size={16} className="text-green-400" />Étape 5 enregistrée ✓
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">

        {/* En-tête */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 5 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#185FA5] rounded-full" initial={{ width: '0%' }} animate={{ width: '71%' }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
            <span className="text-[11px] text-gray-300">71%</span>
            {savedAt && <span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Brouillon enregistré · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Projets & retraite</h1>
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-xl">Définissez vos objectifs de retraite et vos projets à financer. Ces informations guideront l'ensemble des recommandations de votre bilan.</p>
        </div>

        {/* ══ A — RETRAITE ══════════════════════════════════════════════════ */}
        <SectionTitle>A — Retraite</SectionTitle>
        {isCouple ? (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <RetraiteCard retraite={state.retraiteP1} onChange={r => upd('retraiteP1', r)}
              label={p1Label} isP2={false} dateNaissance={p1Data.dateNaissance}
              revenusMensuel={revenuP1Mensuel} errorAge={errors.revenusCiblesP1} />
            <RetraiteCard retraite={state.retraiteP2} onChange={r => upd('retraiteP2', r)}
              label={p2Label} isP2 dateNaissance={p2Data.dateNaissance}
              revenusMensuel={revenuP2Mensuel} errorAge={errors.revenusCiblesP2} />
          </div>
        ) : (
          <div className="mb-8">
            <RetraiteCard retraite={state.retraiteP1} onChange={r => upd('retraiteP1', r)}
              label={p1Label} isP2={false} dateNaissance={p1Data.dateNaissance}
              revenusMensuel={revenuP1Mensuel} errorAge={errors.revenusCiblesP1} />
          </div>
        )}

        {/* ══ B — PROJETS ══════════════════════════════════════════════════ */}
        <SectionTitle>B — Projets à financer</SectionTitle>
        <div className="mb-8">
          <Field label="Avez-vous des projets à financer ?">
            <Toggle value={state.aProjects} onChange={v => upd('aProjects', v)} />
          </Field>

          {state.aProjects && (
            <div className="mt-4 space-y-3">
              {state.projets.map(p => (
                <ProjetCard key={p.id} projet={p}
                  onChange={np => upd('projets', state.projets.map(x => x.id === p.id ? np : x))}
                  onRemove={() => upd('projets', state.projets.filter(x => x.id !== p.id))} />
              ))}
              <button type="button"
                onClick={() => upd('projets', [...state.projets, defaultProjet()])}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-[13px] text-gray-400 hover:border-[#185FA5] hover:text-[#185FA5] transition-colors font-medium">
                + Ajouter un projet
              </button>

              {budgetTotal > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                  <p className="text-[12px] font-semibold text-gray-700">Budget total projets : <strong className="text-[#185FA5]">{fmt(budgetTotal)} €</strong></p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[['Court terme', budgetCT], ['Moyen terme', budgetMT], ['Long terme', budgetLT]].map(([l, v]) => (
                      <div key={l as string} className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400">{l as string}</p>
                        <p className="text-[13px] font-semibold text-gray-700">{fmt(v as number)} €</p>
                      </div>
                    ))}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-[12px] font-medium ${
                    capacite * 12 * 3 >= budgetTotal ? 'bg-[#E1F5EE] text-[#085041]'
                    : capacite * 12 * 5 >= budgetTotal ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
                  }`}>
                    {capacite * 12 * 3 >= budgetTotal ? '✓ Finançables avec votre épargne actuelle'
                    : capacite * 12 * 5 >= budgetTotal ? '⚠ Effort d\'épargne supplémentaire nécessaire'
                    : '⚠ Besoin de financement externe probable'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ C — ÉPARGNE & EFFORT FUTUR ═══════════════════════════════════ */}
        <SectionTitle>C — Épargne & effort futur</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 mb-8">

          <Field label="Capacité d'épargne mensuelle actuelle">
            <div className="space-y-1.5">
              <Input value={state.capaciteEpargne} onChange={v => upd('capaciteEpargne', v)} placeholder="500" suffix="€/mois" />
              <p className="text-[11px] text-gray-400">Basé sur vos revenus et charges déclarés en Bloc 4</p>
            </div>
          </Field>

          {/* Répartition */}
          <Field label="Répartition de l'épargne" tooltip="La somme des 4 curseurs doit totaliser 100%">
            <div className="space-y-4">
              {[
                { key: 'precaution' as const, label: 'Épargne de précaution (liquidités)', tooltip: `Coussin recommandé : 4–6 mois de charges, soit ${fmt(parseNum(state.capaciteEpargne) * 4)} – ${fmt(parseNum(state.capaciteEpargne) * 6)} € pour vous` },
                { key: 'projetsCT' as const, label: 'Financement de projets CT' },
                { key: 'retraite' as const, label: 'Préparation retraite' },
                { key: 'transmission' as const, label: 'Transmission / succession' },
              ].map(({ key, label, tooltip }) => (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-gray-600">{label}</span>
                      {tooltip && (
                        <div className="group relative">
                          <span className="w-3.5 h-3.5 rounded-full border border-gray-200 text-gray-400 text-[9px] flex items-center justify-center cursor-help">?</span>
                          <div className="absolute bottom-5 left-0 bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded-lg w-52 hidden group-hover:block z-20">{tooltip}</div>
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] font-semibold text-[#185FA5]">{state.repartition[key]}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={state.repartition[key]}
                    onChange={e => upd('repartition', { ...state.repartition, [key]: Number(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
                </div>
              ))}
              <div className="mt-2">
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-gray-500">Total</span>
                  <span className={`font-bold ${repartTotal === 100 ? 'text-[#0F6E56]' : repartTotal > 100 ? 'text-red-600' : 'text-amber-600'}`}>
                    {repartTotal}% {repartTotal !== 100 && `— ${repartTotal > 100 ? 'il faut retirer' : 'il manque'} ${Math.abs(100 - repartTotal)}%`}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${repartTotal === 100 ? 'bg-[#0F6E56]' : repartTotal > 100 ? 'bg-red-500' : 'bg-[#185FA5]'}`}
                    style={{ width: `${Math.min(repartTotal, 100)}%` }} />
                </div>
              </div>
            </div>
          </Field>

          {/* Effort supplémentaire */}
          <Field label="Effort d'épargne supplémentaire envisageable">
            <div className="space-y-2">
              <div className="flex justify-between mb-1">
                <span className="text-[13px] font-bold text-[#185FA5]">{fmt(state.effortSupp)} €/mois</span>
                {state.effortSupp > 0 && <span className="text-[12px] text-gray-400">→ Capital add. : {fmt(capitalFuteur(state.effortSupp, 4, 15))} €</span>}
              </div>
              <input type="range" min={0} max={3000} step={50} value={state.effortSupp}
                onChange={e => upd('effortSupp', Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
              <div className="flex justify-between text-[10px] text-gray-400"><span>0 €</span><span>3 000 €/mois</span></div>
              {state.effortSupp > 0 && (
                <InfoCard color="blue">
                  Sur 15 ans à 4% de rendement moyen : capital supplémentaire de <strong>{fmt(capitalFuteur(state.effortSupp, 4, 15))} €</strong>
                </InfoCard>
              )}
            </div>
          </Field>

          <Field label="Horizon d'investissement global">
            <Chips options={['< 3 ans', '3–8 ans', '8–15 ans', '15 ans+']}
              value={state.horizonInvest} onChange={v => upd('horizonInvest', v as string)} />
          </Field>
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">Synthèse Bloc 5</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Retraite */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-[13px] font-semibold text-gray-800 mb-3">Retraite — {p1Label}</p>
                {[
                  { label: 'Départ prévu', value: annesAvantP1 !== null ? `Dans ${annesAvantP1} ans (${new Date().getFullYear() + (annesAvantP1 ?? 0)})` : '—' },
                  { label: 'Pension estimée', value: `${fmt(pensionNettP1)} €/mois` },
                  { label: 'Objectif', value: `${fmt(state.retraiteP1.revenusCibles)} €/mois` },
                  { label: 'Déficit à couvrir', value: `${fmt(Math.max(0, state.retraiteP1.revenusCibles - pensionNettP1))} €/mois` },
                  { label: 'Capital projeté', value: `${fmt(capitalProjecte)} €` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-[12px] text-gray-400">{label}</span>
                    <span className="text-[12px] font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
                <div className={`rounded-lg px-3 py-2 text-[12px] font-semibold mt-2 ${
                  capitalProjecte >= (parseNum(state.retraiteP1.patrimoineCouvrir) || capitalProjecte) ? 'bg-[#E1F5EE] text-[#085041]'
                  : state.retraiteP1.revenusCibles - pensionNettP1 <= 500 ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700'
                }`}>
                  {capitalProjecte >= (parseNum(state.retraiteP1.patrimoineCouvrir) || capitalProjecte) ? '✓ Objectif atteignable'
                  : state.retraiteP1.revenusCibles - pensionNettP1 <= 500 ? '⚠ Effort supplémentaire nécessaire'
                  : '⚠ Déficit important — action requise'}
                </div>
              </div>

              {/* Projets */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-[13px] font-semibold text-gray-800 mb-3">Projets</p>
                {[
                  { label: 'Projets identifiés', value: `${state.projets.length}` },
                  { label: 'Budget total', value: `${fmt(budgetTotal)} €` },
                  { label: 'Court terme', value: `${fmt(budgetCT)} € (${state.projets.filter(p => p.horizon === 'Court terme (0–3 ans)').length} projet${budgetCT > 0 ? 's' : ''})` },
                  { label: 'Moyen terme', value: `${fmt(budgetMT)} €` },
                  { label: 'Long terme', value: `${fmt(budgetLT)} €` },
                  { label: 'Finançable épargne', value: `${fmt(Math.min(budgetTotal, capacite * 12 * 5))} €` },
                  { label: 'Besoin complémentaire', value: `${fmt(Math.max(0, budgetTotal - capacite * 12 * 5))} €` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-[12px] text-gray-400">{label}</span>
                    <span className="text-[12px] font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Graphique projection */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[13px] font-semibold text-gray-800 mb-4">Projection du capital dans le temps</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
                  <Legend />
                  {annesAvantP1 !== null && (
                    <ReferenceLine x={new Date().getFullYear() + annesAvantP1} stroke="#185FA5" strokeDasharray="4 2" label={{ value: 'Retraite', fontSize: 10, fill: '#185FA5' }} />
                  )}
                  <Line type="monotone" dataKey="capitalProjecte" stroke="#185FA5" strokeWidth={2} dot={false} name="Capital projeté" />
                  {state.retraiteP1.patrimoineCouvrir && (
                    <Line type="monotone" dataKey="objectif" stroke="#0F6E56" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Objectif retraite" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <button type="button" onClick={() => navigate(getNextBloc(5))}
              className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
              Confirmer et passer au Bloc 6 — Profil investisseur →
            </button>
          </div>
        )}
      </div>

      {/* Barre sticky */}
      <div className="fixed bottom-[72px] left-[220px] right-0 bg-white border-t border-gray-100 px-8 py-2.5 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Retraite {p1Label}</span>
            <span className="text-[13px] font-bold text-[#185FA5]">{annesAvantP1 !== null ? `dans ${annesAvantP1} ans` : '—'}</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Budget projets</span>
            <span className="text-[13px] font-bold text-gray-700">{fmt(budgetTotal)} €</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Capacité d'épargne</span>
            <span className="text-[13px] font-bold text-[#0F6E56]">{fmt(capacite)} €/mois</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between items-center z-30">
        <button type="button" onClick={() => navigate('/bloc4')} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">← Retour</button>
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