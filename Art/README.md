# Art/

Sorties brutes du pipeline de génération, **avant** intégration finale dans
Unity (voir `docs/PIPELINE_ART.md`).

```
Art/
  ConceptArt/<categorie>/      Sorties Gemini (PNG), via Git LFS
  Tripo3D_Raw/<categorie>/     Exports bruts Tripo3D, avant retouche Blender
```

Les fichiers sources retouchés vivent dans `Blender/`, et le résultat final
intégré au jeu dans `UnityProject/Assets/_Project/Art/`.
