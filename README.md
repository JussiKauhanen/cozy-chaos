# Cozy Chaos

A cozy WarioWare-style pile of 19 tiny microgames. Each one lasts a few seconds, the task keeps changing, and it all gets a little faster. Slice bread, slap carrots (only the ones asking for it), water a sprout, tuck in the moon, and cry on the right flower.

Works with a mouse, a keyboard or a touchscreen, and has layouts for desktop, a phone held sideways and a phone held upright.

## Play locally

Any static file server works. From this folder:

```bash
python3 -m http.server 8737
```

Then open http://localhost:8737. Opening `index.html` straight from disk won't load the sprites, so use a server.

Add `?game=slap` (or any game name) to the address to play just one game.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository (it can be the repository's root).
2. In the repository, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and pick your main branch and the `/ (root)` folder.
3. After a minute the game is live at `https://<your-username>.github.io/<repository-name>/`.

Every path in the game is relative, so it works from that sub-folder address. The empty `.nojekyll` file tells GitHub to serve the files as they are.

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
