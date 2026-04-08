import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, Info, BarChart2, TrendingUp, PieChart, DollarSign, Users, Settings, Mail, GraduationCap, WifiOff } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import FadeIn from '../components/FadeIn'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

const sectionVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const sectionItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}
const recVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: (i: number) => ({ opacity: 1, x: 0, transition: { duration: 0.35, delay: i * 0.08, ease: 'easeOut' } }),
}

function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    startRef.current = null
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    const id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [target, duration])
  return value
}

function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const steps = 40
    const increment = target / steps
    const intervalMs = duration / steps
    let current = 0
    const id = setInterval(() => {
      current += increment
      if (current >= target) { setValue(Math.round(target)); clearInterval(id); return }
      setValue(Math.round(current))
    }, intervalMs)
    return () => clearInterval(id)
  }, [target, duration])
  return value
}

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

  // Liquidités = livrets + comptes courants (depuis bloc2)
  const b2 = bloc2 as { livrets?: {solde?: string}[]; comptesCourants?: {solde?: string}[] }
  const totalLiquidites = [
    ...(b2.livrets || []).map(l => parseNum(l.solde)),
    ...(b2.comptesCourants || []).map(c => parseNum(c.solde)),
  ].reduce((a, v) => a + v, 0)

  // Pourcentages allocation (arrondis, somme forcée à 100%)
  const _totalBrut = patrimoineBrut || 1
  const _pctImmoRaw = totalImmo / _totalBrut * 100
  const _pctLiqRaw = Math.min(totalLiquidites / _totalBrut * 100, totalFin / _totalBrut * 100)
  const _pctFinRaw = totalFin / _totalBrut * 100 - _pctLiqRaw
  const _pctAutresRaw = totalAutres / _totalBrut * 100
  const _sum = _pctImmoRaw + _pctFinRaw + _pctLiqRaw + _pctAutresRaw
  const _k = _sum > 0 ? 100 / _sum : 1
  const pctImmo = Math.round(_pctImmoRaw * _k)
  const pctFinancier = Math.round(_pctFinRaw * _k)
  const pctLiquidites = Math.round(_pctLiqRaw * _k)
  const pctAutres = 100 - pctImmo - pctFinancier - pctLiquidites

  const b3 = bloc3 as { creditsImmo?: {crd?: string}[]; creditsConso?: {crd?: string}[] }
  const totalDettes = (b3.creditsImmo || []).reduce((a, c) => a + parseNum(c.crd), 0) + (b3.creditsConso || []).reduce((a, c) => a + parseNum(c.crd), 0)
  const patrimoineNet = patrimoineBrut - totalDettes

  const b4 = bloc4 as { p1Pro?: {salaire?: string; remunNette?: string}; p2Pro?: {salaire?: string}; revenusFonciersB?: string; revenusFinanciers?: string; aPension?: boolean; pensionMontant?: string; mensualitesCredits?: string; assurances?: string; abonnements?: string; loyerMensuel?: string; fiscal?: {tmi?: number; rfr?: string; impotNet?: string; prelevementsSociaux?: string}; depenses?: {montant?: string; pct?: string; mode?: string}[] }
  const revP1 = parseNum(b4.p1Pro?.salaire || b4.p1Pro?.remunNette)
  const revP2 = parseNum(b4.p2Pro?.salaire)
  const revenusPatrimoniaux = parseNum(b4.revenusFonciersB) / 12 + parseNum(b4.revenusFinanciers) / 12
  const totalRev = revP1 + revP2 + revenusPatrimoniaux
  // Utilise le tableau depenses (somme de toutes les catégories) si disponible,
  // sinon fallback sur les 4 champs séparés (anciens profils sans depenses)
  const depensesList = b4.depenses || []
  const depensesTotal = depensesList.reduce((sum, d) => {
    if (d.montant && parseNum(d.montant) > 0) return sum + parseNum(d.montant)
    if (d.mode === 'pct' && d.pct) return sum + Math.round(totalRev * parseFloat(d.pct) / 100)
    return sum
  }, 0)
  const pensionAlimentaire = b4.aPension ? parseNum(b4.pensionMontant) : 0
  const totalCharges = (depensesTotal > 0
    ? depensesTotal
    : parseNum(b4.mensualitesCredits) + parseNum(b4.assurances) + parseNum(b4.abonnements) + parseNum(b4.loyerMensuel)
  ) + pensionAlimentaire
  const capaciteEpargne = Math.max(0, totalRev - totalCharges)
  console.log('Capacité épargne:', capaciteEpargne, '| Revenus:', totalRev, '| Charges:', totalCharges)

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

  // ── PER vs AV ──────────────────────────────────────────────────────────────
  const b1mode = loadLS<{ v?: string }>('patrisim_bloc1_mode', {})
  const isCouplePVA = b1mode.v === 'couple'

  const b2assets = bloc2 as { pers?: {valeur?: string}[]; avs?: {valeurRachat?: string}[] }
  const capitalPERActuel = (b2assets.pers || []).reduce((a, p) => a + parseNum(p.valeur), 0)
  const capitalAVActuel  = (b2assets.avs || []).reduce((a, v) => a + parseNum(v.valeurRachat), 0)

  // TMI à la retraite calculée depuis la pension estimée (barème 2025, abattement 10%)
  const calcTMIRetraite = (pensionAnn: number): number => {
    const ri = pensionAnn * 0.9
    if (ri <= 11294) return 0; if (ri <= 28797) return 11
    if (ri <= 82341) return 30; if (ri <= 177106) return 41; return 45
  }
  const tmiRetraite = calcTMIRetraite(pensionEstimee * 12)

  // Hypothèse : 30% de la capacité d'épargne versée chaque mois
  const versHypoMensuel = Math.round(capaciteEpargne * 0.3)
  const versHypoAnnuel  = versHypoMensuel * 12
  const r04m  = 0.04 / 12
  const nMois = anneesAvantRetraite * 12
  const factCap    = nMois > 0 ? (Math.pow(1 + r04m, nMois) - 1) / r04m : 0
  const factActuel = Math.pow(1.04, anneesAvantRetraite)

  // PER
  const capitalPERFinal   = Math.round(capitalPERActuel * factActuel + versHypoMensuel * factCap)
  const totalVersePER     = versHypoAnnuel * anneesAvantRetraite
  const gainsPER          = Math.max(0, capitalPERFinal - totalVersePER - capitalPERActuel)
  const economieFiscPER   = Math.round(totalVersePER * tmi / 100)
  const impotSortiePER    = Math.round(totalVersePER * tmiRetraite / 100) + Math.round(gainsPER * 0.30)
  const netPER            = Math.max(0, capitalPERFinal - impotSortiePER)

  // AV
  const capitalAVFinal    = Math.round(capitalAVActuel * factActuel + versHypoMensuel * factCap)
  const totalVerseAV      = versHypoAnnuel * anneesAvantRetraite
  const gainsAV           = Math.max(0, capitalAVFinal - capitalAVActuel - totalVerseAV)
  const abattAV           = isCouplePVA ? 9200 : 4600
  const baseImpAV         = Math.max(0, gainsAV - abattAV)
  const impotSortieAV     = anneesAvantRetraite >= 8
    ? Math.round(baseImpAV * (0.075 + 0.172))
    : Math.round(gainsAV * 0.30)
  const netAV             = Math.max(0, capitalAVFinal - impotSortieAV)

  const perVsAvRecommande: 'per' | 'av' | 'equilibre' =
    tmi >= 30 && tmiRetraite < tmi ? 'per' : tmi < 30 ? 'av' : 'equilibre'

  return {
    patrimoineBrut, patrimoineNet, totalDettes,
    totalRev, totalCharges, capaciteEpargne,
    tmi, ir, pressionFiscale, tauxMoyen, rfr,
    ageDepart, anneesAvantRetraite, age1,
    pensionEstimee, revenusCibles, deficitMensuel, capitalNecessaire, capitalProjecte,
    tauxEndettement, totalMensualites,
    plafondPer, economiePer,
    totalImmo, totalFin, totalAutres, totalLiquidites,
    pctImmo, pctFinancier, pctLiquidites, pctAutres,
    capitalPERActuel, capitalAVActuel, tmiRetraite, versHypoMensuel,
    capitalPERFinal, economieFiscPER, impotSortiePER, netPER,
    capitalAVFinal, impotSortieAV, netAV,
    perVsAvRecommande, isCouplePVA,
  }
}

