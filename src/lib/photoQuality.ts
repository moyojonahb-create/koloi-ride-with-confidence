/**
 * Lightweight, in-browser photo quality measurement.
 * Returns simple indicators useful for student verification triage.
 */
export interface PhotoQuality {
  brightness: number;   // 0-100  (target ~40-75)
  glare: boolean;       // true if many near-white hot pixels
  blur: number;         // 0-100  (lower = sharper, >60 likely blurry)
  width: number;
  height: number;
}

export async function measureQuality(blob: Blob): Promise<PhotoQuality> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImg(url);
    // Downscale for speed
    const max = 256;
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * r));
    const h = Math.max(1, Math.round(img.height * r));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { brightness: 50, glare: false, blur: 0, width: img.width, height: img.height };
    }
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Brightness (avg luminance) + glare (% near-white pixels)
    const lum = new Float32Array(w * h);
    let sum = 0;
    let hot = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const Y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      lum[p] = Y;
      sum += Y;
      if (Y > 245) hot++;
    }
    const brightness = Math.round((sum / lum.length) / 255 * 100);
    const glare = (hot / lum.length) > 0.04; // >4% blown-out pixels

    // Blur via Laplacian-like variance on luminance
    let lapSum = 0;
    let lapSqSum = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const v = 4 * lum[idx] - lum[idx - 1] - lum[idx + 1] - lum[idx - w] - lum[idx + w];
        lapSum += v;
        lapSqSum += v * v;
        n++;
      }
    }
    const mean = lapSum / n;
    const variance = lapSqSum / n - mean * mean;
    // Map variance: <100 very blurry, >1500 very sharp. Higher score = blurrier.
    const blur = Math.max(0, Math.min(100, Math.round(100 - (variance / 15))));

    return { brightness, glare, blur, width: img.width, height: img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export interface QualityIssue { code: string; label: string; tip: string }

export function evaluateQuality(q: PhotoQuality, kind: 'id' | 'selfie'): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (q.brightness < 30) {
    issues.push({ code: 'too_dark', label: 'Too dark', tip: 'Move to a well-lit area or face a window.' });
  } else if (q.brightness > 85) {
    issues.push({ code: 'too_bright', label: 'Overexposed', tip: 'Reduce direct light — step away from harsh sunlight.' });
  }
  if (q.glare) {
    issues.push({
      code: 'glare',
      label: 'Glare detected',
      tip: kind === 'id'
        ? 'Tilt the ID slightly to remove the shine on the surface.'
        : 'Avoid lights or windows directly behind you.',
    });
  }
  if (q.blur > 60) {
    issues.push({ code: 'blurry', label: 'Looks blurry', tip: 'Hold the camera steady and tap to focus before shooting.' });
  }
  return issues;
}
