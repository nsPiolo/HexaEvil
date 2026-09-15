# 07 · Tests E2E Playwright (ergonomie et lisibilité)

## Objectif

Vérifier automatiquement les **critères d'acceptation d'ergonomie** des specs 01 à 06 — ce que le joueur voit, lit et manipule — pas les règles de course (déjà couvertes par les tests Vitest du noyau). Un test E2E de ce fichier échoue quand une information cesse d'être visible, lisible ou atteignable, même si la logique reste juste.

## Outillage

- `@playwright/test` en **devDependency** (la contrainte « React seul » du README porte sur le runtime, pas sur l'outillage de test).
- Environnements où le téléchargement de navigateurs est bloqué : utiliser le Chromium préinstallé — respecter `PLAYWRIGHT_BROWSERS_PATH` s'il est défini, sinon `executablePath` vers le Chromium système ; ne jamais exiger `npx playwright install` dans le flux de test.
- `playwright.config.ts` : `webServer: { command: 'npm run dev', port: 5183, reuseExistingServer: true }` ; projet unique Chromium ; viewport par défaut 1440×900.
- Scripts npm : `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`.
- Les tests vivent dans `e2e/` (à la racine de `Proto4Html/`), un fichier par spec : `e2e/01-jauge.spec.ts`, `e2e/02-navigation.spec.ts`, etc.

## Prérequis de testabilité (petits changements au proto)

- **T1 — Graine par URL** : `useRace` tire une graine aléatoire (`useState(randomSeed)` dans `useRace.ts`). Ajouter la lecture d'un paramètre d'URL `?seed=NNN` (et le propager aux courses suivantes) : avec une graine fixée, dés, vitrine et course sont **entièrement déterministes** (mulberry32, `core/rules/rng.ts`). La graine est déjà affichée dans le log de course — la garder.
- **T2 — Départ direct** : paramètre d'URL `?e2e=1` qui pré-remplit `localStorage` (options : vitesse ×4, intro non nécessaire) et démarre un nouveau run directement sur l'écran de jeu, sans splash de 5 s ni dialogue d'intro. Alternative acceptable : les tests cliquent « Passer l'introduction » et le splash est abrégé au clic (comportement existant) — mais le paramètre rend les tests plus rapides et plus stables.
- **T3 — `data-testid` sobres** sur les éléments que les tests ne peuvent pas viser par rôle+libellé sans ambiguïté : `money-gauge`, `tab-bets`, `tab-shop`, `drawer-bets`, `drawer-shop`, `die-soul-{i}`, `die-dist-{i}`, `combo-{i}`, `ghost-token`, `token-{soulId}`, `results-modal`, `bet-ticket-{i}`, `phase-strip`. Tout le reste se sélectionne par rôle ARIA et texte.
- **T4 — Horloge pilotable** : les délais (révélation des tickets 06/C1, pulse 05/C5, retour du bouton de confirmation 04/C4) doivent être testables avec `page.clock` (Playwright ≥ 1.45) : ne pas capturer `Date.now`/`setTimeout` d'une façon qui l'empêche.

## Conventions (c'est ici que se joue la lisibilité)

1. **Sélectionner par rôle et libellé d'abord** (`getByRole('button', { name: 'Poser le pari' })`) : si un test ne trouve plus un élément par son libellé, c'est un vrai défaut d'ergonomie (bouton devenu div, libellé disparu). Les `data-testid` sont le recours, pas la norme.
2. **Toute information d'état doit exister en texte** : les assertions vérifient le texte (« en bonne voie », « gagné +40 », « Verrouillé · rang 2 »), jamais seulement une classe CSS ou une couleur. C'est le test mécanique de la règle « jamais une info portée que par la couleur ».
3. **Zéro `waitForTimeout`** : attendre des états (`toBeVisible`, `toHaveText`), piloter le temps avec `page.clock`, jouer à vitesse ×4.
4. Chaque test porte en commentaire la référence du critère qu'il vérifie (ex. `// 03/AC1`).

## Scénarios

### `01-jauge.spec.ts` — la jauge des trois usages

- **E2E-01-A** (01/AC1) : la jauge est présente et identique (même testid, mêmes valeurs) à quatre endroits : HUD, panneau de paris ouvert, boutique ouverte, modale de résultats.
- **E2E-01-B** (01/AC2) : à 87/200, la jauge affiche « encore 113 ¤ à trouver » en texte ; poser un pari de 20 la fait passer à 67 sans recharger.
- **E2E-01-C** (01/AC4) : en avertissement, « Poser le pari » et « Acheter » restent activables jusqu'à solde insuffisant réel.

### `02-navigation.spec.ts` — Pari ↔ Boutique

- **E2E-02-A** (02/AC1) : deux paris posés (10 + 20), panneau replié : l'onglet affiche exactement « Paris (2) · 30 ¤ misés ».
- **E2E-02-B** (02/AC2) : sans pari, cliquer l'onglet Boutique ouvre le panneau sur le message d'état vide (texte vérifié) ; poser un pari fait apparaître la vitrine sans re-clic.
- **E2E-02-C** (02/AC3) : remplir un ticket (type + âme + mise) sans le poser, ouvrir la boutique, revenir : les trois choix sont intacts.
- **E2E-02-D** (02/AC4) : après « Lancer la course », l'onglet Boutique n'existe plus ; l'onglet Paris existe jusqu'à la fin de course.
- **E2E-02-E** (02/AC5) : viewport 1024×768 : ouvrir la boutique replie le panneau de paris (et réciproquement) ; le plateau (`Board`) reste entièrement dans le viewport (bounding box vérifiée).

### `03-paris.spec.ts` — le ticket

- **E2E-03-A** (03/AC1) : Vainqueur + âme + mise 20 : le pied affiche « Gain potentiel : +40 ¤ (×3) » et « Solde après mise » ; changer la mise à 50 met à jour les deux lignes.
- **E2E-03-B** (03/AC2) : type Duel : cliquer deux jetons sur le plateau remplit les slots dans l'ordre ; recliquer le premier le retire ; un clic sur une troisième âme est sans effet.
- **E2E-03-C** (03/AC3) : une âme au-delà du seuil (course avancée, graine dédiée) est désactivée côté chips **et** côté jetons, avec la même explication (`title`).
- **E2E-03-D** (03/AC4) : « Retirer » en préparation ré-augmente le compteur de pièces de la mise exacte ; après lancement, le bouton n'existe plus.
- **E2E-03-E** (lisibilité) : les paris verrouillés sont visibles, `disabled`, et portent le nom du grade en texte (« Contremaître ») — pas seulement un cadenas.

### `04-boutique.spec.ts` — la vitrine

- **E2E-04-A** (04/AC1) : avec une graine produisant un objet ⚠ en vitrine : bandeau « DANGER », contrepartie visible en texte ; l'ordre gauche→droite va du plus sûr au plus dangereux (comparaison des bandeaux).
- **E2E-04-B** (04/AC3) : objet ≥ seuil : premier clic → le bouton devient « Confirmer {prix} ¤ » ; second clic → achat (solde vérifié) ; sans second clic, retour à « Acheter » après 3 s (`page.clock.fastForward`).
- **E2E-04-C** (04/AC4) : flux de remplacement de dé : chaque option affiche les faces actuelles, une flèche, les nouvelles faces.
- **E2E-04-D** (04/AC5) : objet trop cher : nom, description et faces restent visibles et contrastés ; seul le prix est marqué et le bouton `disabled`.

### `05-course.spec.ts` — association, file, prévisualisation

- **E2E-05-A** (05/AC1) : former 3 combinaisons (clic-clic) ; `×` sur la 2e la retire et ses dés redeviennent activables ; `→` sur la 1re échange l'ordre ; refaire la même chose **entièrement au clavier** (Tab + Entrée).
- **E2E-05-B** (05/AC2) : graine fixée : le fantôme est visible sur une case précise ; « Résoudre » : l'âme finit **exactement** sur la case du fantôme (comparaison des positions AVANT/APRÈS via la légende « case N » — c'est le test croisé preview/move côté UI).
- **E2E-05-C** (05/AC5) : frise : « ordonner » actif pendant l'appariement, « adversaire » pendant la paire adverse.
- **E2E-05-D** (05/AC6) : survoler un dé Âme allume le jeton correspondant (classe/testid) ; quitter le survol l'éteint.
- **E2E-05-E** (05/AC7) : appariement complet + `page.clock.fastForward(5000)` : « Résoudre » porte l'état « pulse » ; cliquer un dé le retire.
- **E2E-05-F** (lisibilité) : chaque événement de course produit un texte dans `last-event` (aria-live) — percussion, échange, franchissement — vérifié sur une graine qui produit une collision.

