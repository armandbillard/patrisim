import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, Info, ChevronDown, BarChart2, TrendingUp, PieChart, DollarSign, Users, Settings } from 'lucide-react'

// ─── Types résultat IA ────────────────────────────────────────────────────────

interface SubScores {
  solidite_bilan: number
  efficacite_fiscale: number
  preparation_retraite: number
  diversification: number
  protection_famille: number
  optimisation_succession: number
}

interface ScorePatrimonial {
  global: number
  details: SubScores
  commentaire_global: string
}

interface SyntheseExecutive {
  points_forts: string[]
  points_attention: string[]
  opportunites: string[]
  phrase_bilan: string
}

interface PlanAction {
  etape: number
  action: string
  delai: string
  impact_estime: string
  priorite: 'haute' | 'moyenne' | 'faible'
}

interface AnalyseObjectif {
  objectif: string
  montant_cible: number
  horizon_ans: number
  situation_actuelle: string
  gap_analyse: string
  probabilite_succes: number
  facteurs_favorables: string[]
  facteurs_risque: string[]
  plan_action: PlanAction[]
  projection_avec_optimisation: string
  projection_sans_optimisation: string
}

interface Recommandation {
  categorie: string
  titre: string
  description: string
  impact_potentiel: string
  montant_concerne: number
  economie_ou_gain_estime: number
  urgence: 'immediate' | 'court_terme' | 'moyen_terme' | 'long_terme'
  complexite: 'simple' | 'moderee' | 'complexe'
  prerequis: string
  avertissement: string
}

interface AnalyseFiscale {
  situation_actuelle: string
  tmi: number
  taux_moyen: number
  pression_fiscale_annuelle: number
  optimisations_identifiees: { levier: string; description: string; economie_annuelle_estimee: number; conditions: string }[]
  enveloppe_recommandee: string
  potentiel_per: number
}

interface AnalyseRetraite {
  situation_actuelle: string
  pension_estimee_totale: number
  objectif_revenus: number
  deficit_mensuel: number
  capital_necessaire: number
  capital_projete: number
  ecart: number
  statut: 'objectif_atteignable' | 'effort_necessaire' | 'deficit_important'
  recommandations_specifiques: string[]
  age_liberte_financiere_estime: number
}

interface AnalyseSuccession {
  patrimoine_transmissible: number
  droits_estimes_avant_optim: number
  droits_estimes_apres_optim: number
  economie_potentielle: number
  points_vigilance: string[]
  optimisations_disponibles: { outil: string; description: string; economie_estimee: number; complexite: string }[]
}

interface AnalysePortefeuille {
  coherence_profil_mifid: string
  taux_diversification: number
  risque_concentration: boolean
  actif_concentre: string
  pct_concentration: number
  rendement_moyen_pondere: number
  recommandations_allocation: string
}

interface Alerte {
  niveau: 'critique' | 'attention' | 'info'
  categorie: string
  message: string
  action_recommandee: string
}