// ─── Données compressées pour l'IA ───────────────────────────────────────────

function buildCompressedData(preCalc: ReturnType<typeof computePreCalculations>) {
  const mode = loadLS<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const p1 = loadLS<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const pro1 = loadLS<Record<string, unknown>>('patrisim_bloc1_pro1', {})
  const foyer = loadLS<Record<string, unknown>>('patrisim_bloc1_foyer', {})
  const bloc6 = loadLS<Record<string, unknown>>('patrisim_bloc6', {})
  const bloc7 = loadLS<Record<string, unknown>>('patrisim_bloc7', {})
  const bloc0 = loadLS<{ objectif?: string }>('patrisim_bloc0', {})

  const b6 = bloc6 as { reponses?: Record<string,number> }
  const scoreMifid = b6.reponses ? Object.values(b6.reponses).reduce((a, b) => a + b, 0) : 0
  const profil = scoreMifid <= 10 ? 'Défensif' : scoreMifid <= 14 ? 'Équilibré' : scoreMifid <= 17 ? 'Dynamique' : 'Offensif'
  const b7 = bloc7 as { heritiers?: unknown[]; testament?: { aTestament?: boolean } }

  // Crédits avec durée restante pour règle "fin de crédit"
  const bloc3data = loadLS<{
    creditsImmo?: { mensualiteTotale?: string; dureeRestante?: string; dureeRestanteUnite?: string }[]
    creditsConso?: { mensualite?: string }[]
  }>('patrisim_bloc3', {})
  const creditsFinProches = (bloc3data.creditsImmo || [])
    .map(c => {
      const duree = parseFloat(c.dureeRestante || '99')
      const annees = c.dureeRestanteUnite === 'Mois' ? duree / 12 : duree
      return { mensualite: parseFloat(c.mensualiteTotale || '0'), anneesRestantes: Math.round(annees * 10) / 10 }
    })
    .filter(c => c.anneesRestantes < 5 && c.mensualite > 0)

  // AV existante — durée depuis ouverture approximée via capital (non disponible → on passe l'info brute)
  const bloc2AV = loadLS<{ avs?: { valeurRachat?: string; dateOuverture?: string }[] }>('patrisim_bloc2', {})
  const avsAvecAge = (bloc2AV.avs || []).map(av => {
    const anneeOuverture = av.dateOuverture ? new Date(av.dateOuverture).getFullYear() : null
    const ageAV = anneeOuverture ? new Date().getFullYear() - anneeOuverture : null
    return { valeurRachat: parseFloat(av.valeurRachat || '0'), ageAV }
  }).filter(av => av.valeurRachat > 0)

  return {
    objectif: bloc0.objectif || 'bilan',
    mode,
    prenom_p1: p1.prenom?.trim() || null,
    age: preCalc.age1,
    statut_pro: pro1.statut,
    statut_matrimonial: (foyer as Record<string,string>).statutMatrimonial,
    nb_enfants: (foyer as Record<string,number>).enfantsCharge || 0,
    patrimoine_brut: preCalc.patrimoineBrut,
    patrimoine_net: preCalc.patrimoineNet,
    total_dettes: preCalc.totalDettes,
    revenus_mensuels: preCalc.totalRev,
    capacite_epargne_mensuelle: preCalc.capaciteEpargne,
    taux_endettement: preCalc.tauxEndettement,
    tmi: preCalc.tmi,
    taux_moyen: preCalc.tauxMoyen,
    pression_fiscale_annuelle: preCalc.pressionFiscale,
    age_depart_retraite: preCalc.ageDepart,
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
    credits_fin_proches: creditsFinProches,
    assurances_vie: avsAvecAge,
    tmi_retraite_estimee: preCalc.tmiRetraite,
    simulation_per_capital_net: preCalc.netPER,
    simulation_av_capital_net: preCalc.netAV,
    per_vs_av_recommande: preCalc.perVsAvRecommande,
    ratio_couverture_retraite: preCalc.capitalNecessaire > 0
      ? Math.round(preCalc.capitalProjecte / preCalc.capitalNecessaire * 100) / 100
      : null,
  }
}

// ─── Parsing robuste ─────────────────────────────────────────────────────────

function safeParseAI(raw: string) {
  try {
    // Tentative 1 : JSON direct
    return JSON.parse(raw)
  } catch {
    try {
      // Tentative 2 : extraire entre { et }
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
    } catch {
      try {
        // Tentative 3 : nettoyer les caractères invisibles
        const cleaned = raw
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
        const match2 = cleaned.match(/\{[\s\S]*\}/)
        if (match2) return JSON.parse(match2[0])
      } catch {
        console.error('Impossible de parser la réponse IA:', raw)
        return null
      }
    }
  }
  return null
}

// ─── Appel API ───────────────────────────────────────────────────────────────

