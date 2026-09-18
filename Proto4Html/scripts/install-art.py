#!/usr/bin/env python3
"""
Installe dans le jeu les portraits détourés à la main.

Deux familles, même canevas et même traitement :

  boss    docs/proto4/raw/demons/png2/<n>_<univers>.png
            → public/circles/<NN>-<nom>/boss.webp
  perso   docs/proto4/raw/perso/<nom>.png
            → public/menu/perso/<nom>.webp
  objets  docs/proto4/raw/objects/png/<id>.png
            → public/objets/<id>.webp
  cases   docs/proto4/raw/cases/<kind>.png
            → public/table/cases/<kind>.webp
  map     docs/proto4/raw/map/<nom>.png
            → public/map/<nom>.webp
  des     docs/proto4/raw/des/<couleur sans #>.png   (une face d'âme)
          docs/proto4/raw/des/<id boutique>.png      (un dé spécial)
            → public/table/dice/<même nom>.webp

Le canevas commun (976 × 1075, servi à 700 × 771) est ce qui fait que le portrait du
boss et celui du stagiaire se remplacent au même endroit sans que le personnage saute :
c'est lui qu'on vise, pas le cadrage de chaque image. Les portraits du stagiaire y sont
déjà, il n'y a qu'à réduire ; les rendus de boss sortent en 4:5, plus haut, donc on
rogne **par le bas** — la tête garde sa place dans le tiers supérieur et la coupe tombe
dans l'ourlet qui se dissout déjà.

Le CSS (`.dialogue-portrait`) ancre le portrait en bas et estompe son dernier cinquième,
donc une silhouette qui atteint le bord bas est normale ; c'en est une qui s'arrête trop
haut qui pose problème, elle flotterait au-dessus du sol de la scène.

    python3 scripts/install-art.py boss              # les quinze portraits de boss
    python3 scripts/install-art.py boss 4            # seulement le cercle 4
    python3 scripts/install-art.py perso             # les neuf du stagiaire
    python3 scripts/install-art.py perso 4_boss      # ceux dont le nom contient ça
    python3 scripts/install-art.py objets            # les vignettes de la boutique
    python3 scripts/install-art.py cases              # les marqueurs de cases spéciales
    python3 scripts/install-art.py map                # les repères de la carte
    python3 scripts/install-art.py des                # les faces de dé
    python3 scripts/install-art.py des a9c93a         # une seule face
    python3 scripts/install-art.py objets --dry-run   # ce qui serait écrit
"""
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
LARGEUR, HAUTEUR = 700, 771  # le canevas 976 × 1075 à la largeur servie
COTE_OBJET = 256  # la vignette d'objet, carrée
COTE_DE = 208  # la face de dé, carrée elle aussi mais servie bien plus petite
LARGEUR_MAP = 192  # les braseros de la carte, servis autour de 30 px de large
LARGEUR_CASE = 256  # le marqueur d'une case du plateau, servi au plus à 74 px de large
REMPLISSAGE = 0.85  # part du cadre occupée par l'objet, marge égale tout autour
QUALITE = 88

# Le numéro de cercle donne le fichier source et le dossier de destination ; les deux ne
# portent pas le même nom (CIRCLE_ART dans src/presentation/art.ts).
CERCLES = {
    1: ("1_limbes", "01-limbes"), 2: ("2_luxure", "02-luxure"),
    3: ("3_gourmandise", "03-gourmandise"), 4: ("4_avarice", "04-avarice"),
    5: ("5_colere", "05-colere"), 6: ("6_heresie", "06-heresie"),
    7: ("7_violence", "07-violence"), 8: ("8_fraude", "08-fraude"),
    9: ("9_trahison", "09-trahison"), 10: ("10_mer", "10-fonds-marins"),
    11: ("11_falaise", "11-falaise"), 12: ("12_villes", "12-ville"),
    13: ("13_neige", "13-montagne"), 14: ("14_vent", "14-ciel"),
    15: ("15_ange", "15-paradis"),
}


def paires_boss():
    """(source, destination) pour les quinze cercles, dans l'ordre."""
    src = REPO / "docs/proto4/raw/demons/png2"
    dest = REPO / "Proto4Html/public/circles"
    return [(src / f"{nom}.png", dest / dossier / "boss.webp", nom)
            for _, (nom, dossier) in sorted(CERCLES.items())]


def paires_perso():
    """(source, destination) pour les portraits du stagiaire, nommés à l'identique."""
    src = REPO / "docs/proto4/raw/perso"
    dest = REPO / "Proto4Html/public/menu/perso"
    return [(p, dest / f"{p.stem}.webp", p.stem) for p in sorted(src.glob("*.png"))]


def paires_objets():
    """(source, destination) pour les vignettes d'objets, nommées par l'id de shop.json.

    `qmark.png` fait partie du lot : c'est le point d'interrogation que `ItemArt` affiche
    à la place d'un objet dont la vignette n'est pas encore peinte.
    """
    src = REPO / "docs/proto4/raw/objects/png"
    dest = REPO / "Proto4Html/public/objets"
    return [(p, dest / f"{p.stem}.webp", p.stem) for p in sorted(src.glob("*.png"))]