interface AIResult {
  score_patrimonial: ScorePatrimonial
  synthese_executive: SyntheseExecutive
  analyse_objectif_principal: AnalyseObjectif
  recommandations: Recommandation[]
  analyse_fiscale: AnalyseFiscale
  analyse_retraite: AnalyseRetraite
  analyse_succession: AnalyseSuccession
  analyse_portefeuille: AnalysePortefeuille
  alertes: Alerte[]
  hypotheses_utilisees: { rendement_portefeuille: number; inflation: number; revalorisation_immo: number; croissance_revenus: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch { return fallback }
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const parseNum = (s: unknown) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }

// ─── Compilation données client ───────────────────────────────────────────────

function buildClientData() {
  const bloc1Mode = loadLS<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const p1 = loadLS<Record<string, unknown>>('patrisim_bloc1_p1', {})
  const p2 = loadLS<Record<string, unknown>>('patrisim_bloc1_p2', {})
  const foyer = loadLS<Record<string, unknown>>('patrisim_bloc1_foyer', {})
  const pro1 = loadLS<Record<string, unknown>>('patrisim_bloc1_pro1', {})
  const pro2 = loadLS<Record<string, unknown>>('patrisim_bloc1_pro2', {})
  const cf1 = loadLS<Record<string, unknown>>('patrisim_bloc1_cf1', {})
  const cf2 = loadLS<Record<string, unknown>>('patrisim_bloc1_cf2', {})
  const bloc2 = loadLS<Record<string, unknown>>('patrisim_bloc2', {})
  const bloc3 = loadLS<Record<string, unknown>>('patrisim_bloc3', {})
  const bloc4 = loadLS<Record<string, unknown>>('patrisim_bloc4', {})
  const bloc5 = loadLS<Record<string, unknown>>('patrisim_bloc5', {})
  const bloc6 = loadLS<Record<string, unknown>>('patrisim_bloc6', {})
  const bloc7 = loadLS<Record<string, unknown>>('patrisim_bloc7', {})

  // Calculs clés
  const b2 = bloc2 as { comptesCourants?: {solde?: string}[]; livrets?: {solde?: string}[]; peas?: {valeur?: string}[]; avs?: {valeurRachat?: string}[]; pers?: {valeur?: string}[]; ctos?: {valeur?: string}[]; biens?: {loue?: boolean; location?: {loyerMensuel?: string}}[]; epargneSalariale?: {valeur?: string; type?: string}[]; crypto?: {valeur?: string; prixRevient?: string}; vehicules?: {valeur?: string}[]; partsSociales?: {nomSociete?: string; pctDetenu?: string; valeur?: string}[]; origine?: Record<string,number> }
  const totalImmo = parseNum((bloc2 as {totalImmo?: number}).totalImmo || 0)
  const totalFin = parseNum((bloc2 as {totalFinancier?: number}).totalFinancier || 0)
  const totalAutres = parseNum((bloc2 as {totalAutres?: number}).totalAutres || 0)
  const patrimoineBrut = totalImmo + totalFin + totalAutres

  const b3 = bloc3 as { creditsImmo?: {mensualiteHA?: string; mensualiteAssurance?: string; crd?: string; etablissement?: string; typePret?: string; taux?: string; montantInitial?: string; garantie?: string}[]; creditsConso?: {mensualite?: string; crd?: string; type?: string; montantInitial?: string; taeg?: string}[]; autresDettes?: {description?: string; montantDu?: string; mensualite?: string}[] }
  const totalDettes = (b3.creditsImmo || []).reduce((a, c) => a + parseNum(c.crd), 0) + (b3.creditsConso || []).reduce((a, c) => a + parseNum(c.crd), 0)
  const totalMensualites = (b3.creditsImmo || []).reduce((a, c) => a + parseNum(c.mensualiteHA) + parseNum(c.mensualiteAssurance), 0) + (b3.creditsConso || []).reduce((a, c) => a + parseNum(c.mensualite), 0)
  const patrimoineNet = patrimoineBrut - totalDettes

  const b4 = bloc4 as { p1Pro?: {salaire?: string}; p2Pro?: {salaire?: string}; mensualitesCredits?: string; assurances?: string; abonnements?: string; fiscal?: {tmi?: number; rfr?: string; impotNet?: string; prelevementsSociaux?: string} }
  const revP1 = parseNum(b4.p1Pro?.salaire)
  const revP2 = parseNum(b4.p2Pro?.salaire)
  const charges = parseNum(b4.mensualitesCredits) + parseNum(b4.assurances) + parseNum(b4.abonnements)
  const capacite = Math.max(0, revP1 + revP2 - charges)
  const coussinMin = charges * 4
  const coussinMax = charges * 6
  const epargneDisponible = [...(b2.comptesCourants || []), ...(b2.livrets || [])].reduce((a, x: Record<string, unknown>) => a + parseNum((x.solde || x.solde as string) as string), 0)

  const b6 = bloc6 as { reponses?: Record<string, number>; objectifsOrder?: string[]; prefGeo?: string; prefESG?: string; universInvest?: string[]; liquiditePct?: number; modeConseil?: string; objectifsSelectionnes?: string[] }
  const score = b6.reponses ? Object.values(b6.reponses).reduce((a, b) => a + b, 0) : 0
  const profils = ['Défensif', 'Équilibré', 'Dynamique', 'Offensif']
  const profilIdx = score <= 10 ? 0 : score <= 14 ? 1 : score <= 17 ? 2 : 3

  const b7 = bloc7 as { heritiers?: {lien?: string; prenom?: string; age?: string; situation?: string}[]; testament?: {aTestament?: boolean; type?: string}; mandatProtection?: boolean; donations?: {beneficiaire?: string; type?: string; montant?: string; date?: string; acteNotarie?: boolean; declare?: boolean}[]; demembrements?: {bien?: string; type?: string; usufruitier?: string; nuProprio?: string; valeurPP?: string; dateConstitution?: string}[]; clausesAV?: {nom?: string; valeur?: string; typeClause?: string}[]; successionsAttendues?: {lienType?: string; montant?: string; delai?: string}[] }

  const b5 = bloc5 as { retraiteP1?: {ageDepartSouhaite?: number; revenusCibles?: number}; projets?: {type?: string; horizon?: string; montant?: string; financement?: string[]; priorite?: string}[]; capaciteEpargne?: string; repartition?: {precaution?: number; projetsCT?: number; retraite?: number; transmission?: number} }

  return {
    profil: {
      mode: bloc1Mode,
      personne1: { prenom: p1.prenom, nom: p1.nom, date_naissance: p1.dateNaissance, nationalite: p1.nationalite, statut_matrimonial: (foyer as {statutMatrimonial?: string}).statutMatrimonial, regime_matrimonial: (foyer as {regimeMatrimonial?: string}).regimeMatrimonial, statut_professionnel: pro1.statut, type_contrat: pro1.typeContrat, anciennete: pro1.anciennete, niveau_connaissance: cf1.niveauGeneral, produits_detenus: cf1.produits },
      personne2: bloc1Mode === 'couple' ? { prenom: p2.prenom, nom: p2.nom, date_naissance: p2.dateNaissance, statut_professionnel: pro2.statut, niveau_connaissance: cf2.niveauGeneral, produits_detenus: cf2.produits } : null,
      enfants_charge: ((foyer as {enfants?: {prenom?: string; age?: string}[]}).enfants || []).map(e => ({ prenom: e.prenom, age: e.age })),
      enfants_majeurs: (foyer as {enfantsMajeurs?: number}).enfantsMajeurs || 0,
      logement: (foyer as {typeLogement?: string}).typeLogement,
    },
    actif: {
      immobilier: [...((b2.biens || []) as {typeBien?: string; ville?: string; codePostal?: string; valeurEstimee?: string; prixAchat?: string; anneeAchat?: string; modeDetention?: string; natureJuridique?: string; loue?: boolean; location?: {loyerMensuel?: string; tauxOccupation?: string; chargesAnnuelles?: string}}[]).map(b => ({ type: b.typeBien, ville: b.ville, cp: b.codePostal, valeur_estimee: parseNum(b.valeurEstimee), prix_achat: parseNum(b.prixAchat), annee_achat: b.anneeAchat, mode_detention: b.modeDetention, nature_juridique: b.natureJuridique, loue: b.loue, loyer_mensuel: parseNum(b.location?.loyerMensuel), taux_occupation: parseNum(b.location?.tauxOccupation || '100'), charges_annuelles: parseNum(b.location?.chargesAnnuelles) }))],
      financier: {
        comptes_courants: (b2.comptesCourants || []).map((c: {solde?: string}) => ({ solde: parseNum(c.solde) })),
        livrets: ((b2.livrets || []) as {type?: string; taux?: string; solde?: string}[]).map(l => ({ type: l.type, taux: parseNum(l.taux), solde: parseNum(l.solde) })),
        pea: (b2.peas || []).map((p: {valeur?: string; versements?: string; dateOuverture?: string; composition?: string[]}) => ({ valeur: parseNum(p.valeur), versements: parseNum(p.versements), date_ouverture: p.dateOuverture, composition: p.composition })),
        cto: (b2.ctos || []).map((c: {valeur?: string; prixRevient?: string; composition?: string[]}) => ({ valeur: parseNum(c.valeur), pv_latentes: parseNum(c.valeur) - parseNum(c.prixRevient), composition: c.composition })),
        av: (b2.avs || []).map((av: {valeurRachat?: string; versements?: string; dateOuverture?: string; fondsEurosPct?: number; ucDetail?: string[]; clauseBeneficiaire?: string}) => ({ valeur: parseNum(av.valeurRachat), versements: parseNum(av.versements), date_ouverture: av.dateOuverture, composition_euros_pct: av.fondsEurosPct, composition_uc: av.ucDetail, clause_beneficiaire: av.clauseBeneficiaire })),
        per: (b2.pers || []).map((p: {valeur?: string; versementsVolontaires?: string; type?: string; modeSortie?: string}) => ({ valeur: parseNum(p.valeur), versements_volontaires: parseNum(p.versementsVolontaires), type: p.type, mode_sortie: p.modeSortie })),
        epargne_salariale: ((b2.epargneSalariale || []) as {valeur?: string; type?: string}[]).map(e => ({ valeur: parseNum(e.valeur), type: e.type })),
        crypto: { valeur: parseNum((b2.crypto as {valeur?: string} | undefined)?.valeur), prix_revient: parseNum((b2.crypto as {prixRevient?: string} | undefined)?.prixRevient) },
        autres: []
      },
      autres: {
        vehicules: ((b2.vehicules || []) as {valeur?: string}[]).map(v => ({ valeur: parseNum(v.valeur) })),
        parts_sociales: ((b2.partsSociales || []) as {nomSociete?: string; pctDetenu?: string; valeur?: string}[]).map(p => ({ societe: p.nomSociete, pct_detention: parseNum(p.pctDetenu), valeur: parseNum(p.valeur) })),
        autres: []
      },
      origine_patrimoine: (b2.origine as Record<string, number>) || {},
      total_brut: patrimoineBrut,
    },
    passif: {
      credits_immo: (b3.creditsImmo || []).map(c => ({ etablissement: c.etablissement, type_pret: (c as {typePret?: string}).typePret, taux: parseNum((c as {taux?: string}).taux), montant_initial: parseNum((c as {montantInitial?: string}).montantInitial), crd: parseNum(c.crd), mensualite_hors_assurance: parseNum(c.mensualiteHA), mensualite_assurance: parseNum(c.mensualiteAssurance), garantie: (c as {garantie?: string}).garantie })),
      credits_conso: (b3.creditsConso || []).map(c => ({ type: (c as {type?: string}).type, montant_initial: parseNum((c as {montantInitial?: string}).montantInitial), crd: parseNum(c.crd), taux: parseNum((c as {taeg?: string}).taeg), mensualite: parseNum(c.mensualite) })),
      autres_dettes: ((b3.autresDettes || []) as {description?: string; montantDu?: string; mensualite?: string}[]).map(d => ({ description: d.description, montant: parseNum(d.montantDu), mensualite: parseNum(d.mensualite) })),
      total_dettes: totalDettes,
      total_mensualites: totalMensualites,
    },
    flux: {
      revenus: {
        salaire_net_p1: revP1,
        salaire_net_p2: revP2,
        revenus_fonciers_nets: parseNum((bloc4 as {revenusFonciersB?: string}).revenusFonciersB),
        revenus_financiers: parseNum((bloc4 as {revenusFinanciers?: string}).revenusFinanciers),
        total_mensuel_net: revP1 + revP2,
      },
      charges: { loyer: parseNum((bloc4 as {loyerMensuel?: string}).loyerMensuel), mensualites_credits: parseNum(b4.mensualitesCredits), assurances: parseNum(b4.assurances), abonnements: parseNum(b4.abonnements), total_mensuel: charges },
      capacite_epargne: capacite,
      fiscalite: { rfr: parseNum(b4.fiscal?.rfr), ir_net: parseNum(b4.fiscal?.impotNet), taux_moyen: parseNum(b4.fiscal?.rfr) > 0 ? Math.round(parseNum(b4.fiscal?.impotNet) / parseNum(b4.fiscal?.rfr) * 1000) / 10 : 0, tmi: b4.fiscal?.tmi || 0, prelevements_sociaux: parseNum(b4.fiscal?.prelevementsSociaux), pression_fiscale: parseNum(b4.fiscal?.impotNet) + parseNum(b4.fiscal?.prelevementsSociaux) },
    },
    projets: {
      retraite: { age_depart_p1: b5.retraiteP1?.ageDepartSouhaite, pension_estimee_p1: Math.round(revP1 * 0.5), revenus_cibles: b5.retraiteP1?.revenusCibles, capital_necessaire: 0 },
      projets: (b5.projets || []).map(p => ({ type: p.type, horizon: p.horizon, budget: parseNum(p.montant), financement: p.financement, priorite: p.priorite })),
      capacite_epargne_mensuelle: parseNum(b5.capaciteEpargne) || capacite,
      repartition_epargne: b5.repartition,
    },
    profil_investisseur: {
      score_mifid: score,
      profil: profils[profilIdx],
      objectifs: (b6.objectifsSelectionnes || []).map((o, i) => ({ type: o, priorite: i + 1 })),
      objectif_principal: (b6.objectifsOrder || [])[0] || '',
      convictions: b6.universInvest || [],
      preference_geo: b6.prefGeo || '',
      preference_esg: b6.prefESG || '',
      liquidite_souhaitee_pct: b6.liquiditePct || 20,
      mode_conseil: b6.modeConseil || '',
    },
    succession: {
      heritiers: (b7.heritiers || []).map(h => ({ lien: h.lien, prenom: h.prenom, age: h.age, situation: h.situation })),
      testament: b7.testament?.aTestament || false,
      type_testament: b7.testament?.type || '',
      mandat_protection: b7.mandatProtection || false,
      donations_effectuees: (b7.donations || []).map(d => ({ beneficiaire: d.beneficiaire, type: d.type, montant: parseNum(d.montant), date: d.date, acte_notarie: d.acteNotarie, declare: d.declare })),
      demembrements: (b7.demembrements || []).map(d => ({ bien: d.bien, type: d.type, usufruitier: d.usufruitier, nu_proprietaire: d.nuProprio, valeur_pp: parseNum(d.valeurPP), date_constitution: d.dateConstitution })),
      av_clauses: (b7.clausesAV || []).map(av => ({ contrat: av.nom, valeur: parseNum(av.valeur), type_clause: av.typeClause })),
      succession_a_recevoir: (b7.successionsAttendues || []).map(s => ({ lien: s.lienType, montant_estime: parseNum(s.montant), delai: s.delai })),
    },
    calculs: {
      patrimoine_brut: patrimoineBrut,
      patrimoine_net: patrimoineNet,
      total_dettes: totalDettes,
      total_mensualites: totalMensualites,
      taux_endettement_patrimoine: patrimoineBrut > 0 ? Math.round(totalDettes / patrimoineBrut * 100) : 0,
      taux_endettement_revenus: (revP1 + revP2) > 0 ? Math.round(totalMensualites / (revP1 + revP2) * 100) : 0,
      capacite_epargne: capacite,
      coussin_securite_actuel: epargneDisponible,
      coussin_securite_recommande_min: coussinMin,
      coussin_securite_recommande_max: coussinMax,
    }
  }
}

// ─── Call API ─────────────────────────────────────────────────────────────────

async function callClaudeAPI(clientData: ReturnType<typeof buildClientData>): Promise<AIResult> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: `Tu es un conseiller en gestion de patrimoine (CGP) expert français, bienveillant et pédagogue. Tu analyses le profil patrimonial complet d'un client et génères un bilan personnalisé structuré.

RÈGLES IMPORTANTES :
1. Tous tes montants sont en euros (€)
2. Tu utilises le tutoiement si le client est seul (mode: "seul"), le vouvoiement si c'est un couple (mode: "couple")
3. Tes recommandations sont pédagogiques et informatives, jamais des conseils d'investissement formels au sens MiFID II
4. Tu prends en compte la réglementation fiscale française en vigueur (2025)
5. Tu personnalises TOUT en fonction des données du profil
6. Tu réponds UNIQUEMENT en JSON valide sans texte avant ou après, sans balises markdown

Génère une analyse complète avec cette structure JSON exacte :
{
  "score_patrimonial": { "global": number, "details": { "solidite_bilan": number, "efficacite_fiscale": number, "preparation_retraite": number, "diversification": number, "protection_famille": number, "optimisation_succession": number }, "commentaire_global": string },
  "synthese_executive": { "points_forts": [string], "points_attention": [string], "opportunites": [string], "phrase_bilan": string },
  "analyse_objectif_principal": { "objectif": string, "montant_cible": number, "horizon_ans": number, "situation_actuelle": string, "gap_analyse": string, "probabilite_succes": number, "facteurs_favorables": [string], "facteurs_risque": [string], "plan_action": [{ "etape": number, "action": string, "delai": string, "impact_estime": string, "priorite": string }], "projection_avec_optimisation": string, "projection_sans_optimisation": string },
  "recommandations": [{ "categorie": string, "titre": string, "description": string, "impact_potentiel": string, "montant_concerne": number, "economie_ou_gain_estime": number, "urgence": string, "complexite": string, "prerequis": string, "avertissement": string }],
  "analyse_fiscale": { "situation_actuelle": string, "tmi": number, "taux_moyen": number, "pression_fiscale_annuelle": number, "optimisations_identifiees": [{ "levier": string, "description": string, "economie_annuelle_estimee": number, "conditions": string }], "enveloppe_recommandee": string, "potentiel_per": number },
  "analyse_retraite": { "situation_actuelle": string, "pension_estimee_totale": number, "objectif_revenus": number, "deficit_mensuel": number, "capital_necessaire": number, "capital_projete": number, "ecart": number, "statut": string, "recommandations_specifiques": [string], "age_liberte_financiere_estime": number },
  "analyse_succession": { "patrimoine_transmissible": number, "droits_estimes_avant_optim": number, "droits_estimes_apres_optim": number, "economie_potentielle": number, "points_vigilance": [string], "optimisations_disponibles": [{ "outil": string, "description": string, "economie_estimee": number, "complexite": string }] },
  "analyse_portefeuille": { "coherence_profil_mifid": string, "taux_diversification": number, "risque_concentration": boolean, "actif_concentre": string, "pct_concentration": number, "rendement_moyen_pondere": number, "recommandations_allocation": string },
  "alertes": [{ "niveau": string, "categorie": string, "message": string, "action_recommandee": string }],
  "hypotheses_utilisees": { "rendement_portefeuille": number, "inflation": number, "revalorisation_immo": number, "croissance_revenus": number }
}`,
      messages: [{
        role: 'user',
        content: `Voici le profil patrimonial complet du client à analyser :\n${JSON.stringify(clientData, null, 2)}`
      }]
    })
  })
  const data = await response.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text || ''
