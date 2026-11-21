# Cozy Chaos

A cozy WarioWare-style pile of 19 tiny microgames. Each one lasts a few seconds, the task keeps changing, and it all gets a little faster. Slice bread, slap carrots (only the ones asking for it), water a sprout, tuck in the moon, and cry on the right flower.

Works with a mouse, a keyboard or a touchscreen, and has layouts for desktop, a phone held sideways and a phone held upright.

### [▶ Try Cozy chaos live](https://jussikauhanen.github.io/cozy-chaos/)

## What's in here

| File | What it does |
|---|---|
| `index.html` | The whole game: layout, all 19 microgames, the announcer, score, pet cat |
| `music.js` | Background music, synthesized live in the browser (no audio files) |
| `sfx.js` | Sound effects, rendered once at load (no audio files) |
| `sprites/` | The cut-out sprite images |
| `cut_sprites.py` | Dev tool that cuts `sprites/` out of the original sprite sheets (not needed to play) |

`cut_sprites.py` reads the source sheets from `../sprite-sheets` and `../more-sprite-sheets` next to this folder. It needs `pip install pillow numpy scipy`. After re-cutting sprites, bump the `ART` version number in `index.html` so browsers fetch the new images.

## Credits

- Sprite art generated with Gemini.
- Font: [DotGothic16](https://fonts.google.com/specimen/DotGothic16), loaded from Google Fonts (SIL Open Font License).
- Music and sound effects are original, synthesized with the Web Audio API.
