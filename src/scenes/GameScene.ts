import Phaser from 'phaser'
import { TILE, COLS, ROWS } from '../constants'
import { Player } from '../objects/Player'

export class GameScene extends Phaser.Scene {
  private player!: Player
  private walls: Set<string> = new Set()
  private scoreText!: Phaser.GameObjects.Text
  private heightText!: Phaser.GameObjects.Text
  private score = 0
  private startY = 0

  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale
    this.score = 0
    this.walls = new Set()

    this.add.rectangle(width / 2, height / 2, width, height, 0x080810)

    // 임시 경계 벽 (맵 생성 전까지)
    this.buildBorderWalls()

    // 플레이어 생성 (하단 중앙)
    const startGX = Math.floor(COLS / 2)
    const startGY = ROWS - 2
    this.player = new Player(this, startGX, startGY)
    this.startY = this.player.y

    // 데스존
    this.createDeathZone(width, height)

    // HUD
    this.createHUD(width)
  }

  private buildBorderWalls() {
    for (let x = 0; x < COLS; x++) {
      this.walls.add(`${x},-1`)  // 상단 경계
    }
    for (let y = 0; y < ROWS; y++) {
      this.walls.add(`-1,${y}`)       // 좌측 경계
      this.walls.add(`${COLS},${y}`)  // 우측 경계
    }
  }

  private createDeathZone(width: number, height: number) {
    const dz = this.add.graphics()
    dz.fillGradientStyle(0xff2255, 0xff2255, 0x440011, 0x440011, 0.0, 0.0, 0.95, 0.95)
    dz.fillRect(0, height - 80, width, 80)
    dz.lineStyle(2, 0xff2255, 0.8)
    dz.lineBetween(0, height - 80, width, height - 80)
  }

  private createHUD(width: number) {
    // SCORE 박스
    const sg = this.add.graphics().setScrollFactor(0)
    sg.fillStyle(0x0d1a2e, 0.85)
    sg.fillRect(8, 8, 120, 52)
    sg.lineStyle(1, 0x1a3a5c, 1)
    sg.strokeRect(8, 8, 120, 52)

    this.add.text(20, 16, 'SCORE', {
      fontSize: '10px', fontFamily: 'monospace', color: '#7799aa'
    }).setScrollFactor(0)

    this.scoreText = this.add.text(20, 32, '0', {
      fontSize: '20px', fontFamily: 'monospace', color: '#00e5cc', fontStyle: 'bold'
    }).setScrollFactor(0)

    // HEIGHT 박스
    const hg = this.add.graphics().setScrollFactor(0)
    hg.fillStyle(0x0d1a2e, 0.85)
    hg.fillRect(width - 128, 8, 120, 52)
    hg.lineStyle(1, 0x1a3a5c, 1)
    hg.strokeRect(width - 128, 8, 120, 52)

    this.add.text(width - 116, 16, 'HEIGHT', {
      fontSize: '10px', fontFamily: 'monospace', color: '#7799aa'
    }).setScrollFactor(0)

    this.heightText = this.add.text(width - 116, 32, '0m', {
      fontSize: '20px', fontFamily: 'monospace', color: '#f5a623', fontStyle: 'bold'
    }).setScrollFactor(0)
  }

  update() {
    this.player.update(this.walls)

    // 높이 계산 (위로 올라갈수록 증가)
    const height = Math.max(0, Math.floor((this.startY - this.player.y) / TILE))
    this.heightText.setText(height + 'm')
    this.scoreText.setText(String(this.score))
  }
}