if (!text) throw new Error('Réponse vide de l\'API')
const clean = text
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim()
const jsonStart = clean.indexOf('{')
const jsonEnd = clean.lastIndexOf('}')
if (jsonStart === -1 || jsonEnd === -1) throw new Error('JSON introuvable dans la réponse')
const jsonStr = clean.substring(jsonStart, jsonEnd + 1)
return JSON.parse(jsonStr) as AIResult
}

// ─── UI components ────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'lg' | 'sm' }) {
  const color = score >= 81 ? '#0F6E56' : score >= 66 ? '#185FA5' : score >= 41 ? '#D97706' : '#DC2626'
  const r = size === 'lg' ? 52 : 28
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const sz = size === 'lg' ? 128 : 72

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={size === 'lg' ? 10 : 6} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={size === 'lg' ? 10 : 6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-bold leading-none`} style={{ color, fontSize: size === 'lg' ? 28 : 16 }}>{score}</span>
        {size === 'lg' && <span className="text-[10px] text-gray-400">/100</span>}
      </div>
    </div>
  )
}

function InfoCard({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'amber' | 'green' | 'red' }) {
  const s = { blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20', amber: 'bg-amber-50 text-amber-800 border-amber-200', green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20', red: 'bg-red-50 text-red-700 border-red-200' }
  return <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

const LOADING_MESSAGES = [
  'Analyse de votre profil civil…',
  'Évaluation de votre patrimoine…',
  'Calcul de votre capacité d\'épargne…',
  'Analyse de votre situation fiscale…',
  'Simulation de votre retraite…',
  'Évaluation successorale…',
  'Génération des recommandations…',
  'Finalisation de votre bilan…',
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Analyse() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'loading' | 'result' | 'error'>('loading')
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AIResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [filterCat, setFilterCat] = useState('Toutes')
  const hasCalled = useRef(false)

  // Progression UI
  useEffect(() => {
    if (phase !== 'loading') return
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 1.2, 92))
      setLoadingMsg(m => Math.min(m + (Math.random() > 0.85 ? 1 : 0), LOADING_MESSAGES.length - 1))
    }, 300)
    return () => clearInterval(interval)
  }, [phase])

  // Appel API
  useEffect(() => {
    if (hasCalled.current) return
    hasCalled.current = true

    const run = async () => {
      try {
        // Vérifier cache
        const cached = localStorage.getItem('patrisim_analyse')
        if (cached) {
          const { data, ts } = JSON.parse(cached)
          // Cache valide 30min
          if (Date.now() - ts < 30 * 60 * 1000) {
            setResult(data)
            setProgress(100)
            setTimeout(() => setPhase('result'), 400)
            return
          }
        }

        const clientData = buildClientData()
        let res: AIResult

        try {
          res = await callClaudeAPI(clientData)
        } catch {
          // Retry once
          await new Promise(r => setTimeout(r, 2000))
          res = await callClaudeAPI(clientData)
        }

        localStorage.setItem('patrisim_analyse', JSON.stringify({ data: res, ts: Date.now() }))
        setResult(res)
        setProgress(100)
        setTimeout(() => setPhase('result'), 500)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Erreur inconnue')
        setPhase('error')
      }
    }

    run()
  }, [])

  // ── Loading page ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex flex-col items-center justify-center px-8">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Logo */}
          <div>
            <span className="text-[28px] font-bold text-gray-900">Patri<span className="text-[#185FA5]">Sim</span></span>
            <p className="text-[12px] text-gray-400 mt-1">Analyse patrimoniale intelligente</p>
          </div>

          {/* Jauge animée */}
          <div className="relative">
            <ScoreGauge score={Math.round(progress)} size="lg" />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-[16px] font-semibold text-gray-800 transition-all">{LOADING_MESSAGES[loadingMsg]}</p>
            <p className="text-[12px] text-gray-400">Analyse en cours · environ 20 secondes</p>
          </div>

          {/* Barre */}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#185FA5] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Étapes */}
          <div className="space-y-1.5">
            {LOADING_MESSAGES.map((msg, i) => (
              <div key={i} className={`flex items-center gap-2 text-[12px] transition-all ${i <= loadingMsg ? 'text-gray-700' : 'text-gray-300'}`}>
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
  }

  // ── Error page ────────────────────────────────────────────────────────────
  if (phase === 'error' || !result) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-8">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-5">
          <AlertTriangle size={40} className="text-amber-500 mx-auto" />
          <h2 className="text-[18px] font-bold text-gray-900">Analyse temporairement indisponible</h2>
          <p className="text-[13px] text-gray-500">L'analyse IA est temporairement indisponible. Vous pouvez accéder directement à votre dashboard.</p>
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
  }

  // ── Result page ───────────────────────────────────────────────────────────
  const r = result
  const scoreColor = r.score_patrimonial.global >= 81 ? 'text-[#0F6E56]' : r.score_patrimonial.global >= 66 ? 'text-[#185FA5]' : r.score_patrimonial.global >= 41 ? 'text-amber-600' : 'text-red-600'
  const subscore = r.score_patrimonial.details
  const subLabels: [keyof SubScores, string][] = [
    ['solidite_bilan', 'Solidité du bilan'],
    ['efficacite_fiscale', 'Efficacité fiscale'],
    ['preparation_retraite', 'Préparation retraite'],
    ['diversification', 'Diversification'],
    ['protection_famille', 'Protection famille'],
    ['optimisation_succession', 'Optimisation succession'],
  ]

  const filteredReco = filterCat === 'Toutes' ? r.recommandations : r.recommandations.filter(rec => rec.categorie === filterCat.toLowerCase())
  const urgenceOrder = { immediate: 0, court_terme: 1, moyen_terme: 2, long_terme: 3 }
  const sortedReco = [...filteredReco].sort((a, b) => urgenceOrder[a.urgence] - urgenceOrder[b.urgence])

  const urgenceBorder = { immediate: 'border-l-red-500', court_terme: 'border-l-amber-500', moyen_terme: 'border-l-[#185FA5]', long_terme: 'border-l-gray-300' }
  const urgenceLabel = { immediate: 'Immédiate', court_terme: 'Court terme', moyen_terme: 'Moyen terme', long_terme: 'Long terme' }
  const urgenceBadge = { immediate: 'bg-red-50 text-red-700', court_terme: 'bg-amber-50 text-amber-700', moyen_terme: 'bg-[#E6F1FB] text-[#0C447C]', long_terme: 'bg-gray-100 text-gray-600' }
  const complexBadge = { simple: 'bg-[#E1F5EE] text-[#085041]', moderee: 'bg-amber-50 text-amber-700', complexe: 'bg-red-50 text-red-600' }

  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const dashModules = [
    { icon: <BarChart2 size={22} />, title: 'Bilan patrimonial', desc: 'Évolution, répartition, projections', score: subscore.solidite_bilan, path: '/dashboard/bilan' },
    { icon: <TrendingUp size={22} />, title: 'Simulation retraite', desc: 'Capital, revenus, scénarios', score: subscore.preparation_retraite, path: '/dashboard/retraite' },
    { icon: <PieChart size={22} />, title: 'Analyse portefeuille', desc: 'Allocation, risque, MiFID II', score: subscore.diversification, path: '/dashboard/portefeuille' },
    { icon: <DollarSign size={22} />, title: 'Optimisation fiscale', desc: 'TMI, enveloppes, économies', score: subscore.efficacite_fiscale, path: '/dashboard/fiscal' },
    { icon: <Users size={22} />, title: 'Succession simulée', desc: 'Droits, optimisation, transmission', score: subscore.optimisation_succession, path: '/dashboard/succession' },
    { icon: <Settings size={22} />, title: 'Hypothèses & scénarios', desc: 'Modifier les paramètres, stress tests', score: null, path: '/dashboard/hypotheses' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <div className="max-w-4xl mx-auto px-8 py-10 pb-16">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#0F6E56]" />
            <span className="text-[11px] text-[#0F6E56] font-semibold uppercase tracking-wider">Analyse complète</span>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Votre bilan patrimonial personnalisé</h1>
          <p className="text-[13px] text-gray-400 mt-1">Généré le {dateStr} à {timeStr} · Basé sur l'ensemble de votre profil</p>
        </div>

        {/* Score global + sous-scores */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-8 mb-6">
            <ScoreGauge score={r.score_patrimonial.global} size="lg" />
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Score patrimonial global</p>
              <p className={`text-[32px] font-bold ${scoreColor}`}>{r.score_patrimonial.global}<span className="text-[18px] text-gray-400 font-normal">/100</span></p>
              <p className="text-[13px] text-gray-600 mt-1 max-w-sm">{r.score_patrimonial.commentaire_global}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {subLabels.map(([key, label]) => {
              const val = subscore[key]
              const c = val >= 75 ? 'bg-[#0F6E56]' : val >= 50 ? 'bg-[#185FA5]' : val >= 30 ? 'bg-amber-500' : 'bg-red-500'
              return (
                <div key={key}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold text-gray-800">{val}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Phrase bilan */}
        <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-2xl px-6 py-5 mb-6">
          <p className="text-[15px] text-[#0C447C] italic font-medium leading-relaxed">"{r.synthese_executive.phrase_bilan}"</p>
        </div>

        {/* Synthèse executive */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F6E56] mb-3">Points forts</p>
            {r.synthese_executive.points_forts.map((p, i) => (
              <div key={i} className="bg-white border border-[#0F6E56]/20 rounded-xl px-4 py-3 flex gap-2">
                <CheckCircle size={14} className="text-[#0F6E56] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-700">{p}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-3">Points d'attention</p>
            {r.synthese_executive.points_attention.map((p, i) => (
              <div key={i} className="bg-white border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-700">{p}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#185FA5] mb-3">Opportunités</p>
            {r.synthese_executive.opportunites.map((p, i) => (
              <div key={i} className="bg-white border border-[#185FA5]/20 rounded-xl px-4 py-3 flex gap-2">
                <Info size={14} className="text-[#185FA5] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-700">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Analyse objectif principal */}
        <div className="bg-white rounded-2xl border-2 border-[#185FA5]/30 shadow-sm p-6 mb-8 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Objectif principal</p>
              <p className="text-[20px] font-bold text-gray-900">{r.analyse_objectif_principal.objectif}</p>
              <p className="text-[13px] text-gray-400 mt-0.5">Montant cible : {fmt(r.analyse_objectif_principal.montant_cible)} € · Horizon : {r.analyse_objectif_principal.horizon_ans} ans</p>
            </div>
            <div className="text-center">
              <ScoreGauge score={r.analyse_objectif_principal.probabilite_succes} size="sm" />
              <p className="text-[10px] text-gray-400 mt-1">Probabilité</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Situation actuelle</p>
              <p className="text-[13px] text-gray-700">{r.analyse_objectif_principal.situation_actuelle}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Analyse de l'écart</p>
              <p className="text-[13px] text-gray-700">{r.analyse_objectif_principal.gap_analyse}</p>
            </div>
          </div>

          {/* Plan d'action */}
          <div>
            <p className="text-[13px] font-semibold text-gray-800 mb-3">Plan d'action</p>
            <div className="space-y-2">
              {r.analyse_objectif_principal.plan_action.map(step => (
                <div key={step.etape} className="bg-gray-50 rounded-xl px-4 py-3 flex items-start gap-4">
                  <span className="w-6 h-6 rounded-full bg-[#185FA5] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step.etape}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-800">{step.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{step.delai}</span>
                      <span className="text-[10px] bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">{step.impact_estime}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${step.priorite === 'haute' ? 'bg-red-50 text-red-600' : step.priorite === 'moyenne' ? 'bg-amber-50 text-amber-700' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>{step.priorite === 'haute' ? 'Haute' : step.priorite === 'moyenne' ? 'Moyenne' : 'Faible'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projection comparée */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-red-200 bg-red-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-red-600 uppercase mb-2">Sans optimisation</p>
              <p className="text-[12px] text-red-700">{r.analyse_objectif_principal.projection_sans_optimisation}</p>
            </div>
            <div className="border border-[#0F6E56]/30 bg-[#E1F5EE] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[#085041] uppercase mb-2">Avec recommandations PatriSim</p>
              <p className="text-[12px] text-[#085041]">{r.analyse_objectif_principal.projection_avec_optimisation}</p>
            </div>
          </div>
        </div>

        {/* Recommandations */}
        <div className="mb-8">
          <p className="text-[16px] font-bold text-gray-900 mb-4">Recommandations personnalisées</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Toutes', 'Fiscal', 'Épargne', 'Investissement', 'Protection', 'Succession', 'Immobilier', 'Retraite'].map(cat => (
              <button key={cat} type="button" onClick={() => setFilterCat(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] border font-medium transition-all ${filterCat === cat ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {sortedReco.map((rec, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm p-5 ${urgenceBorder[rec.urgence]}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold uppercase">{rec.categorie}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${urgenceBadge[rec.urgence]}`}>{urgenceLabel[rec.urgence]}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${complexBadge[rec.complexite] || 'bg-gray-100 text-gray-600'}`}>{rec.complexite}</span>
                  </div>
                </div>
                <p className="text-[14px] font-semibold text-gray-900 mb-1">{rec.titre}</p>
                <p className="text-[12px] text-gray-600 mb-3">{rec.description}</p>
                <p className="text-[12px] text-gray-500 italic mb-3">{rec.impact_potentiel}</p>
                <div className="flex gap-4 text-[12px]">
                  {rec.montant_concerne > 0 && <span className="text-gray-500">Montant concerné : <strong className="text-gray-700">{fmt(rec.montant_concerne)} €</strong></span>}
                  {rec.economie_ou_gain_estime > 0 && <span className="text-[#0F6E56] font-semibold">Gain estimé : +{fmt(rec.economie_ou_gain_estime)} €</span>}
                </div>
                {rec.prerequis && <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-500">⚡ Prérequis : {rec.prerequis}</div>}
                {rec.avertissement && <div className="mt-2"><InfoCard color="amber">{rec.avertissement}</InfoCard></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Alertes */}
        {r.alertes.length > 0 && (
          <div className="mb-8">
            <p className="text-[16px] font-bold text-gray-900 mb-4">Points de vigilance</p>
            <div className="space-y-3">
              {[...r.alertes].sort((a, b) => ({ critique: 0, attention: 1, info: 2 }[a.niveau] - { critique: 0, attention: 1, info: 2 }[b.niveau])).map((al, i) => (
                <div key={i} className={`rounded-2xl border px-5 py-4 flex gap-3 ${al.niveau === 'critique' ? 'bg-red-50 border-red-200' : al.niveau === 'attention' ? 'bg-amber-50 border-amber-200' : 'bg-[#E6F1FB] border-[#185FA5]/20'}`}>
                  {al.niveau === 'critique' ? <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" /> : al.niveau === 'attention' ? <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" /> : <Info size={16} className="text-[#185FA5] flex-shrink-0 mt-0.5" />}
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{al.categorie}</span>
                    <p className="text-[13px] text-gray-800 font-medium mt-0.5">{al.message}</p>
                    <p className="text-[12px] text-gray-500 mt-1">{al.action_recommandee}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation dashboard */}
        <div className="mb-8">
          <p className="text-[16px] font-bold text-gray-900 mb-4">Accédez à vos analyses détaillées</p>
          <div className="grid grid-cols-2 gap-4">
            {dashModules.map((m, i) => (
              <button key={i} type="button" onClick={() => navigate(m.path)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-[#185FA5]/30 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[#185FA5] group-hover:text-[#0C447C] transition-colors">{m.icon}</div>
                  {m.score !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[12px] font-bold ${m.score >= 75 ? 'text-[#0F6E56]' : m.score >= 50 ? 'text-[#185FA5]' : 'text-amber-600'}`}>{m.score}</span>
                      <span className="text-[10px] text-gray-400">/100</span>
                    </div>
                  )}
                </div>
                <p className="text-[14px] font-semibold text-gray-800 mb-0.5">{m.title}</p>
                <p className="text-[12px] text-gray-400">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-4">
          <button type="button" onClick={() => navigate('/bloc1')}
            className="w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
            ← Modifier mon profil
          </button>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <strong className="text-gray-500">PatriSim</strong> est un outil de simulation pédagogique. Les résultats affichés sont des estimations basées sur les données saisies et des hypothèses simplifiées. Ils ne constituent pas un conseil en investissement au sens de la réglementation MiFID II. Consultez un conseiller en gestion de patrimoine agréé pour toute décision financière.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}