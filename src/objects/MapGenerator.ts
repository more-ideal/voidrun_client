import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import patternData from '../data/patterns.json'

// ── 상수 ────────────────────────────────────────
const PATTERN_HEIGHT = patternData.patterns[0].length
const START_PATTERN = patternData.patterns[patternData.startIdx] as number[][]
const BUFFER_AHEAD = 30
const MIN_LONG_GAP = 5    // 긴 장애물 최소 간격
const MAX_CLEAR_RUN = 6   // 연속 빈칸 최대

// ── 슬라이딩 물리 (canReachTop용) ──────────────
type Row = number[]

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
  const seen = new Set<number>([start.r*COLS+start.c])
  const stack = [{...start}], nodes: {r:number,c:number}[] = []
  while (stack.length) {
    const cur = stack.pop()!; nodes.push(cur)
    for (const [dr,dc] of DIRS) {
      const n = slideStop(rows, cur.r, cur.c, dr, dc)
      const k = n.r*COLS+n.c
      if ((n.r!==cur.r||n.c!==cur.c) && !seen.has(k)) { seen.add(k); stack.push(n) }
    }
  }
  return nodes
}

function canReachTop(rows: Row[], start: {r:number,c:number}): boolean {
  const top = rows.length - 1
  const key = (r:number,c:number) => r*COLS+c
  const nodes = reachable(rows, start)
  const radj = new Map<number,number[]>()
  for (const {r,c} of nodes) {
    for (const [dr,dc] of DIRS) {
      const e = slideStop(rows, r, c, dr, dc)
      if (e.r===r&&e.c===c) continue
      const bk=key(e.r,e.c), ak=key(r,c)
      const l=radj.get(bk); if(l) l.push(ak); else radj.set(bk,[ak])
    }
  }
  const upOK = new Set<number>(), seed: number[] = []
  for (const {r,c} of nodes) if (r>=top) { const k=key(r,c); upOK.add(k); seed.push(k) }
  while (seed.length) for (const p of (radj.get(seed.pop()!)??[])) if (!upOK.has(p)) { upOK.add(p); seed.push(p) }
  return nodes.every(({r,c})=>upOK.has(key(r,c)))
}

// ── 맵 생성기 ───────────────────────────────────

export class MapGenerator {
  private baseGY = 0
  private rows: Row[] = []          // 자동생성 행 배열 (rows[0]=가장 아래)
  private baseRowGY = 0             // rows[0]의 gridY

  private chunkGfx = new Map<number, Phaser.GameObjects.Graphics>()  // 패턴 청크
  private wallSet = new Set<string>()
  private tileTypeMap = new Map<string, number>()
  private tileObjects = new Map<string, Phaser.GameObjects.GameObject[]>()

  private lastLongDir: 'left'|'right' = 'right'
  private rowsSinceLong = MIN_LONG_GAP
  private totalRowsGenerated = 0

  constructor(
    private scene: Phaser.Scene,
    private walls: Set<string>
  ) {}

  init(playerStartGY: number) {
    this.baseGY = playerStartGY

    // 시작 패턴 (JSON)
    this.placeStartPattern()

    // 자동 생성 행 기반 영역 초기화
    const patternTopGY = this.baseGY - PATTERN_HEIGHT
    this.baseRowGY = patternTopGY - 1
    this.rows = [this.emptyWallRow()]   // rows[0] = 시작 행
    this.syncRow(0)

    for (let i = 0; i < BUFFER_AHEAD; i++) this.addRow()
  }

  update(playerGY: number) {
    // 필요한 만큼 행 추가
    const playerRowIdx = this.baseRowGY - playerGY
    const ahead = this.rows.length - 1 - playerRowIdx
    for (let i = ahead; i < BUFFER_AHEAD; i++) this.addRow()

    // 오래된 타일 제거
    for (const [k, tile] of this.tileObjects) {
      const gy = parseInt(k.split(',')[1])
      if (gy > playerGY + PATTERN_HEIGHT + 5) {
        tile.forEach(o => o.destroy())
        this.tileObjects.delete(k)
        this.tileTypeMap.delete(k)
        this.walls.delete(k)
        this.wallSet.delete(k)
      }
    }
    // 패턴 청크 제거
    for (const [idx, gfx] of this.chunkGfx) {
      if (idx === 0) {
        const bottomGY = this.baseGY
        if (bottomGY > playerGY + PATTERN_HEIGHT + 5) {
          gfx.destroy(); this.chunkGfx.delete(idx)
        }
      }
    }
  }

  getTileType(gx: number, gy: number): number {
    return this.tileTypeMap.get(`${gx},${gy}`) ?? 0
  }

  removeTile(gx: number, gy: number) {
    const k = `${gx},${gy}`
    this.tileObjects.get(k)?.forEach(o => o.destroy())
    this.tileObjects.delete(k)
    this.tileTypeMap.delete(k)
    this.walls.delete(k); this.wallSet.delete(k)
  }

  // ── 시작 패턴 배치 ──────────────────────────

