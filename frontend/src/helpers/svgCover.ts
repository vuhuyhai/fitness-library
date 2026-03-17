/**
 * Procedural SVG cover generator.
 * Each document gets a unique, deterministic cover based on its ID and category.
 */

const CATEGORY_THEMES: Record<string, { bg: string; colors: string[]; style: string }> = {
  'cat-workout': {
    bg: '#1a0a00',
    colors: ['#f97316', '#fb923c', '#dc2626', '#fbbf24'],
    style: 'geometric',
  },
  'cat-nutrition': {
    bg: '#00150a',
    colors: ['#22c55e', '#4ade80', '#86efac', '#16a34a'],
    style: 'organic',
  },
  'cat-recovery': {
    bg: '#00091a',
    colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'],
    style: 'wave',
  },
  'cat-mindset': {
    bg: '#0f0019',
    colors: ['#a855f7', '#c084fc', '#e879f9', '#7c3aed'],
    style: 'constellation',
  },
  'cat-science': {
    bg: '#001a1a',
    colors: ['#06b6d4', '#22d3ee', '#67e8f9', '#0e7490'],
    style: 'grid',
  },
  default: {
    bg: '#111827',
    colors: ['#6b7280', '#9ca3af', '#d1d5db', '#374151'],
    style: 'geometric',
  },
}

// Seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function strToSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

function ri(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min) + min)
}

function generateGeometric(rng: () => number, colors: string[], w: number, h: number): string {
  const shapes: string[] = []
  for (let i = 0; i < 8; i++) {
    const x = ri(rng, -30, w + 30)
    const y = ri(rng, -30, h + 30)
    const size = ri(rng, 40, 150)
    const color = colors[ri(rng, 0, colors.length)]
    const opacity = (rng() * 0.4 + 0.15).toFixed(2)
    const rotation = ri(rng, 0, 360)
    // Triangles and parallelograms
    const type = rng() > 0.5 ? 'polygon' : 'rect'
    if (type === 'polygon') {
      const pts = `${x},${y} ${x + size},${y + size / 2} ${x + size / 2},${y + size}`
      shapes.push(`<polygon points="${pts}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation},${x},${y})"/>`)
    } else {
      shapes.push(`<rect x="${x}" y="${y}" width="${size}" height="${size * 0.4}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation},${x},${y})" rx="2"/>`)
    }
  }
  // Dynamic diagonal lines
  for (let i = 0; i < 5; i++) {
    const x1 = ri(rng, 0, w)
    const y1 = ri(rng, 0, h)
    const x2 = x1 + ri(rng, -100, 100)
    const y2 = y1 + ri(rng, 60, 150)
    const color = colors[ri(rng, 0, colors.length)]
    shapes.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${ri(rng, 1, 4)}" opacity="0.5"/>`)
  }
  return shapes.join('\n')
}

