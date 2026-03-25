import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const features = [
  { num: '01', title: 'Bilan patrimonial complet', desc: 'Immobilier, financier, passif — une vision 360° de votre patrimoine net en quelques minutes.' },
  { num: '02', title: 'Analyse IA personnalisée', desc: "Une IA analyse votre profil et génère un plan d'action sur mesure adapté à votre situation." },
  { num: '03', title: 'Simulation retraite', desc: 'Projetez votre capital et vos revenus à la retraite selon 3 scénarios comparatifs.' },
  { num: '04', title: 'Optimisation fiscale', desc: 'PEA, AV, PER — identifiez vos leviers fiscaux et calculez vos économies potentielles.' },
  { num: '05', title: 'Succession simulée', desc: "Estimez les droits de succession et optimisez la transmission de votre patrimoine." },
  { num: '06', title: 'Profil investisseur', desc: 'Questionnaire complet pour définir votre profil de risque et vos convictions patrimoniales.' },
]

const stats = [
  { value: '7', label: 'blocs de collecte' },
  { value: '6', label: "modules d'analyse" },
  { value: '30+', label: 'simulateurs intégrés' },
  { value: '100%', label: 'confidentiel' },
]

const steps = [
  'Profil civil et familial',
  'Actif patrimonial',
  'Passif et dettes',
  'Flux et fiscalité',
  'Projets et retraite',
  'Profil investisseur',
  'Succession et transmission',
]

export default function Landing() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white overflow-x-hidden">

      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-[#0A0F1E]/80 backdrop-blur-md border-b border-white/5">
        <div className="text-[16px] font-semibold tracking-tight">
          Patri<span className="text-[#4A9EE8]">Sim</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[12px] text-gray-500 hidden md:block">
            Projet étudiant · Armand Billard · Master Gestion de Patrimoine
          </span>
          <button
            onClick={() => navigate('/bloc1')}
            className="text-[13px] font-medium bg-[#185FA5] hover:bg-[#1a6bbf] text-white px-4 py-2 rounded-lg transition-colors"
          >
            Demarrer
          </button>
        </div>
      </nav>

      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-8 pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-[#185FA5]/20" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(24,95,165,0.15) 0%, transparent 70%)' }}
          />
        </div>

        <div
          className="relative z-10 transition-all duration-1000"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4A9EE8] animate-pulse" />
            <span className="text-[12px] text-gray-400">
              Projet étudiant · Simulation patrimoniale complète
            </span>
          </div>

          <h1 className="text-[56px] font-bold tracking-tight leading-tight mb-6 max-w-3xl">
            Votre patrimoine,
            <br />
            <span className="text-[#4A9EE8]">analysé intelligemment</span>
          </h1>

          <p className="text-[18px] text-gray-400 leading-relaxed max-w-xl mb-10">
            PatriSim est un outil de simulation patrimoniale complet, de l'inventaire de vos actifs à l'analyse personnalisée par intelligence artificielle. Conçu par Armand Billard, étudiant passionné de finance et d'investissement, dans le cadre d'un projet personnel autour de la gestion de patrimoine.
            
            
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/bloc1')}
              className="text-[15px] font-semibold bg-[#185FA5] hover:bg-[#1a6bbf] text-white px-8 py-3.5 rounded-xl transition-all active:scale-95"
            >
              Commencer mon bilan
            </button>
            <button
              onClick={() => document.getElementById('fonctionnalités')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[15px] text-gray-400 hover:text-white px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              En savoir plus
            </button>
          </div>
        </div>
      </section>

      <section className="py-16 px-8 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-[40px] font-bold text-[#4A9EE8] leading-none mb-2">{s.value}</div>
              <div className="text-[13px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="fonctionnalités" className="py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#4A9EE8] mb-4">
              Fonctionnalités
            </div>
            <h2 className="text-[36px] font-bold tracking-tight">
              Un outil complet, de bout en bout
            </h2>
            <p className="text-[16px] text-gray-400 mt-3 max-w-lg mx-auto">
              PatriSim couvre l'integralité du parcours patrimonial.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map(f => (
              <div
                key={f.num}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#185FA5]/30 transition-all"
              >
                <div className="text-[11px] font-mono text-[#4A9EE8] mb-3 opacity-60">{f.num}</div>
                <h3 className="text-[15px] font-semibold mb-2">{f.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-8 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#4A9EE8] mb-4">
              Parcours
            </div>
            <h2 className="text-[36px] font-bold tracking-tight">
              7 étapes, un bilan complet
            </h2>
          </div>
          <div className="relative max-w-lg mx-auto">
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-white/10" />
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-6 mb-6 relative">
                <div className="w-9 h-9 rounded-full bg-[#0A0F1E] border border-[#185FA5]/40 flex items-center justify-center flex-shrink-0 z-10">
                  <span className="text-[12px] font-semibold text-[#4A9EE8]">{i + 1}</span>
                </div>
                <div className="text-[15px] text-gray-300 font-medium">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#4A9EE8] mb-4">
            À propos
          </div>
          <div className="w-16 h-16 rounded-full bg-[#185FA5]/20 border border-[#185FA5]/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-[20px] font-bold text-[#4A9EE8]">AB</span>
          </div>
          <h2 className="text-[28px] font-bold mb-3">Armand Billard</h2>
          <p className="text-[14px] text-gray-400 leading-relaxed mb-6">
            Étudiant en Master Gestion de Patrimoine. Passionné de finance et d'investissement.
            Investisseur actif (PEA, CTO, obligations, cryptos). Alternant en promotion immobilière.
            PatriSim est un projet personnel conçu pour demontrer la maitrise des outils
            patrimoniaux et des technologies modernes.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-[12px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-400">Master GDP 2025</span>
            <span className="text-[12px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-400">TOEIC 800/990</span>
            <span className="text-[12px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-400">Investisseur actif</span>
            <span className="text-[12px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-400">Promotion immobilière</span>
          </div>
        </div>
      </section>

      <section className="py-32 px-8 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(24,95,165,0.12) 0%, transparent 60%)' }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-[40px] font-bold tracking-tight mb-4">
            Prêt à analyser votre patrimoine ?
          </h2>
          <p className="text-[16px] text-gray-400 mb-10">
            Gratuit, confidentiel, et complet en moins de 15 minutes.
          </p>
          <button
            onClick={() => navigate('/bloc1')}
            className="text-[16px] font-semibold bg-[#185FA5] hover:bg-[#1a6bbf] text-white px-10 py-4 rounded-xl transition-all active:scale-95"
          >
            Commencer gratuitement
          </button>
        </div>
      </section>

      <footer className="py-8 px-8 border-t border-white/5 flex items-center justify-between flex-wrap gap-4">
        <div className="text-[13px] font-medium">
          Patri<span className="text-[#4A9EE8]">Sim</span>
        </div>
        <div className="text-[12px] text-gray-600">
          Developpé par Armand Billard · 2025 · Projet académique Master Gestion de Patrimoine
        </div>
      </footer>

    </div>
  )
}