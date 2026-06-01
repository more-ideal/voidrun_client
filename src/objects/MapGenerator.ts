import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

export const CHUNK_HEIGHT = 12

export class MapGenerator {
  private scene: Phaser.Scene
  private walls: Set<string>
  private chunks: { startRow: number; tiles: Phaser.GameObjects.Rectangle[] }[] = []

  constructor(scene: Phaser.Scene, walls: Set<string>) {
    this.scene = scene
    this.walls = walls
  }

  init(startRow: number) {
    // 초기 청크 충분히 생성
    for (let i = 0; i < 8; i++) {
      this.generateChunk(startRow - CHUNK_HEIGHT * i)
    }
  }

  generateChunk(startRow: number) {
    const tiles: Phaser.GameObjects.Rectangle[] = []

    for (let row = startRow; row > startRow - CHUNK_HEIGHT; row--) {
      const wallCols = this.generateRow(row, startRow)

      wallCols.forEach(col => {
        const tile = this.scene.add.rectangle(
          col * TILE + TILE / 2,
          row * TILE + TILE / 2,
          TILE - 2,
          TILE - 2,
          0x0d2040
        )
        tile.setStrokeStyle(1, 0x1a4060, 1)
        tile.setDepth(1)
        tiles.push(tile)
        this.walls.add(`${col},${row}`)
      })
    }

    this.chunks.push({ startRow, tiles })
  }

  private generateRow(row: number, chunkStartRow: number): number[] {
    const wallCols: number[] = []

    // 좌우 경계 벽
    for (let y = row - 5; y <= row + 5; y++) {
      this.walls.add(`-1,${y}`)
      this.walls.add(`${COLS},${y}`)
    }

    // 청크 시작 2행은 비워서 연결 통로 확보
    if (row > chunkStartRow - 2) return wallCols

    // 내부 벽 랜덤 배치 (최대 35%, 최소 빈칸 4개 보장)
    let wallCount = 0
    const maxWalls = Math.floor(COLS * 0.35)

    for (let col = 0; col < COLS; col++) {
      if (wallCount < maxWalls && Math.random() < 0.28) {
        wallCols.push(col)
        wallCount++
      }
    }

    return wallCols
  }

  update(playerGY: number) {
    // 위로 새 청크 필요하면 생성
    const highestRow = this.chunks.reduce(
      (min, c) => Math.min(min, c.startRow - CHUNK_HEIGHT),
      Infinity
    )
    if (highestRow > playerGY - CHUNK_HEIGHT * 3) {
      this.generateChunk(highestRow)
    }

    // 너무 아래 청크 제거
    this.chunks = this.chunks.filter(chunk => {
      if (chunk.startRow > playerGY + CHUNK_HEIGHT * 4) {
        chunk.tiles.forEach(t => t.destroy())
        for (let row = chunk.startRow; row > chunk.startRow - CHUNK_HEIGHT; row--) {
          for (let col = -1; col <= COLS; col++) {
            this.walls.delete(`${col},${row}`)
          }
        }
        return false
      }
      return true
    })
  }
}
