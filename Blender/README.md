# Blender/

Fichiers sources `.blend` (Blender 5.2), organisés par catégorie, retouchés
à partir des exports bruts Tripo3D (`Art/Tripo3D_Raw/`). Ce sont les
fichiers de *source de vérité* pour le mesh final — l'export `.glb`/`.fbx`
utilisé dans Unity en dérive et peut être régénéré à tout moment.

```
Blender/
  Characters/
  Environment/
  Tiles/
```

Voir `docs/PIPELINE_ART.md` pour le détail du pipeline et la checklist
avant export.

Les `.blend` sont versionnés via Git LFS (voir `.gitattributes`) ; les
fichiers de sauvegarde automatique (`*.blend1`, `autosave/`) sont ignorés
(voir `.gitignore`).
