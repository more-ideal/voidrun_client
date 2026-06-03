import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const MIN_WALLS = 2
const MAX_WALLS = 4
const MAX_CLEAR_RUN = 5   // 연속 빈칸 최대 칸 수
const MAX_ATTEMPTS = 80   // 행 재시도 횟수
const BUFFER_AHEAD = 28   // 플레이어 위로 미리 생성할 행 수

type Row = number[]  // 0=빈, 1=벽

// ── 슬라이딩 물리 ────────────────────────────────
// rows[0]=가장 아래, rows[length-1]=가장 위
// 위 = rowIdx 증가 (+1)

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

/** 모든 도달 가능 노드에서 맨 위 행까지 올라갈 수 있는지 검증 */
function canReachTop(rows: Row[], start: {r:number,c:number}): boolean {
  const top = rows.length - 1
  const key = (r:number,c:number) => r * COLS + c
  const nodes = reachable(rows, start)

  // 역방향 인접 리스트 구성
  const radj = new Map<number, number[]>()
  for (const {r,c} of nodes) {
    for (const [dr,dc] of DIRS) {
      const e = slideStop(rows, r, c, dr, dc)
      if (e.r === r && e.c === c) continue
      const bk = key(e.r, e.c)
      const ak = key(r, c)
      const list = radj.get(bk)
      if (list) list.push(ak)
      else radj.set(bk, [ak])
    }
  }

  // 맨 위 행 씨앗으로 역전파
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

// ── 맵 생성기 ────────────────────────────────────

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

    // 아래쪽 오래된 타일 정리
    for (const [k, tile] of this.tiles) {
      const gy = parseInt(k.split(',')[1])
      if (gy > playerGY + 12) {
        tile.destroy(); this.tiles.delete(k); this.walls.delete(k)
      }
    }
  }

  // ── 행 추가 ──

  private addRow() {
    const newGY = this.baseGY - this.rows.length
    const startC = this.openCols(this.rows[0])[0] ?? Math.floor(COLS / 2)
    const start = { r: 0, c: startC }

    let newRow: Row | null = null
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = this.makeRow()
      // 최근 행들 + 후보 행으로만 검증 (성능)
      const window = [...this.rows.slice(-BUFFER_AHEAD), candidate]
      const wStart = { r: window.length - 1 - (this.rows.length - 1), c: startC }
      const safeStart = { r: 0, c: startC }
      if (canReachTop([...this.rows, candidate], start)) {
        newRow = candidate; break
      }
    }

    if (!newRow) newRow = this.emptyRow()
    this.rows.push(newRow)
    this.renderRow(newRow, newGY)
  }

  // ── 행 생성 ──

  private makeRow(): Row {
    const row = this.emptyRow()
    const target = MIN_WALLS + Math.floor(Math.random() * (MAX_WALLS - MIN_WALLS + 1))
    let placed = 0, guard = 0

    while (placed < target && guard++ < (COLS - 2) * 5) {
      const c = 1 + Math.floor(Math.random() * (COLS - 2))
      if (row[c] !== 0) continue
      row[c] = 1; placed++

      // 50% 확률로 클러스터 (옆 칸도 벽)
      if (placed < target && Math.random() < 0.5) {
        const nc = c + (Math.random() < 0.5 ? 1 : -1)
        if (nc >= 1 && nc < COLS - 1 && row[nc] === 0) {
          row[nc] = 1; placed++
        }
      }
    }

    return this.enforceMaxRun(row)
  }

  /** 연속 빈칸이 MAX_CLEAR_RUN 초과하면 중간에 벽 삽입 */
  private enforceMaxRun(row: Row): Row {
    const r = [...row]
    let run = 0, start = -1
    for (let c = 0; c < COLS; c++) {
      if (r[c] === 0) {
        if (run === 0) start = c
        run++
        if (run > MAX_CLEAR_RUN) {
          const mid = start + Math.floor(run / 2)
          if (mid >= 1 && mid < COLS - 1) {
            r[mid] = 1; run = 0; start = -1; c = mid
          }
        }
      } else { run = 0; start = -1 }
    }
    return r
  }

  private emptyRow(): Row {
    const r = new Array(COLS).fill(0)
    r[0] = 1; r[COLS - 1] = 1
    return r
  }

  private openCols(row: Row): number[] {
    return row.map((v, i) => (v === 0 ? i : -1)).filter(i => i > 0)
  }

  private renderRow(row: Row, gy: number) {
    // 좌우 경계 벽 등록
    this.walls.add(`-1,${gy}`)
    this.walls.add(`${COLS},${gy}`)

    for (let c = 0; c < COLS; c++) {
      if (row[c] === 1) {
        const k = `${c},${gy}`
        if (!this.tiles.has(k)) {
          const tile = this.scene.add.rectangle(
            c * TILE + TILE / 2, gy * TILE + TILE / 2,
            TILE - 2, TILE - 2, 0x0d2040
          ).setStrokeStyle(1, 0x1a4060, 1).setDepth(1)
          this.tiles.set(k, tile)
          this.walls.add(k)
        }
      }
    }
  }

  private syncWalls() {
    for (let i = 0; i < this.rows.length; i++) {
      this.renderRow(this.rows[i], this.baseGY - i)
    }
  }
}
