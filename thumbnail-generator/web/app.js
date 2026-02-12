const WIDTH = 1280;
const HEIGHT = 720;

const scriptFile = document.getElementById('scriptFile');
const videoFile = document.getElementById('videoFile');
const video = document.getElementById('video');
const titleEl = document.getElementById('title');
const badgeEl = document.getElementById('badge');
const badgePosEl = document.getElementById('badgePos');
const footerEl = document.getElementById('footer');
const timeRange = document.getElementById('timeRange');
const timeLabel = document.getElementById('timeLabel');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');

const canvas = document.getElementById('thumb');
const ctx = canvas.getContext('2d');

let hasVideo = false;

function fitTitle(ctx2d, text, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  let fontSize = 118;
  let lines = [];

  while (fontSize >= 54) {
    ctx2d.font = `900 ${fontSize}px Arial`;
    lines = [];
    let line = '';

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx2d.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);

    if (lines.length <= maxLines && lines.every((l) => ctx2d.measureText(l).width <= maxWidth)) {
      return { fontSize, lines: lines.slice(0, maxLines) };
    }

    fontSize -= 2;
  }

  return { fontSize: 54, lines: [words.slice(0, 6).join(' ')] };
}

function drawRoundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function readScriptSuggestion(text) {
  const cleaned = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
    .join(' ');

  const words = cleaned.split(/\s+/).slice(0, 8);
  return words.join(' ');
}

function drawBackground() {
  if (hasVideo && video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
    const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    g.addColorStop(0, 'rgba(0,0,0,0.48)');
    g.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 160; i += 1) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    const r = Math.random() * 90 + 25;
    const t = ctx.createRadialGradient(x, y, 0, x, y, r);
    t.addColorStop(0, 'rgba(255,255,255,0.07)');
    t.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = t;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render() {
  const titleRaw = titleEl.value.trim() || 'Your Video Title Here';
  const title = titleRaw.split(/\s+/).slice(0, 8).join(' ');
  const badge = badgeEl.value.trim().toUpperCase();
  const footer = footerEl.value.trim();

  drawBackground();

  const padding = 72;
  const maxW = WIDTH - padding * 2;
  const { fontSize, lines } = fitTitle(ctx, title, maxW, 3);
  const lineHeight = Math.round(fontSize * 1.05);

  ctx.font = `900 ${fontSize}px Arial`;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.92)';
  ctx.lineWidth = 10;

  const blockH = lines.length * lineHeight;
  let y = (HEIGHT - blockH) / 2 + fontSize * 0.82;

  lines.forEach((line) => {
    ctx.strokeText(line, padding, y);
    ctx.fillText(line, padding, y);
    y += lineHeight;
  });

  if (badge) {
    ctx.font = '900 40px Arial';
    const tx = ctx.measureText(badge).width;
    const w = tx + 40;
    const h = 68;
    const margin = 50;
    let x = WIDTH - w - margin;
    let by = margin;

    if (badgePosEl.value === 'top-left') x = margin;
    if (badgePosEl.value === 'bottom-left') {
      x = margin;
      by = HEIGHT - h - margin;
    }
    if (badgePosEl.value === 'bottom-right') by = HEIGHT - h - margin;

    drawRoundedRect(x, by, w, h, 999);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, x + 20, by + h / 2);
    ctx.textBaseline = 'alphabetic';
  }

  if (footer) {
    ctx.font = '700 30px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(footer, padding, HEIGHT - 28);
  }
}

scriptFile.addEventListener('change', async () => {
  const file = scriptFile.files && scriptFile.files[0];
  if (!file) return;
  const text = await file.text();
  if (!titleEl.value.trim()) {
    titleEl.value = readScriptSuggestion(text);
  }
  render();
});

videoFile.addEventListener('change', () => {
  const file = videoFile.files && videoFile.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  video.src = url;
  video.style.display = 'block';
  hasVideo = true;

  video.addEventListener(
    'loadedmetadata',
    () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      timeRange.max = String(duration || 0);
      timeRange.value = String(Math.min(1, duration));
      timeLabel.textContent = `Duration: ${duration.toFixed(1)}s`;
      video.currentTime = Number(timeRange.value);
    },
    { once: true }
  );

  video.addEventListener('seeked', render);
});

timeRange.addEventListener('input', () => {
  if (!hasVideo) return;
  video.currentTime = Number(timeRange.value);
  timeLabel.textContent = `Frame at ${Number(timeRange.value).toFixed(1)}s`;
});

generateBtn.addEventListener('click', render);

downloadBtn.addEventListener('click', () => {
  render();
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'thumbnail.png';
  a.click();
});

render();
