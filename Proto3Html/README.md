# Proto 3 — « 4-21 des Enfers »

Prototype jouable de la mécanique décrite dans
[`../docs/proto3/GDD.md`](../docs/proto3/GDD.md) : un 4-21 en duel, précédé de
batailles de cartes, dans un run roguelike à travers 9 Cercles où **une seule
défaite termine tout**.

React + TypeScript, hors Unity. Aucune dépendance au-delà de React.

```bash
npm install
npm run dev        # http://localhost:5182
npm test           # 103 tests
npm run measure    # mode lot : joue 600 runs et imprime les chiffres du §17
npm run build
```

## Ce qu'on teste

Les quatre questions du §Objet du GDD. La plus urgente est la quatrième :
**la boucle d'amélioration a-t-elle le temps de tourner** dans un roguelike où
un run raté ne dure que deux parties ? `npm run measure` répond.

## Organisation

```
config/gameplay.json     toute valeur de gameplay (G1) — rien en dur dans le code
src/core/                le moteur, sans une ligne d'affichage (ADR-0003)
  config/                chargement + validation qui nomme le champ fautif (G2)
  cards/                 decks, mains, classement par taille de main (C11, C12)
  dice/                  dés gravables, montée de dé, barème (V1, V2, F1-F9)
  ai/                    les démons (I1-I7)
  rules/
    match.ts             une partie entière, écrite en générateur
    run.ts               le run, les Cercles, la boutique
    trace.ts             les étapes émises pour l'affichage (U2)
    autoplay.ts          pilote automatique : tests et mode lot
src/presentation/        React. Ne fait que rejouer la trace dans le temps.
```

**Le moteur est un générateur.** La séquence d'une partie (`S1`) se lit
linéairement de haut en bas dans `match.ts`, et chaque décision humaine est un
`yield`. Les démons répondent aux mêmes questions sans interrompre le flux.

**Le moteur ne connaît pas l'affichage.** Il émet une trace d'étapes, chacune
portant l'état visible qu'elle produit (pot, piles de jetons). La présentation
la rejoue avec une durée par type d'étape et une vitesse réglable — c'est ce
qui rend les transitions visibles (`U1`), exigence forte du brouillon.

## Ce qui est implémenté

Tout le corps de règles du GDD : les 5 batailles en deux séries, les 10
récompenses avec leurs moments d'application, les deux phases du 4-21 avec le
plafond du meneur et l'annonce du dernier jet, le barème généralisé à tous les
dés, la nénette, la gravure et la montée de dé, la boutique, les points de
forge, le run et sa mort sèche.

## Ce qui n'y est pas

3D, art, caméra, sauvegarde d'un run, personnalisation des démons (`S4b`),
méta-progression entre runs au-delà du meilleur Cercle atteint.

## Ce que la mesure dit (200 runs par ligne)

| | victoire au C1 | parties par run | Cercle max | runs complets |
| --- | --- | --- | --- | --- |
| joueur au niveau des démons | 86,7 % | 7,8 | 8 | 0 % |
| joueur expert, sans achats | 89,3 % | 11,1 | 9 | 0,5 % |
| joueur expert, achats gloutons | 91,5 % → 100 % | 14,0 | 9 | **6 %** |

Trois réglages successifs, mesurés à chaque fois :

| | victoire au C1 | parties par run | runs complets |
| --- | --- | --- | --- |
| règles d'origine | 52 % | 2,1 | 0 % |
| `D5` ouvert + 4 dés pour le joueur | 80,6 % | 5,0 | 0 % |
| « Prendre » retiré, don immédiat | 86,7 % | 7,8 | 6 % |

Le verrouillage circulaire décrit au §17 du GDD — pour s'équiper il faut un run
long, pour avoir un run long il faut être équipé — est levé. Les parties durent
6 à 7 manches et 29 à 32 jets, deux fois moins qu'aux règles d'origine.

`S5` (le niveau des démons monte avec le Cercle) ne fonctionne que depuis qu'il
porte sur **le choix des dés à garder** : sur les seules mains de cartes, il ne
changeait rien — les parties se décident aux dés.
