import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, Info, BarChart2, TrendingUp, PieChart, DollarSign, Users, Settings, Mail, GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIResult {
  score_global: number
  commentaire_global: string
  phrase_bilan: string
  points_forts: string[]
  points_attention: string[]
  opportunites: string[]
  objectif_principal: string
  probabilite_succes: number
  situation_actuelle: string
  gap_analyse: string
  plan_action: { etape: number; action: string; delai: string; impact: string; priorite: string }[]
  recommandations: { titre: string; description: string; urgence: string; gain_estime: number }[]
  alertes: { niveau: string; message: string; action: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch { return fallback }
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const parseNum = (s: unknown) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }

// ─── Calculs pré-IA ──────────────────────────────────────────────────────────

function computePreCalculations() {
  const bloc4 = loadLS<Record<string, unknown>>('patrisim_bloc4', {})
  const bloc2 = loadLS<Record<string, unknown>>('patrisim_bloc2', {})
  const bloc3 = loadLS<Record<string, unknown>>('patrisim_bloc3', {})
  const bloc5 = loadLS<Record<string, unknown>>('patrisim_bloc5', {})
  const bloc1p1 = loadLS<{ dateNaissance?: string }>('patrisim_bloc1_p1', {})

  const totalImmo = parseNum((bloc2 as Record<string,number>).totalImmo)
  const totalFin = parseNum((bloc2 as Record<string,number>).totalFinancier)
  const totalAutres = parseNum((bloc2 as Record<string,number>).totalAutres)
  const patrimoineBrut = totalImmo + totalFin + totalAutres

  const b3 = bloc3 as { creditsImmo?: {crd?: string}[]; creditsConso?: {crd?: string}[] }
  const totalDettes = (b3.creditsImmo || []).reduce((a, c) => a + parseNum(c.crd), 0) + (b3.creditsConso || []).reduce((a, c) => a + parseNum(c.crd), 0)
  const patrimoineNet = patrimoineBrut - totalDettes

  const b4 = bloc4 as { p1Pro?: {salaire?: string; remunNette?: string}; p2Pro?: {salaire?: string}; mensualitesCredits?: string; assurances?: string; abonnements?: string; loyerMensuel?: string; fiscal?: {tmi?: number; rfr?: string; impotNet?: string; prelevementsSociaux?: string} }
  const revP1 = parseNum(b4.p1Pro?.salaire || b4.p1Pro?.remunNette)
  const revP2 = parseNum(b4.p2Pro?.salaire)
  const totalRev = revP1 + revP2
  const totalCharges = parseNum(b4.mensualitesCredits) + parseNum(b4.assurances) + parseNum(b4.abonnements) + parseNum(b4.loyerMensuel)
  const capaciteEpargne = Math.max(0, totalRev - totalCharges)

  const tmi = (b4.fiscal as Record<string,number>)?.tmi || 0
  const ir = parseNum((b4.fiscal as Record<string,string>)?.impotNet)
  const ps = parseNum((b4.fiscal as Record<string,string>)?.prelevementsSociaux)
  const rfr = parseNum((b4.fiscal as Record<string,string>)?.rfr)
  const pressionFiscale = ir + ps
  const tauxMoyen = rfr > 0 ? Math.round(ir / rfr * 1000) / 10 : 0

  const b5 = bloc5 as { retraiteP1?: {ageDepartSouhaite?: number; revenusCibles?: number; pensionEstimee?: number} }
  const ageDepart = b5.retraiteP1?.ageDepartSouhaite || 64
  const age1 = bloc1p1.dateNaissance ? Math.floor((Date.now() - new Date(bloc1p1.dateNaissance).getTime()) / 31557600000) : 0
  const anneesAvantRetraite = Math.max(0, ageDepart - age1)
  const pensionEstimee = b5.retraiteP1?.pensionEstimee || Math.round(totalRev * 0.5)
  const revenusCibles = b5.retraiteP1?.revenusCibles || Math.round(totalRev * 0.75)
  const deficitMensuel = Math.max(0, revenusCibles - pensionEstimee)
  const capitalNecessaire = deficitMensuel > 0 ? Math.round(deficitMensuel * 12 / 0.04) : 0
  const rendementAnnuel = 0.04
  const capitalProjecte = anneesAvantRetraite > 0
    ? Math.round(patrimoineNet * Math.pow(1 + rendementAnnuel, anneesAvantRetraite) + capaciteEpargne * 12 * ((Math.pow(1 + rendementAnnuel, anneesAvantRetraite) - 1) / rendementAnnuel))
    : patrimoineNet

  const totalMensualites = parseNum(b4.mensualitesCredits)
  const tauxEndettement = totalRev > 0 ? Math.round(totalMensualites / totalRev * 100) : 0
  const plafondPer = totalRev > 0 ? Math.min(totalRev * 12 * 0.10, 35194) : 0
  const economiePer = Math.round(plafondPer * tmi / 100)

  return {
    patrimoineBrut, patrimoineNet, totalDettes,
    totalRev, totalCharges, capaciteEpargne,
    tmi, ir, pressionFiscale, tauxMoyen, rfr,
    ageDepart, anneesAvantRetraite, age1,
    pensionEstimee, revenusCibles, deficitMensuel, capitalNecessaire, capitalProjecte,
    tauxEndettement, totalMensualites,
    plafondPer, economiePer,
  }
}

// ─── Données compressées pour l'IA ───────────────────────────────────────────

function buildCompressedData(preCalc: ReturnType<typeof computePreCalculations>) {
  const mode = loadLS<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const pro1 = loadLS<Record<string, unknown>>('patrisim_bloc1_pro1', {})
  const foyer = loadLS<Record<string, unknown>>('patrisim_bloc1_foyer', {})
  const bloc6 = loadLS<Record<string, unknown>>('patrisim_bloc6', {})
  const bloc7 = loadLS<Record<string, unknown>>('patrisim_bloc7', {})
  const bloc0 = loadLS<{ objectif?: string }>('patrisim_bloc0', {})

  const b6 = bloc6 as { reponses?: Record<string,number> }
  const scoreMifid = b6.reponses ? Object.values(b6.reponses).reduce((a, b) => a + b, 0) : 0
  const profil = scoreMifid <= 10 ? 'Défensif' : scoreMifid <= 14 ? 'Équilibré' : scoreMifid <= 17 ? 'Dynamique' : 'Offensif'
  const b7 = bloc7 as { heritiers?: unknown[]; testament?: { aTestament?: boolean } }

  return {
    objectif: bloc0.objectif || 'bilan',
    mode,
    age: preCalc.age1,
    statut_pro: pro1.statut,
    statut_matrimonial: (foyer as Record<string,string>).statutMatrimonial,
    nb_enfants: (foyer as Record<string,number>).enfantsCharge || 0,
    patrimoine_net: preCalc.patrimoineNet,
    revenus_mensuels: preCalc.totalRev,
    capacite_epargne: preCalc.capaciteEpargne,
    taux_endettement: preCalc.tauxEndettement,
    tmi: preCalc.tmi,
    taux_moyen: preCalc.tauxMoyen,
    pression_fiscale_annuelle: preCalc.pressionFiscale,
    annees_avant_retraite: preCalc.anneesAvantRetraite,
    deficit_mensuel_retraite: preCalc.deficitMensuel,
    capital_necessaire_retraite: preCalc.capitalNecessaire,
    capital_projete: preCalc.capitalProjecte,
    nb_heritiers: (b7.heritiers || []).length,
    a_testament: b7.testament?.aTestament || false,
    patrimoine_transmissible: preCalc.patrimoineNet,
    profil_investisseur: profil,
    plafond_per_disponible: preCalc.plafondPer,
    economie_per_potentielle: preCalc.economiePer,
  }
}

// ─── Appel API ───────────────────────────────────────────────────────────────

async function callAPI(data: ReturnType<typeof buildCompressedData>): Promise<AIResult> {
  const tmi = data.tmi
  const mode = data.mode === 'couple' ? 'vouvoiement' : 'tutoiement'

  const systemPrompt = `Tu es un conseiller en gestion de patrimoine français, pédagogue et bienveillant.
Toutes les métriques financières sont DÉJÀ CALCULÉES dans le profil fourni.
Ta mission : écrire une synthèse humaine et des recommandations concrètes.

RÈGLES ABSOLUES :
- ${mode}
- Zéro jargon : pas de "MiFID II", "AGIRC-ARRCO", "surcotisations", "arbitrage", "allocation d'actifs"
- Pas de tirets "—" dans le texte
- Phrases simples et concrètes, accessibles à un non-spécialiste
- Objectif analysé : ${data.objectif}
- JSON uniquement, sans markdown ni texte autour

Retourne exactement ce JSON :
{
  "score_global": number (0-100),
  "commentaire_global": string (1 phrase simple),
  "phrase_bilan": string (1 phrase humaine et directe),
  "points_forts": [3 courtes phrases positives],
  "points_attention": [3 courtes phrases de vigilance],
  "opportunites": [3 actions concrètes et simples],
  "objectif_principal": string (reformulation simple de l'objectif),
  "probabilite_succes": number (0-100),
  "situation_actuelle": string (2 phrases simples),
  "gap_analyse": string (2 phrases sur ce qui manque),
  "plan_action": [
    {"etape": 1, "action": string, "delai": string, "impact": string, "priorite": "haute"|"moyenne"|"faible"},
    {"etape": 2, "action": string, "delai": string, "impact": string, "priorite": "haute"|"moyenne"|"faible"},
    {"etape": 3, "action": string, "delai": string, "impact": string, "priorite": "haute"|"moyenne"|"faible"}
  ],
  "recommandations": [
    {"titre": string, "description": string (2 phrases max, simples), "urgence": "immediate"|"court_terme"|"moyen_terme", "gain_estime": number},
    {"titre": string, "description": string, "urgence": "immediate"|"court_terme"|"moyen_terme", "gain_estime": number},
    {"titre": string, "description": string, "urgence": "immediate"|"court_terme"|"moyen_terme", "gain_estime": number}
  ],
  "alertes": [
    {"niveau": "critique"|"attention"|"info", "message": string (1 phrase), "action": string (1 phrase)}
  ]
}`

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Profil :\n${JSON.stringify(data)}` }]
    })
  })

  const json = await response.json()
  const text = json.content?.find((b: { type: string }) => b.type === 'text')?.text || ''
  if (!text) throw new Error('Réponse vide')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('JSON introuvable')
  // Nettoyage : supprimer les caractères de contrôle invisibles (sauf \n \r \t valides en JSON)
  const cleaned = text.substring(start, end + 1).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  try {
    return JSON.parse(cleaned) as AIResult
  } catch (e) {
    console.error('[PatriSim] Erreur parsing JSON IA:', e)
    console.error('[PatriSim] Texte brut reçu:', text)
    return {} as AIResult
  }
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#0F6E56' : score >= 55 ? '#185FA5' : score >= 35 ? '#D97706' : '#DC2626'
  const r = 52
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ * 0.75
  const offset = circ * 0.125
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="flex-shrink-0">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={-offset} strokeLinecap="round" transform="rotate(0 65 65)" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-offset} strokeLinecap="round" transform="rotate(0 65 65)" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="65" y="60" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="22" fontWeight="bold">{score}</text>
      <text x="65" y="78" textAnchor="middle" dominantBaseline="middle" fill="#9CA3AF" fontSize="11">/100</text>
    </svg>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'blue' | 'green' | 'amber' | 'red' }) {
  const styles = {
    blue: 'bg-[#E6F1FB] border-[#185FA5]/20',
    green: 'bg-[#E1F5EE] border-[#0F6E56]/20',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
  }
  const textStyles = { blue: 'text-[#0C447C]', green: 'text-[#085041]', amber: 'text-amber-800', red: 'text-red-700' }
  return (
    <div className={`rounded-2xl border p-4 ${styles[color]}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[20px] font-bold ${textStyles[color]}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Lecture de votre profil...',
  'Calcul du patrimoine et des dettes...',
  'Analyse des revenus et charges...',
  'Simulation de la retraite...',
  'Génération des recommandations...',
  'Finalisation du bilan...',
]

const PARCOURS_LABELS: Record<string, string> = {
  retraite: 'Parcours retraite',
  bilan: 'Bilan complet',
  fiscalite: 'Parcours fiscalité',
  succession: 'Parcours succession',
}

const urgenceBorder: Record<string, string> = { immediate: 'border-l-red-500', court_terme: 'border-l-amber-500', moyen_terme: 'border-l-[#185FA5]' }
const urgenceLabel: Record<string, string> = { immediate: 'À faire maintenant', court_terme: 'Dans les 6 mois', moyen_terme: 'À moyen terme' }
const urgenceBadge: Record<string, string> = { immediate: 'bg-red-50 text-red-700', court_terme: 'bg-amber-50 text-amber-700', moyen_terme: 'bg-[#E6F1FB] text-[#0C447C]' }

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Analyse() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'loading' | 'result' | 'error'>('loading')
  const [result, setResult] = useState<AIResult | null>(null)
  const [preCalc, setPreCalc] = useState<ReturnType<typeof computePreCalculations> | null>(null)
  const [progress, setProgress] = useState(0)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const hasCalled = useRef(false)

  useEffect(() => {
    if (hasCalled.current) return
    hasCalled.current = true

    const ticker = setInterval(() => {
      setProgress(p => Math.min(p + 2, 95))
      setLoadingMsg(m => Math.min(m + 1, LOADING_MESSAGES.length - 1))
    }, 1200)

    const run = async () => {
      try {
        const calc = computePreCalculations()
        setPreCalc(calc)

        // Cache 30 min
        const cached = localStorage.getItem('patrisim_analyse')
        if (cached) {
          const { data, ts } = JSON.parse(cached)
          if (Date.now() - ts < 30 * 60 * 1000) {
            clearInterval(ticker)
            setResult(data); setProgress(100)
            setTimeout(() => setPhase('result'), 400)
            return
          }
        }

        // Cache démo
        const bloc0 = JSON.parse(localStorage.getItem('patrisim_bloc0') || '{}')
        if (bloc0._demoProfileId) {
          const demoCache = localStorage.getItem(`patrisim_analyse_demo_${bloc0._demoProfileId}`)
          if (demoCache) {
            const { data } = JSON.parse(demoCache)
            clearInterval(ticker)
            setResult(data); setProgress(100)
            setTimeout(() => setPhase('result'), 400)
            return
          }
        }

        const compressed = buildCompressedData(calc)
        let res: AIResult
        try { res = await callAPI(compressed) }
        catch { await new Promise(r => setTimeout(r, 2000)); res = await callAPI(compressed) }

        const analyseData = JSON.stringify({ data: res, ts: Date.now() })
        localStorage.setItem('patrisim_analyse', analyseData)
        if (bloc0._demoProfileId) {
          localStorage.setItem(`patrisim_analyse_demo_${bloc0._demoProfileId}`, analyseData)
        }

        clearInterval(ticker)
        setResult(res); setProgress(100)
        setTimeout(() => setPhase('result'), 500)
      } catch (e) {
        clearInterval(ticker)
        setErrorMsg(e instanceof Error ? e.message : 'Erreur inconnue')
        setPhase('error')
      }
    }
    run()
    return () => clearInterval(ticker)
  }, [])

  if (phase === 'loading') return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col items-center justify-center px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <span className="text-[28px] font-bold text-gray-900">Patri<span className="text-[#185FA5]">Sim</span></span>
          <p className="text-[12px] text-gray-400 mt-1">Analyse en cours</p>
        </div>
        <ScoreGauge score={Math.round(progress)} />
        <div className="space-y-2">
          <p className="text-[16px] font-semibold text-gray-800">{LOADING_MESSAGES[loadingMsg]}</p>
          <p className="text-[12px] text-gray-400">Environ 15 secondes</p>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#185FA5] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-1.5">
          {LOADING_MESSAGES.map((msg, i) => (
            <div key={i} className={`flex items-center gap-2 text-[12px] ${i <= loadingMsg ? 'text-gray-700' : 'text-gray-300'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${i < loadingMsg ? 'bg-[#0F6E56]' : i === loadingMsg ? 'bg-[#185FA5] animate-pulse' : 'bg-gray-200'}`}>
                {i < loadingMsg && <CheckCircle size={10} className="text-white" />}
              </div>
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (phase === 'error' || !result || !preCalc) return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-8">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-5">
        <AlertTriangle size={40} className="text-amber-500 mx-auto" />
        <h2 className="text-[18px] font-bold text-gray-900">Analyse temporairement indisponible</h2>
        <p className="text-[13px] text-gray-500">Vérifiez votre connexion et réessayez.</p>
        {errorMsg && <p className="text-[11px] text-red-400 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => { hasCalled.current = false; setPhase('loading'); setProgress(0); setLoadingMsg(0) }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50">
            Réessayer
          </button>
          <button type="button" onClick={() => navigate('/bloc1')}
            className="flex-1 py-3 rounded-xl bg-[#185FA5] text-white text-[13px] font-semibold hover:bg-[#0C447C]">
            Retour au profil
          </button>
        </div>
      </div>
    </div>
  )

  const r = result
  const c = preCalc
  const scoreColor = r.score_global >= 75 ? 'text-[#0F6E56]' : r.score_global >= 55 ? 'text-[#185FA5]' : r.score_global >= 35 ? 'text-amber-600' : 'text-red-600'
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const dashModules = [
    { icon: <BarChart2 size={22} />, title: 'Bilan patrimonial', desc: 'Actifs, dettes, projection', path: '/dashboard/bilan' },
    { icon: <TrendingUp size={22} />, title: 'Simulation retraite', desc: 'Capital, revenus, scénarios', path: '/dashboard/retraite' },
    { icon: <PieChart size={22} />, title: 'Analyse portefeuille', desc: 'Allocation, risque, cohérence', path: '/dashboard/portefeuille' },
    { icon: <DollarSign size={22} />, title: 'Optimisation fiscale', desc: 'Impôts, enveloppes, économies', path: '/dashboard/fiscal' },
    { icon: <Users size={22} />, title: 'Succession simulée', desc: 'Droits, optimisation, transmission', path: '/dashboard/succession' },
    { icon: <Settings size={22} />, title: 'Hypothèses', desc: 'Modifier les paramètres', path: '/dashboard/hypotheses' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-10 pb-16 space-y-6">

        {/* ── Bloc Armand — EN HAUT, bien visible ── */}
        <div className="bg-white rounded-2xl border border-[#185FA5]/20 shadow-sm p-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E6F1FB] flex items-center justify-center flex-shrink-0">
                <GraduationCap size={20} className="text-[#185FA5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-gray-900">Armand Billard</p>
                  <span className="text-[10px] bg-[#E6F1FB] text-[#0C447C] px-2 py-0.5 rounded-full font-semibold">Créateur de PatriSim</span>
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5">Étudiant en Master Gestion de Patrimoine</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  PatriSim est un outil pédagogique pour comprendre sa situation patrimoniale. Pour toute question ou retour, écrivez-moi.
                </p>
              </div>
            </div>
            <a href="mailto:a.billard.cgp@gmail.com"
              className="flex items-center gap-2 bg-[#185FA5] text-white px-4 py-2.5 rounded-xl text-[12px] font-semibold hover:bg-[#0C447C] transition-all whitespace-nowrap flex-shrink-0">
              <Mail size={14} />
              Me contacter
            </a>
          </div>
        </div>

        {/* ── Header analyse ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#0F6E56]" />
              <span className="text-[11px] text-[#0F6E56] font-semibold uppercase tracking-wider">
                {PARCOURS_LABELS[r.objectif_principal] || 'Analyse complète'}
              </span>
            </div>
            <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Votre bilan patrimonial</h1>
            <p className="text-[12px] text-gray-400 mt-1">Généré le {dateStr}</p>
          </div>
        </div>

        {/* ── Disclaimer pédagogique ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-[12px] text-amber-800 leading-relaxed">
            <strong>Outil pédagogique :</strong> PatriSim vous permet de mieux comprendre votre situation patrimoniale et vos perspectives d'évolution.
            Les analyses sont des estimations basées sur vos informations et ne remplacent pas un accompagnement personnalisé avec un conseiller en gestion de patrimoine.
          </p>
        </div>

        {/* ── Métriques clés ── */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Patrimoine net"
            value={`${fmt(c.patrimoineNet)} €`}
            sub={c.totalDettes > 0 ? `Dettes : ${fmt(c.totalDettes)} €` : 'Sans dettes'}
            color={c.patrimoineNet >= 0 ? 'blue' : 'red'}
          />
          <MetricCard
            label="Capacité d'épargne"
            value={`${fmt(c.capaciteEpargne)} €/mois`}
            sub={`Revenus : ${fmt(c.totalRev)} €/mois`}
            color={c.capaciteEpargne > 500 ? 'green' : c.capaciteEpargne > 0 ? 'amber' : 'red'}
          />
          <MetricCard
            label="Taux d'endettement"
            value={`${c.tauxEndettement}%`}
            sub={c.tauxEndettement < 33 ? 'Niveau sain' : c.tauxEndettement < 40 ? 'Limite acceptable' : 'Trop élevé'}
            color={c.tauxEndettement < 33 ? 'green' : c.tauxEndettement < 40 ? 'amber' : 'red'}
          />
        </div>

        {/* ── Métriques fiscales ── */}
        {c.tmi > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="Tranche d'imposition"
              value={`${c.tmi}%`}
              sub={`Taux réel moyen : ${c.tauxMoyen}%`}
              color="blue"
            />
            <MetricCard
              label="Impôts annuels"
              value={`${fmt(c.pressionFiscale)} €`}
              sub={`Soit ${fmt(Math.round(c.pressionFiscale / 12))} € par mois`}
              color="amber"
            />
            {c.economiePer > 0 && (
              <MetricCard
                label="Économie possible sur impôts"
                value={`${fmt(c.economiePer)} €/an`}
                sub={`Via un plan d'épargne retraite`}
                color="green"
              />
            )}
          </div>
        )}

        {/* ── Retraite ── */}
        {c.anneesAvantRetraite > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[13px] font-semibold text-gray-800 mb-4">Simulation retraite</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Départ dans</p>
                <p className="text-[22px] font-bold text-[#185FA5]">{c.anneesAvantRetraite} ans</p>
                <p className="text-[11px] text-gray-400">à {c.ageDepart} ans</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Déficit mensuel estimé</p>
                <p className={`text-[22px] font-bold ${c.deficitMensuel > 0 ? 'text-amber-600' : 'text-[#0F6E56]'}`}>
                  {c.deficitMensuel > 0 ? `${fmt(c.deficitMensuel)} €/mois` : 'Objectif atteint'}
                </p>
              </div>
            </div>
            {c.capitalNecessaire > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-[12px] text-amber-800">
                  Pour combler ce déficit, vous aurez besoin de <strong>{fmt(c.capitalNecessaire)} €</strong> à la retraite.
                  Avec votre épargne actuelle, votre capital projeté est de <strong>{fmt(c.capitalProjecte)} €</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Score + phrase bilan ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-8 mb-4">
            <ScoreGauge score={r.score_global} />
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Score global</p>
              <p className={`text-[32px] font-bold ${scoreColor}`}>{r.score_global}<span className="text-[18px] text-gray-400 font-normal">/100</span></p>
              <p className="text-[13px] text-gray-600 mt-1 max-w-sm">{r.commentaire_global}</p>
            </div>
          </div>
          <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl px-5 py-3">
            <p className="text-[14px] text-[#0C447C] italic font-medium">"{r.phrase_bilan}"</p>
          </div>
        </div>

        {/* ── Synthèse 3 colonnes ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F6E56] mb-2">Points forts</p>
            {(r.points_forts || []).map((p, i) => (
              <div key={i} className="bg-white border border-[#0F6E56]/20 rounded-xl px-4 py-3 flex gap-2">
                <CheckCircle size={14} className="text-[#0F6E56] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-700">{p}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-2">Points d'attention</p>
            {(r.points_attention || []).map((p, i) => (
              <div key={i} className="bg-white border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-700">{p}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#185FA5] mb-2">Ce que vous pouvez faire</p>
            {(r.opportunites || []).map((p, i) => (
              <div key={i} className="bg-white border border-[#185FA5]/20 rounded-xl px-4 py-3 flex gap-2">
                <Info size={14} className="text-[#185FA5] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-700">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Objectif + plan d'action ── */}
        <div className="bg-white rounded-2xl border-2 border-[#185FA5]/30 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Votre objectif</p>
              <p className="text-[18px] font-bold text-gray-900">{r.objectif_principal}</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl px-4 py-2">
              <div className={`text-[26px] font-bold ${r.probabilite_succes >= 70 ? 'text-[#0F6E56]' : r.probabilite_succes >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {r.probabilite_succes}%
              </div>
              <p className="text-[10px] text-gray-400">de réussite</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>Progression vers l'objectif</span>
              <span>{r.probabilite_succes}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${r.probabilite_succes >= 70 ? 'bg-[#0F6E56]' : r.probabilite_succes >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${r.probabilite_succes}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Où vous en êtes</p>
              <p className="text-[12px] text-gray-700">{r.situation_actuelle}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Ce qu'il vous manque</p>
              <p className="text-[12px] text-gray-700">{r.gap_analyse}</p>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-gray-800 mb-3">Votre plan d'action</p>
            <div className="space-y-2">
              {(r.plan_action || []).map(step => (
                <div key={step.etape} className="bg-gray-50 rounded-xl px-4 py-3 flex items-start gap-4">
                  <span className="w-6 h-6 rounded-full bg-[#185FA5] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{step.etape}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-800">{step.action}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{step.delai}</span>
                      <span className="text-[10px] bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">{step.impact}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${step.priorite === 'haute' ? 'bg-red-50 text-red-600' : step.priorite === 'moyenne' ? 'bg-amber-50 text-amber-700' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>
                        {step.priorite === 'haute' ? 'Priorité haute' : step.priorite === 'moyenne' ? 'Priorité moyenne' : 'Priorité faible'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recommandations ── */}
        <div>
          <p className="text-[16px] font-bold text-gray-900 mb-4">Recommandations</p>
          <div className="space-y-3">
            {(r.recommandations || []).map((rec, i) => (
              <motion.div key={i}
                whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                transition={{ duration: 0.2 }}
                className={`bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm p-5 ${urgenceBorder[rec.urgence] || 'border-l-gray-300'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${urgenceBadge[rec.urgence] || 'bg-gray-100 text-gray-600'}`}>
                    {urgenceLabel[rec.urgence] || rec.urgence}
                  </span>
                </div>
                <p className="text-[14px] font-semibold text-gray-900 mb-1">{rec.titre}</p>
                <p className="text-[12px] text-gray-600 leading-relaxed">{rec.description}</p>
                {rec.gain_estime > 0 && (
                  <p className="text-[12px] text-[#0F6E56] font-semibold mt-2">Gain potentiel : {fmt(rec.gain_estime)} € par an</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Alertes ── */}
        {(r.alertes || []).length > 0 && (
          <div>
            <p className="text-[16px] font-bold text-gray-900 mb-4">Points de vigilance</p>
            <div className="space-y-3">
              {r.alertes.map((al, i) => (
                <div key={i} className={`rounded-2xl border px-5 py-4 flex gap-3 ${al.niveau === 'critique' ? 'bg-red-50 border-red-200' : al.niveau === 'attention' ? 'bg-amber-50 border-amber-200' : 'bg-[#E6F1FB] border-[#185FA5]/20'}`}>
                  {al.niveau === 'critique' ? <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" /> : al.niveau === 'attention' ? <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" /> : <Info size={16} className="text-[#185FA5] flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-[13px] text-gray-800 font-medium">{al.message}</p>
                    <p className="text-[12px] text-gray-500 mt-1">{al.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Modules dashboard ── */}
        <div>
          <p className="text-[16px] font-bold text-gray-900 mb-4">Analyses détaillées</p>
          <div className="grid grid-cols-2 gap-4">
            {dashModules.map((m, i) => (
              <motion.button key={i} type="button" onClick={() => navigate(m.path)}
                whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left">
                <div className="text-[#185FA5] mb-3">{m.icon}</div>
                <p className="text-[14px] font-semibold text-gray-800 mb-0.5">{m.title}</p>
                <p className="text-[12px] text-gray-400">{m.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="space-y-3">
          <button type="button" onClick={() => navigate('/start')}
            className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
            Modifier mon profil
          </button>
          <p className="text-[11px] text-gray-400 text-center leading-relaxed px-4">
            PatriSim est un outil de simulation pédagogique. Les résultats sont des estimations et ne constituent pas un conseil en investissement.
            Consultez un conseiller en gestion de patrimoine pour toute décision financière importante.
          </p>
        </div>

      </div>
    </div>
  )
}