def paires_cases():
    """(source, destination) pour les marqueurs de case, nommés par leur `kind`.

    `gold`, `trap` et `boost` sont les trois types de `SpecialCell` (`config/schema.ts`),
    `tribune` l'artefact posé par le joueur et `blocked` la case sur laquelle on n'atterrit
    jamais. `Board.tsx` construit le chemin depuis ce nom, il n'y a rien à déclarer ailleurs.
    """
    src = REPO / "docs/proto4/raw/cases"
    dest = REPO / "Proto4Html/public/table/cases"
    return [(p, dest / f"{p.stem}.webp", p.stem) for p in sorted(src.glob("*.png"))]


def marqueur_case(src: Path) -> Image.Image:
    """Recadre sur la boîte opaque, puis réduit à une largeur commune.

    Pas de canevas commun ici, contrairement aux vignettes d'objets : les marqueurs sont
    affichés en `object-fit: contain` dans une case plus large que haute, donc c'est la
    largeur qui borne, et recadrer au plus juste suffit à ce qu'ils occupent tous la même
    place. Une marge conservée dans le fichier ne ferait que rapetisser le dessin.
    """
    im = Image.open(src).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"{src.name} : image entièrement transparente.")
    objet = im.crop(bbox)
    hauteur = round(objet.height * LARGEUR_CASE / objet.width)
    return objet.resize((LARGEUR_CASE, hauteur), Image.LANCZOS)


def paires_map():
    """(source, destination) pour les repères de la carte, nommés à l'identique."""
    src = REPO / "docs/proto4/raw/map"
    dest = REPO / "Proto4Html/public/map"
    return [(p, dest / f"{p.stem}.webp", p.stem) for p in sorted(src.glob("*.png"))]


def jeton_carte(src: Path) -> Image.Image:
    """Réduit sans rien recadrer, contrairement aux vignettes d'objets.

    Les deux états du brasero sont dessinés sur le même canevas, la vasque exactement au même
    endroit ; c'est ce qui permet à la carte de les échanger sans que le repère saute. Les
    recadrer chacun sur son contenu opaque casserait ce calage : la flamme de `step_on`
    déborde loin au-dessus de la vasque, `step_off` s'arrête à son bord.
    """
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    return im.resize((LARGEUR_MAP, round(h * LARGEUR_MAP / w)), Image.LANCZOS)


def paires_des():
    """(source, destination) pour les faces de dé, nommées par ce qu'elles représentent.

    Deux conventions, un seul dossier, et dans les deux cas le nom du fichier EST la clé :

      - une face d'âme porte son code hexadécimal de SOUL_COLORS sans le croisillon ;
      - un dé spécial porte son id dans `config/shop.json` (`kind: "die"`), comme les
        vignettes d'objets.

    C'est ce qui permet à `souls.ts` de composer l'URL sans table de correspondance. Seul le
    dé d'os fait exception — il n'appartient à personne, il sert de fond à tous les autres.

    Les `Des_<couleur>.png` du même dossier sont les rendus d'avant ce nommage ; ils ne sont
    pas repris, mais on les garde comme sources d'origine.
    """
    src = REPO / "docs/proto4/raw/des"
    dest = REPO / "Proto4Html/public/table/dice"
    retenus = _ids_de_des() | {p.stem for p in src.glob("*.png") if _est_couleur(p.stem)}
    paires = [(p, dest / f"{p.stem}.webp", p.stem) for p in sorted(src.glob("*.png")) if p.stem in retenus]
    return [(src / "Des_blanc.png", dest / "white.webp", "white"), *paires]


def _est_couleur(nom: str) -> bool:
    return len(nom) == 6 and all(c in "0123456789abcdef" for c in nom)


def _ids_de_des() -> set:
    """Ids des dés spéciaux, lus dans la boutique plutôt que recopiés ici.

    Un dé ajouté à `shop.json` n'a alors qu'à déposer son PNG pour être installé, et un PNG
    déposé sans dé correspondant reste ignoré — ce dossier sert aussi de vrac de sources.
    """
    import json

    items = json.loads((REPO / "Proto4Html/config/shop.json").read_text(encoding="utf-8"))["items"]
    return {i["id"] for i in items if i.get("kind") == "die"}


