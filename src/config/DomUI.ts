const panel = () => document.getElementById('ui-panel')
const scoreEl = () => document.getElementById('ui-score')
const heightEl = () => document.getElementById('ui-height')

export function showGameUI() {
  panel()?.classList.add('visible')
}

export function hideGameUI() {
  panel()?.classList.remove('visible')
}

export function updateScore(score: number) {
  const el = scoreEl()
  if (el) el.textContent = String(score)
}

export function updateHeight(height: number) {
  const el = heightEl()
  if (el) el.textContent = height + 'm'
}
