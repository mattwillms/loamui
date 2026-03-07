export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null
}

export function darkenHex(hex: string, factor = 0.55): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.floor(rgb.r * factor)
  const g = Math.floor(rgb.g * factor)
  const b = Math.floor(rgb.b * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function contrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#1a1a1a'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#1a1a1a' : '#f5f0eb'
}
