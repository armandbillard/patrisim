import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, TrendingUp, PieChart, DollarSign, Users, Target,
  ArrowLeft, ChevronRight, Lock, TrendingDown,
} from 'lucide-react'
import { motion, type Variants, type Transition } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback as object, ...JSON.parse(raw) } as T
  } catch { return fallback }
}

const parseNum = (s: unknown) => {
  const n = parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M€'
    : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'

const fmtK = (n: number) =>
  n >= 1_000
    ? (n / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k€'
    : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'

const OBJECTIF_LABELS: Record<string, string> = {
  retraite: 'Retraite',
  bilan: 'Bilan patrimonial',
  fiscalite: 'Optimisation fiscale',
  succession: 'Succession',
  investissement: 'Investissement',
  immobilier: 'Immobilier',
  protection: 'Protection',
  objectif: 'Objectif personnalisé',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  patrimoineNet: number
  capaciteEpargne: number
  tmi: number
  scoreIA: number | null
  hasAnalyse: boolean
}

interface ModuleDef {
  id: string
  icon: React.ReactNode
  title: string
  desc: string
  anchor: string
  requiredBloc: string | null
  requiredBlocLabel: string | null
  available: boolean
}

// ─── Animations ───────────────────────────────────────────────────────────────

const cardTransition: Transition = { duration: 0.35, ease: 'easeOut' }

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: cardTransition },
}

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [prenom, setPrenom] = useState('')
  const [objectif, setObjectif] = useState('')

  const computeMetrics = useCallback((): Metrics => {
    const bloc2 = loadLS<Record<string, unknown>>('patrisim_bloc2', {})
    const bloc3 = loadLS<Record<string, unknown>>('patrisim_bloc3', {})
    const bloc4 = loadLS<Record<string, unknown>>('patrisim_bloc4', {})
    const bloc5 = loadLS<Record<string, unknown>>('patrisim_bloc5', {})

    const totalImmo = parseNum((bloc2 as Record<string, number>).totalImmo)
    const totalFin = parseNum((bloc2 as Record<string, number>).totalFinancier)
    const totalAutres = parseNum((bloc2 as Record<string, number>).totalAutres)
    const patrimoineBrut = totalImmo + totalFin + totalAutres

    const b3 = bloc3 as { creditsImmo?: { crd?: string }[]; creditsConso?: { crd?: string }[] }
    const totalDettes =
      (b3.creditsImmo || []).reduce((a, c) => a + parseNum(c.crd), 0) +
      (b3.creditsConso || []).reduce((a, c) => a + parseNum(c.crd), 0)
    const patrimoineNet = patrimoineBrut - totalDettes

    // Capacité d'épargne : préférer bloc5.capaciteEpargne, sinon calculer depuis bloc4
    const b5cap = parseNum((bloc5 as Record<string, unknown>).capaciteEpargne)
    let capaciteEpargne = b5cap
    if (!b5cap) {
      const b4 = bloc4 as {
        p1Pro?: { salaire?: string; remunNette?: string }
        p2Pro?: { salaire?: string }
        mensualitesCredits?: string
        assurances?: string
        abonnements?: string
        loyerMensuel?: string
      }
      const revP1 = parseNum(b4.p1Pro?.salaire || b4.p1Pro?.remunNette)
      const revP2 = parseNum(b4.p2Pro?.salaire)
      const totalRev = revP1 + revP2
      const totalCharges =
        parseNum(b4.mensualitesCredits) +
        parseNum(b4.assurances) +
        parseNum(b4.abonnements) +
        parseNum(b4.loyerMensuel)
      capaciteEpargne = Math.max(0, totalRev - totalCharges)
    }

    const b4fiscal = (bloc4 as { fiscal?: Record<string, unknown> }).fiscal || {}
    const tmi = parseNum(b4fiscal.tmi)

    const analyseRaw = localStorage.getItem('patrisim_analyse')
    let scoreIA: number | null = null
    let hasAnalyse = false
    if (analyseRaw) {
      try {
        const parsed = JSON.parse(analyseRaw)
        scoreIA = parsed?.data?.score_global ?? null
        hasAnalyse = true
      } catch { /* ignore */ }
    }

    return { patrimoineNet, capaciteEpargne, tmi, scoreIA, hasAnalyse }
  }, [])

  useEffect(() => {
    const m = computeMetrics()
    setMetrics(m)

    const p1 = loadLS<{ prenom?: string }>('patrisim_bloc1_p1', {})
    setPrenom(p1.prenom || '')

    const b0 = loadLS<{ objectif?: string }>('patrisim_bloc0', {})
    setObjectif(b0.objectif || '')
  }, [computeMetrics])

  // Detect available blocs
  const hasBloc = (key: string) => localStorage.getItem(key) !== null

  const modules: ModuleDef[] = [
    {
      id: 'bilan',
      icon: <BarChart2 size={22} />,
      title: 'Bilan patrimonial',
      desc: 'Vue consolidée actifs / passifs, évolution nette, répartition par classe d\'actifs.',
      anchor: '#bilan',
      requiredBloc: hasBloc('patrisim_bloc2') ? null : 'bloc2',
      requiredBlocLabel: hasBloc('patrisim_bloc2') ? null : 'Bloc 2',
      available: hasBloc('patrisim_bloc2'),
    },
    {
      id: 'retraite',
      icon: <TrendingUp size={22} />,
      title: 'Simulation retraite',
      desc: 'Capital cible, trajectoire d\'épargne, projection à l\'horizon de départ souhaité.',
      anchor: '#retraite',
      requiredBloc: hasBloc('patrisim_bloc5') ? null : 'bloc5',
      requiredBlocLabel: hasBloc('patrisim_bloc5') ? null : 'Bloc 5',
      available: hasBloc('patrisim_bloc5'),
    },
    {
      id: 'fiscalite',
      icon: <DollarSign size={22} />,
      title: 'Optimisation fiscale',
      desc: 'Leviers disponibles selon votre TMI, économies PER, flat tax vs barème.',
      anchor: '#fiscalite',
      requiredBloc: hasBloc('patrisim_bloc4') ? null : 'bloc4',
      requiredBlocLabel: hasBloc('patrisim_bloc4') ? null : 'Bloc 4',
      available: hasBloc('patrisim_bloc4'),
    },
    {
      id: 'portefeuille',
      icon: <PieChart size={22} />,
      title: 'Portefeuille & placements',
      desc: 'Allocation, cohérence avec le profil de risque, pistes de rééquilibrage.',
      anchor: '#portefeuille',
      requiredBloc: hasBloc('patrisim_bloc2') ? null : 'bloc2',
      requiredBlocLabel: hasBloc('patrisim_bloc2') ? null : 'Bloc 2',
      available: hasBloc('patrisim_bloc2'),
    },
    {
      id: 'succession',
      icon: <Users size={22} />,
      title: 'Succession & transmission',
      desc: 'Estimation des droits, simulation de donations, optimisation par enveloppe.',
      anchor: '#succession',
      requiredBloc:
        hasBloc('patrisim_bloc1_p1') && hasBloc('patrisim_bloc2')
          ? null
          : 'bloc1',
      requiredBlocLabel:
        hasBloc('patrisim_bloc1_p1') && hasBloc('patrisim_bloc2')
          ? null
          : 'Bloc 1',
      available: hasBloc('patrisim_bloc1_p1') && hasBloc('patrisim_bloc2'),
    },
    {
      id: 'objectif',
      icon: <Target size={22} />,
      title: 'Objectif principal',
      desc: 'Suivi de la probabilité d\'atteinte, alertes et réajustements personnalisés par l\'IA.',
      anchor: '#objectif',
      requiredBloc: metrics?.hasAnalyse ? null : 'analyse',
      requiredBlocLabel: metrics?.hasAnalyse ? null : 'Analyse IA',
      available: metrics?.hasAnalyse ?? false,
    },
  ]

  const scrollTo = (anchor: string) => {
    const id = anchor.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const objectifLabel = OBJECTIF_LABELS[objectif] || objectif

  return (
    <div className="min-h-screen bg-[#F8F8F6]">

      {/* ── Sticky metrics bar ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-3 flex items-center gap-6 overflow-x-auto">
          <MetricPill
            label="Patrimoine net"
            value={metrics ? fmt(metrics.patrimoineNet) : '—'}
            color="blue"
          />
          <div className="w-px h-7 bg-gray-100 flex-shrink-0" />
          <MetricPill
            label="Épargne mensuelle"
            value={metrics ? fmtK(metrics.capaciteEpargne) + '/mois' : '—'}
            color="green"
          />
          <div className="w-px h-7 bg-gray-100 flex-shrink-0" />
          <MetricPill
            label="TMI"
            value={metrics && metrics.tmi > 0 ? metrics.tmi + ' %' : '—'}
            color="purple"
          />
          {metrics?.hasAnalyse && metrics.scoreIA !== null && (
            <>
              <div className="w-px h-7 bg-gray-100 flex-shrink-0" />
              <MetricPill
                label="Score IA"
                value={metrics.scoreIA + ' / 100'}
                color="amber"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-8 py-10 pb-20">

        {/* Header */}
        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="show"
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#185FA5] bg-[#E6F1FB] px-3 py-1 rounded-full">
              Tableau de bord
            </span>
            {objectifLabel && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Objectif : {objectifLabel}
              </span>
            )}
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">
            Votre tableau de bord patrimonial
          </h1>
          {prenom && (
            <p className="text-[15px] text-gray-500 mt-1.5">
              Bonjour <span className="font-semibold text-gray-700">{prenom}</span>, voici une vue d'ensemble de votre situation.
            </p>
          )}
        </motion.div>

        {/* ── Modules grid ──────────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 mb-14"
        >
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} onScroll={scrollTo} />
          ))}
        </motion.div>

        {/* ── Sections ──────────────────────────────────────────────────── */}
        <div className="space-y-10">

          {/* Bilan patrimonial — section custom avec simulateur */}
          <div id="bilan" className="scroll-mt-20">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center">
                <BarChart2 size={18} />
              </div>
              <h2 className="text-[16px] font-bold text-gray-800">Bilan patrimonial</h2>
            </div>
            {modules[0].available
              ? (
                <div className="space-y-6">
                  <PlusValueImmo />
                  <RendementLocatif />
                </div>
              )
              : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <p className="text-[13px] text-gray-400">Complétez les blocs requis pour débloquer cette simulation.</p>
                </div>
              )}
          </div>
          {/* Retraite — section custom avec simulateur */}
          <div id="retraite" className="scroll-mt-20">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <h2 className="text-[16px] font-bold text-gray-800">Simulation retraite</h2>
            </div>
            {modules[1].available
              ? (
                <div className="space-y-6">
                  <RachatTrimestres />
                  <SurcoteDecote />
                </div>
              )
              : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <p className="text-[13px] text-gray-400">Complétez les blocs requis pour débloquer cette simulation.</p>
                </div>
              )}
          </div>

          {/* Fiscalité — section custom avec simulateur */}
          <div id="fiscalite" className="scroll-mt-20">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <h2 className="text-[16px] font-bold text-gray-800">Optimisation fiscale</h2>
            </div>
            {modules[2].available
              ? (
                <div className="space-y-6">
                  <SimulateurIFI />
                  <PfuVsBareme />
                </div>
              )
              : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <p className="text-[13px] text-gray-400">Complétez les blocs requis pour débloquer cette simulation.</p>
                </div>
              )}
          </div>

          <Section id="portefeuille" title="Portefeuille & placements" icon={<PieChart size={18} />} available={modules[3].available} />
          {/* Succession — section custom avec simulateur */}
          <div id="succession" className="scroll-mt-20">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center">
                <Users size={18} />
              </div>
              <h2 className="text-[16px] font-bold text-gray-800">Succession & transmission</h2>
            </div>
            {modules[4].available
              ? <OptimAVSuccession />
              : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <p className="text-[13px] text-gray-400">Complétez les blocs requis pour débloquer cette simulation.</p>
                </div>
              )}
          </div>
          <Section id="objectif" title="Objectif principal" icon={<Target size={18} />} available={modules[5].available} />
        </div>

        {/* ── Back button ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="mt-14 flex justify-center"
        >
          <button
            type="button"
            onClick={() => navigate('/analyse')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={14} />
            Retour à l'analyse
          </button>
        </motion.div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricPill({
  label, value, color,
}: {
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'amber'
}) {
  const colorMap = {
    blue: 'text-[#185FA5]',
    green: 'text-emerald-600',
    purple: 'text-violet-600',
    amber: 'text-amber-600',
  }
  return (
    <div className="flex-shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
      <p className={`text-[15px] font-bold ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

const cardVariantsLocal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function ModuleCard({
  module: m,
  onScroll,
}: {
  module: ModuleDef
  onScroll: (anchor: string) => void
}) {
  const iconBg = m.available
    ? 'bg-[#E6F1FB] text-[#185FA5]'
    : 'bg-gray-100 text-gray-400'

  return (
    <motion.div
      variants={cardVariantsLocal}
      onClick={() => m.available && onScroll(m.anchor)}
      className={[
        'bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all duration-200',
        m.available
          ? 'border-gray-100 hover:border-[#185FA5]/30 hover:shadow-md cursor-pointer group'
          : 'border-gray-100 opacity-70 cursor-default',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {m.icon}
        </div>
        {m.available ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#185FA5] bg-[#E6F1FB] px-2.5 py-1 rounded-full group-hover:bg-[#185FA5] group-hover:text-white transition-colors whitespace-nowrap">
            Voir la simulation
            <ChevronRight size={10} />
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
            <Lock size={9} />
            Compléter {m.requiredBlocLabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-[14px] font-semibold text-gray-800 mb-1">{m.title}</p>
        <p className="text-[12px] text-gray-400 leading-relaxed">{m.desc}</p>
      </div>
    </motion.div>
  )
}

function Section({
  id, title, icon, available,
}: {
  id: string
  title: string
  icon: React.ReactNode
  available: boolean
}) {
  return (
    <div id={id} className="scroll-mt-20">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-[16px] font-bold text-gray-800">{title}</h2>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        {available ? (
          <p className="text-[13px] text-gray-400">
            Ce module sera disponible dans la prochaine version de PatriSim.
          </p>
        ) : (
          <p className="text-[13px] text-gray-400">
            Complétez les blocs requis pour débloquer cette simulation.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── PFU vs Barème ────────────────────────────────────────────────────────────

// Tranches 2024 (sur le revenu par part)
const TRANCHES = [
  { max: 11_294, rate: 0 },
  { max: 28_797, rate: 0.11 },
  { max: 82_341, rate: 0.30 },
  { max: 177_106, rate: 0.41 },
  { max: Infinity, rate: 0.45 },
]

function calcIR(revenuImposable: number, nbParts: number): number {
  if (revenuImposable <= 0 || nbParts <= 0) return 0
  const parPart = revenuImposable / nbParts
  let taxParPart = 0
  let prev = 0
  for (const t of TRANCHES) {
    if (parPart <= prev) break
    taxParPart += (Math.min(parPart, t.max) - prev) * t.rate
    prev = t.max
  }
  return Math.round(taxParPart * nbParts)
}

interface PfuResult {
  ir: number
  ps: number
  total: number
}
interface BaremeResult {
  irSupp: number
  ps: number
  csgDeductible: number
  total: number
}

function computePfu(rev: number): PfuResult {
  const ir = Math.round(rev * 0.128)
  const ps = Math.round(rev * 0.172)
  return { ir, ps, total: ir + ps }
}

function computeBareme(rev: number, rfr: number, nbParts: number): BaremeResult {
  // CSG 6.8% déductible → base imposable réduite
  const revNet = rev * (1 - 0.068)
  const irBase = calcIR(rfr, nbParts)
  const irAvec = calcIR(rfr + revNet, nbParts)
  const irSupp = Math.max(0, irAvec - irBase)
  const ps = Math.round(rev * 0.172)
  const csgDeductible = Math.round(rev * 0.068)
  return { irSupp, ps, csgDeductible, total: irSupp + ps }
}

function fmtE(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}

function SimInput({
  label, value, onChange, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#F8F8F6] border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-medium text-gray-800 focus:outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5]/30 transition-colors"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function ResultCol({
  label, rows, total, winner, badge,
}: {
  label: string
  rows: { label: string; value: number; negative?: boolean }[]
  total: number
  winner: boolean
  badge?: string
}) {
  return (
    <div className={[
      'flex-1 rounded-2xl border p-5 transition-all',
      winner
        ? 'border-emerald-200 bg-emerald-50/60 shadow-sm'
        : 'border-gray-100 bg-gray-50/50',
    ].join(' ')}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[13px] font-bold ${winner ? 'text-emerald-700' : 'text-gray-600'}`}>
          {label}
        </span>
        {winner && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
            ✓ Plus avantageux
          </span>
        )}
      </div>
      <div className="space-y-2 mb-4">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-[12px]">
            <span className="text-gray-500">{r.label}</span>
            <span className={r.negative ? 'text-emerald-600 font-medium' : 'text-gray-700 font-medium'}>
              {r.negative ? '−' : ''}{fmtE(r.value)}
            </span>
          </div>
        ))}
      </div>
      <div className={`flex justify-between items-center pt-3 border-t ${winner ? 'border-emerald-200' : 'border-gray-200'}`}>
        <span className={`text-[13px] font-bold ${winner ? 'text-emerald-700' : 'text-gray-700'}`}>
          Total
        </span>
        <span className={`text-[18px] font-bold ${winner ? 'text-emerald-700' : 'text-gray-800'}`}>
          {fmtE(total)}
        </span>
      </div>
      {badge && <p className="text-[10px] text-gray-400 mt-2 text-center">{badge}</p>}
    </div>
  )
}

// ─── Plus-value immobilière — abattements 2026 ────────────────────────────────

function abattIR(duree: number): number {
  // 6% par an de la 6e à la 21e, 4% la 22e → exonération totale après 22 ans
  if (duree <= 5) return 0
  if (duree >= 22) return 100
  return (duree - 5) * 6  // 6% × (duree−5), max 96% à la 21e année
}

function abattPS(duree: number): number {
  // 1.65%/an de la 6e à la 21e, 1.60% la 22e, 9%/an de la 23e à la 30e → exonération après 30 ans
  if (duree <= 5) return 0
  if (duree >= 30) return 100
  if (duree <= 21) return (duree - 5) * 1.65
  if (duree === 22) return 16 * 1.65 + 1.60   // 26.40 + 1.60 = 28%
  return 28 + (duree - 22) * 9                // 37% à la 23e → 91% à la 29e
}

function ResultRow({
  label, value, highlight, accent,
}: {
  label: string
  value: string
  highlight?: boolean
  accent?: boolean
}) {
  return (
    <div className={[
      'flex justify-between items-center px-4 py-2.5 rounded-xl text-[13px]',
      accent ? 'bg-gray-50 border border-gray-200' : 'bg-[#F8F8F6]',
    ].join(' ')}>
      <span className="text-gray-500">{label}</span>
      <span className={[
        'font-semibold',
        highlight ? 'text-emerald-600' : accent ? 'text-gray-900 font-bold' : 'text-gray-800',
      ].join(' ')}>
        {value}
      </span>
    </div>
  )
}

function PlusValueImmo() {
  const bloc2 = loadLS<{ biens?: { prixAchat?: string; travaux?: string; anneeAchat?: string }[] }>(
    'patrisim_bloc2', {}
  )
  const bien0 = bloc2.biens?.[0]
  const CURRENT_YEAR = 2026

  const [achatStr, setAchatStr] = useState(bien0?.prixAchat || '')
  const [travauxStr, setTravauxStr] = useState(bien0?.travaux || '0')
  const [venteStr, setVenteStr] = useState('')
  const [anneeStr, setAnneeStr] = useState(bien0?.anneeAchat || '')

  const achat = parseNum(achatStr)
  const travaux = parseNum(travauxStr)
  const vente = parseNum(venteStr)
  const annee = parseInt(anneeStr)

  const duree = !isNaN(annee) && annee > 0 ? Math.max(0, CURRENT_YEAR - annee) : 0
  const pvBrute = vente > 0 && achat > 0 ? Math.max(0, vente - achat - travaux) : 0

  const rIR = abattIR(duree) / 100
  const rPS = abattPS(duree) / 100

  const pvImposableIR = Math.round(pvBrute * (1 - rIR))
  const pvImposablePS = Math.round(pvBrute * (1 - rPS))

  const ir = Math.round(pvImposableIR * 0.19)
  const ps = Math.round(pvImposablePS * 0.172)
  const totalImpot = ir + ps
  const netVendeur = vente - totalImpot

  const hasResult = vente > 0 && achat > 0 && duree > 0
  const exemptIR = duree >= 22
  const exemptPS = duree >= 30
  const exemptTotal = exemptIR && exemptPS

  const pctPS = abattPS(duree)
  const pctPSLabel = Number.isInteger(pctPS) ? `${pctPS} %` : `${pctPS.toFixed(2).replace('.', ',')} %`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <p className="text-[14px] font-bold text-gray-800">Simulateur plus-value immobilière</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Barème 2026 — hors résidence principale (exonérée de plein droit).
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-4 gap-4">
        <SimInput
          label="Prix d'achat (€)"
          value={achatStr}
          onChange={setAchatStr}
        />
        <SimInput
          label="Travaux (€)"
          value={travauxStr}
          onChange={setTravauxStr}
          hint="Montant justifié (factures)"
        />
        <SimInput
          label="Prix de vente (€)"
          value={venteStr}
          onChange={setVenteStr}
        />
        <SimInput
          label="Année d'achat"
          value={anneeStr}
          onChange={setAnneeStr}
          hint={duree > 0 ? `${duree} an${duree > 1 ? 's' : ''} de détention` : undefined}
        />
      </div>

      {/* Results */}
      {hasResult ? (
        exemptTotal ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <p className="text-[17px] font-bold text-emerald-700 mb-1">
              Exonération totale ✓
            </p>
            <p className="text-[13px] text-emerald-600">
              Après {duree} ans de détention, vous êtes exonéré d'IR et de prélèvements sociaux.
            </p>
            <div className="mt-4 flex justify-center gap-8">
              <div className="text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Plus-value brute</p>
                <p className="text-[16px] font-bold text-gray-700">{fmtE(pvBrute)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Net vendeur</p>
                <p className="text-[16px] font-bold text-emerald-700">{fmtE(vente)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Durée + abattements badges */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                {duree} an{duree > 1 ? 's' : ''} de détention
              </span>
              <span className={[
                'text-[11px] font-semibold px-2.5 py-1 rounded-full',
                exemptIR
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-[#185FA5] bg-[#E6F1FB]',
              ].join(' ')}>
                IR : {exemptIR ? 'Exonéré ✓' : `Abattement ${abattIR(duree)} %`}
              </span>
              <span className={[
                'text-[11px] font-semibold px-2.5 py-1 rounded-full',
                exemptPS
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-[#185FA5] bg-[#E6F1FB]',
              ].join(' ')}>
                PS : {exemptPS ? 'Exonéré ✓' : `Abattement ${pctPSLabel}`}
              </span>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 gap-2">
              <ResultRow label="Plus-value brute" value={fmtE(pvBrute)} />
              <ResultRow
                label="PV imposable — IR"
                value={exemptIR ? 'Exonérée' : fmtE(pvImposableIR)}
                highlight={exemptIR}
              />
              <ResultRow
                label="PV imposable — PS"
                value={exemptPS ? 'Exonérée' : fmtE(pvImposablePS)}
                highlight={exemptPS}
              />
              <ResultRow
                label="IR dû (19 %)"
                value={exemptIR ? '0 €' : fmtE(ir)}
                highlight={exemptIR}
              />
              <ResultRow
                label="PS dû (17,2 %)"
                value={exemptPS ? '0 €' : fmtE(ps)}
                highlight={exemptPS}
              />
              <ResultRow label="Total impôt" value={fmtE(totalImpot)} accent />
            </div>

            {/* Net vendeur */}
            <div className="bg-[#E6F1FB] rounded-2xl px-5 py-4 flex justify-between items-center">
              <span className="text-[13px] font-bold text-[#0C447C]">Net vendeur</span>
              <span className="text-[22px] font-bold text-[#185FA5]">{fmtE(netVendeur)}</span>
            </div>
          </div>
        )
      ) : (
        <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
          <p className="text-[13px] text-gray-400">
            Renseignez le prix d'achat, les travaux, le prix de vente et l'année d'achat.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Rendement locatif net ────────────────────────────────────────────────────

type Regime = 'micro-foncier' | 'reel' | 'lmnp-micro' | 'lmnp-reel'

const REGIME_LABELS: Record<Regime, string> = {
  'micro-foncier': 'Micro-foncier (abattement 30 %)',
  'reel':          'Réel (charges déductibles)',
  'lmnp-micro':    'LMNP micro-BIC (abattement 50 %)',
  'lmnp-reel':     'LMNP réel (amortissement 2,5 %/an)',
}

function detectRegime(raw: string): Regime {
  const r = raw.toLowerCase()
  if (r.includes('micro-bic') || r.includes('microbic')) return 'lmnp-micro'
  if (r.includes('lmnp') && (r.includes('réel') || r.includes('reel'))) return 'lmnp-reel'
  if (r.includes('réel') || r.includes('reel')) return 'reel'
  return 'micro-foncier'
}

function calcRendements(
  loyerMensuel: number,
  chargesAnnuelles: number,
  prixAcquisition: number,
  regime: Regime,
  tmi: number,
): { brut: number; netCharges: number; netFiscal: number } {
  if (prixAcquisition <= 0) return { brut: 0, netCharges: 0, netFiscal: 0 }

  const loyerAnnuel = loyerMensuel * 12
  const brut = (loyerAnnuel / prixAcquisition) * 100
  const revenuNetCharges = Math.max(0, loyerAnnuel - chargesAnnuelles)
  const netCharges = (revenuNetCharges / prixAcquisition) * 100

  const tauxFiscal = tmi / 100 + 0.172
  let impotAnnuel = 0

  if (regime === 'micro-foncier') {
    impotAnnuel = loyerAnnuel * 0.7 * tauxFiscal
  } else if (regime === 'reel') {
    impotAnnuel = Math.max(0, revenuNetCharges) * tauxFiscal
  } else if (regime === 'lmnp-micro') {
    impotAnnuel = loyerAnnuel * 0.5 * tauxFiscal
  } else {
    // LMNP réel : amortissement 2.5%/an sur prix achat
    const amortissement = prixAcquisition * 0.025
    const baseImposable = Math.max(0, revenuNetCharges - amortissement)
    impotAnnuel = baseImposable * tauxFiscal
  }

  const revenuNetFiscal = loyerAnnuel - chargesAnnuelles - impotAnnuel
  const netFiscal = (revenuNetFiscal / prixAcquisition) * 100

  return { brut, netCharges, netFiscal }
}

function SimSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#F8F8F6] border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-800 focus:outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5]/30 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

const RDT_COLORS = ['#94a3b8', '#185FA5', '#059669']

function RdtCol({
  label, value, color, sub,
}: {
  label: string
  value: number
  color: string
  sub?: string
}) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${color}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 opacity-70">{label}</p>
      <p className="text-[26px] font-bold leading-none">
        {value.toFixed(2).replace('.', ',')} %
      </p>
      {sub && <p className="text-[10px] mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function RendementLocatif() {
  // Pre-fill from bloc2 (first loué bien)
  const bloc2 = loadLS<{
    biens?: {
      prixAchat?: string
      loue?: boolean
      location?: { loyerMensuel?: string; chargesAnnuelles?: string; regimeFiscal?: string }
    }[]
  }>('patrisim_bloc2', {})
  const bloc4 = loadLS<{ fiscal?: { tmi?: number } }>('patrisim_bloc4', {})

  const bien = bloc2.biens?.find((b) => b.loue) ?? bloc2.biens?.[0]
  const loc = bien?.location

  const [loyerStr, setLoyerStr] = useState(loc?.loyerMensuel || '')
  const [chargesStr, setChargesStr] = useState(loc?.chargesAnnuelles || '')
  const [prixStr, setPrixStr] = useState(bien?.prixAchat || '')
  const [regime, setRegime] = useState<Regime>(
    loc?.regimeFiscal ? detectRegime(loc.regimeFiscal) : 'micro-foncier'
  )
  const [tmiStr, setTmiStr] = useState(String(bloc4.fiscal?.tmi ?? 30))

  const loyer = parseNum(loyerStr)
  const charges = parseNum(chargesStr)
  const prix = parseNum(prixStr)
  const tmi = parseNum(tmiStr)

  const [rdts, setRdts] = useState({ brut: 0, netCharges: 0, netFiscal: 0 })

  useEffect(() => {
    setRdts(calcRendements(loyer, charges, prix, regime, tmi))
  }, [loyer, charges, prix, regime, tmi])

  const hasResult = prix > 0 && loyer > 0

  const chartData = [
    { name: 'Brut', value: parseFloat(rdts.brut.toFixed(2)) },
    { name: 'Net charges', value: parseFloat(rdts.netCharges.toFixed(2)) },
    { name: 'Net fiscal', value: parseFloat(rdts.netFiscal.toFixed(2)) },
  ]

  const tmiOptions = [0, 11, 30, 41, 45].map((v) => ({ value: String(v), label: `${v} %` }))
  const regimeOptions = (Object.entries(REGIME_LABELS) as [Regime, string][]).map(([v, l]) => ({
    value: v, label: l,
  }))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <p className="text-[14px] font-bold text-gray-800">Simulateur rendement locatif net</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Comparez brut, net charges et net fiscal selon votre régime d'imposition.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <SimInput
          label="Loyer mensuel (€)"
          value={loyerStr}
          onChange={setLoyerStr}
          hint={loyer > 0 ? `${fmtE(loyer * 12)} / an` : undefined}
        />
        <SimInput
          label="Charges annuelles (€)"
          value={chargesStr}
          onChange={setChargesStr}
          hint="Taxe foncière, gestion, entretien…"
        />
        <SimInput
          label="Prix d'acquisition (€)"
          value={prixStr}
          onChange={setPrixStr}
          hint="Frais de notaire inclus"
        />
        <SimSelect
          label="Régime fiscal"
          value={regime}
          onChange={(v) => setRegime(v as Regime)}
          options={regimeOptions}
        />
        <SimSelect
          label="TMI"
          value={tmiStr}
          onChange={setTmiStr}
          options={tmiOptions}
        />
      </div>

      {hasResult ? (
        <>
          {/* 3-column result cards */}
          <div className="grid grid-cols-3 gap-3">
            <RdtCol
              label="Rendement brut"
              value={rdts.brut}
              color="bg-gray-50 border-gray-200 text-gray-700"
              sub={`${fmtE(loyer * 12)} / an`}
            />
            <RdtCol
              label="Net charges"
              value={rdts.netCharges}
              color="bg-[#E6F1FB] border-[#185FA5]/20 text-[#185FA5]"
              sub={`${fmtE(Math.max(0, loyer * 12 - charges))} / an`}
            />
            <RdtCol
              label="Net fiscal"
              value={rdts.netFiscal}
              color={
                rdts.netFiscal >= 3
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : rdts.netFiscal >= 1
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-red-50 border-red-200 text-red-600'
              }
              sub={REGIME_LABELS[regime].split(' ')[0]}
            />
          </div>

          {/* Bar chart */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Comparaison des rendements (%)
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barCategoryGap="35%" margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v} %`}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(2).replace('.', ',')} %`, '']}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={RDT_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
          <p className="text-[13px] text-gray-400">
            Renseignez le loyer mensuel et le prix d'acquisition pour calculer les rendements.
          </p>
        </div>
      )}
    </div>
  )
}

function PfuVsBareme() {
  const bloc4 = loadLS<{
    revenusFinanciers?: string
    fiscal?: { rfr?: string; nbParts?: string; tmi?: number }
  }>('patrisim_bloc4', {})

  const [revStr, setRevStr] = useState(bloc4.revenusFinanciers || '')
  const [rfrStr, setRfrStr] = useState(bloc4.fiscal?.rfr || '')
  const [partsStr, setPartsStr] = useState(bloc4.fiscal?.nbParts || '1')

  const rev = parseNum(revStr)
  const rfr = parseNum(rfrStr)
  const nbParts = Math.max(1, parseNum(partsStr))

  const [pfu, setPfu] = useState<PfuResult | null>(null)
  const [bareme, setBareme] = useState<BaremeResult | null>(null)

  useEffect(() => {
    if (rev <= 0) { setPfu(null); setBareme(null); return }
    setPfu(computePfu(rev))
    setBareme(computeBareme(rev, rfr, nbParts))
  }, [rev, rfr, nbParts])

  const pfuWins = pfu !== null && bareme !== null && pfu.total <= bareme.total
  const baremeWins = pfu !== null && bareme !== null && bareme.total < pfu.total
  const economie = pfu && bareme ? Math.abs(pfu.total - bareme.total) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[14px] font-bold text-gray-800">Simulateur PFU vs Barème</p>
          <p className="text-[12px] text-gray-400 mt-0.5">
            Comparez l'imposition de vos revenus de capitaux mobiliers.
          </p>
        </div>
        {economie > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap">
            <TrendingDown size={12} />
            Économie : {fmtE(economie)}
          </span>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <SimInput
          label="Revenus financiers (€)"
          value={revStr}
          onChange={setRevStr}
          hint="Dividendes, intérêts, plus-values"
        />
        <SimInput
          label="Revenu fiscal de référence (€)"
          value={rfrStr}
          onChange={setRfrStr}
          hint="Hors revenus financiers ci-dessus"
        />
        <SimInput
          label="Nombre de parts"
          value={partsStr}
          onChange={setPartsStr}
          hint="Quotient familial"
        />
      </div>

      {/* Results */}
      {pfu && bareme && rev > 0 ? (
        <div className="flex gap-4">
          <ResultCol
            label="PFU — Flat Tax 30 %"
            rows={[
              { label: 'IR (12,8 %)', value: pfu.ir },
              { label: 'Prélèvements sociaux (17,2 %)', value: pfu.ps },
            ]}
            total={pfu.total}
            winner={pfuWins}
            badge="Taux forfaitaire — simple et prévisible"
          />
          <ResultCol
            label="Barème progressif"
            rows={[
              { label: 'IR supplémentaire', value: bareme.irSupp },
              { label: 'Prélèvements sociaux (17,2 %)', value: bareme.ps },
              { label: 'CSG déductible (6,8 %)', value: bareme.csgDeductible, negative: true },
            ]}
            total={bareme.total}
            winner={baremeWins}
            badge="Base : RFR + revenus × 93,2 % (après CSG déductible)"
          />
        </div>
      ) : (
        <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
          <p className="text-[13px] text-gray-400">
            Saisissez un montant de revenus financiers pour voir la comparaison.
          </p>
        </div>
      )}

      {pfu && bareme && rev > 0 && (
        <p className="text-[11px] text-gray-400 text-center">
          {pfuWins
            ? `Le PFU est plus avantageux de ${fmtE(economie)} — votre TMI effectif dépasse 12,8 %.`
            : `Le barème est plus avantageux de ${fmtE(economie)} — votre TMI effectif est inférieur à 12,8 %.`}
        </p>
      )}
    </div>
  )
}

// ─── Optimisation AV Succession ───────────────────────────────────────────────

interface AVData {
  nom?: string
  compagnie?: string
  dateOuverture?: string
  valeurRachat?: string
  versements?: string
  clauseBeneficiaire?: string
}

interface AVSplit {
  av: AVData
  valeurAvant70: number
  valeurApres70: number
  versementsAvant70: number
  versementsApres70: number
  ratioAvant70: number
}

function computeAVSplit(av: AVData, ageActuel: number): AVSplit {
  const CURRENT_YEAR = 2026
  const totalV = parseNum(av.versements)
  const valeur = parseNum(av.valeurRachat)

  if (!av.dateOuverture || totalV <= 0) {
    return { av, valeurAvant70: valeur, valeurApres70: 0, versementsAvant70: totalV, versementsApres70: 0, ratioAvant70: 1 }
  }

  const openYear = new Date(av.dateOuverture).getFullYear()
  const ageAtOpening = ageActuel - (CURRENT_YEAR - openYear)

  // Tout après 70 ans
  if (ageAtOpening >= 70) {
    return { av, valeurAvant70: 0, valeurApres70: valeur, versementsAvant70: 0, versementsApres70: totalV, ratioAvant70: 0 }
  }
  // Tout avant 70 ans
  if (ageActuel < 70) {
    return { av, valeurAvant70: valeur, valeurApres70: 0, versementsAvant70: totalV, versementsApres70: 0, ratioAvant70: 1 }
  }
  // Split : ouvert avant 70 ans, souscripteur a maintenant ≥ 70 ans
  const totalYears = Math.max(1, ageActuel - ageAtOpening)
  const yearsBeforeAt70 = Math.max(0, 70 - ageAtOpening)
  const ratio = Math.min(1, yearsBeforeAt70 / totalYears)
  return {
    av,
    valeurAvant70: Math.round(valeur * ratio),
    valeurApres70: Math.round(valeur * (1 - ratio)),
    versementsAvant70: Math.round(totalV * ratio),
    versementsApres70: Math.round(totalV * (1 - ratio)),
    ratioAvant70: ratio,
  }
}

function calcTaxAVAvant70(valeur: number, nbBenef: number) {
  const ABATT = 152_500
  const partParBenef = nbBenef > 0 ? valeur / nbBenef : 0
  const taxable = Math.max(0, partParBenef - ABATT)
  const taxParBenef = Math.min(taxable, 700_000) * 0.20 + Math.max(0, taxable - 700_000) * 0.3125
  return { tax: Math.round(taxParBenef * nbBenef), exonere: Math.min(valeur, nbBenef * ABATT) }
}

function calcTaxAVApres70(versements: number, valeur: number) {
  const ABATT_GLOBAL = 30_500
  const gains = Math.max(0, valeur - versements)
  const taxablePrimes = Math.max(0, versements - ABATT_GLOBAL)
  return {
    tax: Math.round(taxablePrimes * 0.20),   // barème succession ~20% enfants
    exonere: gains + Math.min(versements, ABATT_GLOBAL),
  }
}

function SplitBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100)
  return (
    <div className="mt-2">
      <div className="flex rounded-full overflow-hidden h-2 bg-gray-100">
        <div className="bg-[#185FA5] transition-all" style={{ width: `${pct}%` }} />
        <div className="bg-amber-300 flex-1" />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[#185FA5] font-medium">Avant 70 ans · {pct}%</span>
        <span className="text-[10px] text-amber-600 font-medium">Après 70 ans · {100 - pct}%</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-[#F8F8F6] border-gray-100'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={`text-[20px] font-bold ${accent ? 'text-emerald-700' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function OptimAVSuccession() {
  const bloc2 = loadLS<{ avs?: AVData[] }>('patrisim_bloc2', {})
  const bloc1p1 = loadLS<{ dateNaissance?: string }>('patrisim_bloc1_p1', {})

  const defaultAge = bloc1p1.dateNaissance
    ? String(Math.floor((Date.now() - new Date(bloc1p1.dateNaissance).getTime()) / 31_557_600_000))
    : ''

  const [ageStr, setAgeStr] = useState(defaultAge)
  const [nbStr, setNbStr] = useState('1')

  const age = parseNum(ageStr)
  const nbBenef = Math.max(1, parseNum(nbStr))
  const avs = bloc2.avs ?? []

  const splits = age > 0 ? avs.map((av) => computeAVSplit(av, age)) : []

  const totalValeurAvant70 = splits.reduce((s, x) => s + x.valeurAvant70, 0)
  const totalVersementsApres70 = splits.reduce((s, x) => s + x.versementsApres70, 0)
  const totalValeurApres70 = splits.reduce((s, x) => s + x.valeurApres70, 0)
  const totalValeur = splits.reduce((s, x) => s + parseNum(x.av.valeurRachat), 0)

  const resAvant70 = calcTaxAVAvant70(totalValeurAvant70, nbBenef)
  const resApres70 = calcTaxAVApres70(totalVersementsApres70, totalValeurApres70)

  const totalTax = resAvant70.tax + resApres70.tax
  const totalExonere = resAvant70.exonere + resApres70.exonere
  const totalSoumis = Math.max(0, totalValeur - totalExonere)

  // Économie vs succession classique (20% après 100k/bénéf)
  const taxClassique = Math.max(0, totalValeur - nbBenef * 100_000) * 0.20
  const economie = Math.max(0, taxClassique - totalTax)

  const hasData = avs.length > 0 && age > 0

  // Recommandation
  const hasApres70 = totalVersementsApres70 > 0
  const recommandation = age >= 70
    ? 'Vous avez dépassé 70 ans. Privilégiez désormais d\'autres enveloppes (donations, pacte Dutreil) pour la transmission. Les nouvelles primes AV seront soumises aux droits de succession.'
    : `Continuez à alimenter vos assurances-vie avant vos 70 ans : chaque bénéficiaire bénéficie d'un abattement de 152 500 € supplémentaire. Il vous reste ${70 - age} an${70 - age > 1 ? 's' : ''} pour optimiser.`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <p className="text-[14px] font-bold text-gray-800">Simulateur optimisation AV succession</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Avant 70 ans : abattement 152 500 € / bénéficiaire · Après 70 ans : abattement global 30 500 €
        </p>
      </div>

      {/* Global inputs */}
      <div className="grid grid-cols-2 gap-4">
        <SimInput label="Âge actuel du souscripteur" value={ageStr} onChange={setAgeStr} hint="Pré-rempli depuis le Bloc 1" />
        <SimInput label="Nombre de bénéficiaires" value={nbStr} onChange={setNbStr} hint="Désignés dans la clause bénéficiaire" />
      </div>

      {avs.length === 0 ? (
        <div className="bg-[#F8F8F6] rounded-xl p-5 text-center">
          <p className="text-[13px] text-gray-400">Aucune assurance-vie renseignée dans le Bloc 2.</p>
        </div>
      ) : (
        <>
          {/* Per-AV cards */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Assurances-vie détectées ({avs.length})
            </p>
            <div className="grid grid-cols-2 gap-3">
              {splits.map((s, i) => (
                <div key={i} className="bg-[#F8F8F6] rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[13px] font-semibold text-gray-800">{s.av.nom || `AV ${i + 1}`}</p>
                    <span className="text-[11px] font-bold text-[#185FA5]">{fmtE(parseNum(s.av.valeurRachat))}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">{s.av.compagnie} · Versements : {fmtE(parseNum(s.av.versements))}</p>
                  {age > 0 && <SplitBar ratio={s.ratioAvant70} />}
                  {age > 0 && (
                    <div className="flex gap-3 mt-2 text-[11px]">
                      <span className="text-[#185FA5] font-medium">Av. 70 : {fmtE(s.valeurAvant70)}</span>
                      <span className="text-amber-600 font-medium">Ap. 70 : {fmtE(s.valeurApres70)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {hasData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Transmis hors succession"
                  value={fmtE(totalExonere)}
                  sub={`${Math.round(totalExonere / totalValeur * 100)} % de la valeur totale`}
                  accent
                />
                <MetricCard
                  label="Soumis aux droits"
                  value={fmtE(totalSoumis)}
                  sub="Après abattements AV"
                />
                <MetricCard
                  label="Droits estimés"
                  value={fmtE(totalTax)}
                  sub={`Avant 70 : ${fmtE(resAvant70.tax)} · Après 70 : ${fmtE(resApres70.tax)}`}
                />
                <MetricCard
                  label="Économie vs succession"
                  value={fmtE(economie)}
                  sub="Par rapport à une transmission sans AV"
                  accent={economie > 0}
                />
              </div>

              {/* Detail row */}
              <div className="bg-[#F8F8F6] rounded-xl p-4 text-[12px] text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Avant 70 ans — abattement {nbBenef} × 152 500 €</span>
                  <span className="font-medium text-gray-700">{fmtE(Math.min(totalValeurAvant70, nbBenef * 152_500))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Après 70 ans — abattement global 30 500 € + gains exonérés</span>
                  <span className="font-medium text-gray-700">{fmtE(resApres70.exonere)}</span>
                </div>
              </div>

              {/* Recommandation */}
              <div className={`rounded-2xl border p-4 flex gap-3 ${hasApres70 && age < 70 ? 'bg-amber-50 border-amber-200' : age >= 70 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <span className="text-[18px] mt-0.5 flex-shrink-0">{age >= 70 ? '⚠️' : hasApres70 ? '💡' : '✅'}</span>
                <p className="text-[12px] leading-relaxed text-gray-700">{recommandation}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#F8F8F6] rounded-xl p-5 text-center">
              <p className="text-[13px] text-gray-400">Renseignez l'âge du souscripteur pour voir les résultats.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Rachat de trimestres ─────────────────────────────────────────────────────

function tauxRachat(age: number): number {
  if (age < 40) return 0.08
  if (age < 50) return 0.11
  return 0.14
}

function RachatTrimestres() {
  const bloc1p1 = loadLS<{ dateNaissance?: string }>('patrisim_bloc1_p1', {})
  const bloc4 = loadLS<{ p1Pro?: { salaire?: string; remunNette?: string } }>('patrisim_bloc4', {})
  const bloc5 = loadLS<{
    retraiteP1?: { pensionConnue?: boolean; pensionBase?: string; ageDepartSouhaite?: number }
  }>('patrisim_bloc5', {})

  const defaultAge = bloc1p1.dateNaissance
    ? String(Math.floor((Date.now() - new Date(bloc1p1.dateNaissance).getTime()) / 31_557_600_000))
    : ''

  // Salaire mensuel → annuel
  const salaireM = parseNum(bloc4.p1Pro?.salaire || bloc4.p1Pro?.remunNette)
  const defaultRevenu = salaireM > 0 ? String(Math.round(salaireM * 12)) : ''

  // Pension mensuelle estimée
  const retraiteP1 = bloc5.retraiteP1
  const defaultPension = retraiteP1?.pensionConnue && retraiteP1.pensionBase
    ? retraiteP1.pensionBase
    : salaireM > 0 ? String(Math.round(salaireM * 0.5)) : ''

  const [ageStr, setAgeStr] = useState(defaultAge)
  const [revenuStr, setRevenuStr] = useState(defaultRevenu)
  const [pensionStr, setPensionStr] = useState(defaultPension)
  const [nbT, setNbT] = useState(4)

  const age = parseNum(ageStr)
  const revenuAnnuel = parseNum(revenuStr)
  const pensionMensuelle = parseNum(pensionStr)

  const coutParT = revenuAnnuel * tauxRachat(age)
  const coutTotal = coutParT * nbT
  const gainMensuel = pensionMensuelle > 0 ? (pensionMensuelle / 166) * nbT : 0
  const gainAnnuel = gainMensuel * 12
  const rentaAnnees = gainAnnuel > 0 ? coutTotal / gainAnnuel : null
  const agRentabilite = rentaAnnees !== null ? age + rentaAnnees : null
  const rentableAvant80 = agRentabilite !== null && agRentabilite < 80

  const hasResult = age > 0 && revenuAnnuel > 0 && pensionMensuelle > 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <p className="text-[14px] font-bold text-gray-800">Simulateur rachat de trimestres</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Barème 2026 — estimation du coût et de la rentabilité d'un rachat de trimestres manquants.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <SimInput
          label="Âge actuel"
          value={ageStr}
          onChange={setAgeStr}
          hint={age > 0 ? `Taux applicable : ${(tauxRachat(age) * 100).toFixed(0)} %/trimestre` : undefined}
        />
        <SimInput
          label="Revenu annuel (€)"
          value={revenuStr}
          onChange={setRevenuStr}
          hint="Salaire brut annuel"
        />
        <SimInput
          label="Pension estimée (€/mois)"
          value={pensionStr}
          onChange={setPensionStr}
          hint="Base de calcul du gain"
        />
      </div>

      {/* Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Trimestres à racheter
          </label>
          <span className="text-[15px] font-bold text-[#185FA5]">
            {nbT} trimestre{nbT > 1 ? 's' : ''}
            {coutParT > 0 && (
              <span className="text-[12px] font-medium text-gray-400 ml-1.5">
                · {fmtE(Math.round(coutParT))} / trimestre
              </span>
            )}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={nbT}
          onChange={(e) => setNbT(Number(e.target.value))}
          className="w-full h-2 rounded-full accent-[#185FA5] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-300 mt-1">
          <span>1</span><span>3</span><span>6</span><span>9</span><span>12</span>
        </div>
      </div>

      {hasResult ? (
        <div className="space-y-4">
          {/* 3 metric cards */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="Coût total du rachat"
              value={fmtE(Math.round(coutTotal))}
              sub={`${nbT} × ${fmtE(Math.round(coutParT))}`}
            />
            <MetricCard
              label="Gain mensuel pension"
              value={`+${fmtE(Math.round(gainMensuel))}/mois`}
              sub={`${fmtE(Math.round(gainAnnuel))} / an`}
            />
            <MetricCard
              label="Rentabilisation"
              value={rentaAnnees !== null ? `${rentaAnnees.toFixed(1).replace('.', ',')} ans` : '—'}
              sub={agRentabilite !== null ? `Seuil atteint à ${Math.round(agRentabilite)} ans` : undefined}
              accent={rentableAvant80}
            />
          </div>

          {/* Info card */}
          <div className={`rounded-2xl border p-4 flex gap-3 items-start ${
            rentableAvant80
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <span className="text-[18px] flex-shrink-0">{rentableAvant80 ? '✅' : '⚠️'}</span>
            <div>
              <p className={`text-[13px] font-semibold mb-0.5 ${rentableAvant80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {rentableAvant80
                  ? `Rentable — seuil atteint vers ${Math.round(agRentabilite!)} ans`
                  : `Rentabilisation tardive (après 80 ans)`}
              </p>
              <p className="text-[12px] text-gray-600">
                {rentableAvant80
                  ? `En ${rentaAnnees!.toFixed(1).replace('.', ',')} ans, votre gain de pension aura remboursé le coût du rachat. L'opération est financièrement avantageuse.`
                  : `Le coût du rachat ne sera amorti qu'après 80 ans. Envisagez d'abord d'optimiser votre PER ou votre épargne retraite.`}
              </p>
            </div>
          </div>

          {/* Detail */}
          <div className="bg-[#F8F8F6] rounded-xl p-4 text-[12px] text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Taux de rachat ({age} ans)</span>
              <span className="font-medium text-gray-700">{(tauxRachat(age) * 100).toFixed(0)} % du revenu annuel / trimestre</span>
            </div>
            <div className="flex justify-between">
              <span>Gain par trimestre racheté</span>
              <span className="font-medium text-gray-700">{fmtE(Math.round(pensionMensuelle / 166))}/mois · base 166 trimestres</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
          <p className="text-[13px] text-gray-400">
            Renseignez l'âge, le revenu annuel et la pension estimée pour voir les résultats.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Surcote / Décote ─────────────────────────────────────────────────────────

// Trimestres requis pour le taux plein selon l'année de naissance
// Génération 1965+ : 172 trimestres (43 ans)
const TRIMESTRES_TAUX_PLEIN = 172

// Âge légal de départ à taux plein automatique (sans décote) : 67 ans
const AGE_TAUX_PLEIN_AUTO = 67

function computePension(
  salaireRef: number,           // salaire mensuel de référence
  trimCotises: number,          // trimestres cotisés à l'âge de départ
  ageDepart: number,
): { pension: number; decotePct: number; surcotePct: number; trimDiff: number } {
  const pensionBase = salaireRef * 0.5  // taux plein = 50%

  // Manque ou excès de trimestres
  const trimDiff = trimCotises - TRIMESTRES_TAUX_PLEIN

  let decotePct = 0
  let surcotePct = 0

  if (ageDepart >= AGE_TAUX_PLEIN_AUTO) {
    // Taux plein automatique à 67 ans : ni décote ni surcote due à l'âge
    // Surcote possible si trimestres dépassent le taux plein ET âge > 62 ans
    if (trimDiff > 0) surcotePct = Math.min(trimDiff, 50) * 1.25
  } else if (trimDiff < 0) {
    // Décote : -1.25% par trimestre manquant, max 20 trimestres
    decotePct = Math.min(Math.abs(trimDiff), 20) * 1.25
  } else if (trimDiff > 0) {
    // Surcote : +1.25% par trimestre au-delà du taux plein
    surcotePct = Math.min(trimDiff, 50) * 1.25
  }

  const taux = 0.5 * (1 - decotePct / 100) * (1 + surcotePct / 100)
  const pension = Math.round(salaireRef * taux)

  return { pension, decotePct, surcotePct, trimDiff }
}

function SurcoteDecote() {
  const bloc4 = loadLS<{ p1Pro?: { salaire?: string; remunNette?: string } }>('patrisim_bloc4', {})
  const bloc5 = loadLS<{
    retraiteP1?: {
      ageDepartSouhaite?: number
      pensionConnue?: boolean
      pensionBase?: string
      trimestres?: number
    }
  }>('patrisim_bloc5', {})

  const salaireM = parseNum(bloc5.retraiteP1?.pensionConnue && bloc5.retraiteP1.pensionBase
    ? undefined  // will use pensionBase directly
    : bloc4.p1Pro?.salaire || bloc4.p1Pro?.remunNette)

  // Salaire de référence : pensionBase / 0.5 si connue, sinon salaire mensuel
  const salaireRef = bloc5.retraiteP1?.pensionConnue && bloc5.retraiteP1.pensionBase
    ? parseNum(bloc5.retraiteP1.pensionBase) / 0.5
    : salaireM

  const defaultAge = bloc5.retraiteP1?.ageDepartSouhaite ?? 63
  const defaultTrim = bloc5.retraiteP1?.trimestres ?? 0

  const [ageDepart, setAgeDepart] = useState(defaultAge)
  const [trimStr, setTrimStr] = useState(defaultTrim > 0 ? String(defaultTrim) : '')

  const trimCotises = parseNum(trimStr)
  const hasData = salaireRef > 0 && trimCotises > 0

  const res = hasData ? computePension(salaireRef, trimCotises, ageDepart) : null

  // Comparaison : partir maintenant vs dans 2 ans (4 trimestres de plus)
  const resPlus2 = hasData
    ? computePension(salaireRef, trimCotises + 8, ageDepart + 2)
    : null

  // LineChart data : pension de 55 à 70 ans
  // Trimestres augmentent de 4/an depuis maintenant
  const chartData = hasData
    ? Array.from({ length: 16 }, (_, i) => {
        const a = 55 + i
        const trimAtAge = Math.max(0, trimCotises + (a - ageDepart) * 4)
        const r = computePension(salaireRef, trimAtAge, a)
        return { age: a, pension: r.pension, plein: Math.round(salaireRef * 0.5) }
      })
    : []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <p className="text-[14px] font-bold text-gray-800">Simulateur surcote / décote</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Décote −1,25 %/trimestre manquant · Surcote +1,25 %/trimestre supplémentaire · Taux plein = 50 %
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Âge de départ souhaité
            </label>
            <span className="text-[15px] font-bold text-[#185FA5]">{ageDepart} ans</span>
          </div>
          <input
            type="range" min={55} max={72} value={ageDepart}
            onChange={(e) => setAgeDepart(Number(e.target.value))}
            className="w-full h-2 rounded-full accent-[#185FA5] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-300 mt-1">
            <span>55</span><span>60</span><span>62</span><span>64</span><span>67</span><span>72</span>
          </div>
        </div>
        <SimInput
          label="Trimestres cotisés"
          value={trimStr}
          onChange={setTrimStr}
          hint={`Taux plein = ${TRIMESTRES_TAUX_PLEIN} trimestres · Taux plein auto à ${AGE_TAUX_PLEIN_AUTO} ans`}
        />
      </div>

      {hasData && res ? (
        <div className="space-y-4">
          {/* Trimestres diff badge */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              res.trimDiff >= 0
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {res.trimDiff >= 0
                ? `+${res.trimDiff} trimestre${res.trimDiff !== 1 ? 's' : ''} excédentaires`
                : `${res.trimDiff} trimestre${res.trimDiff !== -1 ? 's' : ''} manquants`}
            </span>
            {res.decotePct > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600">
                Décote −{res.decotePct.toFixed(2).replace('.', ',')} %
              </span>
            )}
            {res.surcotePct > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                Surcote +{res.surcotePct.toFixed(2).replace('.', ',')} %
              </span>
            )}
            {res.decotePct === 0 && res.surcotePct === 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E6F1FB] text-[#185FA5]">
                Taux plein ✓
              </span>
            )}
          </div>

          {/* 3 metric cards */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="Pension estimée"
              value={`${fmtE(res.pension)}/mois`}
              sub={`${fmtE(res.pension * 12)}/an`}
              accent={res.surcotePct > 0 || res.decotePct === 0}
            />
            <MetricCard
              label="Taux appliqué"
              value={`${(50 * (1 - res.decotePct / 100) * (1 + res.surcotePct / 100)).toFixed(2).replace('.', ',')} %`}
              sub={`Taux plein = 50 %`}
            />
            {resPlus2 && (
              <MetricCard
                label="+2 ans de cotisation"
                value={`${fmtE(resPlus2.pension)}/mois`}
                sub={`Gain : +${fmtE(resPlus2.pension - res.pension)}/mois`}
                accent={resPlus2.pension > res.pension}
              />
            )}
          </div>

          {/* Comparaison départ maintenant vs +2 ans */}
          {resPlus2 && resPlus2.pension > res.pension && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[12px] text-gray-700 flex gap-3">
              <span className="text-[18px] flex-shrink-0">💡</span>
              <span>
                Attendre 2 ans vous apporterait{' '}
                <strong>+{fmtE(resPlus2.pension - res.pension)}/mois</strong> de pension
                {' '}(+{fmtE((resPlus2.pension - res.pension) * 12)}/an).
                {res.decotePct > 0 && ` En partant à ${ageDepart} ans, vous subissez une décote de ${res.decotePct.toFixed(2).replace('.', ',')} %.`}
              </span>
            </div>
          )}

          {/* LineChart */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Pension estimée selon l'âge de départ
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${Math.round(v / 100) * 100}`} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${fmtE(v)}/mois`,
                    name === 'pension' ? 'Pension nette' : 'Taux plein',
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
                />
                <ReferenceLine
                  x={ageDepart}
                  stroke="#185FA5"
                  strokeDasharray="4 3"
                  label={{ value: 'Départ', position: 'top', fontSize: 10, fill: '#185FA5' }}
                />
                <Line
                  type="monotone" dataKey="plein" stroke="#e5e7eb"
                  strokeWidth={1.5} dot={false} strokeDasharray="4 3"
                />
                <Line
                  type="monotone" dataKey="pension" stroke="#185FA5"
                  strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-1">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="inline-block w-5 h-0.5 bg-[#185FA5] rounded" />Pension projetée
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="inline-block w-5 h-0.5 bg-gray-200 rounded" />Taux plein (50 %)
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
          <p className="text-[13px] text-gray-400">
            Renseignez le nombre de trimestres cotisés pour voir les résultats.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Simulateur IFI ───────────────────────────────────────────────────────────

const IFI_TRANCHES = [
  { min: 800_000,    max: 1_300_000,  rate: 0 },
  { min: 1_300_000,  max: 2_570_000,  rate: 0.005 },
  { min: 2_570_000,  max: 5_000_000,  rate: 0.01 },
  { min: 5_000_000,  max: 10_000_000, rate: 0.0125 },
  { min: 10_000_000, max: Infinity,   rate: 0.015 },
]

function calcIFI(assiette: number): number {
  if (assiette < 1_300_000) return 0
  let tax = 0
  let prev = 0
  for (const t of IFI_TRANCHES) {
    if (assiette <= t.min) break
    tax += (Math.min(assiette, t.max) - Math.max(t.min, prev)) * t.rate
    prev = t.max
  }
  // Décote : 17 500 − 1.25% × assiette, applicable entre 1.3M et 1.4M
  if (assiette <= 1_400_000) {
    tax = Math.max(0, tax - Math.max(0, 17_500 - assiette * 0.0125))
  }
  return Math.round(tax)
}

function SimulateurIFI() {
  const bloc2 = loadLS<{ totalImmo?: number }>('patrisim_bloc2', {})
  const bloc3 = loadLS<{ creditsImmo?: { crd?: string }[] }>('patrisim_bloc3', {})

  const dettesBrutes = (bloc3.creditsImmo ?? []).reduce((s, c) => s + parseNum(c.crd), 0)

  const [brutStr, setBrutStr] = useState(
    bloc2.totalImmo ? String(Math.round(bloc2.totalImmo)) : ''
  )
  const [dettesStr, setDettesStr] = useState(
    dettesBrutes > 0 ? String(Math.round(dettesBrutes)) : ''
  )

  const brut = parseNum(brutStr)
  const dettes = parseNum(dettesStr)
  const assiette = Math.max(0, brut - dettes)
  const ifi = calcIFI(assiette)
  const tauxEffectif = assiette > 0 ? (ifi / assiette) * 100 : 0

  const nonAssujetti = brut > 0 && brut < 800_000
  const procheSeuil  = assiette >= 1_000_000 && assiette < 1_300_000
  const assujetti    = assiette >= 1_300_000

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <p className="text-[14px] font-bold text-gray-800">Simulateur IFI</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Barème 2026 · Seuil d'imposition : 1 300 000 € · Décote entre 1,3 M€ et 1,4 M€
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SimInput
          label="Patrimoine immobilier brut (€)"
          value={brutStr}
          onChange={setBrutStr}
          hint="Valeur vénale de tous vos biens"
        />
        <SimInput
          label="Dettes immobilières déductibles (€)"
          value={dettesStr}
          onChange={setDettesStr}
          hint="Capitaux restants dus sur crédits immo"
        />
      </div>

      {brut > 0 ? (
        nonAssujetti ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-3 items-start">
            <span className="text-[18px]">✅</span>
            <div>
              <p className="text-[13px] font-semibold text-emerald-700">Vous n'êtes pas assujetti à l'IFI</p>
              <p className="text-[12px] text-emerald-600 mt-0.5">
                Votre patrimoine immobilier brut ({fmtE(brut)}) est inférieur au seuil de 800 000 €.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {procheSeuil && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
                <span className="text-[17px]">⚠️</span>
                <p className="text-[12px] text-amber-700">
                  Votre assiette nette ({fmtE(assiette)}) approche le seuil IFI.
                  Il vous reste <strong>{fmtE(1_300_000 - assiette)}</strong> de marge.
                  Envisagez un démembrement ou l'augmentation des dettes déductibles.
                </p>
              </div>
            )}

            {!assujetti && brut >= 1_300_000 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 items-start">
                <span className="text-[17px]">✅</span>
                <p className="text-[12px] text-emerald-700">
                  Après déduction des dettes ({fmtE(dettes)}), votre assiette nette ({fmtE(assiette)})
                  passe sous le seuil. <strong>IFI dû : 0 €.</strong>
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Assiette IFI nette"
                value={fmtE(assiette)}
                sub={`${fmtE(brut)} − ${fmtE(dettes)}`}
              />
              <MetricCard
                label="IFI dû"
                value={fmtE(ifi)}
                sub={assujetti
                  ? IFI_TRANCHES.filter((t) => t.rate > 0 && assiette > t.min).slice(-1)[0]
                      ? `Tranche max ${(IFI_TRANCHES.filter((t) => t.rate > 0 && assiette > t.min).slice(-1)[0].rate * 100).toFixed(2).replace('.', ',')} %`
                      : undefined
                  : 'Sous le seuil'}
                accent={ifi === 0}
              />
              <MetricCard
                label="Taux effectif"
                value={ifi > 0 ? `${tauxEffectif.toFixed(3).replace('.', ',')} %` : '0 %'}
                sub={assiette <= 1_400_000 && ifi > 0 ? 'Décote appliquée' : undefined}
                accent={ifi === 0}
              />
            </div>

            {assujetti && (
              <div className="bg-[#F8F8F6] rounded-xl p-4 space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Détail par tranche
                </p>
                {IFI_TRANCHES.filter((t) => t.rate > 0 && assiette > t.min).map((t) => {
                  const base = Math.min(assiette, t.max) - t.min
                  return (
                    <div key={t.min} className="flex justify-between text-[12px]">
                      <span className="text-gray-500">
                        {fmtE(t.min)} – {t.max === Infinity ? '∞' : fmtE(t.max)}
                        {' '}· {(t.rate * 100).toFixed(2).replace('.', ',')} %
                      </span>
                      <span className="font-medium text-gray-700">{fmtE(Math.round(base * t.rate))}</span>
                    </div>
                  )
                })}
                {assiette <= 1_400_000 && (
                  <div className="flex justify-between text-[12px] text-emerald-600 border-t border-gray-200 pt-1.5 mt-1">
                    <span>Décote (17 500 € − 1,25 % × assiette)</span>
                    <span className="font-medium">−{fmtE(Math.round(Math.max(0, 17_500 - assiette * 0.0125)))}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
          <p className="text-[13px] text-gray-400">
            Renseignez votre patrimoine immobilier brut pour calculer l'IFI.
          </p>
        </div>
      )}
    </div>
  )
}
