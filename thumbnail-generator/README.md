# thumbnail-generator

Generate YouTube thumbnails at **1280x720 (16:9)** from CSV/JSON **or** from a simple local website where you upload a script/video.

## What you can run

1. **CLI mode** (batch generate from `inputs/*.csv|json`)
2. **Web mode** (simple browser UI for one-off thumbnails)

## Setup

```bash
cd thumbnail-generator
npm install
```

## Web preview (simple website)

```bash
npm run web
```

Then open: `http://localhost:3000`

In the web UI you can:
- Upload a script file (`.txt`, `.md`, `.csv`, `.json`) to auto-suggest title text.
- Upload a finished video file and scrub to a frame.
- Add badge + footer.
- Generate and download PNG.

## CLI usage

Generate from CSV:

```bash
node src/generate.js --in inputs/sample.csv --template default --out out
```

Generate from JSON:

```bash
node src/generate.js --in inputs/sample.json --template default --out out
```

Smoke run (3 examples):

```bash
npm run smoke
```

## NPM scripts

- `npm run build`
- `npm run generate -- --in inputs/sample.csv --template default --out out`
- `npm run smoke`
- `npm run web`

## Project structure

```text
thumbnail-generator/
  assets/fonts/
  inputs/
  out/
  src/
    generate.js
    web-server.js
  templates/
    default.json
  web/
    index.html
    app.js
```

## Notes

- CLI rendering uses `canvas` (local library; no paid APIs).
- Web mode is static and runs locally through a tiny Node HTTP server.
- Works on Windows/macOS/Linux.
