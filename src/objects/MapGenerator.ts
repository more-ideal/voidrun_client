import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { PATTERNS, PATTERN_HEIGHT, START_PATTERN_IDX } from './patterns'

export class MapGenerator {
  private placedChunks = 0
  private baseGY = 0
  private tiles = new Map<string, Phaser.GameObjects.Rectangle>()

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

    for (const [k, tile] of this.tiles) {
      const gy = parseInt(k.split(',')[1])
      if (gy > playerGY + PATTERN_HEIGHT) {
        tile.destroy(); this.tiles.delete(k); this.walls.delete(k)
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
    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - chunkIdx * PATTERN_HEIGHT - r
      // 패턴 뒤집기: row 0(에디터 위쪽) → 게임 아래쪽에 배치
      const patternRow = pattern[PATTERN_HEIGHT - 1 - r]
      this.renderRow(patternRow, gy)
    }
  }

  private renderRow(row: number[], gy: number) {
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
}
