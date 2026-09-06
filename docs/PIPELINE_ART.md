# Pipeline art : Gemini → Tripo3D → Blender → Unity

## Vue d'ensemble

```
1. Brief écrit (concept, référence, ambiance)
2. Gemini            -> concept art 2D (plusieurs variantes)
3. Tripo3D           -> mesh 3D brut à partir de l'image retenue
4. Blender 5.2       -> nettoyage : retopologie, UV, matériaux, rig si nécessaire, LOD
5. Export .glb / .fbx
6. Import Unity      -> UnityProject/Assets/_Project/Art/<Categorie>/<NomAsset>/
```

## Emplacements dans le dépôt

- `Art/ConceptArt/<categorie>/` — sorties Gemini conservées (PNG), via Git LFS.
- `Art/Tripo3D_Raw/<categorie>/<nom>/` — export brut Tripo3D, **avant**
  retouche Blender. Sert de point de retour si le nettoyage Blender doit être
  refait différemment. Via Git LFS.
- `Blender/<categorie>/<nom>.blend` — fichier source Blender retouché
  (source de vérité pour le mesh final). Via Git LFS.
- `UnityProject/Assets/_Project/Art/<categorie>/<nom>/` — export final
  `.glb`/`.fbx` + textures, prêt à être référencé par des prefabs.

`<categorie>` reprend les dossiers déjà prévus dans `docs/ARCHITECTURE.md`
(`Characters`, `Environment`, `Tiles`, …).

## Convention de nommage des assets

`<Categorie>_<NomConcept>_<Variante?>` en anglais autant que possible pour
rester cohérent avec le code — voir `docs/LEXIQUE.md` si le nom de l'asset
correspond à un concept déjà répertorié (ex. `Tile_Brasier` doit correspondre
à une entrée `TileDefinition` nommée de façon cohérente).

## Checklist avant d'importer un asset dans Unity

- [ ] Échelle correcte (1 unité Blender = 1 mètre Unity).
- [ ] Origine/pivot cohérent avec l'usage (ex. centre d'une tuile hexagonale
      au sol pour faciliter le placement par `HexCoord`).
- [ ] Normales et UV vérifiés dans Blender avant export.
- [ ] Nombre de triangles raisonnable pour un asset vu à la table (pas de
      mesh brut Tripo3D non retravaillé en production).
- [ ] Nom de fichier conforme à la convention ci-dessus.
- [ ] Ajouté via Git LFS (vérifier `git lfs status` avant commit si doute).

## Traçabilité / disclosure IA

Chaque asset généré ou retouché avec de l'IA (Gemini, Tripo3D) doit rester
identifiable (dossier `ConceptArt`/`Tripo3D_Raw` conservé, pas seulement le
résultat final) — voir `docs/STEAM_AI_DISCLOSURE.md` pour l'obligation de
déclaration Steam liée à l'usage de contenu généré par IA.
