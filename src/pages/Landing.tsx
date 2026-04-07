import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Brain, BarChart2, Lock, Star, Mail, GraduationCap } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import FadeIn from '../components/FadeIn'

const heroVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const heroItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const PARCOURS = [
  { emoji: '📈', titre: 'Préparer ma retraite', desc: 'Pension estimée, capital nécessaire, actions concrètes pour combler les déficits.', duree: '5 à 12 min', dispo: true },
  { emoji: '📋', titre: 'Bilan patrimonial complet', desc: 'Vue complète de votre situation : actifs, dettes, revenus, impôts, objectifs.', duree: '15 à 40 min', dispo: true },
  { emoji: '💶', titre: 'Optimiser mes impôts', desc: 'Identifiez vos leviers fiscaux : plan retraite, déficit foncier, enveloppes adaptées.', duree: '4 à 10 min', dispo: true },
  { emoji: '👨‍👩‍👧', titre: 'Préparer ma succession', desc: 'Analysez les droits à payer et les options pour transmettre dans de meilleures conditions.', duree: '5 à 12 min', dispo: true },
  { emoji: '📊', titre: 'Structurer mes investissements', desc: 'Évaluez la cohérence de vos placements avec votre situation et vos objectifs.', duree: '5 à 10 min', dispo: false },
  { emoji: '🏠', titre: 'Analyser mon patrimoine immobilier', desc: 'Valorisation, rendements locatifs, régimes fiscaux adaptés à votre situation.', duree: '4 à 10 min', dispo: false },
  { emoji: '🛡️', titre: 'Protéger ma famille', desc: 'Évaluez vos couvertures et anticipez les aléas de la vie.', duree: '4 à 8 min', dispo: false },
  { emoji: '🎯', titre: 'Atteindre un objectif précis', desc: 'Achat immobilier, financement des études, capital cible : simulez votre trajectoire.', duree: '5 à 10 min', dispo: false },
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
            Démarrer
          </button>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        variants={heroVariants}
        initial="hidden"
        animate="show"
        className="pt-32 pb-16 px-8 text-center max-w-4xl mx-auto"
      >
        <motion.div variants={heroItem} className="inline-flex items-center gap-2 text-[11px] text-[#185FA5] border border-[#185FA5]/30 bg-[#185FA5]/10 px-4 py-1.5 rounded-full mb-8">
          <Star size={11} />
          Simulation patrimoniale intelligente · Propulsé par IA
        </motion.div>

        <motion.h1 variants={heroItem} className="text-[52px] font-bold leading-tight tracking-tight mb-6">
          Votre patrimoine,<br />
          <span className="text-[#185FA5]">analysé intelligemment</span>
        </motion.h1>

        <motion.p variants={heroItem} className="text-[17px] text-gray-400 max-w-xl mx-auto leading-relaxed mb-10">
          PatriSim vous guide à travers une analyse patrimoniale complète : retraite, impôts, succession, investissements. En quelques minutes.
        </motion.p>

        <motion.div variants={heroItem} className="flex flex-col items-center gap-4">
          <motion.button
            type="button" onClick={() => navigate('/start')}
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#185FA5] hover:bg-[#0C447C] text-[15px] font-bold transition-colors shadow-[0_8px_30px_rgba(24,95,165,0.4)]">
            Commencer mon analyse <ArrowRight size={18} />
          </motion.button>
          <button type="button" onClick={() => navigate('/demo')}
            className="text-[13px] text-gray-400 hover:text-white transition-colors underline underline-offset-4">
            Voir une démonstration avec un profil type
          </button>
          <p className="text-[12px] text-gray-500">Sans inscription · 100% confidentiel · Résultats en moins de 2 minutes</p>
        </motion.div>
      </motion.section>

      {/* Bloc Armand — mis en avant, après le hero */}
      <FadeIn delay={0.1}>
      <section className="px-8 pb-12 max-w-4xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#185FA5]/20 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={24} className="text-[#185FA5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[16px] font-bold text-white">Armand Billard</p>
                  <span className="text-[10px] bg-[#185FA5]/20 text-[#185FA5] px-2 py-0.5 rounded-full font-semibold">Créateur</span>
                </div>
                <p className="text-[13px] text-gray-400">Futur professionnel en gestion de patrimoine</p>
                <p className="text-[12px] text-gray-500 mt-1 max-w-lg">
                  PatriSim est un outil pédagogique pour mieux comprendre sa situation patrimoniale.
                  Les analyses ne remplacent pas l'accompagnement d'un conseiller en gestion de patrimoine.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <a href="mailto:a.billard.cgp@gmail.com"
                className="flex items-center gap-2 bg-[#185FA5] text-white px-5 py-3 rounded-xl text-[13px] font-semibold hover:bg-[#0C447C] transition-all whitespace-nowrap">
                <Mail size={15} />
                Me contacter
              </a>
              <span className="text-sm text-gray-400 select-text">a.billard.cgp@gmail.com</span>
            </div>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* Stats */}
      <section className="py-10 border-y border-white/5">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto px-8 grid grid-cols-4 gap-6 text-center"
        >
          {[
            { n: '4', l: 'parcours disponibles' },
            { n: '7', l: 'blocs d\'analyse' },
            { n: '30+', l: 'simulateurs' },
            { n: '100%', l: 'confidentiel' },
          ].map(({ n, l }) => (
            <motion.div key={l} variants={staggerItem}>
              <p className="text-[32px] font-bold text-[#185FA5]">{n}</p>
              <p className="text-[12px] text-gray-400 mt-1">{l}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 8 parcours */}
      <section className="py-20 px-8 max-w-4xl mx-auto">
        <FadeIn>
          <h2 className="text-[28px] font-bold text-center mb-3">8 parcours patrimoniaux</h2>
          <p className="text-[14px] text-gray-400 text-center mb-10">4 disponibles maintenant · 4 prochainement</p>
        </FadeIn>
        <div className="grid grid-cols-2 gap-4">
          {PARCOURS.map((p, i) => (
            <motion.div key={i}
              whileHover={p.dispo ? { y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' } : {}}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl p-5 border transition-colors ${
                p.dispo
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/2 border-white/5 opacity-50'
              }`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{p.emoji}</span>
                {!p.dispo && (
                  <div className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1">
                    <Lock size={10} className="text-gray-500" />
                    <span className="text-[10px] text-gray-500">Prochainement</span>
                  </div>
                )}
                {p.dispo && (
                  <span className="text-[10px] bg-[#185FA5]/20 text-[#185FA5] px-2 py-1 rounded-full font-semibold">Disponible</span>
                )}
              </div>
              <p className={`text-[14px] font-semibold mb-1 ${p.dispo ? 'text-white' : 'text-gray-500'}`}>{p.titre}</p>
              <p className={`text-[12px] leading-relaxed mb-3 ${p.dispo ? 'text-gray-400' : 'text-gray-600'}`}>{p.desc}</p>
              <span className="text-[11px] text-gray-500">⏱ {p.duree}</span>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button type="button" onClick={() => navigate('/start')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#185FA5] hover:bg-[#0C447C] text-[14px] font-semibold transition-all">
            Commencer avec les parcours disponibles <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="py-16 px-8 max-w-4xl mx-auto">
        <FadeIn>
          <h2 className="text-[28px] font-bold text-center mb-12">Tout ce dont vous avez besoin</h2>
        </FadeIn>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { icon: <Brain size={20} />, title: 'Analyse IA personnalisée', desc: 'L\'IA analyse votre profil et génère un bilan patrimonial sur-mesure en langage simple.' },
            { icon: <BarChart2 size={20} />, title: 'Dashboard interactif', desc: '6 modules : bilan, retraite, portefeuille, impôts, succession, objectifs.' },
            { icon: <Shield size={20} />, title: 'Profil investisseur', desc: 'Questionnaire de profil investisseur conforme à la réglementation européenne.' },
            { icon: <Lock size={20} />, title: 'Données sécurisées', desc: 'Vos informations restent sur votre appareil. Aucun stockage serveur.' },
            { icon: <ArrowRight size={20} />, title: 'Parcours adaptatif', desc: 'Répondez uniquement aux questions pertinentes selon vos objectifs.' },
            { icon: <Star size={20} />, title: 'Recommandations concrètes', desc: 'Plan d\'action priorisé avec impact estimé pour chaque recommandation.' },
          ].map(f => (
            <motion.div key={f.title}
              variants={staggerItem}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="w-9 h-9 rounded-xl bg-[#185FA5]/20 text-[#185FA5] flex items-center justify-center mb-4">{f.icon}</div>
              <p className="text-[14px] font-semibold mb-2">{f.title}</p>
              <p className="text-[12px] text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-8 text-center">
        <h2 className="text-[28px] font-bold mb-4">Prêt à analyser votre patrimoine ?</h2>
        <p className="text-[14px] text-gray-400 mb-8">Gratuit · Sans inscription · Résultats en moins de 2 minutes</p>
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={() => navigate('/start')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#185FA5] hover:bg-[#0C447C] text-[15px] font-bold transition-all shadow-[0_8px_30px_rgba(24,95,165,0.4)]">
            Commencer gratuitement <ArrowRight size={18} />
          </button>
          <button type="button" onClick={() => navigate('/demo')}
            className="text-[13px] text-gray-400 hover:text-white transition-colors underline underline-offset-4">
            Voir une démonstration
          </button>
        </div>
      </section>

      {import.meta.env.DEV && (
        <div style={{margin: '40px auto', maxWidth: 800, padding: '20px', border: '2px dashed #444', borderRadius: 16, background: '#0d1117'}}>
          <span style={{background: 'red', color: 'white', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 'bold'}}>DEV ONLY</span>
          <p style={{color: '#aaa', marginTop: 8, fontSize: 13}}>Espace développeur</p>
          <button onClick={() => {
            const fakeResult = JSON.stringify({
              score_global: 72,
              patrimoine_net: 250000,
              capacite_epargne: 800,
              points_forts: ["Bonne capacité d'épargne", "Patrimoine immobilier solide"],
              points_attention: ["Taux d'endettement à surveiller"],
              recommandations: [
                {titre: "Optimiser votre PER", description: "Versement annuel recommandé : 3 000 €", urgence: "haute", gain_estime: 900},
                {titre: "Diversifier l'épargne", description: "Ouvrir un PEA pour les UC", urgence: "moyenne", gain_estime: 0}
              ]
            });
            localStorage.setItem('patrisim_analyse', fakeResult);
            window.location.href = '/analyse';
          }} style={{marginTop: 12, padding: '10px 20px', background: '#185FA5', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13}}>
            Accéder à l'analyse (sans IA)
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-[11px] text-gray-600">
            PatriSim · Projet étudiant Master Gestion de Patrimoine · {new Date().getFullYear()}
          </p>
          <a href="mailto:a.billard.cgp@gmail.com"
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-white transition-colors">
            <Mail size={12} />
            a.billard.cgp@gmail.com
          </a>
        </div>
        <p className="text-[10px] text-gray-700 text-center mt-4 max-w-2xl mx-auto leading-relaxed">
          PatriSim est un outil de simulation pédagogique. Les résultats sont des estimations et ne constituent pas un conseil en investissement.
          Consultez un conseiller en gestion de patrimoine pour toute décision financière importante.
        </p>
      </footer>
    </div>
  )
}