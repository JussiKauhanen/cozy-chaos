"""Cut sprites out of the Gemini sheets and remove the fake checkerboard / white background.

Usage:  python cut_sprites.py        (needs: pip install pillow numpy scipy)
Reads the source sheets from ../sprite-sheets and ../more-sprite-sheets (kept outside the site)
and writes compressed transparent PNGs into ./sprites. Add new sheets/boxes to SHEETS below.
Boxes are (left, top, right, bottom) in source-image pixels; keep a margin of background around each sprite.
A sprite can also be (box, [erase boxes]) to blank out neighbours/labels that poke into its box.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).parent
SRC = HERE.parent / "sprite-sheets"
MORE = HERE.parent / "more-sprite-sheets"
OUT = HERE / "sprites"

A = "Gemini_Generated_Image_3jqwcp3jqwcp3jqw.jpeg"   # 10 games, sheet 1
B = "Gemini_Generated_Image_pwe30kpwe30kpwe3.jpeg"   # 10 games, sheet 2
C = "Gemini_Generated_Image_92k8kn92k8kn92k8.jpeg"   # eel soup / void cat / ramen slalom / tv head

# whole panels kept as rectangles (their black/coloured backgrounds are part of the picture)
PANELS = {
    MORE / C: {
        "eel_girl": ((46, 76, 330, 354), [(46, 76, 82, 112)]),
        "eel_cool": ((361, 76, 657, 204), [(361, 76, 397, 110)]),
        "eel_coil": ((451, 229, 567, 349), [(553, 245, 567, 300), (560, 229, 567, 349)]),
        "void_cat": ((748, 76, 1045, 354), [(748, 76, 786, 112)]),
        "void_fish": ((1078, 76, 1359, 354), [(1078, 76, 1114, 112)]),
        "tv_head": (743, 459, 948, 714),
        "tv_face": (971, 501, 1195, 688),
        "tv_knob": (1218, 501, 1367, 688),
    },
}

SHEETS = {
    MORE / A: {
        "stack_block": ((108, 95, 212, 230), [(195, 90, 215, 115)]),
        "wall_l": (15, 232, 132, 334),
        "strawberry": (338, 64, 457, 210),
        "hedgehog_dizzy": (478, 68, 655, 202),
        "glass_juice": (448, 203, 542, 327),
        "arm_cookie": ((678, 66, 880, 220), [(838, 140, 895, 185)]),
        "arm_blush": (893, 58, 1068, 220),
        "cookie": ((812, 68, 880, 138), [("keep", 846, 103, 27), (812, 84, 828, 138)]),
        "duck_tub": ((1088, 62, 1342, 288), [(1326, 105, 44), (1300, 52, 1380, 160), (1270, 52, 1300, 130)]),
        "bubble": ((1276, 54, 1378, 160), [("keep", 1326, 106, 47)]),
        "carrot_kiss": ((363, 303, 458, 482), [(355, 290, 378, 328)]),
        "carrot_notnow": (534, 298, 695, 482),
        "onion_sob": (718, 308, 892, 482),
        "frog": (1023, 388, 1112, 477),
        "flower_wilt": (1133, 378, 1242, 477),
        "cat_sit": (1268, 338, 1398, 477),
        "piano": (28, 538, 288, 742),
        "mole_sleep": ((843, 548, 1002, 732), [(843, 530, 885, 572)]),
    },
    MORE / B: {
        "glass_half": (608, 33, 712, 187),
        "hedgehog_happy": (743, 38, 888, 192),
        "pirate_ship": (928, 33, 1108, 192),
        "bomb": (1113, 58, 1248, 187),
        "boom": (1263, 33, 1402, 192),
        "carrot_slapme": (13, 233, 218, 377),
        "carrot_slapped": (343, 233, 533, 382),
        "carrot_laugh": (553, 228, 698, 382),
        "onion_cry": (763, 233, 888, 377),
        "onion_happy": (1218, 233, 1402, 377),
        "bird_sing": (8, 423, 177, 567),
        "frog_sing": (168, 423, 312, 572),
        "xmark": (558, 438, 688, 562),
        "moon_sleep": (713, 421, 888, 562),
        "moon_tired": (1228, 418, 1402, 562),
        "mole_happy": (23, 618, 172, 747),
        "mole_booped": ((183, 593, 338, 747), [(183, 585, 262, 616)]),
        "mole_hurt": (503, 618, 658, 747),
        "sweater_flat": (728, 623, 978, 742),
        "sweater_folded": (1028, 633, 1198, 742),
        "cat_on_pile": (1208, 578, 1402, 752),
    },
    MORE / C: {                                   # extra sheet: gray-background sprites
        "ramen": (35, 455, 272, 690),
        "egg_eyes": (275, 450, 478, 712),
        "naruto_dizzy": (512, 480, 680, 650),
    },
    MORE / "announcer_red.jpg": {                   # the announcer (red shirt), 2 rows x 3 poses
        "ann_idle": (0, 0, 400, 450),
        "ann_happy": (400, 0, 800, 450),
        "ann_sad": (800, 0, 1199, 450),
        "ann_ready": (0, 448, 400, 896),
        "ann_cheer": (400, 448, 800, 896),
        "ann_cry": (800, 448, 1199, 896),
    },
    SRC / "Gemini_Generated_Image_46m16146m16146m1.jpeg": {          # claymation rain
        "cloud": (70, 80, 585, 380),
        "drop": (245, 388, 395, 590),
        "bucket": (650, 130, 900, 435),
        "bucket_splash": (580, 555, 970, 930),
    },
    SRC / "Gemini_Generated_Image_46m16146m16146m1 (1).jpeg": {      # pixel bread
        "loaf_happy": (50, 165, 440, 455),
        "loaf_sliced": (485, 22, 925, 510),
        "slices_dizzy": (190, 590, 835, 885),
    },
    SRC / "Gemini_Generated_Image_46m16146m16146m1 (2).jpeg": {      # green handheld plants
        "sprout_1": (365, 40, 500, 285),
        "sprout_2": (530, 25, 655, 285),
        "sprout_3": (690, 25, 820, 285),
        "can": (840, 0, 1005, 160),
    },
    SRC / "Gemini_Generated_Image_t2tjw6t2tjw6t2tj.jpeg": {          # 16-bit sheep
        "sheep_idle": (60, 210, 470, 570),
        "sheep_petted": (510, 135, 880, 570),
        "sheep_awake": (945, 210, 1350, 570),
    },
}


def cut(img: np.ndarray) -> np.ndarray:
    rgb = img.astype(int)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    # the fake checkerboard is two flat grey tones: take the two most common greys on the border
    ring = np.zeros(lum.shape, bool); ring[:6] = ring[-6:] = True; ring[:, :6] = ring[:, -6:] = True
    border = lum[ring & (sat < 8)]
    hist, edges = np.histogram(border, bins=64, range=(0, 256))
    t1 = edges[hist.argmax()] + 2
    hist2 = hist.copy(); hist2[max(0, hist.argmax() - 4):hist.argmax() + 5] = 0
    t2 = edges[hist2.argmax()] + 2
    if hist2.max() < hist.max() * .15 or abs(t2 - t1) > 130:   # single-colour bg (ignore outlines on the edge)
        t2 = t1
    d1, d2 = np.abs(lum - t1), np.abs(lum - t2)
    cand = (sat < 14) & (np.minimum(d1, d2) < 13)   # pure grey AND close to a checker tone
    # flood-fill through any grey in the checker range (covers blurry seams); dark outlines stop it
    grey = (sat < 16) & (lum > min(t1, t2) - 18) & (lum < max(t1, t2) + 18)

    labels, n = ndimage.label(grey)
    seeds = labels[ring & cand]
    edge = set(np.unique(seeds)) - {0}
    bg = np.isin(labels, list(edge))
    # the flood can leak through small gaps in an outline into grey shading (sheep wool):
    # close those gaps and refill whatever ends up enclosed
    closed = ndimage.binary_closing(~bg, iterations=4)
    bg &= ~(ndimage.binary_fill_holes(closed) & ~closed)
    # enclosed holes (bucket handle, gap between slices): only if they contain BOTH checker tones
    if abs(t1 - t2) > 15:
        for i in range(1, n + 1):
            if i in edge:
                continue
            m = labels == i
            if m.sum() > 250 and (d1[m] < 13).mean() > .2 and (d2[m] < 13).mean() > .2:
                bg |= m
    fg = ~bg
    labels, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, labels, range(1, n + 1))
    keep = np.isin(labels, np.nonzero(sizes >= max(40, sizes.max() * .004))[0] + 1)   # drop leftover specks
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    return ndimage.median_filter(alpha, size=3)


SHIRT_HUE = None     # announcer shirt hue in degrees (e.g. 168 = teal); None keeps the sheet's own colour


def recolor_shirt(rgba):
    """Swap the saturated orange shirt for another hue; skin (less saturated) is left alone."""
    rgb = rgba[..., :3].astype(float) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = (np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) + 360) % 360
    ys = np.arange(rgba.shape[0])[:, None] / rgba.shape[0]
    m = (sat > .6) & (hue > 22) & (hue < 52) & (mx > .45) & (ys > .45)
    hsv = np.array(Image.fromarray(rgba[..., :3]).convert("HSV")).astype(int)
    hsv[..., 0][m] = int(SHIRT_HUE / 360 * 255)
    hsv[..., 1][m] = (hsv[..., 1][m] * .7).astype(int)
    out = rgba.copy()
    out[..., :3] = np.array(Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB"))
    return out


def save(img, name):
    """256-colour PNG: ~85% smaller than full colour and visually the same for this art."""
    img.convert("RGBA").quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(OUT / f"{name}.png", optimize=True)


def main():
    OUT.mkdir(exist_ok=True)
    for sheet, boxes in SHEETS.items():
        im = Image.open(sheet).convert("RGB")
        for name, box in boxes.items():
            box, erase = box if isinstance(box[0], tuple) else (box, [])
            crop = np.array(im.crop(box))
            bgc = crop[0, 0].copy()
            yy, xx = np.mgrid[box[1]:box[3], box[0]:box[2]]
            for e in erase:                # paint over neighbours with the corner bg colour
                if len(e) == 3:            # (cx, cy, r): erase inside a circle
                    crop[(xx - e[0]) ** 2 + (yy - e[1]) ** 2 < e[2] ** 2] = bgc
                elif e[0] == "keep":       # ("keep", cx, cy, r): erase everything outside a circle
                    crop[(xx - e[1]) ** 2 + (yy - e[2]) ** 2 > e[3] ** 2] = bgc
                else:                      # (l, t, r, b) rectangle
                    l, t, r, b = e
                    crop[max(0, t - box[1]):max(0, b - box[1]), max(0, l - box[0]):max(0, r - box[0])] = bgc
            a = cut(crop)
            ys, xs = np.nonzero(a)
            rgba = np.dstack([crop, a])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            if name.startswith("ann_") and SHIRT_HUE is not None:
                rgba = recolor_shirt(rgba)
            save(Image.fromarray(rgba, "RGBA"), name)
            print(f"{name}.png  {rgba.shape[1]}x{rgba.shape[0]}")
    for sheet, boxes in PANELS.items():
        im = Image.open(sheet).convert("RGB")
        for name, (box, erase) in ((n, b if isinstance(b[0], tuple) else (b, [])) for n, b in boxes.items()):
            crop = np.array(im.crop(box))
            for l, t, r, b in erase:       # cover the panel numbers with the panel's corner colour
                crop[max(0, t - box[1]):max(0, b - box[1]), max(0, l - box[0]):max(0, r - box[0])] = crop[-1, -1]
            save(Image.fromarray(crop), name)
            print(f"{name}.png  {crop.shape[1]}x{crop.shape[0]}  (panel)")


if __name__ == "__main__":
    main()
