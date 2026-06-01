export interface GameSettings {
  theme: 'dark' | 'light'
  trailEffect: 'box' | 'gradient' | 'spark' | 'ghost'
  keyLeft: number
  keyRight: number
  keyUp: number
  keyDown: number
}

const STORAGE_KEY = 'voidrun_settings'

export const DEFAULT_SETTINGS: GameSettings = {
  theme: 'dark',
  trailEffect: 'box',
  keyLeft: 37,   // LEFT
  keyRight: 39,  // RIGHT
  keyUp: 38,     // UP
  keyDown: 40,   // DOWN
}

export function loadSettings(): GameSettings {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: GameSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function keyName(code: number): string {
  const m: Record<number, string> = {
    37: '←', 38: '↑', 39: '→', 40: '↓',
    65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E',
    70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J',
    75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O',
    80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T',
    85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
    32: 'SPC', 13: 'ENT',
  }
  return m[code] ?? `[${code}]`
}
