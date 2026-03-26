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
  handicape: boolean
  autreUnion: boolean
  autreUnionParent: 'P1' | 'P2' | ''
}

interface EnfantMajeur {
  prenom: string
  age: string
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

interface Foyer {
  statutMatrimonial: string
  unionPrecedente: boolean
  nbUnionsPrecedentes: string
  regimeMatrimonial: string
  enfantsCharge: number
  enfants: EnfantCharge[]
  enfantsMajeurs: number
  majeurs: EnfantMajeur[]
  autresCharges: AutreCharge[]
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
  unionPrecedente: false,
  nbUnionsPrecedentes: '',
  regimeMatrimonial: '',
  enfantsCharge: 0,
  enfants: [],
  enfantsMajeurs: 0,
  majeurs: [],
  autresCharges: [],
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

function Checkbox({ checked, onChange, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
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

function ToggleButton({ value, onChange }: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-3">
      {['Non', 'Oui'].map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt === 'Oui')}
          className={`px-5 py-2 rounded-lg text-[13px] border transition-all ${
            (opt === 'Oui') === value
              ? 'bg-[#185FA5] border-[#185FA5] text-white'
              : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
          }`}
        >
          {opt}
        </button>
      ))}
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

function PersonneCard({ personne, onChange, label, dot, text }: {
  personne: Personne
  onChange: (p: Personne) => void
  label: string
  dot: string
  text: string
}) {
  const age = calculateAge(personne.dateNaissance)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className={`w-2 h-2 rounded-full ${dot}`} />
        <span className={`text-[12px] font-semibold tracking-wide ${text}`}>{label}</span>
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

export default function Bloc1() {
  const [mode, setMode] = useState<'seul' | 'couple'>('seul')
  const [p1, setP1] = useState<Personne>(defaultPersonne)
  const [p2, setP2] = useState<Personne>(defaultPersonne)
  const [foyer, setFoyer] = useState<Foyer>(defaultFoyer)

  const showRegime = ['Marié(e)', 'Pacsé(e)'].includes(foyer.statutMatrimonial)

  const handleEnfantsCharge = (n: number) => {
    const enfants = Array(n).fill(null).map((_, i) => foyer.enfants[i] || {
      prenom: '', age: '', gardeAlternee: false,
      handicape: false, autreUnion: false, autreUnionParent: '' as ''
    })
    setFoyer({ ...foyer, enfantsCharge: n, enfants })
  }

  const handleEnfantsMajeurs = (n: number) => {
    const majeurs = Array(n).fill(null).map((_, i) => foyer.majeurs[i] || {
      prenom: '', age: '', etudes: false,
      handicape: false, autreUnion: false, autreUnionParent: '' as ''
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

  const addAutreCharge = () => {
    setFoyer({
      ...foyer,
      autresCharges: [...foyer.autresCharges, {
        lien: '', autreDesc: '', prenom: '', coutMensuel: ''
      }]
    })
  }

  const updateAutreCharge = (i: number, field: keyof AutreCharge, value: string) => {
    const newCharges = [...foyer.autresCharges]
    newCharges[i] = { ...newCharges[i], [field]: value }
    setFoyer({ ...foyer, autresCharges: newCharges })
  }

  const removeAutreCharge = (i: number) => {
    setFoyer({ ...foyer, autresCharges: foyer.autresCharges.filter((_, idx) => idx !== i) })
  }

  const getEnfantLabel = (enfant: { prenom: string }, i: number) =>
    enfant.prenom.trim() || `Enfant ${i + 1}`

  const p1Label = p1.prenom.trim() || 'Personne 1'
  const p2Label = p2.prenom.trim() || 'Personne 2'

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
              personne={p1} onChange={setP1}
              label={p1Label} dot="bg-[#185FA5]" text="text-[#185FA5]"
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <PersonneCard
                personne={p1} onChange={setP1}
                label={p1Label} dot="bg-[#185FA5]" text="text-[#185FA5]"
              />
              <PersonneCard
                personne={p2} onChange={setP2}
                label={p2Label} dot="bg-[#0F6E56]" text="text-[#0F6E56]"
              />
            </div>
          )}
        </div>

        {/* Situation familiale */}
        <div className="mb-8">
          <SectionTitle>Situation familiale du foyer</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">

            {/* Statut matrimonial */}
            <Field label="Statut matrimonial actuel">
              <Select
                value={foyer.statutMatrimonial}
                onChange={v => setFoyer({ ...foyer, statutMatrimonial: v, regimeMatrimonial: '' })}
              >
                <option value="">Sélectionnez...</option>
                <option>Célibataire</option>
                <option>Marié(e)</option>
                <option>Pacsé(e)</option>
                <option>En concubinage</option>
                <option>Veuf(ve)</option>
              </Select>
            </Field>

            {/* Union précédente */}
            {foyer.statutMatrimonial && foyer.statutMatrimonial !== 'Veuf(ve)' && (
              <div>
                <Field label="Avez-vous déjà été marié(e) ou pacsé(e) précédemment ?">
                  <ToggleButton
                    value={foyer.unionPrecedente}
                    onChange={v => setFoyer({ ...foyer, unionPrecedente: v, nbUnionsPrecedentes: '' })}
                  />
                </Field>
                {foyer.unionPrecedente && (
                  <div className="mt-3">
                    <Field label="Nombre d'unions précédentes">
                      <ChipSelector
                        options={['1', '2', '3+']}
                        value={foyer.nbUnionsPrecedentes}
                        onChange={v => setFoyer({ ...foyer, nbUnionsPrecedentes: v })}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}

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
                      <div className="text-[12px] font-semibold text-[#185FA5] mb-3">
                        {getEnfantLabel(enfant, i)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <Field label="Prénom">
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
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <Checkbox
                          checked={enfant.gardeAlternee}
                          onChange={v => updateEnfant(i, 'gardeAlternee', v)}
                          label="Garde alternée"
                        />
                        <Checkbox
                          checked={enfant.handicape}
                          onChange={v => updateEnfant(i, 'handicape', v)}
                          label="Situation de handicap"
                        />
                        <Checkbox
                          checked={enfant.autreUnion}
                          onChange={v => updateEnfant(i, 'autreUnion', v)}
                          label="Issu(e) d'une autre union"
                        />
                      </div>
                      {enfant.autreUnion && (
                        <div className="mt-3">
                          <Field label="Union de">
                            <ChipSelector
                              options={[p1Label, p2Label]}
                              value={enfant.autreUnionParent === 'P1' ? p1Label : enfant.autreUnionParent === 'P2' ? p2Label : ''}
                              onChange={v => updateEnfant(i, 'autreUnionParent', v === p1Label ? 'P1' : 'P2')}
                            />
                          </Field>
                        </div>
                      )}
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
                      <div className="text-[12px] font-semibold text-[#185FA5] mb-3">
                        {getEnfantLabel(majeur, i)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <Field label="Prénom">
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
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <Checkbox
                          checked={majeur.etudes}
                          onChange={v => updateMajeur(i, 'etudes', v)}
                          label="Études en cours"
                        />
                        <Checkbox
                          checked={majeur.handicape}
                          onChange={v => updateMajeur(i, 'handicape', v)}
                          label="Situation de handicap"
                        />
                        <Checkbox
                          checked={majeur.autreUnion}
                          onChange={v => updateMajeur(i, 'autreUnion', v)}
                          label="Issu(e) d'une autre union"
                        />
                      </div>
                      {majeur.autreUnion && (
                        <div className="mt-3">
                          <Field label="Union de">
                            <ChipSelector
                              options={[p1Label, p2Label]}
                              value={majeur.autreUnionParent === 'P1' ? p1Label : majeur.autreUnionParent === 'P2' ? p2Label : ''}
                              onChange={v => updateMajeur(i, 'autreUnionParent', v === p1Label ? 'P1' : 'P2')}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Autres personnes à charge */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                  Autres personnes à charge
                </label>
                <button
                  onClick={addAutreCharge}
                  className="text-[12px] text-[#185FA5] hover:text-[#0C447C] font-medium flex items-center gap-1 transition-colors"
                >
                  <span className="text-[16px] leading-none">+</span> Ajouter une personne
                </button>
              </div>

              {foyer.autresCharges.length === 0 && (
                <div className="text-[13px] text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                  Aucune autre personne à charge déclarée.
                </div>
              )}

              {foyer.autresCharges.map((charge, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[12px] font-semibold text-[#185FA5]">
                      Personne {i + 1}{charge.prenom ? ` — ${charge.prenom}` : ''}
                    </span>
                    <button
                      onClick={() => removeAutreCharge(i)}
                      className="text-[12px] text-red-400 hover:text-red-600 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Field label="Lien de parenté">
                      <Select
                        value={charge.lien}
                        onChange={v => updateAutreCharge(i, 'lien', v)}
                      >
                        <option value="">Sélectionnez...</option>
                        <option>Parent</option>
                        <option>Beau-parent</option>
                        <option>Grand-parent</option>
                        <option>Beau-fils / Belle-fille</option>
                        <option>Enfant d'une autre union</option>
                        <option>Frère / Sœur</option>
                        <option>Autre</option>
                      </Select>
                    </Field>
                    <Field label="Prénom">
                      <Input
                        value={charge.prenom}
                        onChange={v => updateAutreCharge(i, 'prenom', v)}
                        placeholder="ex: Geneviève"
                      />
                    </Field>
                  </div>
                  {charge.lien === 'Autre' && (
                    <div className="mb-3">
                      <Field label="Précisez">
                        <Input
                          value={charge.autreDesc}
                          onChange={v => updateAutreCharge(i, 'autreDesc', v)}
                          placeholder="ex: tuteur légal..."
                        />
                      </Field>
                    </div>
                  )}
                  <Field label="Coût mensuel estimé (€)">
                    <Input
                      type="number"
                      value={charge.coutMensuel}
                      onChange={v => updateAutreCharge(i, 'coutMensuel', v)}
                      placeholder="ex: 500"
                    />
                  </Field>
                </div>
              ))}
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