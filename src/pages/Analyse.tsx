import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, Info, BarChart2, TrendingUp, PieChart, DollarSign, Users, Settings } from 'lucide-react'

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
  disclaimer: string
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

// ─── Compression des données ──────────────────────────────────────────────────

function buildCompressedData() {
  const mode = loadLS<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const p1 = loadLS<Record<string, unknown>>('patrisim_bloc1_p1', {})
  const p2 = loadLS<Record<string, unknown>>('patrisim_bloc1_p2', {})
  const foyer = loadLS<Record<string, unknown>>('patrisim_bloc1_foyer', {})
  const pro1 = loadLS<Record<string, unknown>>('patrisim_bloc1_pro1', {})
  const pro2 = loadLS<Record<string, unknown>>('patrisim_bloc1_pro2', {})
  const bloc2 = loadLS<Record<string, unknown>>('patrisim_bloc2', {})
  const bloc3 = loadLS<Record<string, unknown>>('patrisim_bloc3', {})
  const bloc4 = loadLS<Record<string, unknown>>('patrisim_bloc4', {})
  const bloc5 = loadLS<Record<string, unknown>>('patrisim_bloc5', {})
  const bloc6 = loadLS<Record<string, unknown>>('patrisim_bloc6', {})
  const bloc7 = loadLS<Record<string, unknown>>('patrisim_bloc7', {})
  const bloc0 = loadLS<{ objectifs?: string[]; niveauDetail?: string }>('patrisim_bloc0', {})

  // Calculs patrimoine
  const totalImmo = parseNum((bloc2 as Record<string,number>).totalImmo)
  const totalFin = parseNum((bloc2 as Record<string,number>).totalFinancier)
  const totalAutres = parseNum((bloc2 as Record<string,number>).totalAutres)
  const patrimoineBrut = totalImmo + totalFin + totalAutres

  const b3 = bloc3 as { creditsImmo?: {crd?: string; mensualiteHA?: string; mensualiteAssurance?: string}[]; creditsConso?: {crd?: string; mensualite?: string}[] }
  const totalDettes = (b3.creditsImmo || []).reduce((a, c) => a + parseNum(c.crd), 0) + (b3.creditsConso || []).reduce((a, c) => a + parseNum(c.crd), 0)
  const totalMensualites = (b3.creditsImmo || []).reduce((a, c) => a + parseNum(c.mensualiteHA) + parseNum(c.mensualiteAssurance), 0) + (b3.creditsConso || []).reduce((a, c) => a + parseNum(c.mensualite), 0)

  const b4 = bloc4 as { p1Pro?: {salaire?: string}; p2Pro?: {salaire?: string}; mensualitesCredits?: string; assurances?: string; abonnements?: string; loyerMensuel?: string; fiscal?: {tmi?: number; rfr?: string; impotNet?: string; prelevementsSociaux?: string} }
  const revP1 = parseNum(b4.p1Pro?.salaire)
  const revP2 = parseNum(b4.p2Pro?.salaire)
  const totalRev = revP1 + revP2
  const totalCharges = parseNum(b4.mensualitesCredits) + parseNum(b4.assurances) + parseNum(b4.abonnements) + parseNum(b4.loyerMensuel)
  const capacite = Math.max(0, totalRev - totalCharges)

  const b6 = bloc6 as { reponses?: Record<string,number>; objectifsOrder?: string[]; objectifsSelectionnes?: string[] }
  const scoreMifid = b6.reponses ? Object.values(b6.reponses).reduce((a, b) => a + b, 0) : 0
  const profil = scoreMifid <= 10 ? 'Défensif' : scoreMifid <= 14 ? 'Équilibré' : scoreMifid <= 17 ? 'Dynamique' : 'Offensif'

  const b5 = bloc5 as { retraiteP1?: {ageDepartSouhaite?: number; revenusCibles?: number}; projets?: {type?: string; montant?: string}[] }
  const b7 = bloc7 as { heritiers?: {lien?: string; prenom?: string}[]; testament?: {aTestament?: boolean} }

  // Âges
  const age1 = p1.dateNaissance ? Math.floor((Date.now() - new Date(String(p1.dateNaissance)).getTime()) / 31557600000) : 0
  const age2 = p2.dateNaissance ? Math.floor((Date.now() - new Date(String(p2.dateNaissance)).getTime()) / 31557600000) : 0

  // Objectif principal
  const objectifPrincipal = (bloc0.objectifs || [])[0] || (b6.objectifsOrder || [])[0] || 'bilan'

  return {
    // Contexte
    mode,
    objectif_principal: objectifPrincipal,
    parcours: bloc0.objectifs || [],

    // Profil civil résumé
    p1_age: age1,
    p1_statut_pro: pro1.statut,
    p2_age: mode === 'couple' ? age2 : null,
    p2_statut_pro: mode === 'couple' ? pro2.statut : null,
    statut_matrimonial: (foyer as Record<string,string>).statutMatrimonial,
    nb_enfants_charge: (foyer as Record<string,number>).enfantsCharge || 0,
    type_logement: (foyer as Record<string,string>).typeLogement,

    // Patrimoine résumé
    patrimoine_brut: patrimoineBrut,
    patrimoine_immobilier: totalImmo,
    patrimoine_financier: totalFin,
    patrimoine_autres: totalAutres,
    total_dettes: totalDettes,
    patrimoine_net: patrimoineBrut - totalDettes,
    taux_endettement_patrimoine: patrimoineBrut > 0 ? Math.round(totalDettes / patrimoineBrut * 100) : 0,

    // Flux résumé
    revenus_nets_mensuels: totalRev,
    charges_fixes_mensuelles: totalCharges,
    mensualites_credits: totalMensualites,
    capacite_epargne_mensuelle: capacite,
    taux_endettement_revenus: totalRev > 0 ? Math.round(totalMensualites / totalRev * 100) : 0,

    // Fiscalité résumé
    tmi: b4.fiscal?.tmi || 0,
    rfr: parseNum(b4.fiscal?.rfr),
    ir_net: parseNum(b4.fiscal?.impotNet),
    prelevements_sociaux: parseNum(b4.fiscal?.prelevementsSociaux),
    pression_fiscale_annuelle: parseNum(b4.fiscal?.impotNet) + parseNum(b4.fiscal?.prelevementsSociaux),

    // Retraite résumé
    age_depart_souhaite: b5.retraiteP1?.ageDepartSouhaite || 64,
    revenus_cibles_retraite: b5.retraiteP1?.revenusCibles || 0,
    annees_avant_retraite: Math.max(0, (b5.retraiteP1?.ageDepartSouhaite || 64) - age1),

    // Profil investisseur
    score_mifid: scoreMifid,
    profil_investisseur: profil,
    objectifs_declares: b6.objectifsSelectionnes || [],

    // Succession résumé
    nb_heritiers: (b7.heritiers || []).length,
    a_testament: b7.testament?.aTestament || false,
    patrimoine_transmissible: patrimoineBrut - totalDettes,

    // Projets
    nb_projets: (b5.projets || []).length,
    budget_projets: (b5.projets || []).reduce((a, p) => a + parseNum(p.montant), 0),
  }
}

