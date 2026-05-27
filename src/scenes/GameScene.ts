import Phaser from 'phaser'

const TILE = 48  // 타일 크기
const COLS = 10  // 가로 타일 수

export class GameScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text
  private heightText!: Phaser.GameObjects.Text
  private score = 0
  private maxY = 0  // 카메라 기준 최고 높이 추적

  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale

    this.score = 0
    this.maxY = 0

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x080810)
      .setScrollFactor(0)

    // 플레이어 임시 (다이아몬드)
    this.drawPlayer(width / 2, height - 120)

    // 데스존 임시
    this.drawDeathZone(width)

    // HUD
    this.createHUD(width)
  }

  private drawPlayer(x: number, y: number) {
    const gfx = this.add.graphics()
    gfx.fillStyle(0x00e5cc, 1)
    gfx.fillTriangle(
      x, y - 14,
      x - 10, y + 6,
      x + 10, y + 6
    )
    gfx.fillTriangle(
      x, y + 14,
      x - 10, y - 6,
      x + 10, y - 6
    )
  }

  private drawDeathZone(width: number) {
    // 데스존 그라디언트 (빨간 반투명)
    const dz = this.add.graphics()
    dz.fillGradientStyle(0xff2255, 0xff2255, 0x440011, 0x440011, 0.9, 0.9, 0.2, 0.2)
    dz.fillRect(0, 620, width, 100)
      .setScrollFactor(0)

    // 데스존 상단 선
    dz.lineStyle(2, 0xff2255, 1)
    dz.lineBetween(0, 620, width, 620)
  }

  private createHUD(width: number) {
    // 좌상단 SCORE 박스
    const scoreBox = this.add.graphics().setScrollFactor(0)
    scoreBox.fillStyle(0x0d1a2e, 0.85)
    scoreBox.fillRect(8, 8, 120, 52)
    scoreBox.lineStyle(1, 0x1a3a5c, 1)
    scoreBox.strokeRect(8, 8, 120, 52)

    this.add.text(20, 16, 'SCORE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#7799aa',
    }).setScrollFactor(0)

    this.scoreText = this.add.text(20, 32, '0', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00e5cc',
      fontStyle: 'bold',
    }).setScrollFactor(0)

    // 우상단 HEIGHT 박스
    const heightBox = this.add.graphics().setScrollFactor(0)
    heightBox.fillStyle(0x0d1a2e, 0.85)
    heightBox.fillRect(width - 128, 8, 120, 52)
    heightBox.lineStyle(1, 0x1a3a5c, 1)
    heightBox.strokeRect(width - 128, 8, 120, 52)

    this.add.text(width - 116, 16, 'HEIGHT', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#7799aa',
    }).setScrollFactor(0)

    this.heightText = this.add.text(width - 116, 32, '0m', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#f5a623',
      fontStyle: 'bold',
    }).setScrollFactor(0)
  }

  update() {
    // 높이 업데이트 (나중에 실제 플레이어 y 기반으로 교체)
    this.heightText.setText(this.maxY + 'm')
    this.scoreText.setText(String(this.score))
  }
}
