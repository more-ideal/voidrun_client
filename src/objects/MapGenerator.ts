import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

export const CHUNK_HEIGHT = 10  // 청크 하나당 행 수

export interface Chunk {
  startRow: number
  tiles: Phaser.GameObjects.Rectangle[]
}

export class MapGenerator {
  private scene: Phaser.Scene
  private chunks: Chunk[] = []
  private walls: Set<string>
  private totalRowsGenerated = 0

  constructor(scene: Phaser.Scene, walls: Set<string>) {
    this.scene = scene
    this.walls = walls
  }

  // 초기 맵 생성 (화면 채울 만큼)
  init(startRow: number) {
    for (let i = 0; i < 5; i++) {
      this.generateChunk(startRow - CHUNK_HEIGHT * i)
    }
  }

  // 청크 하나 생성
  generateChunk(startRow: number) {
    const tiles: Phaser.GameObjects.Rectangle[] = []

    for (let row = startRow; row > startRow - CHUNK_HEIGHT; row--) {
      const wallsInRow = this.generateRow(row)
      wallsInRow.forEach(col => {
        // 벽 타일 그리기
        const x = col * TILE
        const y = row * TILE
        const tile = this.scene.add.rectangle(
          x + TILE / 2,
          y + TILE / 2,
          TILE - 2,
          TILE - 2,
          0x0d2040
        )
        // 테두리
        tile.setStrokeStyle(1, 0x1a4060, 1)
        tiles.push(tile)
        this.walls.add(`${col},${row}`)
      })
    }

    this.chunks.push({ startRow, tiles })
    this.totalRowsGenerated++
  }

  // 한 행의 벽 위치 결정
  private generateRow(row: number): number[] {
    const wallCols: number[] = []

    // 좌우 경계는 항상 벽
    wallCols.push(-1)
    wallCols.push(COLS)

    // 첫 2행은 플레이어 시작 공간 확보 (벽 없음)
    if (row >= this.getPlayerStartRow() - 2) return wallCols

    // 내부 벽 랜덤 배치
    const candidates = Array.from({ length: COLS }, (_, i) => i)
    const maxWalls = Math.min(4, Math.floor(COLS * 0.35))
    const minEmpty = COLS - maxWalls  // 최소 빈칸 보장

    let wallCount = 0
    candidates.forEach(col => {
      if (wallCount < maxWalls && Math.random() < 0.3) {
        wallCols.push(col)
        wallCount++
      }
    })

    return wallCols
  }

  private getPlayerStartRow(): number {
    return 18  // 플레이어 시작 행
  }

  // 플레이어 위치 기준으로 청크 업데이트
  update(playerGY: number) {
    const topRow = playerGY - CHUNK_HEIGHT

    // 위로 새 청크 필요하면 생성
    const highestChunk = this.chunks.reduce(
      (min, c) => Math.min(min, c.startRow),
      Infinity
    )
    if (highestChunk > topRow) {
      this.generateChunk(highestChunk - CHUNK_HEIGHT)
    }

    // 너무 아래 청크 제거
    this.chunks = this.chunks.filter(chunk => {
      if (chunk.startRow > playerGY + CHUNK_HEIGHT * 3) {
        chunk.tiles.forEach(t => t.destroy())
        // 벽 데이터도 제거
        for (let row = chunk.startRow; row > chunk.startRow - CHUNK_HEIGHT; row--) {
          for (let col = 0; col < COLS; col++) {
            this.walls.delete(`${col},${row}`)
          }
        }
        return false
      }
      return true
    })
  }
}
