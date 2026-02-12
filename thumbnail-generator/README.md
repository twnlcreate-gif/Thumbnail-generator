# thumbnail-generator

Generate YouTube thumbnails locally at **1280x720 (16:9)** from CSV or JSON input.

## Features

- Local rendering with [`canvas`](https://www.npmjs.com/package/canvas) (no paid APIs)
- Input rows with:
  - `title` (required)
  - `subtitle` (optional, currently parsed for future template use)
  - `badge` (optional)
  - `footer` / `channel` (optional)
- Output PNG files in `/out` with safe slug filenames
- Configurable template (`/templates/default.json`)
- Optional custom fonts loaded from `./assets/fonts`
- Cross-platform CLI usage (Windows, macOS, Linux)

## Project structure

```text
thumbnail-generator/
  assets/fonts/          # Drop .ttf/.otf/etc here
  inputs/
    sample.csv
    sample.json
  out/
  src/
    generate.js
  templates/
    default.json
  package.json
```

## Setup

```bash
cd thumbnail-generator
npm install
```

## Usage

Generate from CSV:

```bash
node src/generate.js --in inputs/sample.csv --template default --out out
```

Generate from JSON:

```bash
node src/generate.js --in inputs/sample.json --template default --out out
```

Limit rows (useful for smoke checks):

```bash
node src/generate.js --in inputs/sample.json --template default --out out --limit 3
```

### NPM scripts

- `npm run build` - placeholder build command for CI consistency
- `npm run generate -- --in inputs/sample.csv --template default --out out`
- `npm run smoke` - generates 3 sample thumbnails

## CSV format

Use this header row:

```csv
title,subtitle,badge,footer
```

Quoted values are supported.

## Template config

Edit `templates/default.json`:

- `layout.padding`
- `typography` (font family, min/max size, line count, visible word cap)
- `colors` (gradient + text colors)
- `effects` (outline, shadow, texture)
- `badge` (position + styling)
- `footer` (styling)

## Windows notes

- Commands work in **PowerShell**, **Command Prompt**, or **Git Bash**.
- Use local fonts by placing `.ttf/.otf` files into `assets/fonts`.
- Paths like `inputs\sample.csv` or `inputs/sample.csv` both work.

## Example

```bash
npm run generate -- --in inputs/sample.csv --template default --out out
```

Outputs files like:

- `out/01-stop-making-this-thumbnail-mistake.png`
- `out/02-fix-your-click-through-rate-fast.png`
- `out/03-goodbye-to-boring-video-covers.png`