  private placeStartPattern() {
    const gfx = this.scene.add.graphics().setDepth(1)
    this.chunkGfx.set(0, gfx)

    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - r
      const row = START_PATTERN[r]
      this.walls.add(`-1,${gy}`); this.walls.add(`${COLS},${gy}`)
      for (let c = 0; c < COLS; c++) {
        const t = row[c]; if (!t) continue
        const k = `${c},${gy}`
        this.tileTypeMap.set(k, t)
        if (t===1||t===4) { this.walls.add(k); this.wallSet.add(k) }
        this.drawTile(gfx, c, gy, t, START_PATTERN, r)
      }
    }
  }

  // ── 자동 행 추가 ────────────────────────────

  private addRow() {
    const newGY = this.baseRowGY - this.rows.length
    const startC = this.openCols(this.rows[0])[0] ?? 7
    const start = { r: 0, c: startC }

    let newRow: Row | null = null
    for (let attempt = 0; attempt < 80; attempt++) {
      const candidate = this.generateRow()
      if (canReachTop([...this.rows, candidate], start)) {
        newRow = candidate; break
      }
    }
    if (!newRow) newRow = this.emptyWallRow()

    this.rows.push(newRow)
    this.rowsSinceLong++
    this.totalRowsGenerated++

    this.syncRow(this.rows.length - 1)
    this.addSpecialTiles(newRow, newGY)
  }

  private generateRow(): Row {
    const canLong = this.rowsSinceLong >= MIN_LONG_GAP
    const r = Math.random()
    if (canLong && r < 0.22) return this.longObstacleRow()
    if (r < 0.55)            return this.emptyWallRow()
    return this.shortObstacleRow()
  }

  private shortObstacleRow(): Row {
    const row = this.emptyWallRow()
    let tries = 0
    while (tries++ < 20) {
      const c = 2 + Math.floor(Math.random() * (COLS - 4))
      const size = Math.random() < 0.5 ? 1 : 2
      let ok = true
      for (let i = 0; i < size; i++) if (c+i>=COLS-1||row[c+i]) { ok=false; break }
      if (!ok) continue
      for (let i = 0; i < size; i++) row[c+i] = 1
      break
    }
    return this.enforceMaxRun(row)
  }

  private longObstacleRow(): Row {
    const row = this.emptyWallRow()
    const dir = this.lastLongDir === 'left' ? 'right' : 'left'
    this.lastLongDir = dir
    this.rowsSinceLong = 0
    const gap = 2 + Math.floor(Math.random() * 2)
    if (dir === 'left') {
      for (let c = 1; c < COLS - 1 - gap; c++) row[c] = 1
    } else {
      for (let c = 1 + gap; c < COLS - 1; c++) row[c] = 1
    }
    return row
  }

  private enforceMaxRun(row: Row): Row {
    const r = [...row]; let run = 0, start = -1
    for (let c = 0; c < COLS; c++) {
      if (!r[c]) {
        if (!run) start = c; run++
        if (run > MAX_CLEAR_RUN) {
          const mid = start + Math.floor(run/2)
          if (mid>=1&&mid<COLS-1) { r[mid]=1; run=0; start=-1; c=mid }
        }
      } else { run=0; start=-1 }
    }
    return r
  }

  private emptyWallRow(): Row {
    const r = new Array(COLS).fill(0)
    r[0]=1; r[COLS-1]=1; return r
  }

  private openCols(row: Row): number[] {
    return row.map((v,i)=>v===0?i:-1).filter(i=>i>0)
  }

  // 빈 공간에 오브/레이저 랜덤 배치
  private addSpecialTiles(row: Row, gy: number) {
    const depth = this.totalRowsGenerated
      if (row[c] !== 0) continue
      const type = 2  // 모든 빈 칸에 오브
      
      
      
      // else if (rnd < 0.09 && depth > 10) type = 3  // 레이저 2% (10행 이후)
      if (!type) continue
      const k = `${c},${gy}`
      this.tileTypeMap.set(k, type)
      const objs: Phaser.GameObjects.GameObject[] = []
      const gfx = this.chunkGfx.get(-1) ?? (() => {
        const g = this.scene.add.graphics().setDepth(1)
        this.chunkGfx.set(-1, g); return g
      })()
      if (type === 2) objs.push(...this.drawOrb(c * TILE, gy * TILE))
      if (type === 3) this.drawLaser(gfx, c * TILE, gy * TILE, c, row)
      if (objs.length) this.tileObjects.set(k, objs)
    }
  }

  // ── 행 등록 (walls / wallSet) ───────────────

  private syncRow(idx: number) {
    const gy = this.baseRowGY - idx
    const row = this.rows[idx]
    this.walls.add(`-1,${gy}`); this.walls.add(`${COLS},${gy}`)
    const gfx = this.chunkGfx.get(-1) ?? (() => {
      const g = this.scene.add.graphics().setDepth(1)
      this.chunkGfx.set(-1, g); return g
    })()
    for (let c = 0; c < COLS; c++) {
      if (!row[c]) continue
      const k = `${c},${gy}`
      this.tileTypeMap.set(k, 1)
      this.walls.add(k); this.wallSet.add(k)
      this.drawTile(gfx, c, gy, 1, [row], 0)
    }
  }

  // ── 렌더링 ──────────────────────────────────

  private drawTile(gfx: Phaser.GameObjects.Graphics, c: number, gy: number, type: number, pattern: number[][], r: number) {
    const x = c*TILE, y = gy*TILE
    switch (type) {
      case 1: this.drawWall(gfx, x, y, c, gy); break
      case 2: { const o=this.drawOrb(x,y); this.tileObjects.set(`${c},${gy}`,o) } break
      case 3: this.drawLaser(gfx, x, y, c, pattern[r]); break
      case 4: { const o=this.drawGlitch(x,y); this.tileObjects.set(`${c},${gy}`,o) } break
      default: { const o=this.drawConveyor(x,y,type); this.tileObjects.set(`${c},${gy}`,o) }
    }
  }

  private drawWall(gfx: Phaser.GameObjects.Graphics, x: number, y: number, c: number, gy: number) {
    gfx.fillStyle(0x0d2040,1); gfx.fillRect(x,y,TILE,TILE)
    gfx.lineStyle(1.5,0x2a5080,1)
    if (!this.wallSet.has(`${c},${gy-1}`)) { gfx.beginPath(); gfx.moveTo(x,y); gfx.lineTo(x+TILE,y); gfx.strokePath() }
    if (!this.wallSet.has(`${c},${gy+1}`)) { gfx.beginPath(); gfx.moveTo(x,y+TILE); gfx.lineTo(x+TILE,y+TILE); gfx.strokePath() }
    if (!this.wallSet.has(`${c-1},${gy}`)) { gfx.beginPath(); gfx.moveTo(x,y); gfx.lineTo(x,y+TILE); gfx.strokePath() }
    if (!this.wallSet.has(`${c+1},${gy}`)) { gfx.beginPath(); gfx.moveTo(x+TILE,y); gfx.lineTo(x+TILE,y+TILE); gfx.strokePath() }
  }

    const img = this.scene.add.image(x+TILE/2,y+TILE/2,'orb').setDisplaySize(TILE-4,TILE-4).setAlpha(0.8).setDepth(3)
    this.scene.tweens.add({ targets:img, alpha:0.6, yoyo:true, repeat:-1, duration:700 })
    this.scene.tweens.add({ targets:img, alpha:0.6, yoyo:true, repeat:-1, duration:700 })
    return [img]
  }

  private drawLaser(gfx: Phaser.GameObjects.Graphics, x: number, y: number, c: number, row: number[]) {
    const cx=x+TILE/2, cy=y+TILE/2, s=TILE*0.3
    gfx.fillStyle(0xff2255,1)
    gfx.fillTriangle(cx,cy-s,cx+s,cy,cx,cy+s)
    gfx.fillTriangle(cx,cy-s,cx-s,cy,cx,cy+s)
    gfx.lineStyle(1,0xff6680,1)
    gfx.strokeTriangle(cx,cy-s,cx+s,cy,cx,cy+s)
    gfx.strokeTriangle(cx,cy-s,cx-s,cy,cx,cy+s)
    if (c+1<COLS && row[c+1]===3) { gfx.lineStyle(2,0xff2255,0.7); gfx.lineBetween(x+TILE,cy,x+TILE*2,cy) }
  }

  private drawGlitch(x: number, y: number): Phaser.GameObjects.GameObject[] {
    const gfx=this.scene.add.graphics().setDepth(2)
    gfx.fillStyle(0x1a0040,1); gfx.fillRect(x,y,TILE,TILE)
    gfx.lineStyle(2,0xff2255,0.9); gfx.strokeRect(x+2,y-2,TILE,TILE)
    gfx.lineStyle(2,0x00e5ff,0.9); gfx.strokeRect(x-2,y+2,TILE,TILE)
    this.scene.tweens.add({ targets:gfx, alpha:0.4, yoyo:true, repeat:-1, duration:500 })
    return [gfx]
  }

  private drawConveyor(x: number, y: number, type: number): Phaser.GameObjects.GameObject[] {
    const keys: Record<number,string> = {5:'up',6:'down',7:'left',8:'right'}
    const key = keys[type]
    if (key && this.scene.textures.exists(key)) {
      return [this.scene.add.image(x+TILE/2,y+TILE/2,key).setDisplaySize(TILE,TILE).setDepth(2)]
    }
    const gfx=this.scene.add.graphics().setDepth(1)
    gfx.fillStyle(0x112233,1); gfx.fillRect(x,y,TILE,TILE)
    gfx.lineStyle(1,0x00e5cc,0.5); gfx.strokeRect(x,y,TILE,TILE)
    const arrows: Record<number,string>={5:'↑',6:'↓',7:'←',8:'→'}
    const txt=this.scene.add.text(x+TILE/2,y+TILE/2,arrows[type]??'?',{fontSize:'13px',fontFamily:'monospace',color:'#00e5cc'}).setOrigin(0.5).setDepth(2)
    return [gfx,txt]
  }
}
