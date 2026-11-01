# ŞEHRİN YARINI — Official 120-second trailer package

This folder contains the exact 120-second trailer build and its evidence.

## Build

Run from the repository root:

```bash
bash trailer/scripts/render_trailer.sh
```

Output: `trailer/renders/SEHRIN_YARINI_OFFICIAL_TRAILER_2MIN.mp4`

The trailer is 30 seconds of real in-game screenshots with restrained motion, followed by 90 seconds of real browser gameplay captured from the current RPG build. The original gameplay recording is preserved in `raw/real-gameplay-90s.webm`.

## Contents

- `raw/` — source browser recording.
- `graphics/` — official logo and real gameplay screenshots.
- `audio/` — temporary system-TTS voice and procedural original audio.
- `subtitles/` — Turkish SRT captions.
- `scripts/` — capture, edit timeline, shot manifest and render script.
- `captures/` — preview stills extracted from the final render.
- `renders/` — final MP4 and intermediate files.

The voice is deliberately labeled temporary: no human narration was available in the workspace. The production report records this limitation rather than presenting synthetic narration as a final studio recording.
