import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import patternData from '../data/patterns.json'

const PATTERN_HEIGHT = patternData.patterns[0].length
const PATTERNS = patternData.patterns as number[][][]
const START_IDX = patternData.startIdx

const TILE_FILL: Record<number, number> = {
  1: 0x0d2040,
  2: 0x3d2a00,
  3: 0x3a0000,
  4: 0x1a0040,
  5: 0x002020, 6: 0x002020, 7: 0x002020, 8: 0x002020,
}
const TILE_BORDER: Record<number, number> = {
  1: 0x2a5080,
  2: 0xf5a623,
  3: 0xff4444,
  4: 0x9966ff,
  5: 0x00e5cc, 6: 0x00e5cc, 7: 0x00e5cc, 8: 0x00e5cc,
}

export class MapGenerator {
  private placedChunks = 0
  private baseGY = 0
  private chunkGfx = new Map<number, Phaser.GameObjects.Graphics>()
  private wallSet = new Set<string>()

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
            this.walls.delete(`${c},${gy}`)
            this.wallSet.delete(`${c},${gy}`)
          }
        }
      }
    }
  }

  private addChunk() {
    // 패턴이 1개뿐이면 그걸 반복 사용
    const available = PATTERNS.length > 1
      ? PATTERNS.filter((_, i) => i !== START_IDX)
      : PATTERNS
    const pattern = available[Math.floor(Math.random() * available.length)]
    this.placeChunk(pattern, this.placedChunks)
    this.placedChunks++
  }

  private placeChunk(pattern: number[][], chunkIdx: number) {
    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - chunkIdx * PATTERN_HEIGHT - r
      const row = pattern[r]
      this.walls.add(`-1,${gy}`)
      this.walls.add(`${COLS},${gy}`)
      for (let c = 0; c < COLS; c++) {
        if (row[c] === 1 || row[c] === 3 || row[c] === 4) {
          this.walls.add(`${c},${gy}`)
          this.wallSet.add(`${c},${gy}`)
        }
      }
    }

    const gfx = this.scene.add.graphics().setDepth(1)
    this.chunkGfx.set(chunkIdx, gfx)

    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - chunkIdx * PATTERN_HEIGHT - r
      const row = pattern[r]
      for (let c = 0; c < COLS; c++) {
        const t = row[c]
        if (t > 0) this.drawTile(gfx, c, gy, t)
      }
    }
  }

  private drawTile(gfx: Phaser.GameObjects.Graphics, c: number, gy: number, type: number) {
    const x = c * TILE, y = gy * TILE
    const fill = TILE_FILL[type] ?? 0x0d2040
    const border = TILE_BORDER[type] ?? 0x2a5080

    gfx.fillStyle(fill, 1)
    gfx.fillRect(x, y, TILE, TILE)

    if (type === 1) {
      gfx.lineStyle(1.5, border, 1)
      if (!this.wallSet.has(`${c},${gy-1}`)) { gfx.beginPath(); gfx.moveTo(x,y); gfx.lineTo(x+TILE,y); gfx.strokePath() }
      if (!this.wallSet.has(`${c},${gy+1}`)) { gfx.beginPath(); gfx.moveTo(x,y+TILE); gfx.lineTo(x+TILE,y+TILE); gfx.strokePath() }
      if (!this.wallSet.has(`${c-1},${gy}`)) { gfx.beginPath(); gfx.moveTo(x,y); gfx.lineTo(x,y+TILE); gfx.strokePath() }
      if (!this.wallSet.has(`${c+1},${gy}`)) { gfx.beginPath(); gfx.moveTo(x+TILE,y); gfx.lineTo(x+TILE,y+TILE); gfx.strokePath() }
    } else {
      gfx.lineStyle(1.5, border, 0.8)
      gfx.strokeRect(x, y, TILE, TILE)
    }

    const arrows: Record<number, string> = {5:'↑',6:'↓',7:'←',8:'→'}
    if (arrows[type]) {
      this.scene.add.text(x+TILE/2, y+TILE/2, arrows[type], {
        fontSize: '12px', fontFamily: 'monospace', color: '#00e5cc'
      }).setOrigin(0.5).setDepth(2)
    }
  }
}
