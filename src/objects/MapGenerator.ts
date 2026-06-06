import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { PATTERNS, PATTERN_HEIGHT, START_PATTERN_IDX } from './patterns'

const WALL_COLOR  = 0x0d2040
const WALL_BORDER = 0x2a5080

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
    this.placeChunk(PATTERNS[START_PATTERN_IDX], 0)
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
    const available = PATTERNS.filter((_, i) => i !== START_PATTERN_IDX)
    const pattern = available[Math.floor(Math.random() * available.length)]
    this.placeChunk(pattern, this.placedChunks)
    this.placedChunks++
  }

  private placeChunk(pattern: number[][], chunkIdx: number) {
    // 패턴은 이미 뒤집어서 저장됨 — row 0이 게임 아래쪽
    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - chunkIdx * PATTERN_HEIGHT - r
      const row = pattern[r]
      this.walls.add(`-1,${gy}`)
      this.walls.add(`${COLS},${gy}`)
      for (let c = 0; c < COLS; c++) {
        if (row[c] === 1) {
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
        if (row[c] === 1) this.drawTile(gfx, c, gy)
      }
    }
  }

  private drawTile(gfx: Phaser.GameObjects.Graphics, c: number, gy: number) {
    const x = c * TILE, y = gy * TILE
    gfx.fillStyle(WALL_COLOR, 1)
    gfx.fillRect(x, y, TILE, TILE)

    gfx.lineStyle(1.5, WALL_BORDER, 1)
    if (!this.wallSet.has(`${c},${gy - 1}`)) { gfx.beginPath(); gfx.moveTo(x, y);        gfx.lineTo(x+TILE, y);        gfx.strokePath() }
    if (!this.wallSet.has(`${c},${gy + 1}`)) { gfx.beginPath(); gfx.moveTo(x, y+TILE);   gfx.lineTo(x+TILE, y+TILE);   gfx.strokePath() }
    if (!this.wallSet.has(`${c-1},${gy}`))   { gfx.beginPath(); gfx.moveTo(x, y);        gfx.lineTo(x, y+TILE);        gfx.strokePath() }
    if (!this.wallSet.has(`${c+1},${gy}`))   { gfx.beginPath(); gfx.moveTo(x+TILE, y);   gfx.lineTo(x+TILE, y+TILE);   gfx.strokePath() }
  }
}
