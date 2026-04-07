// src/pages/Demo.tsx
// Profils de démonstration — remplissent automatiquement le localStorage

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import FadeIn from '../components/FadeIn'

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' } }),
}

export interface DemoProfile {
  id: string
  emoji: string
  titre: string
  description: string
  tags: string[]
  data: Record<string, unknown>
}

export const DEMO_PROFILES: DemoProfile[] = [

  // ─── PROFIL 1 — Couple 50 ans ───────────────────────────────────────────
  {
    id: 'couple-50',
    emoji: '👨‍👩‍👧',
    titre: 'Couple de cadres, 50 ans',
    description: 'Propriétaires avec 2 enfants. Préparent leur retraite et veulent optimiser la transmission.',
    tags: ['Retraite', 'Succession', 'Immobilier'],
    data: {
      patrisim_bloc1_mode: { v: 'couple' },
      patrisim_bloc1_p1: { prenom: 'Sophie', nom: 'Martin', dateNaissance: '1974-03-15', nationalite: 'Française' },
      patrisim_bloc1_p2: { prenom: 'Laurent', nom: 'Martin', dateNaissance: '1972-07-22', nationalite: 'Française' },
      patrisim_bloc1_foyer: {
        statutMatrimonial: 'Marié(e)',
        regimeMatrimonial: 'Communauté légale réduite aux acquêts',
        typeLogement: 'Propriétaire',
        enfantsCharge: 0,
        enfantsMajeurs: 2,
        majeurs: [
          { prenom: 'Emma', age: '23' },
          { prenom: 'Thomas', age: '20' },
        ],
      },
      patrisim_bloc1_pro1: { statut: 'Salarié(e) du privé', typeContrat: 'CDI', anciennete: '+ 15 ans' },
      patrisim_bloc1_pro2: { statut: 'Salarié(e) du privé', typeContrat: 'CDI', anciennete: '+ 15 ans' },
      patrisim_bloc1_cf1: { niveauGeneral: 'Confirmé', produits: ['PEA', 'Assurance-vie', 'Livrets réglementés'] },
      patrisim_bloc1_cf2: { niveauGeneral: 'Intermédiaire', produits: ['Assurance-vie', 'Livrets réglementés', 'PER'] },
      patrisim_bloc2: {
        proprietaireRP: true,
        rp: { typeBien: 'Maison ancienne', ville: 'Lyon', codePostal: '69006', valeurEstimee: '480000', prixAchat: '280000', anneeAchat: '2005', modeDetention: 'Pleine propriété', natureJuridique: 'Bien commun' },
        biens: [],
        livrets: [
          { type: 'Livret A', taux: '1.5', solde: '22950', titulaire: 'P1' },
          { type: 'LDDS', taux: '1.5', solde: '12000', titulaire: 'P2' },
        ],
        peas: [{ valeur: '85000', versements: '60000', dateOuverture: '2010-04-01', composition: ['ETF', 'Actions françaises'] }],
        avs: [{
          nom: 'Floriane Vie', compagnie: 'Crédit Agricole', dateOuverture: '2008-01-15',
          valeurRachat: '95000', versements: '70000', fondsEurosPct: 60, rendement: '3.5',
          clauseBeneficiaire: 'Standard',
        }],
        pers: [{ type: 'PER individuel', valeur: '35000', versementsVolontaires: '25000', modeSortie: 'Capital' }],
        comptesCourants: [{ etablissement: 'Crédit Agricole', solde: '8000', titulaire: 'Joint' }],
        totalImmo: 480000,
        totalFinancier: 257950,
        totalAutres: 0,
      },
      patrisim_bloc3: {
        aCredits: true,
        creditsImmo: [{
          bienFinance: 'Résidence principale Lyon',
          etablissement: 'Crédit Agricole',
          typePret: 'Prêt amortissable classique',
          taux: '1.2',
          typeTaux: 'Fixe',
          montantInitial: '200000',
          crd: '42000',
          mensualiteHA: '1155',
          mensualiteAssurance: '85',
          dateDebut: '2005-09-01',
          dureeInitiale: '20',
          garantie: 'Hypothèque',
        }],
        creditsConso: [],
      },
      patrisim_bloc4: {
        p1Pro: { salaire: '4200' },
        p2Pro: { salaire: '3800' },
        revenusFonciersB: '0',
        revenusFinanciers: '9030',
        mensualitesCredits: '1240',
        assurances: '320',
        abonnements: '180',
        fiscal: {
          anneeRevenus: '2024',
          rfr: '85000',
          revenuImposable: '76500',
          impotNet: '12800',
          nbParts: '2',
          prelevementsSociaux: '1800',
          tmi: 30,
          source: 'manuel',
        },
        depenses: [
          { id: 'loyer', label: 'Loyer / Charges habitation', montant: '1240', pct: '', mode: 'euro', prefilled: true, emoji: '🏠' },
          { id: 'transport', label: 'Transports', montant: '400', pct: '', mode: 'euro', prefilled: false, emoji: '🚗' },
          { id: 'nourriture', label: 'Alimentation', montant: '', pct: '12', mode: 'pct', prefilled: false, emoji: '🛒' },
          { id: 'invest', label: 'Investissement / Épargne', montant: '800', pct: '', mode: 'euro', prefilled: false, emoji: '📈' },
          { id: 'loisirs', label: 'Loisirs & sorties', montant: '', pct: '5', mode: 'pct', prefilled: false, emoji: '🎭' },
          { id: 'sante', label: 'Santé & assurances', montant: '320', pct: '', mode: 'euro', prefilled: false, emoji: '🏥' },
          { id: 'abos', label: 'Abonnements', montant: '180', pct: '', mode: 'euro', prefilled: false, emoji: '📱' },
          { id: 'autres', label: 'Autres dépenses', montant: '', pct: '3', mode: 'pct', prefilled: false, emoji: '💳' },
        ],
        dcas: [{ actif: 'ETF MSCI World', montantMensuel: '300', depuis: '2020-01-01', plateforme: 'Boursorama' }],
        aPension: false,
      },
      patrisim_bloc5: {
        retraiteP1: { ageDepartSouhaite: 63, regimes: ['Régime général (CNAV)', 'AGIRC-ARRCO'], pensionConnue: false, revenusCibles: 3000, aTransmission: true, montantTransmission: '200000' },
        retraiteP2: { ageDepartSouhaite: 63, regimes: ['Régime général (CNAV)', 'AGIRC-ARRCO'], pensionConnue: false, revenusCibles: 2800, aTransmission: true, montantTransmission: '200000' },
        aProjects: true,
        projets: [{ id: '1', horizon: 'Court terme (0–3 ans)', type: 'Travaux / Rénovation', montant: '35000', financement: ['Épargne existante'], priorite: 'Important', collapsed: false, description: 'Rénovation cuisine et salle de bain', budgetMode: 'precis', montantMin: '', montantMax: '' }],
        capaciteEpargne: '1800',
        repartition: { precaution: 20, projetsCT: 15, retraite: 50, transmission: 15 },
        effortSupp: 300,
        horizonInvest: '8–15 ans',
      },
      patrisim_bloc6: {
        mifidDone: true,
        reponses: { q1: 2, q2: 3, q3: 2, q4: 2, q5: 3, q6: 2, q7: 2 },
        objectifsSelectionnes: ['Préparer ma retraite', 'Transmettre un patrimoine', 'Réduire mes impôts'],
        objectifsOrder: ['Préparer ma retraite', 'Transmettre un patrimoine', 'Réduire mes impôts'],
        aConvictions: true,
        universInvest: ['ETF / Fonds indiciels', 'Assurance-vie', 'PER', 'Immobilier physique'],
        prefGeo: 'Monde entier',
        prefESG: 'Critères ESG importants',
        secteursPriv: ['Technologie', 'Santé'],
        secteursExcl: ['Armement', 'Tabac'],
        liquiditePct: 20,
        suiviFrequence: 'Semestrielle',
        modeConseil: 'Guidé (conseils puis je décide)',
      },
      patrisim_bloc7: {
        heritiers: [
          { id: '1', lien: 'Enfant commun', prenom: 'Emma', age: '23', situation: 'Vivant', prefilled: true },
          { id: '2', lien: 'Enfant commun', prenom: 'Thomas', age: '20', situation: 'Vivant', prefilled: true },
        ],
        testament: { aTestament: false },
        mandatProtection: false,
        clauseMatrimoniale: { aClause: false },
        aDonations: false, donations: [],
        aDemembrements: false, demembrements: [],
        clausesAV: [{ id: '1', nom: 'Floriane Vie', compagnie: 'Crédit Agricole', valeur: '95000', typeClause: 'Standard', prefilled: true, nuProprios: [] }],
        pacteDutreil: { aPacte: false },
        aSuccessionAttendue: false, successionsAttendues: [],
      },
      patrisim_bloc0: { objectif: 'retraite', niveauDetail: 'complet', done: true, _demoProfileId: 'couple-50' },
    }
  },

  // ─── PROFIL 2 — Célibataire 35 ans ──────────────────────────────────────
  {
    id: 'celibataire-35',
    emoji: '👤',
    titre: 'Célibataire 35 ans, salarié',
    description: 'Locataire à Paris, bon salaire. Veut acheter sa résidence principale et optimiser son épargne.',
    tags: ['Achat RP', 'Épargne', 'Fiscalité'],
    data: {
      patrisim_bloc1_mode: { v: 'seul' },
      patrisim_bloc1_p1: { prenom: 'Maxime', nom: 'Dubois', dateNaissance: '1989-11-05', nationalite: 'Française' },
      patrisim_bloc1_foyer: { statutMatrimonial: 'Célibataire', typeLogement: 'Locataire', enfantsCharge: 0, enfantsMajeurs: 0 },
      patrisim_bloc1_pro1: { statut: 'Salarié(e) du privé', typeContrat: 'CDI', anciennete: '5–15 ans' },
      patrisim_bloc1_cf1: { niveauGeneral: 'Intermédiaire', produits: ['PEA', 'Livrets réglementés', 'Épargne salariale (PEE/PERCO)'] },
      patrisim_bloc2: {
        proprietaireRP: false,
        biens: [],
        livrets: [
          { type: 'Livret A', taux: '1.5', solde: '22950', titulaire: 'P1' },
          { type: 'LEP', taux: '2.5', solde: '10000', titulaire: 'P1' },
        ],
        peas: [{ valeur: '42000', versements: '35000', dateOuverture: '2018-06-01', composition: ['ETF', 'Actions françaises', 'Actions européennes'] }],
        avs: [],
        pers: [],
        comptesCourants: [{ etablissement: 'BNP Paribas', solde: '5500', titulaire: 'P1' }],
        epargneSalariale: [{ valeur: '18000', type: 'PEE' }],
        totalImmo: 0,
        totalFinancier: 98450,
        totalAutres: 0,
      },
      patrisim_bloc3: { aCredits: false, creditsImmo: [], creditsConso: [] },
      patrisim_bloc4: {
        p1Pro: { salaire: '4800' },
        revenusFonciersB: '0',
        revenusFinanciers: '1680',
        loyerMensuel: '1350',
        mensualitesCredits: '0',
        assurances: '120',
        abonnements: '95',
        fiscal: {
          anneeRevenus: '2024',
          rfr: '52000',
          revenuImposable: '46800',
          impotNet: '7200',
          nbParts: '1',
          prelevementsSociaux: '0',
          tmi: 30,
          source: 'manuel',
        },
        depenses: [
          { id: 'loyer', label: 'Loyer / Charges habitation', montant: '1350', pct: '', mode: 'euro', prefilled: true, emoji: '🏠' },
          { id: 'transport', label: 'Transports', montant: '120', pct: '', mode: 'euro', prefilled: false, emoji: '🚗' },
          { id: 'nourriture', label: 'Alimentation', montant: '', pct: '10', mode: 'pct', prefilled: false, emoji: '🛒' },
          { id: 'invest', label: 'Investissement / Épargne', montant: '700', pct: '', mode: 'euro', prefilled: false, emoji: '📈' },
          { id: 'loisirs', label: 'Loisirs & sorties', montant: '', pct: '8', mode: 'pct', prefilled: false, emoji: '🎭' },
          { id: 'sante', label: 'Santé & assurances', montant: '120', pct: '', mode: 'euro', prefilled: false, emoji: '🏥' },
          { id: 'abos', label: 'Abonnements', montant: '95', pct: '', mode: 'euro', prefilled: false, emoji: '📱' },
          { id: 'autres', label: 'Autres dépenses', montant: '', pct: '3', mode: 'pct', prefilled: false, emoji: '💳' },
        ],
        dcas: [{ actif: 'ETF S&P 500', montantMensuel: '400', depuis: '2021-01-01', plateforme: 'Trade Republic' }],
        aPension: false,
      },
      patrisim_bloc5: {
        retraiteP1: { ageDepartSouhaite: 64, regimes: ['Régime général (CNAV)', 'AGIRC-ARRCO'], pensionConnue: false, revenusCibles: 3200, aTransmission: false },
        aProjects: true,
        projets: [{ id: '1', horizon: 'Moyen terme (3–8 ans)', type: 'Achat résidence principale', montant: '350000', financement: ['Épargne existante', 'Crédit'], priorite: 'Essentiel', collapsed: false, description: 'Appartement Paris ou proche banlieue', budgetMode: 'precis', montantMin: '', montantMax: '' }],
        capaciteEpargne: '1200',
        repartition: { precaution: 15, projetsCT: 40, retraite: 35, transmission: 10 },
        effortSupp: 200,
        horizonInvest: '3–8 ans',
      },
      patrisim_bloc6: {
        mifidDone: true,
        reponses: { q1: 2, q2: 2, q3: 3, q4: 2, q5: 2, q6: 2, q7: 2 },
        objectifsSelectionnes: ['Acquérir ma résidence principale', 'Atteindre un capital cible', 'Réduire mes impôts'],
        objectifsOrder: ['Acquérir ma résidence principale', 'Atteindre un capital cible', 'Réduire mes impôts'],
        aConvictions: true,
        universInvest: ['PEA', 'ETF / Fonds indiciels', 'Assurance-vie'],
        prefGeo: 'Monde entier',
        prefESG: 'Pas de préférence particulière',
        secteursPriv: ['Technologie'],
        secteursExcl: [],
        liquiditePct: 30,
        suiviFrequence: 'Trimestrielle',
        modeConseil: 'Autonome (je décide seul)',
      },
      patrisim_bloc7: {
        heritiers: [],
        testament: { aTestament: false },
        mandatProtection: false,
        clauseMatrimoniale: { aClause: false },
        aDonations: false, donations: [],
        aDemembrements: false, demembrements: [],
        clausesAV: [],
        pacteDutreil: { aPacte: false },
        aSuccessionAttendue: false, successionsAttendues: [],
      },
      patrisim_bloc0: { objectif: 'objectif', niveauDetail: 'complet', done: true, _demoProfileId: 'single-35' },
    }
  },

  // ─── PROFIL 3 — Retraité 65 ans ─────────────────────────────────────────
  {
    id: 'retraite-65',
    emoji: '👴',
    titre: 'Retraité 65 ans, patrimoine immobilier',
    description: 'Retraité avec plusieurs biens immobiliers. Priorité : transmettre efficacement à ses 3 enfants.',
    tags: ['Succession', 'Transmission', 'Immobilier'],
    data: {
      patrisim_bloc1_mode: { v: 'seul' },
      patrisim_bloc1_p1: { prenom: 'Michel', nom: 'Bernard', dateNaissance: '1959-04-12', nationalite: 'Française' },
      patrisim_bloc1_foyer: {
        statutMatrimonial: 'Veuf(ve)',
        typeLogement: 'Propriétaire',
        enfantsCharge: 0,
        enfantsMajeurs: 3,
        majeurs: [
          { prenom: 'Julie', age: '38' },
          { prenom: 'Pierre', age: '35' },
          { prenom: 'Marc', age: '32' },
        ],
      },
      patrisim_bloc1_pro1: { statut: 'Retraité(e)' },
      patrisim_bloc1_cf1: { niveauGeneral: 'Intermédiaire', produits: ['Assurance-vie', 'Livrets réglementés', 'Immobilier locatif'] },
      patrisim_bloc2: {
        proprietaireRP: true,
        rp: { typeBien: 'Maison ancienne', ville: 'Bordeaux', codePostal: '33000', valeurEstimee: '420000', prixAchat: '150000', anneeAchat: '1992', modeDetention: 'Pleine propriété', natureJuridique: 'Bien propre P1' },
        biens: [{
          typeBien: 'Appartement ancien', ville: 'Bordeaux', codePostal: '33000',
          valeurEstimee: '185000', prixAchat: '95000', anneeAchat: '2001',
          modeDetention: 'Pleine propriété', natureJuridique: 'Bien propre P1',
          loue: true,
          location: { loyerMensuel: '850', tauxOccupation: '95', chargesAnnuelles: '1200', meuble: false, regimeFiscal: 'Micro-foncier (abattement 30%)' },
        }],
        livrets: [
          { type: 'Livret A', taux: '1.5', solde: '22950', titulaire: 'P1' },
          { type: 'PEL', taux: '2', solde: '45000', dateOuverture: '2005-01-01', titulaire: 'P1' },
        ],
        peas: [],
        avs: [
          { nom: 'AV Predica', compagnie: 'Predica', dateOuverture: '2000-03-01', valeurRachat: '120000', versements: '80000', fondsEurosPct: 90, rendement: '2.8', clauseBeneficiaire: 'Personnalisée' },
          { nom: 'AV Cardif', compagnie: 'BNP Cardif', dateOuverture: '2005-06-01', valeurRachat: '85000', versements: '65000', fondsEurosPct: 85, rendement: '2.5', clauseBeneficiaire: 'Standard' },
        ],
        pers: [],
        comptesCourants: [{ etablissement: 'Société Générale', solde: '12000', titulaire: 'P1' }],
        totalImmo: 605000,
        totalFinancier: 284950,
        totalAutres: 0,
      },
      patrisim_bloc3: { aCredits: false, creditsImmo: [], creditsConso: [] },
      patrisim_bloc4: {
        p1Pro: { salaire: '2800' },
        revenusFonciersB: '9690',
        revenusFinanciers: '5775',
        mensualitesCredits: '0',
        assurances: '280',
        abonnements: '120',
        fiscal: {
          anneeRevenus: '2024',
          rfr: '42000',
          revenuImposable: '38000',
          impotNet: '4200',
          nbParts: '1',
          prelevementsSociaux: '900',
          tmi: 11,
          source: 'manuel',
        },
        depenses: [
          { id: 'loyer', label: 'Loyer / Charges habitation', montant: '0', pct: '', mode: 'euro', prefilled: true, emoji: '🏠' },
          { id: 'transport', label: 'Transports', montant: '200', pct: '', mode: 'euro', prefilled: false, emoji: '🚗' },
          { id: 'nourriture', label: 'Alimentation', montant: '', pct: '10', mode: 'pct', prefilled: false, emoji: '🛒' },
          { id: 'invest', label: 'Investissement / Épargne', montant: '300', pct: '', mode: 'euro', prefilled: false, emoji: '📈' },
          { id: 'loisirs', label: 'Loisirs & sorties', montant: '', pct: '8', mode: 'pct', prefilled: false, emoji: '🎭' },
          { id: 'sante', label: 'Santé & assurances', montant: '280', pct: '', mode: 'euro', prefilled: false, emoji: '🏥' },
          { id: 'abos', label: 'Abonnements', montant: '120', pct: '', mode: 'euro', prefilled: false, emoji: '📱' },
          { id: 'autres', label: 'Autres dépenses', montant: '', pct: '5', mode: 'pct', prefilled: false, emoji: '💳' },
        ],
        dcas: [],
        aPension: false,
      },
      patrisim_bloc5: {
        retraiteP1: { ageDepartSouhaite: 65, regimes: ['Régime général (CNAV)', 'AGIRC-ARRCO'], pensionConnue: true, pensionBase: '2200', aComplementaire: true, pensionComplementaire: '600', revenusCibles: 2500, aTransmission: true, montantTransmission: '500000' },
        aProjects: false,
        projets: [],
        capaciteEpargne: '800',
        repartition: { precaution: 20, projetsCT: 5, retraite: 25, transmission: 50 },
        effortSupp: 0,
        horizonInvest: '15 ans+',
      },
      patrisim_bloc6: {
        mifidDone: true,
        reponses: { q1: 1, q2: 2, q3: 1, q4: 2, q5: 2, q6: 1, q7: 2 },
        objectifsSelectionnes: ['Transmettre un patrimoine', 'Générer des revenus complémentaires'],
        objectifsOrder: ['Transmettre un patrimoine', 'Générer des revenus complémentaires'],
        aConvictions: false,
        universInvest: ['Assurance-vie', 'Immobilier physique'],
        prefGeo: 'France uniquement',
        prefESG: 'Pas de préférence particulière',
        secteursPriv: [],
        secteursExcl: [],
        liquiditePct: 15,
        suiviFrequence: 'Annuelle',
        modeConseil: 'Délégué (je fais confiance au conseiller)',
      },
      patrisim_bloc7: {
        heritiers: [
          { id: '1', lien: 'Enfant commun', prenom: 'Julie', age: '38', situation: 'Vivant', prefilled: true },
          { id: '2', lien: 'Enfant commun', prenom: 'Pierre', age: '35', situation: 'Vivant', prefilled: true },
          { id: '3', lien: 'Enfant commun', prenom: 'Marc', age: '32', situation: 'Vivant', prefilled: true },
        ],
        testament: { aTestament: true, type: 'Olographe (manuscrit)', dateRedaction: '2018-05-10' },
        mandatProtection: false,
        clauseMatrimoniale: { aClause: false },
        aDonations: false, donations: [],
        aDemembrements: false, demembrements: [],
        clausesAV: [
          { id: '1', nom: 'AV Predica', compagnie: 'Predica', valeur: '120000', typeClause: 'Personnalisée', prefilled: true, nuProprios: [] },
          { id: '2', nom: 'AV Cardif', compagnie: 'BNP Cardif', valeur: '85000', typeClause: 'Standard', prefilled: true, nuProprios: [] },
        ],
        pacteDutreil: { aPacte: false },
        aSuccessionAttendue: false, successionsAttendues: [],
      },
      patrisim_bloc0: { objectif: 'succession', niveauDetail: 'complet', done: true, _demoProfileId: 'retiree-65' },
    }
  },

  // ─── PROFIL 4 — TNS 42 ans ───────────────────────────────────────────────
  {
    id: 'tns-42',
    emoji: '🏢',
    titre: 'TNS 42 ans, dirigeant SAS',
    description: 'Chef d\'entreprise avec forte capacité d\'épargne. Cherche à optimiser sa fiscalité et préparer sa retraite.',
    tags: ['Fiscalité', 'Retraite', 'TNS'],
    data: {
      patrisim_bloc1_mode: { v: 'seul' },
      patrisim_bloc1_p1: { prenom: 'Alexandre', nom: 'Petit', dateNaissance: '1982-09-18', nationalite: 'Française' },
      patrisim_bloc1_foyer: {
        statutMatrimonial: 'Marié(e)',
        regimeMatrimonial: 'Séparation de biens',
        typeLogement: 'Propriétaire',
        enfantsCharge: 2,
        enfants: [{ prenom: 'Léa', age: '10' }, { prenom: 'Hugo', age: '7' }],
        enfantsMajeurs: 0,
      },
      patrisim_bloc1_pro1: { statut: "Chef(fe) d'entreprise", formeJuridique: 'SAS' },
      patrisim_bloc1_cf1: { niveauGeneral: 'Confirmé', produits: ['PEA', 'Assurance-vie', 'PER', 'Actions & obligations', 'Immobilier locatif'] },
      patrisim_bloc2: {
        proprietaireRP: true,
        rp: { typeBien: 'Maison ancienne', ville: 'Nantes', codePostal: '44000', valeurEstimee: '320000', prixAchat: '240000', anneeAchat: '2015', modeDetention: 'Pleine propriété', natureJuridique: 'Bien commun' },
        biens: [{
          typeBien: 'Appartement ancien', ville: 'Nantes', codePostal: '44000',
          valeurEstimee: '140000', prixAchat: '130000', anneeAchat: '2019',
          modeDetention: 'Pleine propriété', natureJuridique: 'Bien propre P1',
          loue: true,
          location: { loyerMensuel: '700', tauxOccupation: '100', chargesAnnuelles: '1500', regimeFiscal: 'Régime réel' },
        }],
        livrets: [{ type: 'Livret A', taux: '1.5', solde: '22950', titulaire: 'P1' }],
        peas: [{ valeur: '35000', versements: '28000', dateOuverture: '2015-01-01', composition: ['ETF', 'Actions françaises', 'Actions européennes'] }],
        avs: [{ nom: 'AV Luxembourg', compagnie: 'Generali', dateOuverture: '2016-03-01', valeurRachat: '80000', versements: '65000', fondsEurosPct: 30, rendement: '5.2', clauseBeneficiaire: 'Standard' }],
        pers: [{ type: 'PER individuel', valeur: '42000', versementsVolontaires: '35000', modeSortie: 'Capital' }],
        comptesCourants: [{ etablissement: 'CIC', solde: '18000', titulaire: 'P1' }],
        partsSociales: [{ nomSociete: 'Petit Consulting SAS', formeJuridique: 'SAS', pctDetenu: '100', valeur: '180000' }],
        totalImmo: 460000,
        totalFinancier: 175950,
        totalAutres: 180000,
      },
      patrisim_bloc3: {
        aCredits: true,
        creditsImmo: [
          {
            bienFinance: 'Résidence principale Nantes',
            etablissement: 'CIC', typePret: 'Prêt amortissable classique',
            taux: '1.8', typeTaux: 'Fixe', montantInitial: '180000', crd: '120000',
            mensualiteHA: '980', mensualiteAssurance: '120',
            dateDebut: '2015-06-01', dureeInitiale: '20', garantie: 'Hypothèque',
          },
          {
            bienFinance: 'Appartement locatif Nantes',
            etablissement: 'CIC', typePret: 'Prêt amortissable classique',
            taux: '2.1', typeTaux: 'Fixe', montantInitial: '110000', crd: '72000',
            mensualiteHA: '620', mensualiteAssurance: '65',
            dateDebut: '2019-03-01', dureeInitiale: '20', garantie: 'Hypothèque',
          },
        ],
        creditsConso: [],
      },
      patrisim_bloc4: {
        p1Pro: { remunNette: '55000', dividendesSociete: '12000', cotisationsSociales: '12000' },
        revenusFonciersB: '11400',
        revenusFinanciers: '7600',
        mensualitesCredits: '1615',
        assurances: '450',
        abonnements: '200',
        fiscal: {
          anneeRevenus: '2024',
          rfr: '68000',
          revenuImposable: '60000',
          impotNet: '9800',
          nbParts: '3',
          prelevementsSociaux: '3200',
          tmi: 30,
          source: 'manuel',
        },
        depenses: [
          { id: 'loyer', label: 'Loyer / Charges habitation', montant: '2615', pct: '', mode: 'euro', prefilled: true, emoji: '🏠' },
          { id: 'transport', label: 'Transports', montant: '600', pct: '', mode: 'euro', prefilled: false, emoji: '🚗' },
          { id: 'nourriture', label: 'Alimentation', montant: '', pct: '8', mode: 'pct', prefilled: false, emoji: '🛒' },
          { id: 'invest', label: 'Investissement / Épargne', montant: '2000', pct: '', mode: 'euro', prefilled: false, emoji: '📈' },
          { id: 'loisirs', label: 'Loisirs & sorties', montant: '', pct: '5', mode: 'pct', prefilled: false, emoji: '🎭' },
          { id: 'sante', label: 'Santé & assurances', montant: '450', pct: '', mode: 'euro', prefilled: false, emoji: '🏥' },
          { id: 'abos', label: 'Abonnements', montant: '200', pct: '', mode: 'euro', prefilled: false, emoji: '📱' },
          { id: 'autres', label: 'Autres dépenses', montant: '', pct: '3', mode: 'pct', prefilled: false, emoji: '💳' },
        ],
        dcas: [
          { actif: 'ETF World', montantMensuel: '1000', depuis: '2019-01-01', plateforme: 'Boursorama' },
          { actif: 'ETF Nasdaq', montantMensuel: '500', depuis: '2021-06-01', plateforme: 'Boursorama' },
        ],
        aPension: false,
      },
      patrisim_bloc5: {
        retraiteP1: { ageDepartSouhaite: 60, regimes: ['SSI (ex-RSI, indépendants)'], pensionConnue: false, revenusCibles: 5000, aTransmission: true, montantTransmission: '500000', patrimoineCouvrir: '1500000' },
        aProjects: true,
        projets: [
          { id: '1', horizon: 'Long terme (8 ans+)', type: 'Investissement locatif', montant: '300000', financement: ['Crédit', 'Épargne existante'], priorite: 'Important', collapsed: false, description: 'Immeuble de rapport', budgetMode: 'precis', montantMin: '', montantMax: '' },
        ],
        capaciteEpargne: '2500',
        repartition: { precaution: 10, projetsCT: 10, retraite: 55, transmission: 25 },
        effortSupp: 500,
        horizonInvest: '15 ans+',
      },
      patrisim_bloc6: {
        mifidDone: true,
        reponses: { q1: 3, q2: 3, q3: 3, q4: 3, q5: 3, q6: 2, q7: 3 },
        objectifsSelectionnes: ['Réduire mes impôts', 'Préparer ma retraite', 'Atteindre un capital cible'],
        objectifsOrder: ['Réduire mes impôts', 'Préparer ma retraite', 'Atteindre un capital cible'],
        aConvictions: true,
        universInvest: ['PEA', 'ETF / Fonds indiciels', 'PER', 'Immobilier physique', 'Private equity', 'Assurance-vie'],
        prefGeo: 'Monde entier',
        prefESG: 'Critères ESG importants',
        secteursPriv: ['Technologie', 'Santé', 'Finance'],
        secteursExcl: ['Énergies fossiles'],
        liquiditePct: 10,
        suiviFrequence: 'Trimestrielle',
        modeConseil: 'Guidé (conseils puis je décide)',
      },
      patrisim_bloc7: {
        heritiers: [
          { id: '1', lien: 'Enfant commun', prenom: 'Léa', age: '10', situation: 'Vivant', prefilled: true },
          { id: '2', lien: 'Enfant commun', prenom: 'Hugo', age: '7', situation: 'Vivant', prefilled: true },
        ],
        testament: { aTestament: false },
        mandatProtection: false,
        clauseMatrimoniale: { aClause: true, type: 'Clause de préciput', description: 'Attribution du domicile conjugal au survivant' },
        aDonations: false, donations: [],
        aDemembrements: false, demembrements: [],
        clausesAV: [{ id: '1', nom: 'AV Luxembourg', compagnie: 'Generali', valeur: '145000', typeClause: 'Standard', prefilled: true, nuProprios: [] }],
        pacteDutreil: { aPacte: false },
        aSuccessionAttendue: false, successionsAttendues: [],
      },
      patrisim_bloc0: { objectif: 'fiscalite', niveauDetail: 'complet', done: true, _demoProfileId: 'self-employed-42' },
    }
  },
]

