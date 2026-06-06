import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const MAX_ATTEMPTS = 60
const BUFFER_AHEAD = 28

type Row = number[]

// ── 슬라이딩 물리 ──────────────────────────────
function slideStop(rows: Row[], sr: number, sc: number, dr: number, dc: number) {
  let r = sr, c = sc
  for (;;) {
    const nr = r + dr, nc = c + dc
    if (nr < 0 || nr >= rows.length || nc < 0 || nc >= COLS) break
    if (rows[nr][nc] === 1) break
    r = nr; c = nc
  }
  return { r, c }
}

const DIRS = [[1,0],[-1,0],[0,1],[0,-1]] as const

function reachable(rows: Row[], start: {r:number,c:number}) {
  const seen = new Set<number>([start.r * COLS + start.c])
  const stack = [{...start}]
  const nodes: {r:number,c:number}[] = []
  while (stack.length) {
    const cur = stack.pop()!
    nodes.push(cur)
    for (const [dr,dc] of DIRS) {
      const n = slideStop(rows, cur.r, cur.c, dr, dc)
      const k = n.r * COLS + n.c
      if ((n.r !== cur.r || n.c !== cur.c) && !seen.has(k)) {
        seen.add(k); stack.push(n)
      }
    }
  }
  return nodes
}

function canReachTop(rows: Row[], start: {r:number,c:number}): boolean {
  const top = rows.length - 1
  const key = (r:number,c:number) => r * COLS + c
  const nodes = reachable(rows, start)

  const radj = new Map<number, number[]>()
  for (const {r,c} of nodes) {
    for (const [dr,dc] of DIRS) {
      const e = slideStop(rows, r, c, dr, dc)
      if (e.r === r && e.c === c) continue
      const bk = key(e.r, e.c), ak = key(r, c)
      const list = radj.get(bk)
      if (list) list.push(ak); else radj.set(bk, [ak])
    }
  }

  const upOK = new Set<number>()
  const seed: number[] = []
  for (const {r,c} of nodes) {
    if (r >= top) { const k = key(r,c); upOK.add(k); seed.push(k) }
  }
  while (seed.length) {
    for (const p of (radj.get(seed.pop()!) ?? [])) {
      if (!upOK.has(p)) { upOK.add(p); seed.push(p) }
    }
  }
  return nodes.every(({r,c}) => upOK.has(key(r,c)))
}

// ── 맵 생성기 ──────────────────────────────────

export class MapGenerator {
  private rows: Row[] = []
  private baseGY = 0
  private tiles = new Map<string, Phaser.GameObjects.Rectangle>()

  constructor(
    private scene: Phaser.Scene,
    private walls: Set<string>
  ) {}

  init(playerStartGY: number) {
    this.baseGY = playerStartGY
    this.rows = [this.emptyRow()]
    this.syncWalls()
    for (let i = 0; i < BUFFER_AHEAD + 5; i++) this.addRow()
  }

  update(playerGY: number) {
    const playerIdx = this.baseGY - playerGY
    const ahead = this.rows.length - 1 - playerIdx
    for (let i = ahead; i < BUFFER_AHEAD; i++) this.addRow()

    for (const [k, tile] of this.tiles) {
      const gy = parseInt(k.split(',')[1])
      if (gy > playerGY + 12) {
        tile.destroy(); this.tiles.delete(k); this.walls.delete(k)
      }
    }
  }

  // ── 행 추가 ──────────────────────────────────

  private addRow() {
    const newGY = this.baseGY - this.rows.length
    const startC = this.openCols(this.rows[0])[0] ?? Math.floor(COLS / 2)
    const start = { r: 0, c: startC }

    let newRow: Row | null = null
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = this.makeRow()
      if (canReachTop([...this.rows, candidate], start)) {
        newRow = candidate; break
      }
    }

    if (!newRow) newRow = this.emptyRow()
    this.rows.push(newRow)
    this.renderRow(newRow, newGY)
  }

  // ── 행 종류 선택 ──────────────────────────────

  private makeRow(): Row {
    const r = Math.random()
    if (r < 0.45) return this.emptyRow()           // 45% 완전 빈 행
    if (r < 0.75) return this.shortObstacleRow()   // 30% 짧은 장애물
    return this.longObstacleRow()                   // 25% 긴 장애물 (tomb 스타일)
  }

  /** 짧은 장애물: 1~2개 클러스터 */
  private shortObstacleRow(): Row {
    const row = this.emptyRow()
    const clusterCount = Math.random() < 0.5 ? 1 : 2
    const used = new Set<number>()

    for (let cl = 0; cl < clusterCount; cl++) {
      // 배치 위치 랜덤 (단, 이미 사용된 곳 근처는 피함)
      let tries = 0
      while (tries++ < 20) {
        const c = 1 + Math.floor(Math.random() * (COLS - 2))
        if (used.has(c) || used.has(c-1) || used.has(c+1)) continue
        // 1~2칸 클러스터
        const size = Math.random() < 0.5 ? 1 : 2
        for (let i = 0; i < size && c + i < COLS - 1; i++) {
          row[c + i] = 1
          used.add(c + i)
        }
        break
      }
    }
    return row
  }

  /** 긴 장애물: tomb of the mask 스타일 — 한쪽에서 길게 막고 반대편에 통로 */
  private longObstacleRow(): Row {
    const row = this.emptyRow()
    // 통로 너비: 2~3칸
    const gapSize = 2 + Math.floor(Math.random() * 2)
    const fromLeft = Math.random() < 0.5

    if (fromLeft) {
      // 왼쪽에서 막기 → 오른쪽에 통로
      const wallEnd = COLS - 1 - gapSize
      for (let c = 1; c < wallEnd; c++) row[c] = 1
    } else {
      // 오른쪽에서 막기 → 왼쪽에 통로
      const wallStart = 1 + gapSize
      for (let c = wallStart; c < COLS - 1; c++) row[c] = 1
    }
    return row
  }

  // ── 유틸 ──────────────────────────────────────

  private emptyRow(): Row {
    const r = new Array(COLS).fill(0)
    r[0] = 1; r[COLS - 1] = 1
    return r
  }

  private openCols(row: Row): number[] {
    return row.map((v,i) => v === 0 ? i : -1).filter(i => i > 0)
  }

  private renderRow(row: Row, gy: number) {
    this.walls.add(`-1,${gy}`)
    this.walls.add(`${COLS},${gy}`)
    for (let c = 0; c < COLS; c++) {
      if (row[c] !== 1) continue
      const k = `${c},${gy}`
      if (this.tiles.has(k)) continue
      const tile = this.scene.add.rectangle(
        c * TILE + TILE / 2, gy * TILE + TILE / 2,
        TILE - 2, TILE - 2, 0x0d2040
      ).setStrokeStyle(1, 0x1a4060, 1).setDepth(1)
      this.tiles.set(k, tile)
      this.walls.add(k)
    }
  }

  private syncWalls() {
    for (let i = 0; i < this.rows.length; i++) {
      this.renderRow(this.rows[i], this.baseGY - i)
    }
  }
}
