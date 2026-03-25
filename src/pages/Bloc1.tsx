import { useState } from 'react'

interface Personne {
  prenom: string
  nom: string
  dateNaissance: string
  nationalite: string
  autrePays: string
}

const defaultPersonne: Personne = {
  prenom: '',
  nom: '',
  dateNaissance: '',
  nationalite: 'Française',
  autrePays: '',
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group">
      <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
        {label}
      </label>
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

function PersonneCard({ personne, onChange, badge }: {
  personne: Personne
  onChange: (p: Personne) => void
  badge: { label: string; bg: string; text: string; dot: string }
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
          <Input
            value={personne.prenom}
            onChange={v => onChange({ ...personne, prenom: v })}
            placeholder="Marie"
          />
        </Field>
        <Field label="Nom">
          <Input
            value={personne.nom}
            onChange={v => onChange({ ...personne, nom: v })}
            placeholder="Dupont"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Date de naissance">
          <div className="relative">
            <Input
              type="date"
              value={personne.dateNaissance}
              onChange={v => onChange({ ...personne, dateNaissance: v })}
            />
            {age !== null && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded-full pointer-events-none">
                {age} ans
              </span>
            )}
          </div>
        </Field>
        <Field label="Nationalité">
          <Select
            value={personne.nationalite}
            onChange={v => onChange({ ...personne, nationalite: v })}
          >
            <option>Française</option>
            <option>Autre</option>
          </Select>
        </Field>
      </div>

      {personne.nationalite === 'Autre' && (
        <Field label="Précisez le pays">
          <Input
            value={personne.autrePays}
            onChange={v => onChange({ ...personne, autrePays: v })}
            placeholder="Belgique, Suisse..."
          />
        </Field>
      )}
    </div>
  )
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

export default function Bloc1() {
  const [mode, setMode] = useState<'seul' | 'couple'>('seul')
  const [p1, setP1] = useState<Personne>(defaultPersonne)
  const [p2, setP2] = useState<Personne>(defaultPersonne)

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-8 pb-28">

        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
              Étape 1 sur 7
            </span>
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
              badge={{ label: 'Personne 1', bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <PersonneCard
                personne={p1}
                onChange={setP1}
                badge={{ label: 'Personne 1', bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' }}
              />
              <PersonneCard
                personne={p2}
                onChange={setP2}
                badge={{ label: 'Personne 2', bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]', dot: 'bg-[#0F6E56]' }}
              />
            </div>
          )}
        </div>

      </div>

      {/* Footer fixe */}
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