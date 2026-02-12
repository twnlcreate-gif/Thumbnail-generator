#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

const WIDTH = 1280;
const HEIGHT = 720;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (ch === ',' && !insideQuotes) {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  out.push(current.trim());
  return out;
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    const entry = { id: index + 1 };
    headers.forEach((header, i) => {
      entry[header] = cells[i] || '';
    });
    return normalizeEntry(entry, index);
  });
}

function normalizeEntry(raw, index = 0) {
  return {
    id: raw.id || index + 1,
    title: String(raw.title || '').trim(),
    subtitle: String(raw.subtitle || '').trim(),
    badge: String(raw.badge || '').trim(),
    footer: String(raw.footer || raw.channel || '').trim()
  };
}

function loadInput(inputFile) {
  const content = fs.readFileSync(inputFile, 'utf8');
  const ext = path.extname(inputFile).toLowerCase();

  if (ext === '.json') {
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : parsed.items || [];
    return rows.map((row, index) => normalizeEntry(row, index));
  }

  if (ext === '.csv') {
    return parseCsv(content);
  }

  throw new Error(`Unsupported input format: ${ext}. Use .csv or .json`);
}

function loadTemplate(templateName, cwd) {
  const templatePath = path.resolve(cwd, 'templates', `${templateName}.json`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }
  return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
}

function registerFonts(rootDir) {
  const fontDir = path.resolve(rootDir, 'assets', 'fonts');
  if (!fs.existsSync(fontDir)) return;

  const supported = new Set(['.ttf', '.otf', '.ttc', '.woff', '.woff2']);
  for (const file of fs.readdirSync(fontDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!supported.has(ext)) continue;
    const full = path.join(fontDir, file);
    try {
      const familyName = path.basename(file, ext);
      registerFont(full, { family: familyName });
      console.log(`Loaded font: ${file} (family: ${familyName})`);
    } catch (error) {
      console.warn(`Skipping font ${file}: ${error.message}`);
    }
  }
}

function safeFilename(text, fallback = 'thumbnail') {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

function truncateWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const w = ctx.measureText(candidate).width;
    if (w <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) {
        lines.push(line);
        break;
      }
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (lines.length === maxLines) {
    const idx = maxLines - 1;
    while (ctx.measureText(`${lines[idx]}…`).width > maxWidth && lines[idx].includes(' ')) {
      lines[idx] = lines[idx].split(' ').slice(0, -1).join(' ');
    }
    if (!lines[idx].endsWith('…')) {
      lines[idx] = `${lines[idx]}…`;
    }
  }

  return lines;
}

