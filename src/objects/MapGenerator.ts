import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const TEST_PATTERN: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

export const PATTERN_HEIGHT = TEST_PATTERN.length

export class MapGenerator {
  private scene: Phaser.Scene
  private walls: Set<string>
  private tiles: Map<string, Phaser.GameObjects.Rectangle> = new Map()
  private generatedChunks: Set<number> = new Set()

  constructor(scene: Phaser.Scene, walls: Set<string>) {
    this.scene = scene
    this.walls = walls
  }

  init(playerStartRow: number) {
    // 시작 위치 기준 충분히 위까지 생성
    const startChunk = Math.ceil(playerStartRow / PATTERN_HEIGHT)
    for (let i = -1; i <= startChunk + 6; i++) {
      this.generateChunk(i)
    }
  }

  generateChunk(chunkIndex: number) {
    if (this.generatedChunks.has(chunkIndex)) return
    this.generatedChunks.add(chunkIndex)

    const chunkBottomRow = chunkIndex * PATTERN_HEIGHT

    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const worldRow = chunkBottomRow - r

      // 좌우 경계 벽
      this.walls.add(`-1,${worldRow}`)
      this.walls.add(`${COLS},${worldRow}`)

      for (let c = 0; c < TEST_PATTERN[r].length && c < COLS; c++) {
        if (TEST_PATTERN[r][c] === 1) {
          const key = `${c},${worldRow}`
          if (!this.tiles.has(key)) {
            const tile = this.scene.add.rectangle(
              c * TILE + TILE / 2,
              worldRow * TILE + TILE / 2,
              TILE - 2,
              TILE - 2,
              0x0d2040
            )
            tile.setStrokeStyle(1, 0x1a4060, 1)
            tile.setDepth(1)
            this.tiles.set(key, tile)
            this.walls.add(key)
          }
        }
      }
    }
  }

  update(playerGY: number) {
    const playerChunk = Math.ceil(playerGY / PATTERN_HEIGHT)

    // 위로 3청크 미리 생성
    for (let i = playerChunk - 4; i <= playerChunk + 2; i++) {
      this.generateChunk(i)
    }

    // 너무 아래 청크 제거
    const minChunk = playerChunk - 6
    for (const [key, tile] of this.tiles) {
      const [, rowStr] = key.split(',')
      const row = parseInt(rowStr)
      const chunk = Math.ceil(row / PATTERN_HEIGHT)
      if (chunk > playerChunk + 4) {
        tile.destroy()
        this.tiles.delete(key)
        this.walls.delete(key)
      }
    }
  }
}
