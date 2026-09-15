# 01 · Composants transverses

## Objectif

Donner au joueur, sur tous les écrans, la réponse immédiate à la question centrale du jeu : « où en suis-je par rapport au prix du cercle ? » — et unifier les codes visuels (verrouillage, états, vocabulaire) que les autres specs réutilisent.

Maquette de référence : la jauge apparaît en haut à droite sur `img/ecran-paris.png`, `img/ecran-boutique.png` et dans la modale de `img/resultats-gains.png`.

## État actuel

- Le HUD gauche (`GameScreen.tsx`, `hud-left`) affiche le prix du cercle en texte : `HUD.price` (« Prix du cercle : {price} pièces »).
- Le HUD droit affiche `{n} Pièces` (`hud-big money`) et le lien artefacts.
- `BetPanel` et `ShopPanel` affichent chacun le solde en tête (`.money`), sans lien avec le prix du cercle.
- `Ranking` affiche `argent : {money}` en fin de bilan, sans le prix du cercle.
- Le verrouillage par rang existe pour les paris (`type-locked`, `lock-badge` avec le nom du grade) — c'est le modèle à réutiliser.

## Cible

Un composant unique `MoneyGauge` (nouveau fichier `src/presentation/MoneyGauge.tsx`) affiché à l'identique aux quatre endroits : HUD droit (sous le compteur de pièces), tête du panneau de paris, tête de la boutique, pied de la modale de résultats.

```
[████████████░░░░░░░░░░]  87 / 200
 solde                    prix du cercle
```

- Barre horizontale : le remplissage représente `money / price` (plafonné à 100 %).
- **État normal** (`money >= price`) : remplissage doré, la portion au-delà du prix marquée d'un séparateur fin (c'est la « marge de jeu »).
- **État avertissement** (`money < price`) : remplissage ambre sur fond rouge pâle, texte du manque affiché à côté : « encore {missing} ¤ à trouver » (+ « en {n} course(s) » quand `Ranking` fournit le nombre de courses restantes du cercle). **Jamais bloquant** : c'est de l'information, pas une erreur.
- Au survol (title) : décomposition « Solde {money} · misé en course {staked} · prix du cercle {price} », où `staked` = somme des mises des paris `open` (`ui.bets`).
- L'information n'est pas portée que par la couleur : les valeurs `{money} / {price}` sont toujours en texte.

## Changements

- **C1 (P1)** — Créer `MoneyGauge({ money, price, staked, racesLeft? })` et l'intégrer : HUD droit de `GameScreen` (remplace la ligne texte `HUD.price` du HUD gauche, qui migre ici), header de `BetPanel`, header de `ShopPanel`, pied de `Ranking` (voir 06). Libellés dans `texts.ts` (`GAUGE.missing`, `GAUGE.tooltip`…).
- **C2 (P2)** — Animation courte du remplissage quand `money` change (achat, mise, gain) : transition CSS ~300 ms à vitesse ×1, mise à l'échelle par `options.speed`.
- **C3 (P2)** — Unifier le motif « verrouillé » : partout où un élément est fermé par le rang du stagiaire (paris déjà faits ; objets de boutique en 04), même rendu : cadenas 🔒 + nom du grade (`rankOfLevel(...).name`), élément visible et lisible, jamais masqué ni grisé anonymement. Extraire si utile un petit composant `LockBadge`.
- **C4 (P3)** — Glossaire minimal : les termes canon (percuter, échanger, zone de fin, combinaison, charge) reçoivent un `title` explicatif là où ils apparaissent (bulles du plateau, bilan). Une seule source : un objet `GLOSSARY` dans `texts.ts`.

## Critères d'acceptation

- [ ] La même jauge (même composant, même géométrie) est visible sur : table (HUD), panneau de paris ouvert, boutique ouverte, modale de résultats.
- [ ] À 87 pièces pour un prix de 200, la jauge est en avertissement et affiche « encore 113 ¤ à trouver » ; poser un pari de 20 la met à jour immédiatement (67).
- [ ] À 250 pièces pour un prix de 200, la jauge montre le prix couvert et la marge au-delà du séparateur.
- [ ] Aucune action n'est bloquée par l'état d'avertissement (on peut toujours miser/acheter jusqu'à 0).
- [ ] `npm run typecheck` et `npm test` passent ; aucun test du noyau modifié (composant purement présentation).

## Hors périmètre

Prévision de gains potentiels dans la jauge (les paris ouverts ne « comptent » pas comme de l'argent) ; historique d'évolution du solde.
