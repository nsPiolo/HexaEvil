#!/usr/bin/env python3
"""
Installe les portraits de boss détourés dans le jeu.

Prend les PNG à alpha de `docs/proto4/raw/demons/png2/`, les ramène sur le canevas
commun puis les pose en `public/circles/<NN>-<nom>/boss.webp`.

Le canevas commun (976 × 1075, servi à 700 × 771) est ce qui fait que le portrait du
boss et celui du stagiaire se remplacent au même endroit sans que le personnage saute :
c'est lui qu'on vise, pas le cadrage de chaque image. Le rendu sort en 4:5, plus haut
que la cible, donc on rogne **par le bas** — la tête garde sa place dans le tiers
supérieur et la coupe tombe dans l'ourlet qui se dissout déjà. Le CSS
(`.dialogue-portrait`) ancre le portrait en bas et estompe son dernier cinquième, donc
une silhouette qui atteint le bord bas est normale, pas un défaut.

    python3 scripts/install-boss.py            # les quinze
    python3 scripts/install-boss.py 2 9        # seulement ces cercles
    python3 scripts/install-boss.py --dry-run  # ce qui serait écrit
"""
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "docs/proto4/raw/demons/png2"
DEST = REPO / "Proto4Html/public/circles"

LARGEUR, HAUTEUR = 700, 771  # le canevas 976 × 1075 à la largeur servie
QUALITE = 88

# Le numéro de cercle donne le fichier source et le dossier de destination ; les deux
# ne portent pas le même nom (CIRCLE_ART dans src/presentation/art.ts).
CERCLES = {
    1: ("1_limbes", "01-limbes"),
    2: ("2_luxure", "02-luxure"),
    3: ("3_gourmandise", "03-gourmandise"),
    4: ("4_avarice", "04-avarice"),
    5: ("5_colere", "05-colere"),
    6: ("6_heresie", "06-heresie"),
    7: ("7_violence", "07-violence"),
    8: ("8_fraude", "08-fraude"),
    9: ("9_trahison", "09-trahison"),
    10: ("10_mer", "10-fonds-marins"),
    11: ("11_falaise", "11-falaise"),
    12: ("12_villes", "12-ville"),
    13: ("13_neige", "13-montagne"),
    14: ("14_vent", "14-ciel"),
    15: ("15_ange", "15-paradis"),
}


def convertir(src: Path) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    voulue = round(w * HAUTEUR / LARGEUR)
    if voulue > h:
        raise SystemExit(f"{src.name} : {w} × {h} est trop plat pour le canevas, il faudrait {voulue} px de haut.")
    return im.crop((0, 0, w, voulue)).resize((LARGEUR, HAUTEUR), Image.LANCZOS)


def main() -> None:
    args = sys.argv[1:]
    sec = "--dry-run" in args
    demandes = [int(a) for a in args if not a.startswith("-")] or sorted(CERCLES)

    for n in demandes:
        if n not in CERCLES:
            raise SystemExit(f"Cercle inconnu : {n}")
        nom, dossier = CERCLES[n]
        src = SRC / f"{nom}.png"
        if not src.exists():
            print(f"  {nom:<16} absent de {SRC.relative_to(REPO)}, ignoré")
            continue
        cible = DEST / dossier / "boss.webp"
        if sec:
            print(f"  {nom:<16} → {cible.relative_to(REPO)}")
            continue
        im = convertir(src)
        # Un bbox alpha qui n'atteint pas le bas signale un buste qui flotte : le portrait
        # est ancré en bas, il décollerait du sol de la scène.
        bb = im.getchannel("A").getbbox()
        cible.parent.mkdir(parents=True, exist_ok=True)
        im.save(cible, "WEBP", quality=QUALITE, method=6)
        ko = cible.stat().st_size / 1024
        creux = HAUTEUR - bb[3]
        alerte = f"  ⚠ {creux} px de vide sous le buste" if creux > 20 else ""
        print(f"  {nom:<16} → {cible.relative_to(REPO)}  {ko:>5.0f} Ko  tête à y={bb[1]}{alerte}")


if __name__ == "__main__":
    main()
