# Third-party notices

SKAT AUF TOUR bundles material from the following sources. Each area adds its own section.

## Lichess puzzle database (chess puzzles)

- **Files:** `public/puzzles/chess-easy.json`, `public/puzzles/chess-medium.json`, `public/puzzles/chess-hard.json`,
  and the few built-in fallback puzzles in `src/chess/puzzle.ts`.
- **Source:** the Lichess puzzle database, <https://database.lichess.org/#puzzles>
  (`lichess_db_puzzle.csv.zst`, release of 2 October 2026), selected with `tools/chess/select-puzzles.py`.
- **Licence:** Creative Commons CC0 1.0 Universal (public domain dedication),
  <https://creativecommons.org/publicdomain/zero/1.0/>. Lichess publishes the puzzle database under CC0.
- **What we keep:** puzzle id, start position (FEN), solution line (UCI), rating and themes of 900 puzzles. With
  thanks to lichess.org and its players, who generated and rated these puzzles.

## Freesound field recordings (inn and beer-garden ambiences)

- **Files:** `public/audio/sfx/inn-murmur.ogg`, `public/audio/sfx/inn-murmur-busy.ogg`,
  `public/audio/sfx/beergarden.ogg`. All other sound effects are synthesised by our own code
  (`audio-src/sfx/`, no third-party material).
- **Source files:** the HQ previews published by Freesound for each sound (same licence as the original upload).
  Exact preview URL and SHA-256 per file in `audio-src/sfx/manifest.json` and `audio-src/sfx/rec.py`.
- **Changes made (all three):** a 33 s excerpt was cut out, loud moments levelled, rumble high-passed, the highs cut
  so speech blurs into murmur, the stereo image narrowed, the excerpt looped with a 3 s crossfade and turned down to
  about −36 LUFS, encoded as OGG Vorbis.

| Our file | Recording | Author | Licence |
|---|---|---|---|
| `inn-murmur.ogg` | „German restaurant with a crowd.wav“, <https://freesound.org/people/BonnyOrbit/sounds/334140/> | BonnyOrbit | CC0 1.0, <https://creativecommons.org/publicdomain/zero/1.0/> |
| `inn-murmur-busy.ogg` | „big crowd in a hall talking“, <https://freesound.org/people/Garuda1982/sounds/641303/> | Garuda1982 | CC BY 4.0, <https://creativecommons.org/licenses/by/4.0/> |
| `beergarden.ogg` | „Restaurant outside by the river atmosphere with people talking“, <https://freesound.org/people/Garuda1982/sounds/735593/> | Garuda1982 | CC BY 4.0, <https://creativecommons.org/licenses/by/4.0/> |

Attribution for the CC BY 4.0 recordings: *„big crowd in a hall talking“* and *„Restaurant outside by the river
atmosphere with people talking“* by **Garuda1982** (freesound.org), licensed under CC BY 4.0, excerpted and
modified (see above). CC0 needs no attribution; we credit BonnyOrbit with thanks anyway.

## YuE2 (music)

- **Files:** every music file in `public/audio/music/` (12 pieces, 14 files, listed in `public/audio/music.json`).
- **How they were made:** generated locally (no online service) with the YuE2 music model, **`m-a-p/YuE2-3B`** with
  the **`m-a-p/YuE2-Vae`** decoder (inference package `yue2-infer 0.1.6`), from original instrumental score plans and
  text style briefs written for this game (`audio-src/music/plans.py`); no reference recordings, no existing tunes,
  no lyrics. Each file is one native take, kept as performed: only a constant gain, short fades and a 40 ms blend at
  the loop seam were applied. Prompt, seed, settings and hashes of every take: `audio-src/music/manifest.json`.
- **Licences:** the YuE inference code is Apache-2.0 (`audio-src/licenses/YuE2-LICENSE`); the model weights are
  CC BY-NC 4.0 with the model licensors' additional permission of 16 September 2026 for individual creators to publish
  and monetise generated outputs under responsible-use conditions (`audio-src/licenses/YuE2-MODEL_LICENSE`, verbatim);
  third-party code notices of the model package in `audio-src/licenses/YuE2-THIRD_PARTY_NOTICES.md`. Model weights
  and code are not distributed with the game. Sources: <https://github.com/multimodal-art-projection/YuE>,
  <https://huggingface.co/m-a-p/YuE2-3B>, <https://huggingface.co/m-a-p/YuE2-Vae>.
- **Credit:** the licensors ask (optionally) to credit YuE2 when sharing generated work; the credits screen names it.

## Painted art (Krea 2)

The painted backgrounds, portraits, dogs, vehicles, items, trophies and event panels in `public/art/` were made with
the Krea 2 image model and post-processed (see `art-src/manifest.json` for prompt, seed and settings of every image).
They are subject to the Krea 2 Community License (`public/art/KREA-2-COMMUNITY-LICENSE.txt`), which does not permit
commercial use. This project is a private, non-commercial game.
