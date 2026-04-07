# PatriSim — Résumé de session · Avril 2026

> Dernière mise à jour : 2026-04-06  
> Environnement : Windows 11 · Node/Vite · branche `main`

---

## Stack technique

| Couche | Outil |
|--------|-------|
| Framework UI | React 18 + TypeScript |
| Build | Vite 8 |
| Styles | Tailwind CSS (classes utilitaires) |
| Animations | Framer Motion (`motion`, `AnimatePresence`) |
| Charts | Recharts (`PieChart`, `ResponsiveContainer`) |
| Routing | React Router DOM v6 |
| Persistence | `localStorage` uniquement (aucun backend) |
| Types IA | `import.meta.env.DEV` pour blocs dev-only |
| Déploiement | Vite `dist/` (statique) |

Pas de base de données, pas d'API, pas de session serveur. Tout est client-side.

---

## Architecture navigation

**Fichier central : `src/utils/navigation.ts`**

```
getBlocsActifs() → number[]   (lecture localStorage patrisim_bloc0)
getNextBloc(n)  → string      (prochain bloc actif ou '/analyse')
getPrevBloc(n)  → string      (bloc précédent ou '/start')
isLastBloc(n)   → boolean
```

### Matrice des parcours actifs (état avril 2026)

| Objectif | Mode rapide | Mode complet |
|----------|-------------|--------------|
| `bilan` | 1-2-3-4-5-6-7 | 1-2-3-4-5-6-7 |
| `retraite` | **1-2-4-5** | **1-2-3-4-5** |
| `fiscalite` | 1-2-3-4 | 1-2-3-4 |
| `succession` | 1-2-7 | 1-2-7 |
| `investissement` | 1-2-6 | 1-2-6 |
| `immobilier` | 1-2-3 | 1-2-3 |
| `protection` | 1-4 | 1-3-4 |
| `objectif` | 1-4-5-6 | 1-3-4-5-6 |

> Règles `complet` : si has(4)→add(3) · si has(5)→add(4) · si has(7)→add(2)

---

## État des modules (avril 2026)

### Bloc 0 — Sélection objectif
- **Statut** : ✅ Fonctionnel
- 4 parcours actifs : `retraite`, `bilan`, `fiscalite`, `succession`
- 4 modules verrouillés (v2) : `investissement`, `immobilier`, `protection`, `objectif`
- Sélection niveau de détail : rapide / complet
- Stockage : `patrisim_bloc0` → `{ objectif, niveauDetail, done }`

### Bloc 1 — Profil civil
- **Statut** : ✅ Fonctionnel
- Mode solo / couple
- Personne 1 & 2 : état civil, âge, situation pro
- Foyer : régime matrimonial, enfants
- Stockage : `patrisim_bloc1_mode`, `patrisim_bloc1_p1`, `patrisim_bloc1_p2`, `patrisim_bloc1_foyer`, `patrisim_bloc1_pro1`, `patrisim_bloc1_pro2`

### Bloc 2 — Actif patrimonial
- **Statut** : ✅ Fonctionnel · 🔧 Modifié cette session
- Section A : Immobilier (RP, autres biens, SCPI en direct)
- Section B : Actif financier (CC, livrets, PEA, CTO, AV, PER, épargne salariale, crypto, autres)
- Section C : Autres actifs (véhicules, art, forêts, parts sociales)
- **Nouveau** : masquage conditionnel `isRetraite` — SCPI, Crypto, AutresPlacements, section C et LocationFields masqués en parcours retraite
- Version rapide : saisie totaux globaux uniquement
- Stockage : `patrisim_bloc2`

### Bloc 3 — Passif & dettes
- **Statut** : ✅ Fonctionnel
- Crédits immobiliers, conso, autres
- Calcul CRD, mensualités, taux d'endettement
- Stockage : `patrisim_bloc3`, `patrisim_bloc3_calc`

### Bloc 4 — Flux & fiscalité
- **Statut** : ✅ Fonctionnel
- Revenus (salaires, BNC, foncier, autres)
- Dépenses & charges récurrentes
- Fiscalité : TMI, taux moyen, plafond PER
- Composant `SyntheseButton` réutilisable
- Stockage : `patrisim_bloc4`

### Bloc 5 — Projets & retraite
- **Statut** : ✅ Fonctionnel
- Projets financiers libres
- Simulation retraite : âge départ, pension estimée, déficit, capital cible
- Stockage : `patrisim_bloc5`

### Bloc 6 — Profil investisseur
- **Statut** : ✅ Fonctionnel
- Horizon de placement, tolérance au risque, objectifs de rendement
- Scoring profil (défensif → dynamique)
- Stockage : `patrisim_bloc6`

### Bloc 7 — Succession
- **Statut** : ✅ Fonctionnel
- Héritiers, abattements, droits estimés
- Optimisations (donations, assurance-vie)
- Stockage : `patrisim_bloc7`

### Analyse
- **Statut** : ✅ Fonctionnel (rendu sans IA)
- Score global, points forts/attention, recommandations
- Stockage lecture : `patrisim_analyse`
- Accès dev direct via bloc DEV ONLY sur Landing.tsx

### Dashboard
- **Statut** : ✅ Présent · 🚧 Partiellement implémenté
- Vue synthèse multi-modules
- 6 modules prévus, tous non implémentés côté données

