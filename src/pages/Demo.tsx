// src/pages/Demo.tsx
// Profils de démonstration — remplissent automatiquement le localStorage

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import FadeIn from '../components/FadeIn'
import { DEMO_PROFILES, loadDemoProfileWithCache } from '../data/DemoProfiles'

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' } }),
}

// ─── Métriques affichées sur chaque carte ────────────────────────────────────

const PROFILE_METRICS: Record<string, { revenus: string; patrimoine: string; tmi: string }> = {
  'retraite-couple-50': { revenus: '6 500 €/mois',  patrimoine: '550 000 €', tmi: '30%' },
  'bilan-lucas-35':     { revenus: '4 000 €/mois',  patrimoine: '90 000 €',  tmi: '30%' },
  'fiscalite-sophie-46':{ revenus: '7 500 €/mois',  patrimoine: '1 100 000 €', tmi: '41%' },
  'succession-jean-67': { revenus: '3 500 €/mois',  patrimoine: '1 050 000 €', tmi: '11%' },
}

const FILTERS = ['Tous', 'Retraite', 'Bilan', 'Fiscalité', 'Succession'] as const
type Filter = typeof FILTERS[number]

const OBJECTIVE_TO_RECOMMENDED: Record<string, string> = {
  retraite:   'retraite-couple-50',
  bilan:      'bilan-lucas-35',
  fiscalite:  'fiscalite-sophie-46',
  succession: 'succession-jean-67',
}

export default function Demo() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<Filter>('Tous')

  // Lire l'objectif depuis Bloc0 pour afficher le badge "Recommandé"
  const recommendedId: string | null = (() => {
    try {
      const raw = localStorage.getItem('patrisim_bloc0')
      if (!raw) return null
      const { objectif } = JSON.parse(raw)
      return OBJECTIVE_TO_RECOMMENDED[objectif] ?? null
    } catch { return null }
  })()

  const filteredProfiles = activeFilter === 'Tous'
    ? DEMO_PROFILES
    : DEMO_PROFILES.filter(p => p.tags.includes(activeFilter))

  const handleSelect = (profileId: string) => {
    setLoading(profileId)
    const profile = DEMO_PROFILES.find(p => p.id === profileId)
    loadDemoProfileWithCache(profileId, profile?.cachedAnalysis)
    const dest = profile?.cachedAnalysis ? '/analyse' : '/bloc1'
    setTimeout(() => navigate(dest), 1500)
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-3xl mx-auto px-8 py-16">

        <FadeIn className="mb-10">
          <button type="button" onClick={() => navigate('/')}
            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors mb-6 flex items-center gap-1.5">
            ← Retour
          </button>
          <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-2">
            Choisir un profil de démonstration
          </h1>
          <p className="text-[14px] text-gray-400 leading-relaxed">
            Sélectionnez un profil type pour explorer PatriSim avec des données pré-remplies.
            Vous pourrez modifier toutes les valeurs librement.
          </p>
        </FadeIn>

        {/* Filtres */}
        <FadeIn className="mb-6">
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  activeFilter === f
                    ? 'bg-[#185FA5] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-[#185FA5] hover:text-[#185FA5]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProfiles.map((profile, i) => (
              <motion.button
                key={profile.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                layout
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleSelect(profile.id)}
                disabled={loading !== null}
                className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left disabled:opacity-60"
              >
                {/* Badge Recommandé */}
                {recommendedId === profile.id && (
                  <span className="absolute top-4 right-4 bg-[#185FA5] text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    Recommandé
                  </span>
                )}

                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{profile.emoji}</span>
                  {loading === profile.id && (
                    <span className="flex items-center gap-1.5 text-[11px] text-[#185FA5] font-medium">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Chargement...
                    </span>
                  )}
                </div>
                <p className="text-[15px] font-semibold text-gray-900 mb-2 group-hover:text-[#185FA5] transition-colors">
                  {profile.titre}
                </p>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
                  {profile.description}
                </p>
                {PROFILE_METRICS[profile.id] && (
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                    {[
                      { label: 'Revenus nets', value: PROFILE_METRICS[profile.id].revenus },
                      { label: 'Patrimoine net', value: PROFILE_METRICS[profile.id].patrimoine },
                      { label: 'TMI', value: PROFILE_METRICS[profile.id].tmi },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <p className="text-[11px] text-gray-400 mb-0.5">{m.label}</p>
                        <p className="text-[13px] font-semibold text-gray-800">{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {profile.tags.map(tag => (
                    <span key={tag} className="text-[11px] bg-[#E6F1FB] text-[#0C447C] px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mb-4">
                  {profile.cachedAnalysis && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
                      ⚡ Analyse instantanée
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#185FA5] font-medium">
                  {profile.cachedAnalysis ? 'Voir l\'analyse complète' : 'Charger ce profil'} <ArrowRight size={13} />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <FadeIn delay={0.4}>
          <p className="text-[12px] text-gray-400 text-center mt-8">
            Les données de démonstration sont chargées localement. Aucune information n'est transmise.
          </p>
        </FadeIn>
      </div>
    </div>
  )
}