function drawTexture(ctx, width, height, opacity = 0.08, steps = 300) {
  for (let i = 0; i < steps; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 20 + Math.random() * 120;
    const alpha = opacity * (0.2 + Math.random() * 0.8);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function renderThumbnail(item, template, outputPath) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const colors = template.colors || {};
  const typography = template.typography || {};
  const layout = template.layout || {};
  const effects = template.effects || {};
  const badgeConfig = template.badge || {};
  const footer = template.footer || {};

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  const stops = colors.backgroundGradient || ['#111827', '#1d4ed8'];
  bg.addColorStop(0, stops[0]);
  bg.addColorStop(1, stops[1] || stops[0]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawTexture(ctx, WIDTH, HEIGHT, effects.textureOpacity ?? 0.09, effects.textureSteps ?? 280);

  const titleText = truncateWords(item.title, typography.visibleWordsMax || 6);
  const padding = layout.padding ?? 72;
  const maxTitleWidth = WIDTH - padding * 2;
  const maxLines = typography.maxLines || 3;

  const family = typography.fontFamily || 'Arial, sans-serif';
  let fontSize = typography.titleMaxSize || 132;
  const minSize = typography.titleMinSize || 64;
  const lineHeightRatio = typography.lineHeightRatio || 1.06;
  let lines = [];

  while (fontSize >= minSize) {
    ctx.font = `900 ${fontSize}px ${family}`;
    lines = wrapText(ctx, titleText, maxTitleWidth, maxLines);
    const tooWide = lines.some((line) => ctx.measureText(line).width > maxTitleWidth);
    if (!tooWide && lines.length <= maxLines) {
      break;
    }
    fontSize -= 2;
  }

  const lineHeight = Math.round(fontSize * lineHeightRatio);
  const blockHeight = lines.length * lineHeight;
  const startY = (HEIGHT - blockHeight) / 2 + fontSize * 0.84;

  ctx.fillStyle = colors.title || '#ffffff';
  ctx.strokeStyle = colors.titleOutline || 'rgba(0,0,0,0.9)';
  ctx.lineWidth = effects.outlineWidth ?? 10;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  if (effects.shadow) {
    ctx.shadowColor = effects.shadowColor || 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = effects.shadowBlur ?? 22;
    ctx.shadowOffsetX = effects.shadowOffsetX ?? 0;
    ctx.shadowOffsetY = effects.shadowOffsetY ?? 8;
  }

  lines.forEach((line, i) => {
    const x = padding;
    const y = startY + i * lineHeight;
    ctx.strokeText(line, x, y);
    ctx.fillText(line, x, y);
  });

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  if (item.badge) {
    const badgeText = item.badge.toUpperCase();
    const badgeFont = badgeConfig.fontSize || 42;
    ctx.font = `900 ${badgeFont}px ${badgeConfig.fontFamily || family}`;

    const textW = ctx.measureText(badgeText).width;
    const padX = badgeConfig.paddingX || 22;
    const padY = badgeConfig.paddingY || 12;
    const bH = badgeFont + padY * 2;
    const bW = textW + padX * 2;
    const margin = badgeConfig.margin || padding;

    let x = margin;
    let y = margin;
    if (badgeConfig.position === 'top-right') {
      x = WIDTH - margin - bW;
      y = margin;
    } else if (badgeConfig.position === 'bottom-left') {
      x = margin;
      y = HEIGHT - margin - bH;
    } else if (badgeConfig.position === 'bottom-right') {
      x = WIDTH - margin - bW;
      y = HEIGHT - margin - bH;
    }

    drawRoundedRect(ctx, x, y, bW, bH, badgeConfig.radius || 999);
    ctx.fillStyle = badgeConfig.fill || '#ef4444';
    ctx.fill();

    ctx.fillStyle = badgeConfig.textColor || '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, x + padX, y + bH / 2);
  }

  const footerText = item.footer || template.defaults?.footer || '';
  if (footerText) {
    const fSize = footer.fontSize || 30;
    ctx.font = `700 ${fSize}px ${footer.fontFamily || family}`;
    ctx.fillStyle = footer.textColor || 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(footerText, padding, HEIGHT - (footer.marginBottom || 30));
  }

  const png = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, png);
}

function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const inputArg = args.in || 'inputs/sample.csv';
  const templateName = args.template || 'default';
  const outArg = args.out || 'out';
  const limit = args.limit ? Number(args.limit) : Number.POSITIVE_INFINITY;

  const inputPath = path.resolve(cwd, inputArg);
  const outDir = path.resolve(cwd, outArg);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  registerFonts(cwd);
  const items = loadInput(inputPath).filter((item) => item.title).slice(0, limit);
  if (items.length === 0) {
    throw new Error('No valid rows found. Ensure each row has at least a title.');
  }

  const template = loadTemplate(templateName, cwd);
  fs.mkdirSync(outDir, { recursive: true });

  items.forEach((item, index) => {
    const base = safeFilename(item.title, `thumbnail-${index + 1}`);
    const output = path.join(outDir, `${String(index + 1).padStart(2, '0')}-${base}.png`);
    renderThumbnail(item, template, output);
    console.log(`Generated: ${path.relative(cwd, output)}`);
  });

  console.log(`Done. ${items.length} thumbnail(s) generated at ${path.relative(cwd, outDir)}`);
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
