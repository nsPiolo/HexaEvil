# HexaEvil : à lire avant de toucher au code

Le jeu jouable est dans `Proto4Html/` (React + TypeScript, Vite, aucune dépendance
runtime au-delà de React). La conception vit dans `docs/proto4/` : le GDD, les specs
d'écran, le vocabulaire. Ce fichier ne répète pas ces documents, il liste ce qu'on
oublie et qu'on regrette.

## Écrire les textes du jeu

**Jamais de tiret cadratin `—` dans un texte lu par le joueur.** C'est une demande
explicite et elle vaut pour `texts/fr.ts`, `texts/en.ts`, `config/*.json` et
`config/i18n/*.json`. Selon ce que la phrase fait, remplacer par :

| Envie | Écrire |
| --- | --- |
| annoncer, expliciter | `:` |
| séparer deux propositions | `;` ou `,` |
| incise | des parenthèses, ou deux virgules |
| séparer deux morceaux d'un même intitulé | `·` (déjà le séparateur maison) |
| suspendre | `…` |

Les commentaires de code ne sont pas concernés : ils ne sont pas lus par le joueur.

Autres règles de texte :

- **Le français est la langue de référence.** Toute clé naît dans
  `src/presentation/texts/fr.ts` ; `Pack` se déduit du français, donc une clé oubliée
  dans `en.ts` est une erreur de compilation, pas un trou à l'écran.
- **Deux réserves de texte**, et la séparation est volontaire (`docs/proto4/i18n.md`) :
  le lexique d'écran dans `src/presentation/texts/<langue>.ts`, les noms attachés à des
  nombres (âmes, cercles, boss, terrains, objets) dans `config/` avec la couche anglaise
  dans `config/i18n/en.json`.
- **Le noyau ne rédige pas.** `src/core/` renvoie des codes (`{ id: 'bite', value: 1 }`) ;
  `src/presentation/messages.ts` en fait une phrase. Un moteur qui écrit du français
  parle français à un joueur anglais.
- **Vocabulaire canon** : percuter, échanger, zone de fin, combinaison, couloir, dé Âme,
  dé Distance. `docs/proto4/vocabulaire-interface.md` tranche les cas douteux.

## Contraintes de structure

- **Le noyau reste pur** : `src/core/**` sans React ni DOM, couvert par Vitest.
- **Aucune dépendance runtime nouvelle.** React seul. L'outillage de test est en
  devDependency.
- **Rien en dur** : tout seuil, durée ou prix va dans `config/race.json` ou
  `config/shop.json`, accompagné d'un `_comment` qui dit pourquoi cette valeur.
- **Vitesse d'animation** : toute animation nouvelle respecte `options.speed` (×0,5 à ×4).
- **Accessibilité** : jamais une information portée par la seule couleur ; de vrais
  `<button>` ; les `aria-label` existants se conservent. Quand un texte disparaît de
  l'écran au profit d'un signe, le garder en `aria-label` et en `title`.
- **CSS** : `src/index.css`, un seul fichier, classes à plat. Attention aux collisions de
  noms (`.race-dot` existait déjà sur la carte quand la frise du HUD est arrivée) et à
  l'ordre du cascade entre deux règles de même spécificité.
- **Images** : `public/objets/<id>.webp` pour les objets de boutique, le nom du fichier
  est l'id dans `config/shop.json`. Rien à déclarer dans le code.

## Commentaires

Les commentaires de ce projet sont en français et expliquent **pourquoi**, pas quoi :
la règle de jeu derrière le code, la contrainte qui a fait écarter l'autre solution, le
piège qu'on vient de réparer. Un commentaire qui paraphrase la ligne suivante est du
bruit. C'est le style du fichier d'à côté : s'y tenir.

## Vérifier avant de dire que c'est fait

```bash
cd Proto4Html
npm run typecheck     # tsc --noEmit
npm test              # Vitest, le noyau
npm run test:e2e      # Playwright, ce que le joueur voit
```

Et, pour tout changement visible : **le regarder tourner**. Un test e2e jetable qui
lance `start(page, { seed, race })` et prend une capture de l'élément touché coûte
quelques secondes et évite d'annoncer un rendu qu'on n'a pas vu. Le supprimer ensuite.
Paramètres d'URL utiles : `?e2e=1`, `&seed=`, `&race=` (index global de course, base 0),
`&money=`, `&speed=`, `&lang=en`.

Quand un changement retire du texte ou une classe, chercher qui s'appuyait dessus :
les specs e2e sélectionnent volontiers par libellé.

## Documentation

Les specs `docs/proto4/specs/` sont écrites en delta de l'existant : ne pas réécrire ce
qui marche. Quand un écran change, mettre à jour la page qui le décrit
(`docs/proto4/interface.md` pour la disposition, la spec numérotée pour le détail).
