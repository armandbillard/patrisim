import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getNextBloc, isLastBloc } from '../utils/navigation'
import FadeIn from '../components/FadeIn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Personne {
  prenom: string
  dateNaissance: string
}

interface SituationPro {
  statut: string
  typeContrat: string
  caissesRetraite: string
  dateDepartRetraite: string
  formeJuridique: string
}

interface Foyer {
  statutMatrimonial: string
  regimeMatrimonial: string
  typeLogement: string
  logementAutreDetail: string
  enfantsCharge: number
  enfantsMajeurs: number
}

interface Errors {
  p1Prenom?: string
  p1Date?: string
  p2Prenom?: string
  p2Date?: string
  statutMatrimonial?: string
  pro1Statut?: string
  pro2Statut?: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultPersonne: Personne = {
  prenom: '', dateNaissance: '',
}

const defaultFoyer: Foyer = {
  statutMatrimonial: '', regimeMatrimonial: '',
  typeLogement: '', logementAutreDetail: '',
  enfantsCharge: 0, enfantsMajeurs: 0,
}

const defaultSituationPro = (): SituationPro => ({
  statut: '', typeContrat: '', caissesRetraite: '', dateDepartRetraite: '', formeJuridique: '',
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

function PersonneCard({ personne, onChange, isP2 = false, isRapide = false, errors = {} }: {
  personne: Personne; onChange: (p: Personne) => void
  isP2?: boolean; isRapide?: boolean; errors?: { prenom?: string; date?: string }
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom" error={errors.prenom}>
          <Input value={personne.prenom} onChange={v => onChange({ ...personne, prenom: v })} placeholder="Marie" hasError={!!errors.prenom} />
        </Field>
        {isRapide ? (
          <Field label="Âge" error={errors.date}>
            <Input
              type="number"
              value={age !== null ? String(age) : ''}
              onChange={v => onChange({ ...personne, dateNaissance: v ? `${new Date().getFullYear() - Number(v)}-01-01` : '' })}
              placeholder="45"
              hasError={!!errors.date}
            />
          </Field>
        ) : (
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
        )}
      </div>
    </div>
  )
}

// ─── SituationProCard ─────────────────────────────────────────────────────────

function SituationProCard({ pro, onChange, isP2 = false, personneLabel, isRapide = false, errorStatut }: {
  pro: SituationPro; onChange: (p: SituationPro) => void
  isP2?: boolean; personneLabel: string; isRapide?: boolean; errorStatut?: string
}) {
  const upd = <K extends keyof SituationPro>(k: K, v: SituationPro[K]) => onChange({ ...pro, [k]: v })
  const isRetraite = pro.statut === "Retraité(e)"
  const isTNS = pro.statut === "TNS (indépendant)" || pro.statut === "Chef(fe) d'entreprise"
  const isSalarie = pro.statut === "Salarié(e) du privé" || pro.statut === "Fonctionnaire"
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
        {isSalarie && (
          <Field label="Type de contrat">
            <div className="flex flex-wrap gap-2">
              {['CDI', 'CDD', 'Intérim', 'Autre'].map(opt => (
                <button key={opt} type="button" onClick={() => upd('typeContrat', opt)}
                  className={`px-3.5 py-2 text-[12px] rounded-lg border transition-all font-medium ${pro.typeContrat === opt ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </Field>
        )}
        {!isRapide && isRetraite && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Caisse(s) de retraite" tooltip="Ex : CNAV, AGIRC-ARRCO, CIPAV…">
              <Input value={pro.caissesRetraite} onChange={v => upd('caissesRetraite', v)} placeholder="CNAV, AGIRC-ARRCO…" />
            </Field>
            <Field label="Date de départ">
              <Input type="date" value={pro.dateDepartRetraite} onChange={v => upd('dateDepartRetraite', v)} />
            </Field>
          </div>
        )}
        {!isRapide && isTNS && (
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Bloc1() {
  const navigate = useNavigate()

  const niveauDetail = loadFromStorage<{ niveauDetail?: string }>('patrisim_bloc0', {}).niveauDetail || 'complet'
  const isRapide = niveauDetail === 'rapide'

  const [mode, setMode] = useState<'seul' | 'couple'>(() =>
    loadFromStorage<{ v: 'seul' | 'couple' }>('patrisim_bloc1_mode', { v: 'seul' }).v ?? 'seul'
  )
  const [p1, setP1] = useState<Personne>(() => loadFromStorage('patrisim_bloc1_p1', defaultPersonne))
  const [p2, setP2] = useState<Personne>(() => loadFromStorage('patrisim_bloc1_p2', defaultPersonne))
  const [foyer, setFoyer] = useState<Foyer>(() => loadFromStorage('patrisim_bloc1_foyer', defaultFoyer))
  const [pro1, setPro1] = useState<SituationPro>(() => loadFromStorage('patrisim_bloc1_pro1', defaultSituationPro()))
  const [pro2, setPro2] = useState<SituationPro>(() => loadFromStorage('patrisim_bloc1_pro2', defaultSituationPro()))
  const [savedAt, setSavedAt] = useState<string>('')
  const [errors, setErrors] = useState<Errors>({})
  const [showToast, setShowToast] = useState(false)

  const isCouple = mode === 'couple'
  const p1Label = p1.prenom.trim() || 'Personne 1'
  const p2Label = p2.prenom.trim() || 'Personne 2'
  const showRegime = !isRapide && (foyer.statutMatrimonial === 'Marié(e)' || foyer.statutMatrimonial === 'Pacsé(e)')

  // Auto-save
  useEffect(() => {
    localStorage.setItem('patrisim_bloc1_mode', JSON.stringify({ v: mode }))
    localStorage.setItem('patrisim_bloc1_p1', JSON.stringify(p1))
    localStorage.setItem('patrisim_bloc1_p2', JSON.stringify(p2))
    localStorage.setItem('patrisim_bloc1_foyer', JSON.stringify(foyer))
    localStorage.setItem('patrisim_bloc1_pro1', JSON.stringify(pro1))
    localStorage.setItem('patrisim_bloc1_pro2', JSON.stringify(pro2))
    const now = new Date()
    setSavedAt(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  }, [mode, p1, p2, foyer, pro1, pro2])

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
      setErrors({})
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
              <PersonneCard personne={p1} onChange={p => { setP1(p); setErrors(e => ({ ...e, p1Prenom: undefined, p1Date: undefined })) }}
                isP2={false} isRapide={isRapide} errors={{ prenom: errors.p1Prenom, date: errors.p1Date }} />
              <PersonneCard personne={p2} onChange={p => { setP2(p); setErrors(e => ({ ...e, p2Prenom: undefined, p2Date: undefined })) }}
                isP2={true} isRapide={isRapide} errors={{ prenom: errors.p2Prenom, date: errors.p2Date }} />
            </div>
          ) : (
            <PersonneCard personne={p1} onChange={p => { setP1(p); setErrors(e => ({ ...e, p1Prenom: undefined, p1Date: undefined })) }}
              isP2={false} isRapide={isRapide} errors={{ prenom: errors.p1Prenom, date: errors.p1Date }} />
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
            <Field label="Enfants à charge (moins de 18 ans)">
              <ChipSelector options={[0,1,2,3,4,5,6]} value={foyer.enfantsCharge}
                onChange={v => setFoyer({ ...foyer, enfantsCharge: Number(v) })} />
            </Field>

            {/* Enfants majeurs */}
            <Field label="Enfants majeurs (18 ans et plus)">
              <ChipSelector options={[0,1,2,3,4,5,6]} value={foyer.enfantsMajeurs}
                onChange={v => setFoyer({ ...foyer, enfantsMajeurs: Number(v) })} />
            </Field>

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
                isP2={false} personneLabel={p1Label} isRapide={isRapide} errorStatut={errors.pro1Statut} />
              <SituationProCard pro={pro2} onChange={p => { setPro2(p); setErrors(e => ({ ...e, pro2Statut: undefined })) }}
                isP2={true} personneLabel={p2Label} isRapide={isRapide} errorStatut={errors.pro2Statut} />
            </div>
          ) : (
            <SituationProCard pro={pro1} onChange={p => { setPro1(p); setErrors(e => ({ ...e, pro1Statut: undefined })) }}
              isP2={false} personneLabel={p1Label} isRapide={isRapide} errorStatut={errors.pro1Statut} />
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
            {isLastBloc(1) ? 'Lancer l\'analyse →' : 'Suivant →'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