function generateOrganic(rng: () => number, colors: string[], w: number, h: number): string {
  const shapes: string[] = []
  for (let i = 0; i < 6; i++) {
    const cx = ri(rng, 0, w)
    const cy = ri(rng, 0, h)
    const r = ri(rng, 30, 120)
    const color = colors[ri(rng, 0, colors.length)]
    const opacity = (rng() * 0.35 + 0.1).toFixed(2)
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`)
  }
  // Bezier curves
  for (let i = 0; i < 4; i++) {
    const x1 = ri(rng, 0, w)
    const y1 = ri(rng, 0, h)
    const cx1 = ri(rng, 0, w)
    const cy1 = ri(rng, 0, h)
    const x2 = ri(rng, 0, w)
    const y2 = ri(rng, 0, h)
    const color = colors[ri(rng, 0, colors.length)]
    shapes.push(`<path d="M${x1},${y1} Q${cx1},${cy1} ${x2},${y2}" stroke="${color}" stroke-width="${ri(rng, 1, 3)}" fill="none" opacity="0.4"/>`)
  }
  return shapes.join('\n')
}

function generateWave(rng: () => number, colors: string[], w: number, h: number): string {
  const shapes: string[] = []
  for (let i = 0; i < 5; i++) {
    const y = ri(rng, 10, h - 10)
    const amp = ri(rng, 10, 50)
    const freq = rng() * 0.04 + 0.01
    const color = colors[ri(rng, 0, colors.length)]
    const opacity = (rng() * 0.4 + 0.15).toFixed(2)
    let d = `M 0,${y}`
    for (let x = 0; x <= w; x += 5) {
      const yy = y + Math.sin(x * freq * Math.PI) * amp
      d += ` L ${x},${yy.toFixed(1)}`
    }
    shapes.push(`<path d="${d}" stroke="${color}" stroke-width="${ri(rng, 1, 3)}" fill="none" opacity="${opacity}"/>`)
  }
  return shapes.join('\n')
}

function generateConstellation(rng: () => number, colors: string[], w: number, h: number): string {
  const shapes: string[] = []
  const nodes: [number, number][] = []
  for (let i = 0; i < 12; i++) {
    const x = ri(rng, 10, w - 10)
    const y = ri(rng, 10, h - 10)
    nodes.push([x, y])
    const color = colors[ri(rng, 0, colors.length)]
    shapes.push(`<circle cx="${x}" cy="${y}" r="${ri(rng, 2, 5)}" fill="${color}" opacity="0.8"/>`)
  }
  // Connect nearby nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i][0] - nodes[j][0]
      const dy = nodes[i][1] - nodes[j][1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 120 && rng() > 0.4) {
        const color = colors[ri(rng, 0, colors.length)]
        shapes.push(`<line x1="${nodes[i][0]}" y1="${nodes[i][1]}" x2="${nodes[j][0]}" y2="${nodes[j][1]}" stroke="${color}" stroke-width="0.8" opacity="0.35"/>`)
      }
    }
  }
  return shapes.join('\n')
}

function generateGrid(rng: () => number, colors: string[], w: number, h: number): string {
  const shapes: string[] = []
  const gridSize = ri(rng, 20, 40)
  for (let x = 0; x <= w; x += gridSize) {
    shapes.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${colors[0]}" stroke-width="0.5" opacity="0.2"/>`)
  }
  for (let y = 0; y <= h; y += gridSize) {
    shapes.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${colors[0]}" stroke-width="0.5" opacity="0.2"/>`)
  }
  // Data viz mini bars
  const barCount = ri(rng, 5, 10)
  const barW = ri(rng, 8, 16)
  const barSpacing = ri(rng, 4, 8)
  const startX = ri(rng, 10, w - barCount * (barW + barSpacing) - 10)
  const baseY = ri(rng, h / 2, h - 20)
  for (let i = 0; i < barCount; i++) {
    const barH = ri(rng, 20, 80)
    const color = colors[ri(rng, 0, colors.length)]
    shapes.push(`<rect x="${startX + i * (barW + barSpacing)}" y="${baseY - barH}" width="${barW}" height="${barH}" fill="${color}" opacity="0.6" rx="2"/>`)
  }
  return shapes.join('\n')
}

export function generateSvgCover(docId: string, catId: string, width = 400, height = 260): string {
  const theme = CATEGORY_THEMES[catId] || CATEGORY_THEMES.default
  const rng = mulberry32(strToSeed(docId))

  let shapes = ''
  switch (theme.style) {
    case 'geometric':
      shapes = generateGeometric(rng, theme.colors, width, height)
      break
    case 'organic':
      shapes = generateOrganic(rng, theme.colors, width, height)
      break
    case 'wave':
      shapes = generateWave(rng, theme.colors, width, height)
      break
    case 'constellation':
      shapes = generateConstellation(rng, theme.colors, width, height)
      break
    case 'grid':
      shapes = generateGrid(rng, theme.colors, width, height)
      break
    default:
      shapes = generateGeometric(rng, theme.colors, width, height)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${theme.bg}"/>
  ${shapes}
</svg>`
}

export function svgToDataURI(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
