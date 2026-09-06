# Contraintes Steam liées à l'usage massif d'IA

Steam impose depuis 2024 une **divulgation du contenu généré par IA** dans
Steamworks, applicable à ce projet puisque l'illustration (Gemini), la
modélisation 3D (Tripo3D) et une partie du code (Claude) sont produits avec
de l'IA.

## Ce qu'il faut déclarer (Steamworks > page du produit)

Steam distingue deux formulaires/cases à cocher (à reconfirmer sur
Steamworks au moment de la mise en ligne, la politique évoluant) :

1. **AI Generated Content Disclosure** : présence de contenu généré par IA
   *pré-produit* et intégré au jeu (ex. images de concept art retouchées,
   assets 3D générés via Tripo3D, éventuellement du code assisté). Ce projet
   sera **concerné** vu l'usage de Gemini et Tripo3D pour les assets finaux.
2. **Live-generated AI content** : contenu généré par IA **au moment de
   l'exécution** (ex. dialogues générés en direct par un LLM). Ce projet
   n'est **a priori pas concerné** à ce stade (pas de génération IA en
   runtime prévue dans le pitch actuel) — à réévaluer si le design en vient à
   inclure une IA générative embarquée.

Steam demande une description en clair, visible sur la fiche produit, de :
- quels types de contenu sont générés par IA (ex. « images de fond »,
  « modèles 3D »),
- quel rôle l'IA a joué dans leur production (génération, retouche, assistance).

## Ce que ça implique concrètement pour ce dépôt

- `docs/PIPELINE_ART.md` conserve la trace de ce qui vient de Gemini/Tripo3D
  (voir §« Traçabilité / disclosure IA ») pour pouvoir rédiger une
  déclaration précise sans avoir à reconstituer l'historique plus tard.
- Le code assisté par Claude n'a **pas** à être déclaré au même titre que
  l'art (Steam cible le contenu du jeu tel que perçu par le joueur — texte,
  image, son, vidéo, modèle 3D — pas les outils de développement). À
  reconfirmer si Steam précise autrement le périmètre du code.
- Prévoir, avant la mise en vitrine Steam, une relecture de la page
  officielle Steamworks (`https://partner.steamgames.com/doc/store/ai_content`)
  car la politique est amenée à évoluer.

## Statut

🧪 À reconfirmer au moment de la création de la page Steamworks (accès
partenaire nécessaire, pas accessible publiquement en détail). Ce document
sert de pense-bête, pas de référence juridique définitive.
