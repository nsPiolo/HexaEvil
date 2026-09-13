# Boutique — vue d'ensemble et repères de prix

Ces fichiers listent le contenu achetable du proto 4 (GDD §6). Ils servent de
réservoir : tout n'a pas vocation à être implémenté d'un coup, et chaque chiffre
est un point de départ pour la configuration du POC (GDD §9.1).

| Fichier | Contenu | Minimum demandé | Fourni |
|---|---|---:|---:|
| [`personnalites.md`](personnalites.md) | Personnalités à donner aux âmes | 10 | 14 |
| [`artefacts.md`](artefacts.md) | Passifs permanents du run | 20 | 27 |
| [`forge.md`](forge.md) | Altérations de face de dé | 10 | 14 |
| [`des.md`](des.md) | Dés spéciaux | 4 | 9 |
| [`cartes.md`](cartes.md) | Cartes action consommables | 50 | 60 |

## Hypothèses économiques

L'argent sert à parier, acheter et payer le prix du cercle : une même pièce a
trois usages concurrents, ce qui est voulu (inspi §3). Les prix ci-dessous
supposent l'échelle suivante, à recaler dès que les paris seront mesurés :

| Repère | Valeur supposée |
|---|---:|
| Capital initial | 100 |
| Mise typique d'un pari | 10 à 30 |
| Gain net d'une course bien lue | 40 à 120 |
| Prix du cercle 1 | 100 |
| Prix du cercle 5 | 400 |
| Prix du cercle 9 | 1 000 |

Les prix indiqués sont ceux du cercle 1. Règle de progression proposée :
**prix × (1 + 0,25 × (cercle − 1))**, arrondi à 5, pour que la boutique reste un
choix douloureux face au prix du cercle.

## Échelle d'impact

Chaque objet porte une étiquette d'impact qui justifie son prix :

| Impact | Sens | Fourchette de prix (cercle 1) |
|---|---|---:|
| Faible | Ajuste une valeur, une fois | 5 à 20 |
| Moyen | Change une lecture ou un comportement de course | 20 à 60 |
| Fort | Change la façon de jouer un cercle entier | 60 à 150 |
| Extrême | Casse une règle fondamentale, à charges limitées | 150 à 250 |

## Trois options par vitrine

Pour respecter la tension prudente / ambitieuse / dangereuse (inspi §6), chaque
vitrine de boutique devrait proposer au moins :

- un objet **sûr** (Faible ou Moyen, sans contrepartie) ;
- un objet **ambitieux** (Fort, souvent conditionnel) ;
- un objet **dangereux** (avec contrepartie explicite, marqué ⚠ dans les listes).

## Déblocage par la hiérarchie du stagiaire

Le démon stagiaire monte en grade quand son poulain progresse (GDD §5.2). Les
listes indiquent un **rang** minimal quand il y en a un :

| Rang | Obtenu | Débloque |
|---|---|---|
| 0 — Stagiaire | départ | cartes communes, forge de base, un dé spécial |
| 1 — Assistant | boss du cercle 1 battu | personnalités (1 par course), artefacts communs |
| 2 — Tourmenteur | boss du cercle 3 battu | 2 personnalités par course, dés rares, forge avancée |
| 3 — Contremaître | boss du cercle 5 battu | 3 personnalités, artefacts rares, modification du circuit |
| 4 — Sous-directeur | boss du cercle 7 battu | tout, y compris les objets ⚠ extrêmes |

## Vocabulaire commun

- **Percuter** : atterrir en avançant sur une case occupée → saut devant (GDD §2.6).
- **Échanger** : atterrir en reculant sur une case occupée → échange de place.
- **Zone de fin** : cases à partir du seuil 60 %, où l'on ne parie plus.
- **Combinaison** : un dé Âme associé à un dé Distance, résolue dans l'ordre choisi.
- **Dé Âme inutilisé** : le dé Âme qui n'a pas été associé (3 dés Âme pour 2 Distance).
- **Tour adverse** : la ou les paires lancées par l'ordinateur après le joueur.
- **Charge** : nombre d'utilisations restantes d'un objet limité.

## Sources externes consultées

- [Camel Up — règles](https://www.ultraboardgames.com/camel-up/game-rules.php) et [Geeky Hobbies](https://www.geekyhobbies.com/camel-up-board-game-review-and-rules/) : empilement des chameaux, tuiles de spectateur, tickets de pari dégressifs.
- [Long Shot: The Dice Game — livret de règles](https://tesera.ru/images/items/1868785/Long_Shot_DG_Rules_Booklet_4.1.pdf), [Nights Around a Table](https://nightsaroundatable.com/2022/02/17/how-to-play-long-shot-the-dice-game/) : pouvoirs par cheval, concessions, interdiction de gagner par un bonus.
- [Ready Set Bet — Board Game Quest](https://www.boardgamequest.com/ready-set-bet-review/), [comparatif Roll to Review](https://rolltoreview.com/best-betting-board-games-long-shot-camel-up-ready-set-bet/) : paris exotiques, cotes qui se dégradent avec le temps.
- [Dice Legends — Steam](https://store.steampowered.com/app/3112170/Dice_Legends/) : altération de faces par essences, verrouillage de faces avant le lancer.
