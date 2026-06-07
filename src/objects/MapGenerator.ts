import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import patternData from '../data/patterns.json'

const PATTERN_HEIGHT = patternData.patterns[0].length
const START_PATTERN = patternData.patterns[patternData.startIdx] as number[][]
const BUFFER_AHEAD = 30
const MIN_LONG_GAP = 5
const MAX_CLEAR_RUN = 6

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

// 친구 로직: 랜덤 행 생성
function randomRow(): Row {
  const row = new Array(COLS).fill(0)
  row[0] = 1; row[COLS-1] = 1
  const wallCount = 2 + Math.floor(Math.random() * 3)
  let placed = 0, guard = 0
  while (placed < wallCount && guard++ < (COLS-2)*5) {
    const c = 1 + Math.floor(Math.random() * (COLS-2))
    if (row[c] !== 0) continue
    row[c] = 1; placed++
    if (placed < wallCount && Math.random() < 0.5) {
      const nc = c + (Math.random() < 0.5 ? 1 : -1)
      if (nc >= 1 && nc < COLS-1 && row[nc] === 0) { row[nc] = 1; placed++ }
    }
  }
  // 연속 빈칸 제한
  let run = 0, runStart = -1
  const r = [...row]
  for (let c = 0; c < COLS; c++) {
    if (r[c] === 0) {
      if (run === 0) runStart = c
      run++
      if (run > MAX_CLEAR_RUN) {
        const mid = runStart + Math.floor(run/2)
        if (mid >= 1 && mid < COLS-1) { r[mid]=1; run=0; runStart=-1; c=mid }
      }
    } else { run=0; runStart=-1 }
  }
  return r
}

export class MapGenerator {
  private baseGY = 0
  private rows: Row[] = []
  private baseRowGY = 0

  private chunkGfx = new Map<number, Phaser.GameObjects.Graphics>()
  private wallSet = new Set<string>()
  private tileTypeMap = new Map<string, number>()
  private tileObjects = new Map<string, Phaser.GameObjects.GameObject[]>()
  private totalRowsGenerated = 0

  constructor(
    private scene: Phaser.Scene,
    private walls: Set<string>
  ) {}

  init(playerStartGY: number) {
    this.baseGY = playerStartGY
    this.placeStartPattern()
    this.baseRowGY = this.baseGY - PATTERN_HEIGHT - 1
    this.rows = [this.emptyWallRow()]
    this.syncRow(0)
    for (let i = 0; i < BUFFER_AHEAD; i++) this.addRow()
  }

  update(playerGY: number) {
    const playerRowIdx = this.baseRowGY - playerGY
    const ahead = this.rows.length - 1 - playerRowIdx
    for (let i = ahead; i < BUFFER_AHEAD; i++) this.addRow()

    for (const [k, objs] of this.tileObjects) {
      const gy = parseInt(k.split(',')[1])
      if (gy > playerGY + PATTERN_HEIGHT + 5) {
        objs.forEach(o => o.destroy())
        this.tileObjects.delete(k)
        this.tileTypeMap.delete(k)
        this.walls.delete(k)
        this.wallSet.delete(k)
      }
    }
    for (const [idx, gfx] of this.chunkGfx) {
      if (idx === 0 && this.baseGY > playerGY + PATTERN_HEIGHT + 5) {
        gfx.destroy(); this.chunkGfx.delete(idx)
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

  private addRow() {
    const newGY = this.baseRowGY - this.rows.length
    const startC = this.openCols(this.rows[0])[0] ?? 7
    const start = { r: 0, c: startC }

    let newRow: Row | null = null
    for (let attempt = 0; attempt < 80; attempt++) {
      const candidate = randomRow()
      if (canReachTop([...this.rows, candidate], start)) {
        newRow = candidate; break
      }
    }
    if (!newRow) newRow = this.emptyWallRow()

    this.rows.push(newRow)
    this.totalRowsGenerated++
    this.syncRow(this.rows.length - 1)
    this.addSpecialTiles(newRow, newGY)
  }

  private emptyWallRow(): Row {
    const r = new Array(COLS).fill(0)
    r[0]=1; r[COLS-1]=1; return r
  }

  private openCols(row: Row): number[] {
    return row.map((v,i)=>v===0?i:-1).filter(i=>i>0)
  }

  private addSpecialTiles(row: Row, gy: number) {
    for (let c = 1; c < COLS-1; c++) {
      if (row[c] !== 0) continue
      const k = `${c},${gy}`
      this.tileTypeMap.set(k, 2)
      this.tileObjects.set(k, this.drawOrb(c*TILE, gy*TILE))
    }
  }

  private syncRow(idx: number) {
    const gy = this.baseRowGY - idx
    const row = this.rows[idx]
    this.walls.add(`-1,${gy}`); this.walls.add(`${COLS},${gy}`)
    const gfx = this.getAutoGfx()
    for (let c = 0; c < COLS; c++) {
      if (!row[c]) continue
      const k = `${c},${gy}`
      this.tileTypeMap.set(k, 1)
      this.walls.add(k); this.wallSet.add(k)
      this.drawWall(gfx, c*TILE, gy*TILE, c, gy)
    }
  }

  private getAutoGfx(): Phaser.GameObjects.Graphics {
    return this.chunkGfx.get(-1) ?? (() => {
      const g = this.scene.add.graphics().setDepth(1)
      this.chunkGfx.set(-1, g); return g
    })()
  }

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

  private drawOrb(x: number, y: number): Phaser.GameObjects.GameObject[] {
    const size = (TILE-4) * 0.5
    const img = this.scene.add.image(x+TILE/2, y+TILE/2, 'orb')
      .setDisplaySize(size, size).setAlpha(0.8).setDepth(3)
    this.scene.tweens.add({ targets: img, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 })
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
