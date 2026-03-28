// src/pages/Demo.tsx
// Page de démonstration avec profils pré-remplis

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, Users, User, Home, Briefcase } from 'lucide-react'
import { DEMO_PROFILES, loadDemoProfile } from '../data/DemoProfiles'

const ICONS = [
  <Users size={24} />,
  <User size={24} />,
  <Home size={24} />,
  <Briefcase size={24} />,
]

const TAG_COLORS: Record<string, string> = {
  'Retraite': 'bg-[#E6F1FB] text-[#0C447C]',
  'Succession': 'bg-purple-50 text-purple-700',
  'Immobilier': 'bg-orange-50 text-orange-700',
  'Achat RP': 'bg-[#E1F5EE] text-[#085041]',
  'Épargne': 'bg-[#E6F1FB] text-[#0C447C]',
  'Fiscalité': 'bg-amber-50 text-amber-700',
  'Transmission': 'bg-purple-50 text-purple-700',
  'TNS': 'bg-red-50 text-red-700',
}

export default function Demo() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)

  const handleLoad = (profileId: string) => {
    setLoading(profileId)
    setTimeout(() => {
      const ok = loadDemoProfile(profileId)
      if (ok) {
        setLoaded(profileId)
        setLoading(null)
        // Aller directement à l'analyse après 1 seconde
        setTimeout(() => navigate('/analyse'), 1000)
      }
    }, 600)
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <button type="button" onClick={() => navigate('/')} className="text-[12px] text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
            ← Retour à l'accueil
          </button>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#185FA5]" />
            <span className="text-[11px] text-[#185FA5] font-semibold uppercase tracking-wider">Mode démonstration</span>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-2">
            Choisissez un profil de démonstration
          </h1>
          <p className="text-[14px] text-gray-400 max-w-xl">
            Ces profils pré-remplis permettent de tester l'analyse IA sans saisir manuellement les données. Un clic suffit pour charger un profil complet.
          </p>
        </div>

        {/* Grille profils */}
        <div className="grid grid-cols-2 gap-5 mb-10">
          {DEMO_PROFILES.map((profile, i) => (
            <div key={profile.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${loaded === profile.id ? 'border-[#0F6E56]' : 'border-gray-100 hover:border-[#185FA5]/30 hover:shadow-md'}`}>
              {/* Header carte */}
              <div className="p-5 pb-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${loaded === profile.id ? 'bg-[#E1F5EE]' : 'bg-gray-50'}`}>
                    {profile.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-gray-900 leading-tight">{profile.titre}</p>
                    <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">{profile.description}</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {profile.tags.map(tag => (
                    <span key={tag} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Données résumées */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  {[
                    { l: 'Patrimoine brut', v: (() => {
                      const d = profile.data as Record<string, Record<string, number>>
                      const b2 = d.patrisim_bloc2 as Record<string, number>
                      const total = (b2?.totalImmo||0) + (b2?.totalFinancier||0) + (b2?.totalAutres||0)
                      return total > 0 ? `${(total/1000).toFixed(0)} k€` : '—'
                    })()},
                    { l: 'Salaire net', v: (() => {
                      const b4 = (profile.data as Record<string, Record<string, Record<string, string>>>).patrisim_bloc4
                      const s = b4?.p1Pro?.salaire || b4?.p1Pro?.remunNette
                      return s ? `${parseInt(s).toLocaleString('fr-FR')} €/mois` : '—'
                    })()},
                    { l: 'TMI', v: (() => {
                      const b4 = (profile.data as Record<string, Record<string, Record<string, number>>>).patrisim_bloc4
                      return b4?.fiscal?.tmi ? `${b4.fiscal.tmi}%` : '—'
                    })()},
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between text-[11px]">
                      <span className="text-gray-400">{l}</span>
                      <span className="font-semibold text-gray-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bouton */}
              <button
                type="button"
                onClick={() => handleLoad(profile.id)}
                disabled={loading !== null}
                className={`w-full py-3.5 px-5 flex items-center justify-center gap-2 text-[13px] font-semibold transition-all ${
                  loaded === profile.id
                    ? 'bg-[#E1F5EE] text-[#0F6E56]'
                    : loading === profile.id
                    ? 'bg-[#E6F1FB] text-[#185FA5]'
                    : 'bg-[#185FA5] text-white hover:bg-[#0C447C]'
                }`}
              >
                {loaded === profile.id ? (
                  <><CheckCircle size={16} />Chargé — Lancement de l'analyse…</>
                ) : loading === profile.id ? (
                  <><div className="w-4 h-4 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" />Chargement…</>
                ) : (
                  <>Tester ce profil <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-center">
          <p className="text-[12px] text-amber-700 leading-relaxed">
            <strong>Mode démonstration</strong> — Ces profils sont fictifs et servent uniquement à tester l'application. Le chargement d'un profil effacera les données actuellement en mémoire.
          </p>
        </div>

      </div>
    </div>
  )
}