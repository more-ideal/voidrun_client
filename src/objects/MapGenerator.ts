import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import patternData from '../data/patterns.json'

const PATTERN_HEIGHT = patternData.patterns[0].length
const PATTERNS = patternData.patterns as number[][][]
const START_IDX = patternData.startIdx

export class MapGenerator {
  private placedChunks = 0
  private baseGY = 0
  private chunkGfx = new Map<number, Phaser.GameObjects.Graphics>()
  private wallSet = new Set<string>()
  private tileTypeMap = new Map<string, number>()  // 타일 타입 저장
  private tileObjects = new Map<string, Phaser.GameObjects.GameObject[]>()  // 타일별 오브젝트

  constructor(
    private scene: Phaser.Scene,
    private walls: Set<string>
  ) {}

  init(playerStartGY: number) {
    this.baseGY = playerStartGY
    this.placedChunks = 0
    this.placeChunk(PATTERNS[START_IDX], 0)
    this.placedChunks = 1
    for (let i = 0; i < 3; i++) this.addChunk()
  }

  update(playerGY: number) {
    const playerChunkIdx = Math.ceil((this.baseGY - playerGY) / PATTERN_HEIGHT)
    while (this.placedChunks < playerChunkIdx + 3) this.addChunk()

    for (const [idx, gfx] of this.chunkGfx) {
      const chunkBottomGY = this.baseGY - idx * PATTERN_HEIGHT
      if (chunkBottomGY > playerGY + PATTERN_HEIGHT) {
        gfx.destroy()
        this.chunkGfx.delete(idx)
        for (let r = 0; r < PATTERN_HEIGHT; r++) {
          const gy = chunkBottomGY - r
          this.walls.delete(`-1,${gy}`)
          this.walls.delete(`${COLS},${gy}`)
          for (let c = 0; c < COLS; c++) {
            const k = `${c},${gy}`
            this.walls.delete(k)
            this.wallSet.delete(k)
            this.tileTypeMap.delete(k)
            this.tileObjects.get(k)?.forEach(o => o.destroy())
            this.tileObjects.delete(k)
          }
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
    this.walls.delete(k)
    this.wallSet.delete(k)
  }

  private addChunk() {
    const available = PATTERNS.length > 1
      ? PATTERNS.filter((_, i) => i !== START_IDX)
      : PATTERNS
    const pattern = available[Math.floor(Math.random() * available.length)]
    this.placeChunk(pattern, this.placedChunks)
    this.placedChunks++
  }

  private placeChunk(pattern: number[][], chunkIdx: number) {
    // 벽 데이터 먼저 등록
    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - chunkIdx * PATTERN_HEIGHT - r
      const row = pattern[r]
      this.walls.add(`-1,${gy}`)
      this.walls.add(`${COLS},${gy}`)
      for (let c = 0; c < COLS; c++) {
        const t = row[c]
        if (t > 0) {
          const k = `${c},${gy}`
          this.tileTypeMap.set(k, t)
          if (t === 1 || t === 3 || t === 4) {
            this.walls.add(k)
            this.wallSet.add(k)
          }
        }
      }
    }

    // 렌더링
    const gfx = this.scene.add.graphics().setDepth(1)
    this.chunkGfx.set(chunkIdx, gfx)

    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - chunkIdx * PATTERN_HEIGHT - r
      const row = pattern[r]
      for (let c = 0; c < COLS; c++) {
        const t = row[c]
        if (t > 0) this.drawTile(gfx, c, gy, t, pattern, r)
      }
    }
  }

  private drawTile(
    gfx: Phaser.GameObjects.Graphics,
    c: number, gy: number, type: number,
    pattern: number[][], r: number
  ) {
    const x = c * TILE, y = gy * TILE
    const k = `${c},${gy}`
    const objs: Phaser.GameObjects.GameObject[] = []

    switch (type) {
      case 1: this.drawWall(gfx, x, y, c, gy); break
      case 2: objs.push(...this.drawOrb(x, y)); break
      case 3: this.drawLaser(gfx, x, y, c, r, pattern); break
      case 4: this.drawGlitch(x, y, objs); break
      default: this.drawConveyor(x, y, type, objs); break
    }

    if (objs.length) this.tileObjects.set(k, objs)
  }

  // 1: 벽 — 덩어리 외곽선
  private drawWall(gfx: Phaser.GameObjects.Graphics, x: number, y: number, c: number, gy: number) {
    gfx.fillStyle(0x0d2040, 1)
    gfx.fillRect(x, y, TILE, TILE)
    gfx.lineStyle(1.5, 0x2a5080, 1)
    if (!this.wallSet.has(`${c},${gy-1}`)) { gfx.beginPath(); gfx.moveTo(x,y); gfx.lineTo(x+TILE,y); gfx.strokePath() }
    if (!this.wallSet.has(`${c},${gy+1}`)) { gfx.beginPath(); gfx.moveTo(x,y+TILE); gfx.lineTo(x+TILE,y+TILE); gfx.strokePath() }
    if (!this.wallSet.has(`${c-1},${gy}`)) { gfx.beginPath(); gfx.moveTo(x,y); gfx.lineTo(x,y+TILE); gfx.strokePath() }
    if (!this.wallSet.has(`${c+1},${gy}`)) { gfx.beginPath(); gfx.moveTo(x+TILE,y); gfx.lineTo(x+TILE,y+TILE); gfx.strokePath() }
  }

  // 2: 점수 오브 — 반짝이는 마름모
  private drawOrb(x: number, y: number): Phaser.GameObjects.GameObject[] {
    const cx = x + TILE/2, cy = y + TILE/2
    const gfx = this.scene.add.graphics().setDepth(3)
    const r = TILE * 0.32
    gfx.fillStyle(0xf5a623, 1)
    gfx.fillTriangle(cx, cy-r, cx+r, cy, cx, cy+r)
    gfx.fillTriangle(cx, cy-r, cx-r, cy, cx, cy+r)
    gfx.lineStyle(1.5, 0xffd700, 1)
    gfx.strokeTriangle(cx, cy-r, cx+r, cy, cx, cy+r)
    gfx.strokeTriangle(cx, cy-r, cx-r, cy, cx, cy+r)
    // 반짝임 tween
    this.scene.tweens.add({
      targets: gfx, alpha: 0.5, yoyo: true, repeat: -1, duration: 600
    })
    return [gfx]
  }

  // 3: 레이저 — 다이아몬드 + 연속 시 선 연결
  private drawLaser(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number,
    c: number, r: number, pattern: number[][]
  ) {
    const cx = x + TILE/2, cy = y + TILE/2
    const s = TILE * 0.3
    gfx.fillStyle(0xff2255, 1)
    gfx.fillTriangle(cx, cy-s, cx+s, cy, cx, cy+s)
    gfx.fillTriangle(cx, cy-s, cx-s, cy, cx, cy+s)
    gfx.lineStyle(1, 0xff6680, 1)
    gfx.strokeTriangle(cx, cy-s, cx+s, cy, cx, cy+s)
    gfx.strokeTriangle(cx, cy-s, cx-s, cy, cx, cy+s)

    // 오른쪽에 같은 레이저 있으면 연결선
    if (c+1 < COLS && r < pattern.length && pattern[r][c+1] === 3) {
      gfx.lineStyle(2, 0xff2255, 0.7)
      gfx.lineBetween(x+TILE, cy, x+TILE*2, cy)
    }
    // 아래쪽에 같은 레이저 있으면 연결선
    if (r+1 < pattern.length && pattern[r+1][c] === 3) {
      gfx.lineStyle(2, 0xff2255, 0.7)
      gfx.lineBetween(cx, y+TILE, cx, y+TILE*2)
    }
  }

  // 4: 글리치 벽 — 빨강+파랑 오프셋 테두리
  private drawGlitch(x: number, y: number, objs: Phaser.GameObjects.GameObject[]) {
    const gfx = this.scene.add.graphics().setDepth(2)
    gfx.fillStyle(0x1a0040, 1)
    gfx.fillRect(x, y, TILE, TILE)

    const o = 2  // 오프셋
    gfx.lineStyle(2, 0xff2255, 0.85)
    gfx.strokeRect(x+o, y-o, TILE, TILE)
    gfx.lineStyle(2, 0x00e5ff, 0.85)
    gfx.strokeRect(x-o, y+o, TILE, TILE)

    // 깜빡임
    this.scene.tweens.add({
      targets: gfx, alpha: 0.4, yoyo: true, repeat: -1,
      duration: 500, ease: 'Stepped'
    })
    objs.push(gfx)
  }

  // 5~8: 컨베이어 벨트
  private drawConveyor(x: number, y: number, type: number, objs: Phaser.GameObjects.GameObject[]) {
    const gfx = this.scene.add.graphics().setDepth(1)
    gfx.fillStyle(0x112233, 1)
    gfx.fillRect(x, y, TILE, TILE)
    gfx.lineStyle(1, 0x00e5cc, 0.5)
    gfx.strokeRect(x, y, TILE, TILE)
    objs.push(gfx)

    const arrows: Record<number, string> = {5:'↑', 6:'↓', 7:'←', 8:'→'}
    const txt = this.scene.add.text(x+TILE/2, y+TILE/2, arrows[type] ?? '?', {
      fontSize: '13px', fontFamily: 'monospace', color: '#00e5cc'
    }).setOrigin(0.5).setDepth(2)
    objs.push(txt)
  }
}
