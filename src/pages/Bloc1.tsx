import { useState } from 'react'

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
}

interface EnfantMajeur {
  prenom: string
  age: string
  aCharge: boolean
}

interface Foyer {
  statutMatrimonial: string
  regimeMatrimonial: string
  enfantsCharge: number
  enfants: EnfantCharge[]
  enfantsMajeurs: number
  majeurs: EnfantMajeur[]
  autresPersonnes: boolean
  autresPersonnesDesc: string
  autresPersonnesCout: string
}

const defaultPersonne: Personne = {
  prenom: '',
  nom: '',
  dateNaissance: '',
  nationalite: 'Française',
  autrePays: '',
}

const defaultFoyer: Foyer = {
  statutMatrimonial: '',
  regimeMatrimonial: '',
  enfantsCharge: 0,
  enfants: [],
  enfantsMajeurs: 0,
  majeurs: [],
  autresPersonnes: false,
  autresPersonnesDesc: '',
  autresPersonnesCout: '',
}

function calculateAge(dateNaissance: string): number | null {
  if (!dateNaissance) return null
  const today = new Date()
  const birth = new Date(dateNaissance)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function Field({ label, children, tooltip }: {
  label: string
  children: React.ReactNode
  tooltip?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest">
          {label}
        </label>
        {tooltip && (
          <div className="group relative">
            <span className="w-4 h-4 rounded-full border border-gray-200 text-gray-400 text-[10px] flex items-center justify-center cursor-help">?</span>
            <div className="absolute bottom-6 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-56 hidden group-hover:block z-10 leading-relaxed">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '' }: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all"
    />
  )
}

function Select({ value, onChange, children }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all cursor-pointer"
    >
      {children}
    </select>
  )
}

function ChipSelector({ options, value, onChange }: {
  options: (string | number)[]
  value: string | number
  onChange: (v: any) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-lg text-[13px] border transition-all ${
            value === opt
              ? 'bg-[#185FA5] border-[#185FA5] text-white shadow-[0_2px_8px_rgba(24,95,165,0.3)]'
              : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function PersonneCard({ personne, onChange, badge }: {
  personne: Personne
  onChange: (p: Personne) => void
  badge: { label: string; text: string; dot: string }
}) {
  const age = calculateAge(personne.dateNaissance)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className={`w-2 h-2 rounded-full ${badge.dot}`} />
        <span className={`text-[12px] font-semibold tracking-wide ${badge.text}`}>
          {badge.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Prénom">
          <Input value={personne.prenom} onChange={v => onChange({ ...personne, prenom: v })} placeholder="Marie" />
        </Field>
        <Field label="Nom">
          <Input value={personne.nom} onChange={v => onChange({ ...personne, nom: v })} placeholder="Dupont" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Date de naissance">
          <div className="relative">
            <Input type="date" value={personne.dateNaissance} onChange={v => onChange({ ...personne, dateNaissance: v })} />
            {age !== null && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded-full pointer-events-none">
                {age} ans
              </span>
            )}
          </div>
        </Field>
        <Field label="Nationalité">
          <Select value={personne.nationalite} onChange={v => onChange({ ...personne, nationalite: v })}>
            <option>Française</option>
            <option>Autre</option>
          </Select>
        </Field>
      </div>
      {personne.nationalite === 'Autre' && (
        <Field label="Précisez le pays">
          <Input value={personne.autrePays} onChange={v => onChange({ ...personne, autrePays: v })} placeholder="Belgique, Suisse..." />
        </Field>
      )}
    </div>
  )
}

const regimesMatrimoniaux: Record<string, string> = {
  'Communauté légale réduite aux acquêts': 'Les biens acquis pendant le mariage appartiennent aux deux époux à parts égales.',
  'Séparation de biens': "Chaque époux reste propriétaire exclusif des biens qu'il acquiert.",
  'Communauté universelle': 'Tous les biens présents et futurs sont communs aux deux époux.',
  'Participation aux acquêts': 'Régime mixte : séparation pendant le mariage, partage des gains à la dissolution.',
  'PACS — régime légal': 'Par défaut, chaque partenaire conserve ses biens propres.',
  'PACS — indivision': 'Les biens acquis ensemble appartiennent aux deux partenaires.',
}

export default function Bloc1() {
  const [mode, setMode] = useState<'seul' | 'couple'>('seul')
  const [p1, setP1] = useState<Personne>(defaultPersonne)
  const [p2, setP2] = useState<Personne>(defaultPersonne)
  const [foyer, setFoyer] = useState<Foyer>(defaultFoyer)

  const showRegime = ['Marié(e)', 'Pacsé(e)'].includes(foyer.statutMatrimonial)

  const handleEnfantsCharge = (n: number) => {
    const enfants = Array(n).fill(null).map((_, i) => foyer.enfants[i] || {
      prenom: '',
      age: '',
      gardeAlternee: false,
    })
    setFoyer({ ...foyer, enfantsCharge: n, enfants })
  }

  const handleEnfantsMajeurs = (n: number) => {
    const majeurs = Array(n).fill(null).map((_, i) => foyer.majeurs[i] || {
      prenom: '',
      age: '',
      aCharge: false,
    })
    setFoyer({ ...foyer, enfantsMajeurs: n, majeurs })
  }

  const updateEnfant = (i: number, field: keyof EnfantCharge, value: any) => {
    const newEnfants = [...foyer.enfants]
    newEnfants[i] = { ...newEnfants[i], [field]: value }
    setFoyer({ ...foyer, enfants: newEnfants })
  }

  const updateMajeur = (i: number, field: keyof EnfantMajeur, value: any) => {
    const newMajeurs = [...foyer.majeurs]
    newMajeurs[i] = { ...newMajeurs[i], [field]: value }
    setFoyer({ ...foyer, majeurs: newMajeurs })
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-8 pb-28">

        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 1 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#185FA5] rounded-full" style={{ width: '14%' }} />
            </div>
            <span className="text-[11px] text-gray-300">14%</span>
          </div>
          <h1 className="text-[24px] font-semibold text-gray-900 tracking-tight">
            Profil civil & familial
          </h1>
          <p className="text-[14px] text-gray-400 mt-1 leading-relaxed">
            Ces informations permettent de structurer l'analyse patrimoniale
            et de respecter le cadre réglementaire (KYC / MiFID II).
          </p>
        </div>

        {/* Mode de saisie */}
        <div className="mb-8">
          <SectionTitle>Mode de saisie</SectionTitle>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {[
              { key: 'seul', label: 'Personne seule', sub: 'Bilan individuel' },
              { key: 'couple', label: 'Couple', sub: 'Saisie pour les deux' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setMode(opt.key as 'seul' | 'couple')}
                className={`p-4 rounded-xl text-left transition-all ${
                  mode === opt.key
                    ? 'bg-[#185FA5] shadow-[0_4px_14px_rgba(24,95,165,0.25)]'
                    : 'bg-white border border-gray-100 hover:border-gray-200 shadow-sm'
                }`}
              >
                <div className={`text-[13px] font-semibold ${mode === opt.key ? 'text-white' : 'text-gray-800'}`}>
                  {opt.label}
                </div>
                <div className={`text-[11px] mt-0.5 ${mode === opt.key ? 'text-blue-200' : 'text-gray-400'}`}>
                  {opt.sub}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Identité */}
        <div className="mb-8">
          <SectionTitle>Identité</SectionTitle>
          {mode === 'seul' ? (
            <PersonneCard
              personne={p1}
              onChange={setP1}
              badge={{ label: 'Personne 1', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <PersonneCard
                personne={p1}
                onChange={setP1}
                badge={{ label: 'Personne 1', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' }}
              />
              <PersonneCard
                personne={p2}
                onChange={setP2}
                badge={{ label: 'Personne 2', text: 'text-[#0F6E56]', dot: 'bg-[#0F6E56]' }}
              />
            </div>
          )}
        </div>

        {/* Situation familiale */}
        <div className="mb-8">
          <SectionTitle>Situation familiale du foyer</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">

            {/* Statut matrimonial */}
            <Field label="Statut matrimonial">
              <Select
                value={foyer.statutMatrimonial}
                onChange={v => setFoyer({ ...foyer, statutMatrimonial: v, regimeMatrimonial: '' })}
              >
                <option value="">Sélectionnez...</option>
                <option>Célibataire</option>
                <option>Marié(e)</option>
                <option>Pacsé(e)</option>
                <option>En concubinage</option>
                <option>Divorcé(e)</option>
                <option>Séparé(e)</option>
                <option>Veuf(ve)</option>
              </Select>
            </Field>

            {/* Régime matrimonial */}
            {showRegime && (
              <div>
                <Field label="Régime matrimonial">
                  <Select
                    value={foyer.regimeMatrimonial}
                    onChange={v => setFoyer({ ...foyer, regimeMatrimonial: v })}
                  >
                    <option value="">Sélectionnez...</option>
                    {Object.keys(regimesMatrimoniaux).map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </Select>
                </Field>
                {foyer.regimeMatrimonial && (
                  <div className="mt-2 text-[12px] text-[#185FA5] bg-blue-50 px-4 py-2 rounded-lg">
                    {regimesMatrimoniaux[foyer.regimeMatrimonial]}
                  </div>
                )}
              </div>
            )}

            {/* Enfants à charge */}
            <div>
              <Field label="Enfants à charge">
                <ChipSelector
                  options={[0, 1, 2, 3, 4, 5, 6]}
                  value={foyer.enfantsCharge}
                  onChange={v => handleEnfantsCharge(Number(v))}
                />
              </Field>

              {foyer.enfantsCharge > 0 && (
                <div className="mt-4 space-y-3">
                  {foyer.enfants.map((enfant, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <Field label={`Prénom enfant ${i + 1}`}>
                          <Input
                            value={enfant.prenom}
                            onChange={v => updateEnfant(i, 'prenom', v)}
                            placeholder="ex: Emma"
                          />
                        </Field>
                        <Field label="Âge">
                          <Input
                            type="number"
                            value={enfant.age}
                            onChange={v => updateEnfant(i, 'age', v)}
                            placeholder="ex: 8"
                          />
                        </Field>
                        <Field label="Garde alternée">
                          <div className="flex items-center h-10">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div
                                onClick={() => updateEnfant(i, 'gardeAlternee', !enfant.gardeAlternee)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                                  enfant.gardeAlternee
                                    ? 'bg-[#185FA5] border-[#185FA5]'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {enfant.gardeAlternee && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[13px] text-gray-600">Oui</span>
                            </label>
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enfants majeurs */}
            <div>
              <Field label="Enfants majeurs (18 ans et plus)">
                <ChipSelector
                  options={[0, 1, 2, 3, 4, 5, 6]}
                  value={foyer.enfantsMajeurs}
                  onChange={v => handleEnfantsMajeurs(Number(v))}
                />
              </Field>

              {foyer.enfantsMajeurs > 0 && (
                <div className="mt-4 space-y-3">
                  {foyer.majeurs.map((majeur, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <Field label={`Prénom enfant ${i + 1}`}>
                          <Input
                            value={majeur.prenom}
                            onChange={v => updateMajeur(i, 'prenom', v)}
                            placeholder="ex: Lucas"
                          />
                        </Field>
                        <Field label="Âge">
                          <Input
                            type="number"
                            value={majeur.age}
                            onChange={v => updateMajeur(i, 'age', v)}
                            placeholder="ex: 22"
                          />
                        </Field>
                        <Field label="À charge financièrement">
                          <div className="flex items-center h-10">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div
                                onClick={() => updateMajeur(i, 'aCharge', !majeur.aCharge)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                                  majeur.aCharge
                                    ? 'bg-[#185FA5] border-[#185FA5]'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {majeur.aCharge && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[13px] text-gray-600">Oui</span>
                            </label>
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Autres personnes à charge */}
            <div>
              <Field label="Autres personnes à charge">
                <div className="flex gap-3">
                  {['Non', 'Oui'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFoyer({ ...foyer, autresPersonnes: opt === 'Oui' })}
                      className={`px-5 py-2 rounded-lg text-[13px] border transition-all ${
                        (opt === 'Oui') === foyer.autresPersonnes
                          ? 'bg-[#185FA5] border-[#185FA5] text-white'
                          : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
              {foyer.autresPersonnes && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Field label="Description">
                    <Input
                      value={foyer.autresPersonnesDesc}
                      onChange={v => setFoyer({ ...foyer, autresPersonnesDesc: v })}
                      placeholder="ex: parent dépendant"
                    />
                  </Field>
                  <Field label="Coût mensuel estimé (€)">
                    <Input
                      type="number"
                      value={foyer.autresPersonnesCout}
                      onChange={v => setFoyer({ ...foyer, autresPersonnesCout: v })}
                      placeholder="ex: 500"
                    />
                  </Field>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur border-t border-gray-100 px-8 py-4 flex justify-between items-center">
        <button className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
          Annuler
        </button>
        <div className="flex items-center gap-3">
          <button className="text-[13px] text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            Enregistrer
          </button>
          <button className="text-[13px] text-white px-5 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors shadow-[0_2px_8px_rgba(24,95,165,0.3)]">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}