### Landing / Demo / Start
- **Statut** : ✅ Fonctionnels
- Landing : bloc DEV ONLY ajouté (cette session) pour accès `/analyse` sans IA
- Demo : parcours fictif animé → redirige vers `/bloc1`

---

## Bugs corrigés — session avril 2026

| # | Fichier | Bug | Correction |
|---|---------|-----|-----------|
| 1 | `Sidebar.tsx` | `.sort()` sans comparateur numérique | → `.sort((a, b) => a - b)` |
| 2 | `Bloc0.tsx` | `getBlocsRequired()` : dead code, incomplète (manquait 4 cas) | Supprimée |
| 3 | `src/vite-env.d.ts` | Fichier manquant → erreur TS sur `import.meta.env` | Créé (`/// <reference types="vite/client" />`) |
| 4 | `navigation.ts` + `Sidebar.tsx` | Parcours `retraite` n'incluait pas bloc 2 | `blocs.add(2)` ajouté → retraite = [1,2,3,4,5] en complet |
| 5 | `Bloc2.tsx` | Parcours retraite affichait SCPI, crypto, autres actifs non pertinents | Masquage conditionnel `isRetraite` sur 4 sections + `hideLocation` prop sur BienCard |
| 6 | `Landing.tsx` | Aucun moyen d'accéder à `/analyse` sans passer par tous les blocs | Bloc DEV ONLY injecté (`import.meta.env.DEV`) avec fakeResult localStorage |

---

## Conventions du projet

### Stockage localStorage
- Clé racine : `patrisim_bloc0` … `patrisim_bloc7`, `patrisim_analyse`
- Pattern load : `loadFromStorage<T>(key, fallback)` — toujours avec spread `{ ...fallback, ...parsed }`
- Sauvegarde : `useEffect(() => { localStorage.setItem(...) }, [state])` — auto à chaque changement

### Navigation
- **Ne jamais** hardcoder `navigate('/bloc3')` etc. dans les Blocs 1-7
- Toujours utiliser `getNextBloc(n)` / `getPrevBloc(n)` depuis `src/utils/navigation.ts`
- Exception légitime : `navigate('/bloc1')` depuis Bloc0, Analyse, Dashboard, Demo (bloc1 toujours actif)

### Composants UI internes (Bloc2, pattern répété)
- `Field`, `Input`, `Select`, `Toggle`, `Chips` — composants locaux inline dans chaque Bloc
- `FadeIn` — composant partagé dans `src/components/FadeIn.tsx`
- `Sidebar` — composant partagé dans `src/components/Sidebar.tsx`
- `SyntheseButton` — composant partagé dans `src/components/` (utilisé dans Bloc4)

### Typage
- `strict: false` dans tsconfig — projet non strict
- `skipLibCheck: true`
- Tous les types d'état définis en interface locale dans chaque Bloc (`Bloc2State`, etc.)

### Build
- `npm run build` = `tsc -b && vite build`
- Warning chunk >500KB attendu et non bloquant (tout le code est dans un seul bundle)
- Aucun test automatisé configuré

---

## Prochaines tâches prioritaires

### 1. Dashboard — 6 modules (priorité haute)
Implémenter les 6 blocs de synthèse du Dashboard :
- Patrimoine net (actif Bloc2 - passif Bloc3)
- Capacité d'épargne mensuelle (Bloc4)
- Score retraite (Bloc5)
- Profil investisseur synthèse (Bloc6)
- Exposition succession (Bloc7)
- Score fiscal (Bloc4 TMI + recommandations)

### 2. Cache IA — Profils démo (priorité moyenne)
- Pré-générer des résultats d'analyse pour 2-3 profils types (couple 45 ans, célibataire 30 ans, retraité)
- Stocker en JSON statique pour éviter les appels IA en demo/test
- Pattern : `if (isDemo) use cachedResult else callIA()`

### 3. Export PDF (différé v2)
- Génération d'un PDF récapitulatif de l'analyse complète
- Librairie pressentie : `@react-pdf/renderer` ou `jsPDF`
- Contenu : score, recommandations, tableau patrimonial, graphiques
- **Bloquant** : nécessite que l'analyse IA soit stable en v1 d'abord

---

## Fichiers à surveiller (dette technique)

| Fichier | Lignes | Risque |
|---------|--------|--------|
| `src/pages/Bloc2.tsx` | 1 356 | Très long — types + helpers + sous-composants + logique dans un seul fichier |
| `src/pages/Dashboard.tsx` | 1 193 | Idem |
| `src/pages/Bloc5.tsx` | 1 175 | Idem |
| `src/pages/Bloc7.tsx` | 1 076 | |

**Recommandation** : extraire les sous-composants dans `src/components/bloc2/`, `src/components/bloc5/` etc. lorsque la base sera stabilisée.

---

## Point de vigilance identifié

**`AnimatePresence` dans Bloc5.tsx** (ligne ~861) : les enfants directs sont des `<ProjetCard>` (composants custom), non des `motion.*`. L'animation `exit` ne se déclenchera pas à la suppression d'un projet. À corriger en wrappant avec `<motion.div key={p.id}>`.

---

*Généré automatiquement depuis l'état du dépôt — branche `main` — 2026-04-06*
