import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Brain, BarChart2, Lock, Star, ChevronRight, TrendingUp, Home, PiggyBank, Users, Target, Zap, FileText, Info } from 'lucide-react'

const PARCOURS = [
  {
    icon: <TrendingUp size={20} />,
    title: 'Préparer ma retraite',
    desc: 'Estimez votre pension, calculez le capital nécessaire, identifiez les déficits à combler.',
    duree: '5–12 min',
    tag: 'Planification',
    tagColor: 'bg-[#E6F1FB] text-[#0C447C]',
    dispo: true,
  },
  {
    icon: <FileText size={20} />,
    title: 'Bilan patrimonial complet',
    desc: 'Vue d\'ensemble de votre situation : actifs, dettes, revenus, fiscalité, objectifs.',
    duree: '15–40 min',
    tag: 'Bilan global',
    tagColor: 'bg-gray-700 text-gray-200',
    dispo: true,
  },
  {
    icon: <PiggyBank size={20} />,
    title: 'Optimiser ma fiscalité',
    desc: 'Identifiez vos leviers fiscaux : PER, déficit foncier, flat tax, enveloppes adaptées.',
    duree: '4–10 min',
    tag: 'Fiscal',
    tagColor: 'bg-amber-900/30 text-amber-300',
    dispo: true,
  },
  {
    icon: <Users size={20} />,
    title: 'Préparer ma succession',
    desc: 'Analysez les droits à payer, identifiez les optimisations possibles pour transmettre.',
    duree: '5–12 min',
    tag: 'Transmission',
    tagColor: 'bg-purple-900/30 text-purple-300',
    dispo: true,
  },
  {
    icon: <Target size={20} />,
    title: 'Structurer mes investissements',
    desc: 'Définissez votre profil investisseur, vérifiez la cohérence de vos placements.',
    duree: '5–10 min',
    tag: 'Investissement',
    tagColor: 'bg-[#0F6E56]/20 text-[#4ade80]',
    dispo: false,
    raisonBlocage: 'Analyse de portefeuille avancée — bientôt disponible',
  },
  {
    icon: <Home size={20} />,
    title: 'Analyser mon patrimoine immobilier',
    desc: 'Valorisation, rendements locatifs, financement, régimes fiscaux adaptés.',
    duree: '4–10 min',
    tag: 'Immobilier',
    tagColor: 'bg-orange-900/30 text-orange-300',
    dispo: false,
    raisonBlocage: 'Simulateur immobilier avancé — bientôt disponible',
  },
  {
    icon: <Shield size={20} />,
    title: 'Protéger ma famille',
    desc: 'Évaluez les risques, vérifiez vos couvertures, anticipez les aléas de la vie.',
    duree: '4–8 min',
    tag: 'Protection',
    tagColor: 'bg-red-900/30 text-red-300',
    dispo: false,
    raisonBlocage: 'Analyse de prévoyance — bientôt disponible',
  },
  {
    icon: <Zap size={20} />,
    title: 'Atteindre un objectif précis',
    desc: 'Achat immobilier, financement études, capital cible : simulez votre trajectoire.',
    duree: '5–10 min',
    tag: 'Objectif',
    tagColor: 'bg-indigo-900/30 text-indigo-300',
    dispo: false,
    raisonBlocage: 'Simulateur d\'objectifs — bientôt disponible',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0A0F1E]/80 backdrop-blur-md border-b border-white/5">
        <span className="text-[20px] font-bold">Patri<span className="text-[#185FA5]">Sim</span></span>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-gray-400 border border-gray-700 px-3 py-1 rounded-full">
            Projet étudiant · Master Gestion de Patrimoine
          </span>
          <button type="button" onClick={() => navigate('/start')}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] transition-colors">
            Démarrer →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] text-[#185FA5] border border-[#185FA5]/30 bg-[#185FA5]/10 px-4 py-1.5 rounded-full mb-8">
          <Star size={11} />
          Simulation patrimoniale intelligente · Propulsé par IA
        </div>
        <h1 className="text-[52px] font-bold leading-tight tracking-tight mb-6">
          Votre patrimoine,<br />
          <span className="text-[#185FA5]">analysé intelligemment</span>
        </h1>
        <p className="text-[17px] text-gray-400 max-w-xl mx-auto leading-relaxed mb-6">
          PatriSim guide les particuliers et CGP à travers une analyse patrimoniale personnalisée — retraite, fiscalité, succession — en quelques minutes.
        </p>

        {/* Bannière version 1 */}
        <div className="max-w-2xl mx-auto mb-10 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 flex items-start gap-3 text-left">
          <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-semibold text-amber-300">PatriSim v1 — Version simplifiée</p>
            <p className="text-[11px] text-amber-400 mt-0.5">
              Cette version propose 4 parcours disponibles sur 8. Les analyses sont des estimations pédagogiques basées sur vos données, et ne constituent pas un conseil en investissement au sens MiFID II. Une analyse complète nécessite l'accompagnement d'un CGP agréé.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button type="button" onClick={() => navigate('/start')}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#185FA5] hover:bg-[#0C447C] text-[15px] font-bold transition-all shadow-[0_8px_30px_rgba(24,95,165,0.4)] hover:-translate-y-0.5">
            Commencer mon analyse gratuite <ArrowRight size={18} />
          </button>
          <button type="button" onClick={() => navigate('/demo')}
            className="text-[13px] text-gray-400 hover:text-white transition-colors underline underline-offset-4">
            Voir une démonstration avec un profil type →
          </button>
          <p className="text-[12px] text-gray-500">Aucun compte requis · 100% confidentiel · Résultats en 30 secondes</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-4 gap-6 text-center">
          {[
            { n: '4', l: 'parcours disponibles' },
            { n: '7', l: 'blocs d\'analyse' },
            { n: 'IA', l: 'analyse personnalisée' },
            { n: '100%', l: 'confidentiel' },
          ].map(({ n, l }) => (
            <div key={l}>
              <p className="text-[32px] font-bold text-[#185FA5]">{n}</p>
              <p className="text-[12px] text-gray-400 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Parcours */}
      <section className="py-20 px-8 max-w-5xl mx-auto">
        <h2 className="text-[28px] font-bold text-center mb-3">Choisissez votre parcours</h2>
        <p className="text-[14px] text-gray-400 text-center mb-10">4 parcours disponibles · 4 en cours de développement</p>
        <div className="grid grid-cols-2 gap-4">
          {PARCOURS.map((p, i) => (
            <div key={i} className={`relative rounded-2xl border p-5 transition-all ${p.dispo ? 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-[#185FA5]/30 cursor-pointer' : 'bg-white/2 border-white/5 opacity-60'}`}
              onClick={() => p.dispo && navigate('/start')}>
              {!p.dispo && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                  <Lock size={10} className="text-gray-400" />
                  <span className="text-[9px] text-gray-400">Bientôt</span>
                </div>
              )}
              {p.dispo && (
                <div className="absolute top-4 right-4">
                  <ChevronRight size={16} className="text-[#185FA5]" />
                </div>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${p.dispo ? 'bg-[#185FA5]/20 text-[#185FA5]' : 'bg-white/5 text-gray-500'}`}>
                {p.icon}
              </div>
              <p className="text-[14px] font-semibold mb-1 pr-6">{p.title}</p>
              <p className="text-[12px] text-gray-400 leading-relaxed mb-3">{p.desc}</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.tagColor}`}>{p.tag}</span>
                <span className="text-[10px] text-gray-500">{p.duree}</span>
                {!p.dispo && p.raisonBlocage && (
                  <span className="text-[10px] text-gray-500 italic ml-auto">{p.raisonBlocage}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="py-16 px-8 max-w-4xl mx-auto border-t border-white/5">
        <h2 className="text-[24px] font-bold text-center mb-10">Comment ça marche</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <Brain size={20} />, title: 'Analyse IA personnalisée', desc: 'L\'IA analyse votre profil et génère un bilan patrimonial sur-mesure avec recommandations concrètes.' },
            { icon: <BarChart2 size={20} />, title: 'Parcours adaptatif', desc: 'Répondez uniquement aux questions pertinentes selon vos objectifs. Aucune question inutile.' },
            { icon: <Shield size={20} />, title: 'Données sécurisées', desc: 'Vos données restent sur votre appareil. Aucun stockage serveur, aucun compte requis.' },
          ].map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="w-9 h-9 rounded-xl bg-[#185FA5]/20 text-[#185FA5] flex items-center justify-center mb-4">{f.icon}</div>
              <p className="text-[14px] font-semibold mb-2">{f.title}</p>
              <p className="text-[12px] text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* À propos */}
      <section className="py-16 px-8 max-w-2xl mx-auto text-center border-t border-white/5">
        <h2 className="text-[22px] font-bold mb-4">À propos</h2>
        <p className="text-[14px] text-gray-400 leading-relaxed mb-6">
          PatriSim est un projet étudiant développé dans le cadre d'un Master Gestion de Patrimoine par{' '}
          <strong className="text-white">Armand Billard</strong>. Outil pédagogique destiné aux patrimoines inférieurs à{' '}
          <strong className="text-white">500 000 €</strong>. Ne constitue pas un conseil en investissement.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-[12px] text-amber-300 leading-relaxed">
          PatriSim v1 est une version simplifiée. Certaines fonctionnalités avancées (analyse de portefeuille, simulation immobilière, prévoyance) seront disponibles dans les prochaines versions.
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-8 text-center border-t border-white/5">
        <h2 className="text-[28px] font-bold mb-4">Prêt à analyser votre patrimoine ?</h2>
        <p className="text-[14px] text-gray-400 mb-8">Gratuit · Sans inscription · Résultats en moins de 2 minutes</p>
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={() => navigate('/start')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#185FA5] hover:bg-[#0C447C] text-[15px] font-bold transition-all shadow-[0_8px_30px_rgba(24,95,165,0.4)]">
            Commencer gratuitement <ArrowRight size={18} />
          </button>
          <button type="button" onClick={() => navigate('/demo')}
            className="text-[13px] text-gray-400 hover:text-white transition-colors underline underline-offset-4">
            Voir une démonstration →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-8 text-center">
        <p className="text-[11px] text-gray-600">
          PatriSim v1 · Projet étudiant Master Gestion de Patrimoine · Armand Billard · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}