### `06-gains.spec.ts` — la modale de résultats

- **E2E-06-A** (06/AC1) : 3 paris posés, course jouée en auto (bouton `auto` du HUD ou enchaînement piloté) : la modale montre le classement, puis les tickets se révèlent un à un (`page.clock`), le compteur de net progresse ; un clic révèle tout ; fermer par « Voir la table » puis rouvrir par « Gains » : tout est révélé, la séquence ne rejoue pas.
- **E2E-06-B** (06/AC3) : jauge de la modale : « encore {X} ¤ à trouver en {N} course(s) » avec X et N exacts pour la graine et le cercle courants.
- **E2E-06-C** (06/AC4) : deux âmes classées sur la même colonne (graine dédiée, à trouver et **figer en constante de test** avec un commentaire) : la ligne « départage : même colonne, le couloir le plus bas devant » apparaît entre leurs rangs, une seule fois.
- **E2E-06-D** (lisibilité) : chaque ticket révélé énonce en texte son état et son net (« gagné +40 » / « perdu −10 ») — jamais la couleur seule.

## Graines de référence

Les scénarios qui dépendent du hasard (collision, âme au-delà du seuil, objet ⚠ en vitrine, départage) utilisent des graines **cherchées une fois puis figées** dans `e2e/seeds.ts`, chacune documentée (« seed 421337 : collision au tour 2, âme 3 percute âme 1 »). Si un changement de règles invalide une graine, le test doit échouer avec un message clair invitant à re-chercher la graine, pas silencieusement passer.

## Critères d'acceptation de cette spec

- [ ] `npm run test:e2e` passe en local **sans accès réseau** (navigateur préinstallé, aucun téléchargement).
- [ ] Chaque critère d'acceptation coché des specs 01 à 06 a au moins un test E2E qui le référence en commentaire ; la correspondance est visible en grepant `\d\d/AC` dans `e2e/`.
- [ ] Aucun `waitForTimeout` dans `e2e/` ; les délais passent par `page.clock` ou des assertions d'état.
- [ ] Les tests échouent si un libellé d'état devient purement visuel (suppression du texte) — vérifié en revue : chaque assertion d'état est textuelle.
- [ ] Un test volontairement cassé (ex. renommer « Poser le pari ») échoue avec un message compréhensible.

## Hors périmètre

Tests de la logique de course (Vitest), tests visuels au pixel (screenshot diffing — à reconsidérer quand la DA sera posée), audit axe-core complet (peut s'ajouter plus tard en P3 via `@axe-core/playwright`), tests mobiles/tactiles.