// ─── Appel API ────────────────────────────────────────────────────────────────

async function callAPI(data: ReturnType<typeof buildCompressedData>): Promise<AIResult> {
  const parcours = data.objectif_principal
  const mode = data.mode === 'couple' ? 'vouvoiement' : 'tutoiement'

  const systemPrompt = `Tu es un conseiller en gestion de patrimoine (CGP) français expert et pédagogue.
Tu analyses un profil patrimonial simplifié et génères un bilan personnalisé concis.

RÈGLES :
- Utilise le ${mode}
- Montants en euros (€)
- Recommandations pédagogiques, pas des conseils formels MiFID II
- Réglementation fiscale française 2025
- Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown
- Sois concis et précis

OBJECTIF ANALYSÉ : ${parcours}

Structure JSON exacte à retourner :
{
  "score_global": number (0-100),
  "commentaire_global": string (1 phrase),
  "phrase_bilan": string (1 phrase résumant la situation),
  "points_forts": [string, string, string],
  "points_attention": [string, string, string],
  "opportunites": [string, string, string],
  "objectif_principal": string,
  "probabilite_succes": number (0-100),
  "situation_actuelle": string (2-3 phrases),
  "gap_analyse": string (2-3 phrases),
  "plan_action": [
    {"etape": 1, "action": string, "delai": string, "impact": string, "priorite": "haute"|"moyenne"|"faible"},
    {"etape": 2, "action": string, "delai": string, "impact": string, "priorite": "haute"|"moyenne"|"faible"},
    {"etape": 3, "action": string, "delai": string, "impact": string, "priorite": "haute"|"moyenne"|"faible"}
  ],
  "recommandations": [
    {"titre": string, "description": string, "urgence": "immediate"|"court_terme"|"moyen_terme", "gain_estime": number},
    {"titre": string, "description": string, "urgence": "immediate"|"court_terme"|"moyen_terme", "gain_estime": number},
    {"titre": string, "description": string, "urgence": "immediate"|"court_terme"|"moyen_terme", "gain_estime": number}
  ],
  "alertes": [
    {"niveau": "critique"|"attention"|"info", "message": string, "action": string}
  ],
  "disclaimer": "Analyse simplifiée basée sur des données partielles. Cette simulation ne constitue pas un conseil en investissement au sens MiFID II. Consultez un conseiller en gestion de patrimoine agréé pour une analyse complète et personnalisée."
}`

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Profil patrimonial à analyser :\n${JSON.stringify(data, null, 2)}`
      }]
    })
  })

  const json = await response.json()
  const text = json.content?.find((b: { type: string }) => b.type === 'text')?.text || ''
  if (!text) throw new Error('Réponse vide')

  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('JSON introuvable')

  return JSON.parse(text.substring(jsonStart, jsonEnd + 1)) as AIResult
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#0F6E56' : score >= 55 ? '#185FA5' : score >= 35 ? '#D97706' : '#DC2626'
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 128, height: 128 }}>
      <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={64} cy={64} r={r} fill="none" stroke="#F3F4F6" strokeWidth={10} />
        <circle cx={64} cy={64} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold" style={{ color, fontSize: 28 }}>{score}</span>
        <span className="text-[10px] text-gray-400">/100</span>
      </div>
    </div>
  )
}

const LOADING_MESSAGES = [
  'Analyse de votre profil civil…',
  'Évaluation de votre patrimoine…',
  'Calcul de votre capacité d\'épargne…',
  'Analyse fiscale…',
  'Simulation retraite…',
  'Génération des recommandations…',
  'Finalisation de votre bilan…',
]

const PARCOURS_LABELS: Record<string, string> = {
  retraite: 'Préparer ma retraite',
  bilan: 'Bilan patrimonial complet',
  fiscalite: 'Optimiser ma fiscalité',
  succession: 'Préparer ma succession',
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Analyse() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'loading' | 'result' | 'error'>('loading')
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AIResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const hasCalled = useRef(false)

  useEffect(() => {
    if (phase !== 'loading') return
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 1.5, 92))
      setLoadingMsg(m => Math.min(m + (Math.random() > 0.82 ? 1 : 0), LOADING_MESSAGES.length - 1))
    }, 300)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (hasCalled.current) return
    hasCalled.current = true

    const run = async () => {
      try {
        const cached = localStorage.getItem('patrisim_analyse')
        if (cached) {
          const { data, ts } = JSON.parse(cached)
          if (Date.now() - ts < 30 * 60 * 1000) {
            setResult(data); setProgress(100)
            setTimeout(() => setPhase('result'), 400)
            return
          }
        }
        const compressed = buildCompressedData()
        let res: AIResult
        try { res = await callAPI(compressed) }
        catch { await new Promise(r => setTimeout(r, 2000)); res = await callAPI(compressed) }
        localStorage.setItem('patrisim_analyse', JSON.stringify({ data: res, ts: Date.now() }))
        setResult(res); setProgress(100)
        setTimeout(() => setPhase('result'), 500)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Erreur inconnue')
        setPhase('error')
      }
    }
    run()
  }, [])

  // Loading
  if (phase === 'loading') return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col items-center justify-center px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <span className="text-[28px] font-bold text-gray-900">Patri<span className="text-[#185FA5]">Sim</span></span>
          <p className="text-[12px] text-gray-400 mt-1">Analyse patrimoniale intelligente</p>
        </div>
        <ScoreGauge score={Math.round(progress)} />
        <div className="space-y-2">
          <p className="text-[16px] font-semibold text-gray-800">{LOADING_MESSAGES[loadingMsg]}</p>
          <p className="text-[12px] text-gray-400">Analyse en cours · environ 15 secondes</p>
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

  // Error
  if (phase === 'error' || !result) return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-8">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-5">
        <AlertTriangle size={40} className="text-amber-500 mx-auto" />
        <h2 className="text-[18px] font-bold text-gray-900">Analyse temporairement indisponible</h2>
        <p className="text-[13px] text-gray-500">L'analyse IA est momentanément indisponible.</p>
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
  const scoreColor = r.score_global >= 75 ? 'text-[#0F6E56]' : r.score_global >= 55 ? 'text-[#185FA5]' : r.score_global >= 35 ? 'text-amber-600' : 'text-red-600'
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const urgenceBorder: Record<string, string> = { immediate: 'border-l-red-500', court_terme: 'border-l-amber-500', moyen_terme: 'border-l-[#185FA5]' }
  const urgenceLabel: Record<string, string> = { immediate: 'Immédiate', court_terme: 'Court terme', moyen_terme: 'Moyen terme' }
  const urgenceBadge: Record<string, string> = { immediate: 'bg-red-50 text-red-700', court_terme: 'bg-amber-50 text-amber-700', moyen_terme: 'bg-[#E6F1FB] text-[#0C447C]' }

  const dashModules = [
    { icon: <BarChart2 size={22} />, title: 'Bilan patrimonial', desc: 'Évolution, répartition, projections', path: '/dashboard/bilan' },
    { icon: <TrendingUp size={22} />, title: 'Simulation retraite', desc: 'Capital, revenus, scénarios', path: '/dashboard/retraite' },
    { icon: <PieChart size={22} />, title: 'Analyse portefeuille', desc: 'Allocation, risque, MiFID II', path: '/dashboard/portefeuille' },
    { icon: <DollarSign size={22} />, title: 'Optimisation fiscale', desc: 'TMI, enveloppes, économies', path: '/dashboard/fiscal' },
    { icon: <Users size={22} />, title: 'Succession simulée', desc: 'Droits, optimisation, transmission', path: '/dashboard/succession' },
    { icon: <Settings size={22} />, title: 'Hypothèses & scénarios', desc: 'Modifier les paramètres', path: '/dashboard/hypotheses' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-10 pb-16 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#0F6E56]" />
            <span className="text-[11px] text-[#0F6E56] font-semibold uppercase tracking-wider">
              {PARCOURS_LABELS[r.objectif_principal] || 'Analyse complète'}
            </span>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Votre bilan patrimonial</h1>
          <p className="text-[13px] text-gray-400 mt-1">Généré le {dateStr} à {timeStr}</p>
        </div>

        {/* Bannière version simplifiée */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-semibold text-amber-800">Version simplifiée — PatriSim v1</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Cette analyse est basée sur un résumé de votre profil. Pour une analyse complète et personnalisée, consultez un conseiller en gestion de patrimoine agréé (CGP).</p>
          </div>
        </div>

        {/* Score + phrase bilan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-8 mb-4">
            <ScoreGauge score={r.score_global} />
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Score patrimonial global</p>
              <p className={`text-[32px] font-bold ${scoreColor}`}>{r.score_global}<span className="text-[18px] text-gray-400 font-normal">/100</span></p>
              <p className="text-[13px] text-gray-600 mt-1 max-w-sm">{r.commentaire_global}</p>
            </div>
          </div>
          <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl px-5 py-3">
            <p className="text-[14px] text-[#0C447C] italic font-medium">"{r.phrase_bilan}"</p>
          </div>
        </div>

        {/* Synthèse 3 colonnes */}
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#185FA5] mb-2">Opportunités</p>
            {(r.opportunites || []).map((p, i) => (
              <div key={i} className="bg-white border border-[#185FA5]/20 rounded-xl px-4 py-3 flex gap-2">
                <Info size={14} className="text-[#185FA5] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-700">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Objectif principal */}
        <div className="bg-white rounded-2xl border-2 border-[#185FA5]/30 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Objectif analysé</p>
              <p className="text-[20px] font-bold text-gray-900">{r.objectif_principal}</p>
            </div>
            <div className="text-center">
              <div className={`text-[28px] font-bold ${r.probabilite_succes >= 70 ? 'text-[#0F6E56]' : r.probabilite_succes >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {r.probabilite_succes}%
              </div>
              <p className="text-[10px] text-gray-400">Probabilité</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Situation actuelle</p>
              <p className="text-[12px] text-gray-700">{r.situation_actuelle}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Analyse de l'écart</p>
              <p className="text-[12px] text-gray-700">{r.gap_analyse}</p>
            </div>
          </div>

          {/* Plan d'action */}
          <div>
            <p className="text-[13px] font-semibold text-gray-800 mb-3">Plan d'action en 3 étapes</p>
            <div className="space-y-2">
              {(r.plan_action || []).map(step => (
                <div key={step.etape} className="bg-gray-50 rounded-xl px-4 py-3 flex items-start gap-4">
                  <span className="w-6 h-6 rounded-full bg-[#185FA5] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{step.etape}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-800">{step.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{step.delai}</span>
                      <span className="text-[10px] bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">{step.impact}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${step.priorite === 'haute' ? 'bg-red-50 text-red-600' : step.priorite === 'moyenne' ? 'bg-amber-50 text-amber-700' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>
                        {step.priorite === 'haute' ? 'Haute' : step.priorite === 'moyenne' ? 'Moyenne' : 'Faible'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommandations */}
        <div>
          <p className="text-[16px] font-bold text-gray-900 mb-4">Recommandations personnalisées</p>
          <div className="space-y-3">
            {(r.recommandations || []).map((rec, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm p-5 ${urgenceBorder[rec.urgence] || 'border-l-gray-300'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${urgenceBadge[rec.urgence] || 'bg-gray-100 text-gray-600'}`}>
                    {urgenceLabel[rec.urgence] || rec.urgence}
                  </span>
                </div>
                <p className="text-[14px] font-semibold text-gray-900 mb-1">{rec.titre}</p>
                <p className="text-[12px] text-gray-600">{rec.description}</p>
                {rec.gain_estime > 0 && (
                  <p className="text-[12px] text-[#0F6E56] font-semibold mt-2">Gain estimé : +{fmt(rec.gain_estime)} €</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alertes */}
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

        {/* Dashboard */}
        <div>
          <p className="text-[16px] font-bold text-gray-900 mb-4">Accédez à vos analyses détaillées</p>
          <div className="grid grid-cols-2 gap-4">
            {dashModules.map((m, i) => (
              <button key={i} type="button" onClick={() => navigate(m.path)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-[#185FA5]/30 hover:shadow-md transition-all group">
                <div className="text-[#185FA5] group-hover:text-[#0C447C] transition-colors mb-3">{m.icon}</div>
                <p className="text-[14px] font-semibold text-gray-800 mb-0.5">{m.title}</p>
                <p className="text-[12px] text-gray-400">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-4">
          <button type="button" onClick={() => navigate('/start')}
            className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
            ← Modifier mon profil
          </button>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[11px] text-amber-700 leading-relaxed">
              <strong>PatriSim v1 — Simulation pédagogique.</strong> {r.disclaimer}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}