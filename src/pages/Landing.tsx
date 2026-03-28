// src/pages/Landing.tsx — VERSION MISE À JOUR
// Seul changement vs l'original : le bouton CTA pointe vers /start au lieu de /bloc1

import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Brain, BarChart2, Lock, Star, ChevronRight } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0A0F1E]/80 backdrop-blur-md border-b border-white/5">
        <span className="text-[20px] font-bold">
          Patri<span className="text-[#185FA5]">Sim</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-gray-400 border border-gray-700 px-3 py-1 rounded-full">
            Projet étudiant · Master Gestion de Patrimoine
          </span>
          <button
            type="button"
            onClick={() => navigate('/start')}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors"
          >
            Démarrer →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] text-[#185FA5] border border-[#185FA5]/30 bg-[#185FA5]/10 px-4 py-1.5 rounded-full mb-8">
          <Star size={11} />
          Simulation patrimoniale intelligente · Propulsé par IA
        </div>

        <h1 className="text-[52px] font-bold leading-tight tracking-tight mb-6">
          Votre patrimoine,<br />
          <span className="text-[#185FA5]">analysé intelligemment</span>
        </h1>

        <p className="text-[17px] text-gray-400 max-w-xl mx-auto leading-relaxed mb-10">
          PatriSim guide les particuliers et CGP à travers une analyse patrimoniale complète — retraite, fiscalité, succession, investissements — en quelques minutes.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/start')}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#185FA5] hover:bg-[#0C447C] text-[15px] font-bold transition-all shadow-[0_8px_30px_rgba(24,95,165,0.4)] hover:shadow-[0_8px_40px_rgba(24,95,165,0.6)] hover:-translate-y-0.5"
          >
            Commencer mon analyse gratuite
            <ArrowRight size={18} />
          </button>
          <p className="text-[12px] text-gray-500">
            Aucun compte requis · 100% confidentiel · Résultats en 30 secondes
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-4 gap-6 text-center">
          {[
            { n: '7', l: 'blocs d\'analyse' },
            { n: '6', l: 'modules dashboard' },
            { n: '30+', l: 'simulateurs' },
            { n: '100%', l: 'confidentiel' },
          ].map(({ n, l }) => (
            <div key={l}>
              <p className="text-[32px] font-bold text-[#185FA5]">{n}</p>
              <p className="text-[12px] text-gray-400 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="py-20 px-8 max-w-4xl mx-auto">
        <h2 className="text-[28px] font-bold text-center mb-12">
          Tout ce dont vous avez besoin
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <Brain size={20} />, title: 'Analyse IA personnalisée', desc: 'Claude analyse l\'ensemble de votre profil et génère un bilan patrimonial sur-mesure.' },
            { icon: <BarChart2 size={20} />, title: 'Dashboard interactif', desc: '6 modules : bilan, retraite, portefeuille, fiscalité, succession, objectifs.' },
            { icon: <Shield size={20} />, title: 'Conforme MiFID II', desc: 'Questionnaire de profil investisseur conforme à la réglementation européenne.' },
            { icon: <Lock size={20} />, title: 'Données sécurisées', desc: 'Vos informations restent sur votre appareil. Aucun stockage serveur sans votre accord.' },
            { icon: <ChevronRight size={20} />, title: 'Parcours adaptatif', desc: 'Répondez uniquement aux questions pertinentes selon vos objectifs.' },
            { icon: <Star size={20} />, title: 'Recommandations concrètes', desc: 'Plan d\'action priorisé avec impact estimé pour chaque recommandation.' },
          ].map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#185FA5]/20 text-[#185FA5] flex items-center justify-center mb-4">{f.icon}</div>
              <p className="text-[14px] font-semibold mb-2">{f.title}</p>
              <p className="text-[12px] text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Parcours */}
      <section className="py-16 px-8 bg-white/3 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[24px] font-bold text-center mb-10">Votre parcours en 7 étapes</h2>
          <div className="grid grid-cols-7 gap-2">
            {[
              { n: 1, l: 'Profil civil' },
              { n: 2, l: 'Actif patrimonial' },
              { n: 3, l: 'Passif & dettes' },
              { n: 4, l: 'Flux & fiscalité' },
              { n: 5, l: 'Projets & retraite' },
              { n: 6, l: 'Profil investisseur' },
              { n: 7, l: 'Succession' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-9 h-9 rounded-full bg-[#185FA5]/20 text-[#185FA5] font-bold text-[14px] flex items-center justify-center mx-auto mb-2">{s.n}</div>
                <p className="text-[10px] text-gray-400 leading-tight">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* À propos */}
      <section className="py-16 px-8 max-w-2xl mx-auto text-center">
        <h2 className="text-[22px] font-bold mb-4">À propos</h2>
        <p className="text-[14px] text-gray-400 leading-relaxed mb-6">
          PatriSim est un projet étudiant développé dans le cadre d'un Master Gestion de Patrimoine par <strong className="text-white">Armand Billard</strong>. Il est destiné aux patrimoines inférieurs à <strong className="text-white">500 000 €</strong> et constitue un outil d'aide à la réflexion, pas un conseil en investissement.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-[12px] text-amber-300 leading-relaxed">
          PatriSim ne remplace pas l'accompagnement d'un conseiller en gestion de patrimoine agréé (CGP). Consultez un professionnel pour toute décision financière importante.
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-8 text-center">
        <h2 className="text-[28px] font-bold mb-4">Prêt à analyser votre patrimoine ?</h2>
        <p className="text-[14px] text-gray-400 mb-8">Gratuit · Sans inscription · Résultats en moins de 2 minutes</p>
        <button
          type="button"
          onClick={() => navigate('/start')}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#185FA5] hover:bg-[#0C447C] text-[15px] font-bold transition-all shadow-[0_8px_30px_rgba(24,95,165,0.4)]"
        >
          Commencer gratuitement <ArrowRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-8 text-center">
        <p className="text-[11px] text-gray-600">
          PatriSim · Projet étudiant Master Gestion de Patrimoine · Armand Billard · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}