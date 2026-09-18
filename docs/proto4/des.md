# Dés spéciaux

Un dé spécial **remplace** un dé de départ ou **s'ajoute** au lancer (GDD §6.3).
Contrainte du proto : il faut toujours au moins autant de dés Âme que de dés
Distance. Ajouter un dé Distance impose donc d'avoir 3 dés Âme au moins, ce qui
est le cas de base (3 Âme / 2 Distance) : ajouter un troisième dé Distance
consomme le dé Âme « inutilisé ».

Les dés marqués ✔ sont implémentés dans `Proto4Html`.

Les faces des dés spéciaux peuvent ensuite être forgées (voir [`forge.md`](forge.md)).

## Récapitulatif

| # | Dé | Type | Faces | Mode | Impact | Prix | Rang |
|---:|---|---|---|---|---|---:|---:|
| 1 | Dé des Limbes ✔ | Distance | `1, 1, 2, 2` | remplace | Faible | 30 | 0 |
| 2 | Dé de la Colère ✔ | Distance | `-2, 0, 3, 4` | remplace | Moyen | 55 | 0 |
| 3 | Dé de Glace ✔ | Distance | `-1, -1, 2, 5` | remplace | Moyen | 60 | 2 |
| 4 | Dé de Prodigalité ⚠ ✔ | Distance | `2, 3, 3, 4` | remplace | Fort | 80 | 2 |
| 5 | Dé de Fraude ✔ | Distance | `1, 2, 3, ?` | remplace | Fort | 90 | 2 |
| 6 | Troisième dé Distance ✔ | Distance | `-1, 1, 2, 3` | ajoute | Fort | 100 | 2 |
| 7 | Dé Âme pipé | Âme | 2 faces d'une âme choisie | remplace | Moyen | 50 | 0 |
| 8 | Dé du Meneur | Âme | meneur / traînard / 3 âmes | remplace | Fort | 85 | 2 |
| 9 | Dé de Cerbère ⚠ | Âme + Distance | dé à 6 faces mixte | ajoute | Extrême | 160 | 4 |

**État du proto** : les six dés **Distance** (n° 1 à 6) sont implémentés. Les
trois dés **Âme** (n° 7 à 9) ne le sont pas : `rollPlayerDice` tire aujourd'hui
une âme au hasard (`rng.int(soulCount)`) sans objet « dé Âme » derrière. Les
modéliser est un chantier à part, qui débloquerait d'un coup ces trois dés et les
trois faces de dé Âme de [`forge.md`](forge.md).

## Fiches

### Dés Distance

**1. Dé des Limbes — 30, remplace.** Faces `1, 1, 2, 2`. Aucun recul, aucun
grand bond. *L'option prudente : les paris deviennent plus lisibles, les
retournements plus rares. Espérance 1,5 contre 1,25 pour le dé de base.*

**2. Dé de la Colère — 55, remplace.** Faces `-2, 0, 3, 4`. Même espérance que le
dé de base (1,25), variance bien plus forte. *Le `-2` fait reculer de deux cases
avec échange sur la case d'arrivée du recul ; le `4` percute souvent.*

**3. Dé de Glace — 60, remplace, rang 2.** Faces `-1, -1, 2, 5`. Un `5` sur
quatre faces, deux reculs. *Thème du cercle 9. C'est le dé des paris Vainqueur +
dernier exacts : il fabrique des extrêmes.*

**4. Dé de Prodigalité ⚠ — 80, remplace, rang 2.** Faces `2, 3, 3, 4`. Chaque
fois que ce dé est **associé**, le joueur paie 3 pièces ; s'il ne peut pas payer,
le dé vaut 0. *Le dé des riches : espérance 3, mais ~24 pièces par course. Il
transforme l'argent des paris en vitesse (inspi §3, ressource à usages multiples).*

**5. Dé de Fraude — 90, remplace, rang 2.** Faces `1, 2, 3, ?`. La face `?` prend
la valeur de **n'importe quelle face visible** sur les autres dés Distance du
lancer, y compris ceux de l'adversaire si un artefact les révèle. *Un dé qui
copie : avec le Dé de Glace à côté, `?` vaut souvent 5.*

**6. Troisième dé Distance — 100, ajoute, rang 2.** Un dé de base supplémentaire
`-1, 1, 2, 3`. Le lancer passe à 3 combinaisons ; le dé Âme inutilisé disparaît
(3 Âme / 3 Distance) sauf si l'on possède la Quatrième tête de Cerbère.
*Plus de déplacements par tour = courses plus courtes et plus de collisions. À
mesurer : le tour adverse pèse relativement moins.*

### Dés Âme

**7. Dé Âme pipé — 50, remplace.** À l'achat, le joueur choisit une âme : elle
occupe **deux faces** du dé, une autre âme (au choix) disparaît du dé. Le choix
peut être refait à chaque début de cercle pour 10. *Contrôle faible mais
permanent : l'âme choisie sort deux fois plus souvent sur ce dé.*

**8. Dé du Meneur — 85, remplace, rang 2.** Faces : `Meneur`, `Traînard`, et
trois âmes fixes (les autres sont retirées). `Meneur` et `Traînard` désignent
l'âme en tête ou en queue **au moment de la résolution** de la combinaison. *Un
dé qui lit le plateau : l'ordre des combinaisons décide de sa cible. Avec 6 âmes
ou plus, une face « âme aléatoire parmi les absentes » remplace la troisième âme fixe.*

**9. Dé de Cerbère ⚠ — 160, ajoute, rang 4.** Dé à six faces mixte, lancé en plus
du lancer normal : `Âme +1`, `Âme +2`, `Âme -1`, `Adversaire relance`, `Rien`,
`Morsure`. Les faces `Âme ±n` désignent une âme aléatoire et s'appliquent avant
vos combinaisons (le joueur ne choisit ni l'âme ni l'ordre). `Adversaire relance`
: l'adversaire lance une paire de plus ce tour. `Morsure` : l'âme en tête recule
de 2. *Un dé que le joueur ne contrôle pas du tout, qui ajoute du chaos payant :
plus de collisions pour la Bourse percée, plus de retournements pour le Martyr.
C'est l'objet « je joue autrement ce run » (inspi §5).*

## Compositions à tester

| Composition | Question |
|---|---|
| Limbes + base | le joueur qui sécurise gagne-t-il moins mais plus souvent ? |
| Colère + Glace | les courses de 14 cases finissent-elles en 5 tours ? |
| Prodigalité + Comptable + Dorée | l'économie de course s'auto-alimente-t-elle ? |
| Meneur + Face du meneur (forge) | le joueur peut-il viser la tête à chaque tour ? Trop fort ? |
| Cerbère seul | le chaos supplémentaire est-il amusant ou frustrant ? |

## Sources d'inspiration

- Variance de dés et faces typées : [Dice Legends (Steam)](https://store.steampowered.com/app/3112170/Dice_Legends/).
- Un dé par cheval et déplacement secondaire : [Long Shot: The Dice Game (règles)](https://tesera.ru/images/items/1868785/Long_Shot_DG_Rules_Booklet_4.1.pdf).
