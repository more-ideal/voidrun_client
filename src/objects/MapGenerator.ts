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

    // 시작 패턴 고정 배치
    this.placeChunk(PATTERNS[START_PATTERN_IDX], 0)
    this.placedChunks = 1

    // 위로 3청크 미리 생성
    for (let i = 0; i < 3; i++) this.addChunk()
  }

  update(playerGY: number) {
    // 플레이어 위치 기준 필요한 청크 수 계산
    const playerChunkIdx = Math.ceil((this.baseGY - playerGY) / PATTERN_HEIGHT)
    while (this.placedChunks < playerChunkIdx + 3) {
      this.addChunk()
    }

    // 아래 오래된 타일 정리
    for (const [k, tile] of this.tiles) {
      const gy = parseInt(k.split(',')[1])
      if (gy > playerGY + PATTERN_HEIGHT) {
        tile.destroy(); this.tiles.delete(k); this.walls.delete(k)
      }
    }
  }

  // ── 청크 추가 (시작 패턴 제외 랜덤) ──

  private addChunk() {
    const available = PATTERNS.filter((_, i) => i !== START_PATTERN_IDX)
    const pattern = available[Math.floor(Math.random() * available.length)]
    this.placeChunk(pattern, this.placedChunks)
    this.placedChunks++
  }

  // ── 청크 배치 ──
  // row 0 = 패턴 위쪽 (gridY 작음)
  // row PATTERN_HEIGHT-1 = 패턴 아래쪽 (gridY 큼)

  private placeChunk(pattern: number[][], chunkIdx: number) {
    for (let r = 0; r < PATTERN_HEIGHT; r++) {
      const gy = this.baseGY - chunkIdx * PATTERN_HEIGHT - r
      this.renderRow(pattern[r], gy)
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