async function callAPI(data: ReturnType<typeof buildCompressedData>): Promise<AIResult> {
  const tmi = data.tmi
  const mode = data.mode === 'couple' ? 'vouvoiement' : 'tutoiement'

  const systemPrompt = `DONNÉES FIGÉES — NE PAS RECALCULER :
La capacité d'épargne mensuelle est exactement ${data.capacite_epargne_mensuelle} €. N'utilise JAMAIS une autre valeur.
Les capitaux PER/AV nets sont : PER = ${data.simulation_per_capital_net} €, AV = ${data.simulation_av_capital_net} €.
Couverture retraite : ratio = ${data.ratio_couverture_retraite ?? 'non calculable'}.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après
- Pas de backticks, pas de markdown, pas de commentaires
- Tous les montants en euros sont des nombres entiers (pas de décimales)
- Maximum 3 recommandations, triées par urgence décroissante (immediat en premier)
- Chaque recommandation doit avoir : titre (max 8 mots), description (max 30 mots), urgence, gain_estime (nombre entier)
- urgence = UNIQUEMENT "immediat", "court_terme" ou "moyen_terme" — toute autre valeur est invalide
- points_forts : exactement 3 éléments, max 10 mots chacun
- points_attention : exactement 2 éléments, max 10 mots chacun
- Zéro jargon financier : pas de MiFID, AGIRC-ARRCO, flat tax
- ${mode === 'vouvoiement' ? 'Vouvoyer' : 'Tutoyer'} l'utilisateur

Tu es un conseiller en gestion de patrimoine français, pédagogue et bienveillant.
Toutes les métriques financières sont DÉJÀ CALCULÉES dans le profil fourni.
Ta mission : écrire une synthèse humaine et des recommandations concrètes.

══════════════════════════════════════════════
RÈGLES DE COHÉRENCE OBLIGATOIRES
══════════════════════════════════════════════

1. CAPACITÉ D'ÉPARGNE — RÈGLE ABSOLUE :
   Utilise UNIQUEMENT la valeur capacite_epargne_mensuelle fournie en tête de ce prompt.
   Ne jamais la recalculer ni mentionner une autre valeur.

2. SYSTÈME DE PRIORISATION — TIMELINE UNIQUE :
   urgence 'immediat'    = à faire dans les 30 jours
     → ouverture de compte, premier versement, prise de RDV notaire
   urgence 'court_terme' = dans les 3 à 12 mois
     → ajustement stratégie épargne, restructuration placements
   urgence 'moyen_terme' = au-delà de 1 an
     → projets immobiliers, succession, rééquilibrage long terme
   Tri obligatoire : immediat d'abord, moyen_terme en dernier.
   INTERDIT d'utiliser : haute / moyenne / faible / immediate.

3. COUVERTURE RETRAITE ET PER :
   SI ratio_couverture_retraite >= 1.0 (ou capital_necessaire_retraite = 0) :
   → L'objectif retraite est ATTEINT.
   → Message obligatoire : "Votre objectif retraite est atteint. Le PER peut optimiser fiscalement mais n'est pas indispensable."
   → PER = moyen_terme uniquement. Jamais en immediat ni court_terme.
   → Focus : transmission, optimisation fiscale, qualité de vie.
   SI ratio_couverture_retraite entre 0.7 et 0.99 :
   → Message : "Votre retraite nécessite un effort d'épargne régulier."
   → Préciser le gap en € et en €/mois.
   → PER = court_terme maximum.
   SI ratio_couverture_retraite < 0.7 :
   → Alerte justifiée avec solutions concrètes et chiffrées.
   → PER = immediat autorisé si TMI >= 30%.

4. PER vs ASSURANCE-VIE — RÈGLE ABSOLUE :
   SI simulation_av_capital_net > simulation_per_capital_net :
   → AV recommandée en priorité.
   → PER = moyen_terme uniquement, en complément résiduel.
   → Phrase obligatoire dans la description AV : "Dans votre situation, l'assurance-vie ressort plus avantageuse que le PER en capital net après impôt (${data.simulation_av_capital_net} € vs ${data.simulation_per_capital_net} €)."
   SI simulation_per_capital_net > simulation_av_capital_net ET écart_tmi >= 10 ET ratio_couverture < 1.0 :
   → PER recommandé en immediat ou court_terme.
   → Mentionner l'économie nette réelle (économie entrée − impôt sortie).

   Ecart TMI = tmi - tmi_retraite_estimee :
   CAS 1 (ecart >= 10) → PER en immediat si versement > 200 €/mois ET couverture < 1.0, sinon court_terme.
   CAS 2 (ecart 5-9)  → PER en court_terme maximum, AV en priorité.
   CAS 3 (ecart < 5)  → PER en moyen_terme maximum, AV obligatoire.
   CAS 4 (tmi < 30%)  → PER en moyen_terme uniquement. AV et PEA en priorité.

5. GAINS ESTIMÉS :
   - Pour PER et AV : gain_estime = économie fiscale annuelle (versements_annuels × tmi / 100)
   - Pour PEA : gain_estime = plus-value_latente × 0.30 (gain TOTAL à la sortie, pas annuel). Préciser : "avantage fiscal estimé à la sortie". INTERDIT d'écrire "économie de X€/an sur PEA".
   - Pour succession : gain_estime = droits évités TOTAUX (pas divisés par une durée). Préciser : "économie fiscale totale estimée (dépend de la date et de la valeur des actifs)".
   - Si non calculable précisément : mettre 0, ne jamais inventer un chiffre.

6. CONVERSION CAPITAL EN REVENU :
   Chaque fois qu'un capital > 50 000 € est mentionné, ajouter la conversion :
   revenu_mensuel = capital × 0.03 / 12
   Format : "[capital] €, soit environ [revenu_mensuel] €/mois (hypothèse prudente 3%/an, non garantie)".
   S'applique à : capital retraite projeté, PER à la sortie, AV à la sortie.

7. TAUX DE REMPLACEMENT RETRAITE :
   - Pension connue → utiliser cette valeur exacte.
   - Pension inconnue → 62% des revenus actuels (moyenne française 2026), le préciser.

8. RACHAT DE TRIMESTRES :
   Ne jamais donner un coût en %. Utiliser uniquement :
   "Le coût d'un trimestre est généralement compris entre 3 000 € et 7 000 €, selon l'âge et l'option. Consultez votre caisse de retraite pour un chiffre précis."

9. CONCENTRATION D'ACTIFS :
   Si patrimoine > 70% sur une classe d'actifs → signaler dans points_attention. Ne pas recommander d'allocation précise (conseil réglementé).

10. COHÉRENCE INTERNE :
    - Un même concept ne peut avoir deux valeurs différentes.
    - points_forts et points_attention ne doivent pas se contredire.
    - Si score_global > 70 → une seule recommandation 'immediat' maximum.

══════════════════════════════════════════════
RÈGLES SUPPLÉMENTAIRES
══════════════════════════════════════════════

1. PROFIL INVESTISSEUR :
   Chaque recommandation DOIT être cohérente avec profil_investisseur :
   - Défensif → fonds euros, livrets, obligations. Pas d'actions individuelles ni crypto.
   - Équilibré → mix fonds euros + UC (50/50), PEA avec ETF diversifiés.
   - Dynamique → UC majoritaires, PEA, ETF, exposition actions jusqu'à 80%.
   - Offensif → actions, ETF sectoriels, PEA actif, peut mentionner private equity.

2. FISCALITÉ SORTIE PER :
   Quand PER recommandé, préciser dans la description :
   - Économie fiscale à l'entrée (versement × TMI actuelle)
   - Impôt sortie en capital (versements × TMI retraite + gains × 30%)
   - Gain net réel = économie entrée − impôt sortie
   - Si tmi_retraite >= tmi OU AV > PER en net → déconseiller le PER.

3. DÉTECTION FIN DE CRÉDIT :
   Si credits_fin_proches contient des crédits (anneesRestantes < 5) :
   - Recommandation : "Réallocation de vos mensualités de crédit" (immediat)
   - Arbitrage selon profil : Défensif → 70% AV + 30% PER ; Équilibré → 40% PER + 40% AV UC + 20% PEA ; Dynamique → 30% PER + 40% PEA + 30% AV UC ; Offensif → 20% PER + 60% PEA + 20% AV.
   - gain_estime = mensualité × 12 × rendement_profil (3% défensif, 5% équilibré, 7% dynamique, 9% offensif)

4. ASSURANCE-VIE — stratégie complète :
   Si assurances_vie présentes, proposer UNE action concrète :
   - ageAV < 8 ans → "Continuez les versements pour atteindre l'avantage fiscal à 8 ans"
   - ageAV >= 8 ans et TMI >= 30% → "Rachat partiel avantageux : abattement ${data.mode === 'couple' ? '9 200' : '4 600'} € sur les gains"
   - ageAV >= 8 ans et profil Dynamique/Offensif → "Arbitrage vers UC selon votre profil"

5. TON PÉDAGOGIQUE OBLIGATOIRE :
   Mots INTERDITS : "priorité absolue", "vous devez", "il faut impérativement", "risque majeur" (sauf vrai risque financier).
   Remplacements : "priorité absolue" → "levier recommandé" ; "vous devez" → "nous recommandons" ; "il faut" → "il serait pertinent de".
   Ton : bienveillant, pédagogique, suggéré, non alarmiste sauf si nécessaire.

6. PROJECTIONS LONG TERME :
   Pour toute projection > 5 ans : indiquer l'hypothèse de rendement et ajouter "(hypothèse de rendement, non garantie)".

INFLATION : les projections sont en euros courants. L'inflation (2%/an) n'est pas intégrée. Rappelle que 100 000 € dans 20 ans ≈ 67 000 € en pouvoir d'achat aujourd'hui.

RÈGLES DE STYLE :
- Zéro jargon : pas de "MiFID II", "AGIRC-ARRCO", "surcotisations"
- Pas de tirets "—" dans le texte
- Phrases simples, accessibles à un non-spécialiste
- Objectif analysé : ${data.objectif}
- JSON uniquement, sans markdown ni texte autour

══════════════════════════════════════════════
VÉRIFICATION AVANT ENVOI
══════════════════════════════════════════════
1. Si ratio_couverture >= 1.0 → aucune recommandation retraite en immediat.
2. Si AV > PER en net → AV recommandée en priorité.
3. Chaque capital > 50 000 € est traduit en €/mois (formule 3%/an).
4. Aucun montant succession n'est exprimé en "/an".
5. Aucun gain PEA n'est exprimé en "/an".
6. Le système d'urgence est uniquement : immediat / court_terme / moyen_terme.
7. Aucun mot interdit n'est présent dans la réponse.
8. Les recommandations sont triées : immediat d'abord, moyen_terme en dernier.
9. gain_estime cohérent avec capacite_epargne_mensuelle × 12.

Retourne exactement ce JSON :
{
  "score_global": number (0-100),
  "commentaire_global": string (1 phrase simple),
  "phrase_bilan": string (1 phrase humaine et directe),
  "points_forts": [3 courtes phrases positives],
  "points_attention": [2 courtes phrases de vigilance],
  "opportunites": [3 actions concrètes et simples],
  "objectif_principal": string (reformulation simple de l'objectif),
  "probabilite_succes": number (0-100),
  "situation_actuelle": string (2 phrases simples),
  "gap_analyse": string (2 phrases sur ce qui manque),
  "recommandations": [
    {"titre": string, "description": string (2 phrases max), "urgence": "immediat"|"court_terme"|"moyen_terme", "gain_estime": number},
    {"titre": string, "description": string, "urgence": "immediat"|"court_terme"|"moyen_terme", "gain_estime": number},
    {"titre": string, "description": string, "urgence": "immediat"|"court_terme"|"moyen_terme", "gain_estime": number}
  ],
  "alertes": [
    {"niveau": "critique"|"attention"|"info", "message": string (1 phrase), "action": string (1 phrase)}
  ]
}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)

  let response: Response
  try {
    response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Profil :\n${JSON.stringify(data)}` }]
      })
    })
  } finally {
    clearTimeout(timeout)
  }

  const json = await response!.json()
  const text = json.content?.find((b: { type: string }) => b.type === 'text')?.text || ''
  if (!text) throw new Error('Réponse vide — le modèle n\'a rien renvoyé.')
  const parsed = safeParseAI(text)
  if (!parsed) throw new Error('Format de réponse invalide — impossible d\'interpréter la réponse du modèle.')
  return parsed as AIResult
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
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border p-4 ${styles[color]}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[20px] font-bold ${textStyles[color]}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </motion.div>
  )
}