def face_de(src: Path) -> Image.Image:
    """Pose la face dans un carré, sans la déformer et sans la rogner.

    Les rendus sortent en 1045 × 1098, presque carrés mais pas tout à fait. Le CSS empile la
    face peinte et le dé d'os dans la même boîte (`background-image` à deux couches) : si
    l'une était mise au carré par étirement et l'autre par marge, le liseré d'os dépasserait
    d'un côté de la couleur. On les passe donc toutes par le même cadre, la marge en plus
    étant transparente.
    """
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    ratio = COTE_DE / max(w, h)
    petit = im.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)
    carre = Image.new("RGBA", (COTE_DE, COTE_DE), (0, 0, 0, 0))
    carre.alpha_composite(petit, ((COTE_DE - petit.width) // 2, (COTE_DE - petit.height) // 2))
    return carre


def canevas_portrait(src: Path) -> Image.Image:
    """Ramène l'image sur le canevas commun : rognage par le bas si elle est trop haute."""
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    voulue = round(w * HAUTEUR / LARGEUR)
    if voulue > h:
        raise SystemExit(f"{src.name} : {w} × {h} est trop plat pour le canevas, il faudrait {voulue} px de haut.")
    if voulue < h:
        im = im.crop((0, 0, w, voulue))
    return im.resize((LARGEUR, HAUTEUR), Image.LANCZOS)


def vignette_objet(src: Path) -> Image.Image:
    """Recadre sur l'objet, marge égale de tous les côtés, puis réduit au carré.

    Le cadrage des sources varie beaucoup d'un détourage à l'autre (de 70 % à 91 % du
    cadre, 42 % pour le point d'interrogation). Comme les vignettes sont affichées en
    `object-fit: contain` dans des cases de même taille, garder ce cadrage ferait des
    objets visiblement plus petits que d'autres en vitrine. On repart donc de la boîte
    opaque et on la repose au centre d'un carré dont elle occupe REMPLISSAGE.
    """
    im = Image.open(src).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"{src.name} : image entièrement transparente.")
    objet = im.crop(bbox)
    cote = round(max(objet.size) / REMPLISSAGE)
    carre = Image.new("RGBA", (cote, cote), (0, 0, 0, 0))
    carre.alpha_composite(objet, ((cote - objet.width) // 2, (cote - objet.height) // 2))
    return carre.resize((COTE_OBJET, COTE_OBJET), Image.LANCZOS)


FAMILLES = {
    "boss": (paires_boss, canevas_portrait),
    "perso": (paires_perso, canevas_portrait),
    "objets": (paires_objets, vignette_objet),
    "des": (paires_des, face_de),
    "map": (paires_map, jeton_carte),
    "cases": (paires_cases, marqueur_case),
}


def main() -> None:
    args = sys.argv[1:]
    sec = "--dry-run" in args
    positionnels = [a for a in args if not a.startswith("-")]
    famille = positionnels[0] if positionnels else None
    if famille not in FAMILLES:
        print(f"Usage : python3 scripts/install-art.py <{' | '.join(FAMILLES)}> [filtres…] [--dry-run]")
        raise SystemExit(1)

    filtres = positionnels[1:]
    sources, convertir = FAMILLES[famille]
    paires = sources()
    if filtres:
        if famille == "boss" and all(f.isdigit() for f in filtres):
            gardes = {CERCLES[int(f)][0] for f in filtres if int(f) in CERCLES}
            paires = [p for p in paires if p[2] in gardes]
        else:
            paires = [p for p in paires if any(f in p[2] for f in filtres)]
        if not paires:
            raise SystemExit(f"Aucun fichier de la famille « {famille} » ne correspond à {filtres}.")

    for src, cible, nom in paires:
        if not src.exists():
            print(f"  {nom:<26} absent de {src.parent.relative_to(REPO)}, ignoré")
            continue
        if sec:
            print(f"  {nom:<26} → {cible.relative_to(REPO)}")
            continue
        im = convertir(src)
        bb = im.getchannel("A").getbbox()
        cible.parent.mkdir(parents=True, exist_ok=True)
        im.save(cible, "WEBP", quality=QUALITE, method=6)
        ko = cible.stat().st_size / 1024
        if famille == "objets":
            part = 100 * max(bb[2] - bb[0], bb[3] - bb[1]) / COTE_OBJET
            print(f"  {nom:<26} → {cible.relative_to(REPO)}  {ko:>5.0f} Ko  objet à {part:.0f} % du cadre")
        elif famille == "cases":
            print(f"  {nom:<26} → {cible.relative_to(REPO)}  {ko:>5.0f} Ko  {im.width} × {im.height} px")
        elif famille == "map":
            print(f"  {nom:<26} → {cible.relative_to(REPO)}  {ko:>5.0f} Ko  {im.width} × {im.height} px, opaque de y={bb[1]} à {bb[3]}")
        elif famille == "des":
            print(f"  {nom:<26} → {cible.relative_to(REPO)}  {ko:>5.0f} Ko  face {bb[2] - bb[0]} × {bb[3] - bb[1]} px")
        else:
            creux = HAUTEUR - bb[3]
            alerte = f"  ⚠ {creux} px de vide sous le buste" if creux > 20 else ""
            print(f"  {nom:<26} → {cible.relative_to(REPO)}  {ko:>5.0f} Ko  tête à y={bb[1]}{alerte}")


if __name__ == "__main__":
    main()