// ─── Fonction de chargement ───────────────────────────────────────────────────

export function loadDemoProfile(profileId: string): boolean {
  const profile = DEMO_PROFILES.find(p => p.id === profileId)
  if (!profile) return false

  // Vider les données existantes
  Object.keys(localStorage)
    .filter(k => k.startsWith('patrisim'))
    .forEach(k => localStorage.removeItem(k))

  // Charger les nouvelles données
  Object.entries(profile.data).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value))
  })

  // Vider le cache d'analyse pour forcer une nouvelle analyse IA
  localStorage.removeItem('patrisim_analyse')

  return true
}

// Pré-charge un résultat IA en cache pour éviter un appel API
// Utile pour les démos sans consommer de crédits
export function loadDemoProfileWithCache(profileId: string, cachedResult: unknown): boolean {
  const ok = loadDemoProfile(profileId)
  if (!ok) return false
  if (cachedResult) {
    localStorage.setItem('patrisim_analyse', JSON.stringify({
      data: cachedResult,
      ts: Date.now(),
    }))
  }
  return true
}

// ─── Page Demo ────────────────────────────────────────────────────────────────

const PROFILE_METRICS: Record<string, { revenus: string; patrimoine: string; tmi: string }> = {
  'couple-50':    { revenus: '6 000 €/mois',  patrimoine: '350 000 €', tmi: '30%' },
  'celibataire-35': { revenus: '3 000 €/mois', patrimoine: '78 000 €',  tmi: '30%' },
  'retraite-65':  { revenus: '2 800 €/mois',  patrimoine: '820 000 €', tmi: '11%' },
  'tns-42':       { revenus: '5 600 €/mois',  patrimoine: '740 000 €', tmi: '45%' },
}

const FILTERS = ['Tous', 'Retraite', 'Fiscalité', 'Succession'] as const
type Filter = typeof FILTERS[number]

const OBJECTIVE_TO_RECOMMENDED: Record<string, string> = {
  retraite:   'couple-50',
  succession: 'retraite-65',
  fiscalite:  'tns-42',
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
    loadDemoProfile(profileId)
    setTimeout(() => navigate('/bloc1'), 1500)
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
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {profile.tags.map(tag => (
                    <span key={tag} className="text-[11px] bg-[#E6F1FB] text-[#0C447C] px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#185FA5] font-medium">
                  Charger ce profil <ArrowRight size={13} />
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