// ─── ErrorState ──────────────────────────────────────────────────────────────

function ErrorState({ errorMsg, onRetry, onMetrics }: {
  errorMsg: string
  onRetry: () => void
  onMetrics: (() => void) | null
}) {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-8">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <WifiOff size={28} className="text-red-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-[18px] font-bold text-gray-900">Analyse temporairement indisponible</h2>
          <p className="text-[13px] text-gray-500">Vérifiez votre connexion et réessayez.</p>
        </div>
        {errorMsg && (
          <p className="text-[11px] text-red-400 bg-red-50 rounded-lg px-3 py-2 text-left leading-relaxed">
            {errorMsg}
          </p>
        )}
        <div className="flex flex-col gap-2.5 pt-1">
          <button type="button" onClick={onRetry}
            className="w-full py-3 rounded-xl bg-[#185FA5] text-white text-[13px] font-semibold hover:bg-[#0C447C] transition-colors">
            Réessayer
          </button>
          {onMetrics && (
            <button type="button" onClick={onMetrics}
              className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
              Voir les données sans IA
            </button>
          )}
        </div>
      </div>
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

const urgenceBorder: Record<string, string> = { immediat: 'border-l-red-500', court_terme: 'border-l-amber-500', moyen_terme: 'border-l-[#185FA5]' }
const urgenceLabel: Record<string, string> = { immediat: 'À faire maintenant', court_terme: 'Dans l\'année', moyen_terme: 'Long terme' }
const urgenceBadge: Record<string, string> = { immediat: 'bg-red-50 text-red-700', court_terme: 'bg-amber-50 text-amber-700', moyen_terme: 'bg-[#E6F1FB] text-[#0C447C]' }

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Analyse() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'loading' | 'result' | 'error' | 'metrics'>('loading')
  const [result, setResult] = useState<AIResult | null>(null)
  const [preCalc, setPreCalc] = useState<ReturnType<typeof computePreCalculations> | null>(null)
  const [progress, setProgress] = useState(0)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const hasCalled = useRef(false)

  const animPatrimoineNet = useCounter(preCalc?.patrimoineNet ?? 0)
  const animCapaciteEpargne = useCounter(preCalc?.capaciteEpargne ?? 0)

  // Score ajusté : si des recommandations immédiates existent, le score ne peut pas être trop élevé
  const nbImmediats = (result?.recommandations || []).filter(rec => rec.urgence === 'immediat').length
  const scoreEffectif = result
    ? Math.min(result.score_global, nbImmediats >= 3 ? 65 : nbImmediats >= 2 ? 72 : nbImmediats >= 1 ? 80 : 100)
    : 0
  const animScoreGlobal = useCounter(scoreEffectif)

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
          // Cache expiré : le supprimer avant de relancer l'analyse
          localStorage.removeItem('patrisim_analyse')
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
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 border-[3px] border-[#185FA5] border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-2">
          <p className="text-[15px] font-semibold text-gray-800">Analyse en cours...</p>
          <p className="text-[13px] text-gray-400">Cela prend 15 à 30 secondes</p>
        </div>
      </div>
    </div>
  )

  const handleRetry = () => { hasCalled.current = false; setPhase('loading'); setProgress(0); setLoadingMsg(0) }

  if (phase === 'error') return (
    <ErrorState
      errorMsg={errorMsg}
      onRetry={handleRetry}
      onMetrics={preCalc ? () => setPhase('metrics') : null}
    />
  )

  if (phase === 'metrics' && preCalc) {
    const c = preCalc
    return (
      <div className="min-h-screen bg-[#F8F8F6]">
        <div className="max-w-4xl mx-auto px-8 py-10 pb-16 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 leading-relaxed">
              <strong>Analyse IA indisponible.</strong> Voici uniquement vos métriques calculées localement.
              Les recommandations personnalisées ne sont pas disponibles.
            </p>
          </div>

          <div>
            <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Vos métriques patrimoniales</h1>
            <p className="text-[13px] text-gray-400 mt-1">Calculées depuis vos données — sans analyse IA</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Patrimoine net" value={`${fmt(c.patrimoineNet)} €`}
              sub={c.totalDettes > 0 ? `Dettes : ${fmt(c.totalDettes)} €` : 'Sans dettes'}
              color={c.patrimoineNet >= 0 ? 'blue' : 'red'} />
            <MetricCard label="Capacité d'épargne" value={`${fmt(c.capaciteEpargne)} €/mois`}
              sub={`Revenus : ${fmt(c.totalRev)} €/mois`}
              color={c.capaciteEpargne > 500 ? 'green' : c.capaciteEpargne > 0 ? 'amber' : 'red'} />
            <MetricCard label="Taux d'endettement" value={`${c.tauxEndettement}%`}
              sub={c.tauxEndettement < 33 ? 'Niveau sain' : c.tauxEndettement < 40 ? 'Limite acceptable' : 'Trop élevé'}
              color={c.tauxEndettement < 33 ? 'green' : c.tauxEndettement < 40 ? 'amber' : 'red'} />
          </div>

          {c.tmi > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Tranche d'imposition" value={`${c.tmi}%`}
                sub={`Taux réel moyen : ${c.tauxMoyen}%`} color="blue" />
              <MetricCard label="Impôts annuels" value={`${fmt(c.pressionFiscale)} €`}
                sub={`Soit ${fmt(Math.round(c.pressionFiscale / 12))} €/mois`} color="amber" />
              {c.economiePer > 0 && (
                <MetricCard label="Économie possible (PER)" value={`${fmt(c.economiePer)} €/an`}
                  sub="Via versements déductibles" color="green" />
              )}
            </div>
          )}

          {c.anneesAvantRetraite > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[13px] font-semibold text-gray-800">Simulation retraite</p>
              <div className="grid grid-cols-2 gap-4">
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
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            <button type="button" onClick={handleRetry}
              className="w-full py-3 rounded-xl bg-[#185FA5] text-white text-[13px] font-semibold hover:bg-[#0C447C] transition-colors">
              Réessayer l'analyse IA
            </button>
            <button type="button" onClick={() => navigate('/start')}
              className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!result || !preCalc) return (
    <ErrorState errorMsg={errorMsg} onRetry={handleRetry} onMetrics={null} />
  )

  const r = result
  const c = preCalc
  const scoreColor = scoreEffectif >= 75 ? 'text-[#0F6E56]' : scoreEffectif >= 55 ? 'text-[#185FA5]' : scoreEffectif >= 35 ? 'text-amber-600' : 'text-red-600'
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const couvertureRetraite = c.revenusCibles > 0
    ? Math.min(100, Math.round(c.pensionEstimee / c.revenusCibles * 100))
    : null

  const diagnosticMsg = scoreEffectif > 70
    ? 'Votre situation patrimoniale est solide. Quelques optimisations peuvent améliorer votre rendement.'
    : scoreEffectif >= 50
    ? 'Votre situation est correcte mais plusieurs leviers d\'amélioration sont identifiés.'
    : 'Des ajustements importants sont recommandés pour sécuriser votre patrimoine.'

  const diagnosticColor = scoreEffectif > 70
    ? 'bg-[#E1F5EE] border-[#0F6E56]/20 text-[#085041]'
    : scoreEffectif >= 50
    ? 'bg-[#E6F1FB] border-[#185FA5]/20 text-[#0C447C]'
    : 'bg-amber-50 border-amber-200 text-amber-800'

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
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto px-8 py-10 pb-24 space-y-6"
      >

        {/* ── Bloc Armand ── */}
        <motion.div variants={sectionItem} className="bg-white rounded-2xl border border-[#185FA5]/20 shadow-sm p-5">
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
        </motion.div>

        {/* ── Header ── */}
        <motion.div variants={sectionItem} className="flex items-start justify-between">
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
        </motion.div>

        {/* ════════════════════════════════════════════════
            NIVEAU 1 — DIAGNOSTIC RAPIDE
        ════════════════════════════════════════════════ */}
        <motion.div variants={sectionItem} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Votre situation en un coup d'oeil</p>

          {/* Score + métriques côte à côte */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center flex-shrink-0">
              <ScoreGauge score={animScoreGlobal} />
              <p className={`text-[11px] font-semibold mt-1 ${scoreColor}`}>{animScoreGlobal}/100</p>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              <MetricCard
                label="Patrimoine net"
                value={`${fmt(animPatrimoineNet)} €`}
                sub={c.totalDettes > 0 ? `Dettes : ${fmt(c.totalDettes)} €` : 'Sans dettes'}
                color={c.patrimoineNet >= 0 ? 'blue' : 'red'}
              />
              <MetricCard
                label="Capacité d'épargne"
                value={`${fmt(animCapaciteEpargne)} €/mois`}
                sub={`${fmt(c.totalRev)} revenus − ${fmt(c.totalCharges)} charges`}
                color={c.capaciteEpargne > 500 ? 'green' : c.capaciteEpargne > 0 ? 'amber' : 'red'}
              />
              {c.tmi > 0 && (
                <MetricCard
                  label="Tranche d'imposition"
                  value={`TMI ${c.tmi}%`}
                  sub={`Taux réel moyen : ${c.tauxMoyen}%`}
                  color="blue"
                />
              )}
              {couvertureRetraite !== null && c.anneesAvantRetraite > 0 ? (
                <MetricCard
                  label="Couverture retraite"
                  value={`${couvertureRetraite}%`}
                  sub={`de l'objectif de ${fmt(c.revenusCibles)} €/mois`}
                  color={couvertureRetraite >= 80 ? 'green' : couvertureRetraite >= 50 ? 'amber' : 'red'}
                />
              ) : c.tmi === 0 ? (
                <MetricCard
                  label="Taux d'endettement"
                  value={`${c.tauxEndettement}%`}
                  sub={c.tauxEndettement < 33 ? 'Niveau sain' : c.tauxEndettement < 40 ? 'Limite acceptable' : 'Trop élevé'}
                  color={c.tauxEndettement < 33 ? 'green' : c.tauxEndettement < 40 ? 'amber' : 'red'}
                />
              ) : null}
            </div>
          </div>

          {/* Phrase bilan IA */}
          <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl px-5 py-3">
            <p className="text-[13px] text-[#0C447C] italic font-medium">"{r.phrase_bilan}"</p>
          </div>

          {/* Message de diagnostic */}
          <div className={`rounded-xl border px-4 py-3 text-[13px] font-medium ${diagnosticColor}`}>
            {diagnosticMsg}
          </div>
        </motion.div>

        {/* Disclaimer compact */}
        <motion.div variants={sectionItem} className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <strong>Outil pédagogique</strong> — projections non garanties (hypothèse 4 %/an, inflation 2 %/an). Ne remplace pas le conseil d'un CGP, notaire ou expert-comptable agréé.
          </p>
        </motion.div>

        {/* ════════════════════════════════════════════════
            NIVEAU 2 — 3 ACTIONS PRIORITAIRES
        ════════════════════════════════════════════════ */}
        <motion.div variants={sectionItem}>
          <p className="text-[18px] font-bold text-gray-900 mb-4">Vos 3 actions prioritaires</p>
          <div className="space-y-3">
            {(r.recommandations || []).map((rec, i) => (
              <motion.div key={i}
                custom={i}
                variants={recVariants}
                initial="hidden"
                animate="show"
                whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                transition={{ duration: 0.2 }}
                className={`bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm p-5 ${urgenceBorder[rec.urgence] || 'border-l-gray-300'}`}>
                <div className="flex items-start gap-4">
                  <span className="w-7 h-7 rounded-full bg-[#185FA5] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${urgenceBadge[rec.urgence] || 'bg-gray-100 text-gray-600'}`}>
                        {urgenceLabel[rec.urgence] || rec.urgence}
                      </span>
                    </div>
                    <p className="text-[14px] font-semibold text-gray-900 mb-1">{rec.titre}</p>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{rec.description}</p>
                  </div>
                  {rec.gain_estime > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-[15px] font-bold text-[#0F6E56]">{fmt(rec.gain_estime)} €/an</p>
                      <p className="text-[10px] text-gray-400">économie estimée</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bouton toggle Niveau 3 */}
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="mt-5 w-full py-3.5 rounded-2xl border-2 border-[#185FA5]/30 text-[13px] font-semibold text-[#185FA5] hover:bg-[#E6F1FB] transition-colors flex items-center justify-center gap-2"
          >
            <TrendingUp size={15} />
            {showDetails ? 'Masquer les analyses détaillées' : 'Voir les analyses détaillées'}
            <motion.span
              animate={{ rotate: showDetails ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              className="inline-block"
            >▼</motion.span>
          </button>
        </motion.div>

        {/* ════════════════════════════════════════════════
            NIVEAU 3 — DÉTAILS TECHNIQUES (accordéon)
        ════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >

              {/* ── Points forts / attention / opportunités ── */}
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

              {/* ── Objectif ── */}
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
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${r.probabilite_succes}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                      className={`h-full rounded-full ${r.probabilite_succes >= 70 ? 'bg-[#0F6E56]' : r.probabilite_succes >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
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
              </div>

              {/* ── Alertes ── */}
              {(r.alertes || []).length > 0 && (
                <div>
                  <p className="text-[15px] font-bold text-gray-900 mb-3">Points de vigilance</p>
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

              {/* ── Projection 3 scénarios ── */}
              {c.anneesAvantRetraite > 0 && c.patrimoineNet >= 0 && (() => {
                const today = new Date().getFullYear()
                const retraiteYear = today + c.anneesAvantRetraite
                const yearsTotal = Math.max(0, 90 - (c.age1 || 40))
                const endYear = today + yearsTotal
                const epargne = c.capaciteEpargne
                const deficit = Math.max(0, c.revenusCibles - c.pensionEstimee)
                let cap2 = c.patrimoineNet, cap4 = c.patrimoineNet, cap6 = c.patrimoineNet
                const projData: { annee: number; pessimiste: number; median: number; optimiste: number; reel: number }[] = []
                for (let yr = today; yr <= endYear; yr++) {
                  const elapsed = yr - today
                  if (yr < retraiteYear) {
                    cap2 = cap2 * 1.02 + epargne * 12
                    cap4 = cap4 * 1.04 + epargne * 12
                    cap6 = cap6 * 1.06 + epargne * 12
                  } else {
                    cap2 = Math.max(0, cap2 * 1.01 - deficit * 12)
                    cap4 = Math.max(0, cap4 * 1.02 - deficit * 12)
                    cap6 = Math.max(0, cap6 * 1.03 - deficit * 12)
                  }
                  projData.push({ annee: yr, pessimiste: Math.round(cap2), median: Math.round(cap4), optimiste: Math.round(cap6), reel: Math.round(cap4 / Math.pow(1.02, elapsed)) })
                }
                const atRetraite  = projData.find(d => d.annee === retraiteYear)
                const at80year    = today + Math.max(0, 80 - (c.age1 || 40))
                const at80        = projData.find(d => d.annee === at80year)
                const renteEquivalente = atRetraite ? Math.round(atRetraite.median * 0.03 / 12) : 0
                const exhaustPess = projData.find(d => d.pessimiste === 0)
                const warnExhaust = exhaustPess && exhaustPess.annee < today + Math.max(0, 85 - (c.age1 || 40))
                const extraMensuel = warnExhaust && exhaustPess ? (() => {
                  const shortfall = deficit * 12 * Math.max(0, endYear - exhaustPess.annee)
                  const r02m = 0.02 / 12; const nAcc = c.anneesAvantRetraite * 12
                  const fac = nAcc > 0 ? (Math.pow(1 + r02m, nAcc) - 1) / r02m : 1
                  return Math.max(50, Math.round(shortfall / fac / 10) * 10)
                })() : 0
                return (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div>
                      <p className="text-[15px] font-semibold text-gray-800">Projection patrimoniale</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">Évolution de votre patrimoine jusqu'à 90 ans — 3 scénarios</p>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={projData} margin={{ left: 10, right: 10, top: 4 }}>
                        <XAxis dataKey="annee" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${fmt(Math.round(v / 1000))}k`} />
                        <Tooltip formatter={(v: number) => `${fmt(v)} €`} labelFormatter={l => `Année ${l}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <ReferenceLine x={retraiteYear} stroke="#185FA5" strokeDasharray="4 2"
                          label={{ value: 'Retraite', fontSize: 10, fill: '#185FA5', position: 'top' }} />
                        <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="pessimiste" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Pessimiste (2%/an)" />
                        <Line type="monotone" dataKey="median"     stroke="#185FA5" strokeWidth={2.5} dot={false} name="Médian (4%/an)" />
                        <Line type="monotone" dataKey="optimiste"  stroke="#0F6E56" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Optimiste (6%/an)" />
                        <Line type="monotone" dataKey="reel"       stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="3 4" dot={false} name="Valeur réelle (inflation 2%)" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Capital à la retraite', value: atRetraite ? `${fmt(atRetraite.median)} €` : '—', sub: renteEquivalente > 0 ? `≈ ${fmt(renteEquivalente)} €/mois en rente` : 'scénario médian' },
                        { label: 'Capital à 80 ans', value: at80 ? `${fmt(at80.median)} €` : '—', sub: 'scénario médian' },
                        { label: exhaustPess ? 'Épuisement pessimiste' : 'Capital préservé', value: exhaustPess ? `vers ${exhaustPess.annee}` : '✓ à 90 ans', sub: 'scénario à 2%/an', warn: !!exhaustPess },
                      ].map(({ label, value, sub, warn }) => (
                        <div key={label} className={`rounded-xl p-3 text-center ${warn ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                          <p className={`text-[16px] font-bold ${warn ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                        </div>
                      ))}
                    </div>
                    {renteEquivalente > 0 && (
                      <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                        La rente estimée (hypothèse 3 %/an) est indicative. Le capital projeté ne garantit pas ce revenu : la conversion dépend des conditions de marché au moment du départ en retraite.
                      </p>
                    )}
                    {warnExhaust && exhaustPess && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800">
                        <p className="font-semibold mb-1">⚠️ Risque d'épuisement dans le scénario défavorable</p>
                        <p>Dans un scénario à 2 %/an, votre capital pourrait s'épuiser vers <strong>{exhaustPess.annee}</strong>. Augmenter votre épargne de <strong>~{fmt(extraMensuel)} €/mois</strong> pourrait couvrir l'ensemble de votre retraite.</p>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Projections sur hypothèses (2 %, 4 %, 6 %/an) et inflation 2 %/an. Non garanties. Courbe grise = pouvoir d'achat réel.
                    </p>
                  </div>
                )
              })()}

              {/* ── PER vs Assurance-vie ── */}
              {c.tmi > 0 && c.anneesAvantRetraite > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-gray-800">PER vs Assurance-vie</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">Quelle enveloppe privilégier pour votre profil ?</p>
                    </div>
                    {(() => {
                      try {
                        const b6 = JSON.parse(localStorage.getItem('patrisim_bloc6') || '{}')
                        const s = b6.reponses ? Object.values(b6.reponses as Record<string,number>).reduce((a:number,b:number)=>a+b,0) : 0
                        const p = s<=10?'Défensif':s<=14?'Équilibré':s<=17?'Dynamique':'Offensif'
                        return <span className="text-[11px] bg-[#E6F1FB] text-[#0C447C] px-2.5 py-1 rounded-full font-semibold flex-shrink-0">Profil {p}</span>
                      } catch { return null }
                    })()}
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex flex-wrap gap-4 text-[11px] text-gray-500">
                    <span>Versement hypothèse : <strong className="text-gray-700">{fmt(c.versHypoMensuel)} €/mois</strong> (30% capacité d'épargne)</span>
                    <span>Durée : <strong className="text-gray-700">{c.anneesAvantRetraite} ans</strong></span>
                    <span>Rendement : <strong className="text-gray-700">4 %/an</strong></span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr>
                          <th className="text-left text-[11px] text-gray-400 font-medium pb-2 w-44"></th>
                          <th className={`text-center pb-2 rounded-t-xl px-3 ${c.perVsAvRecommande === 'per' ? 'bg-[#E6F1FB] text-[#0C447C]' : 'text-gray-600'}`}>
                            <span className="font-bold">PER</span>
                            {c.perVsAvRecommande === 'per' && <span className="ml-1.5 text-[9px] bg-[#185FA5] text-white px-1.5 py-0.5 rounded-full">✓ Recommandé</span>}
                          </th>
                          <th className={`text-center pb-2 rounded-t-xl px-3 ${c.perVsAvRecommande === 'av' ? 'bg-[#E1F5EE] text-[#085041]' : 'text-gray-600'}`}>
                            <span className="font-bold">Assurance-vie</span>
                            {c.perVsAvRecommande === 'av' && <span className="ml-1.5 text-[9px] bg-[#0F6E56] text-white px-1.5 py-0.5 rounded-full">✓ Recommandée</span>}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[
                          { label: 'Capital final projeté', per: `${fmt(c.capitalPERFinal)} €`, av: `${fmt(c.capitalAVFinal)} €` },
                          { label: 'Économie fiscale entrée', per: `+${fmt(c.economieFiscPER)} €`, av: '0 €', perColor: 'text-[#0F6E56]' },
                          { label: 'Impôt à la sortie', per: `−${fmt(c.impotSortiePER)} €`, av: `−${fmt(c.impotSortieAV)} €`, perColor: 'text-red-600', avColor: 'text-red-600' },
                          { label: 'Net après impôt', per: `${fmt(c.netPER)} €`, av: `${fmt(c.netAV)} €`,
                            perColor: c.netPER >= c.netAV ? 'text-[#185FA5] font-bold' : 'text-gray-700',
                            avColor: c.netAV >= c.netPER ? 'text-[#0F6E56] font-bold' : 'text-gray-700' },
                        ].map(row => (
                          <tr key={row.label}>
                            <td className="py-2 text-gray-500">{row.label}</td>
                            <td className={`py-2 text-center ${row.perColor || 'text-gray-700'} ${c.perVsAvRecommande === 'per' ? 'bg-[#E6F1FB]/40' : ''} px-3`}>{row.per}</td>
                            <td className={`py-2 text-center ${row.avColor || 'text-gray-700'} ${c.perVsAvRecommande === 'av' ? 'bg-[#E1F5EE]/40' : ''} px-3`}>{row.av}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={`rounded-xl px-4 py-3 text-[12px] ${c.perVsAvRecommande === 'per' ? 'bg-[#E6F1FB] text-[#0C447C]' : c.perVsAvRecommande === 'av' ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-amber-50 text-amber-800'}`}>
                    <p className="font-semibold mb-1">
                      {c.perVsAvRecommande === 'per' ? '✓ PER recommandé pour votre situation'
                        : c.perVsAvRecommande === 'av' ? '✓ Assurance-vie recommandée pour votre situation'
                        : '⚖️ Diversifier entre PER et assurance-vie'}
                    </p>
                    <p>
                      {c.perVsAvRecommande === 'per'
                        ? `Votre TMI actuelle (${c.tmi}%) est supérieure à votre TMI estimée à la retraite (${c.tmiRetraite}%). Le PER est plus avantageux fiscalement : vous déduisez à ${c.tmi}% et sortez à ${c.tmiRetraite}%.`
                        : c.perVsAvRecommande === 'av'
                        ? `Votre TMI actuelle (${c.tmi}%) est faible. L'assurance-vie offre plus de flexibilité et une fiscalité douce après 8 ans.`
                        : `Votre TMI actuelle (${c.tmi}%) est proche de votre TMI estimée à la retraite (${c.tmiRetraite}%). Diversifier entre PER et assurance-vie peut être optimal.`}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Simulation basée sur une hypothèse de rendement de 4 %/an et le barème fiscal 2025. Consultez un conseiller agréé pour une analyse personnalisée.
                  </p>
                </div>
              )}

              {/* ── Allocation d'actifs ── */}
              {c.patrimoineBrut > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#E6F1FB] flex items-center justify-center">
                      <PieChart size={16} className="text-[#185FA5]" />
                    </div>
                    <p className="text-[15px] font-semibold text-gray-800">Allocation d'actifs</p>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">À valider avec un conseiller</span>
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    La répartition de votre patrimoine entre les différentes classes d'actifs doit être alignée avec votre profil de risque{(() => { try { const b6 = JSON.parse(localStorage.getItem('patrisim_bloc6') || '{}'); const s = b6.reponses ? Object.values(b6.reponses as Record<string,number>).reduce((a:number,b:number) => a+b, 0) : 0; const p = s <= 10 ? 'Défensif' : s <= 14 ? 'Équilibré' : s <= 17 ? 'Dynamique' : 'Offensif'; return ` (${p})`; } catch { return '' } })()} et votre horizon d'investissement.
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Immobilier', pct: c.pctImmo, color: 'bg-[#185FA5]' },
                      { label: 'Financier', pct: c.pctFinancier, color: 'bg-[#0F6E56]' },
                      { label: 'Liquidités', pct: c.pctLiquidites, color: 'bg-amber-400' },
                      { label: 'Autres actifs', pct: c.pctAutres, color: 'bg-gray-400' },
                    ].map(({ label, pct, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-[12px] text-gray-500 w-24 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(pct, 0)}%` }} />
                        </div>
                        <span className="text-[12px] font-semibold text-gray-700 w-8 text-right">{Math.max(pct, 0)}%</span>
                      </div>
                    ))}
                  </div>
                  {c.pctImmo > 70 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800">
                      <p className="font-semibold mb-1">⚠️ Concentration immobilière ({c.pctImmo}%)</p>
                      <p>Votre patrimoine est fortement concentré sur l'immobilier. Un conseiller agréé peut vous aider à évaluer l'opportunité de diversifier.</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800">
                      <p className="font-semibold mb-1">⚠️ Point important à aborder avec un conseiller</p>
                      <p>L'allocation optimale dépend de votre situation fiscale, de vos objectifs et de votre tolérance au risque. Un conseiller agréé peut définir la répartition adaptée à votre profil.</p>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Accès simulateurs ── */}
        <motion.div variants={sectionItem} className="space-y-4">
          <button type="button" onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors shadow-[0_4px_14px_rgba(24,95,165,0.25)] flex items-center justify-center gap-2">
            Accéder aux simulateurs détaillés →
          </button>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {dashModules.map((m, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < dashModules.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="text-[#185FA5] flex-shrink-0">{m.icon}</div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{m.title}</p>
                  <p className="text-[11px] text-gray-400">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.div variants={sectionItem} className="space-y-3">
          <button type="button" onClick={() => navigate('/start')}
            className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
            Modifier mon profil
          </button>
          <button type="button" onClick={() => { localStorage.removeItem('patrisim_analyse'); navigate('/start') }}
            className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-400 hover:bg-gray-50 transition-colors">
            Refaire une simulation
          </button>
          <p className="text-[11px] text-gray-400 text-center leading-relaxed px-4">
            PatriSim est un outil de simulation pédagogique. Les résultats sont des estimations et ne constituent pas un conseil en investissement.
            Consultez un conseiller en gestion de patrimoine pour toute décision financière importante.
          </p>
        </motion.div>

      </motion.div>
    </div>
  )
}