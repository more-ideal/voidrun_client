import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { Player } from '../objects/Player'
import { MapGenerator } from '../objects/MapGenerator'
import { DeathZone } from '../objects/DeathZone'

const PLAYER_START_GX = Math.floor(COLS / 2)
const PLAYER_START_GY = 18
const MAP_W = COLS * TILE
const PANEL_X = MAP_W + 10
const PANEL_W = 100

export class GameScene extends Phaser.Scene {
  private player!: Player
  private mapGen!: MapGenerator
  private deathZone!: DeathZone
  private walls: Set<string> = new Set()
  private scoreText!: Phaser.GameObjects.Text
  private heightText!: Phaser.GameObjects.Text
  private score = 0
  private startPlayerY = 0
  private isDead = false

  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale
    this.score = 0
    this.isDead = false
    this.walls = new Set()

    this.cameras.main.setBounds(0, -99999, MAP_W, 99999 + height)

    this.add.rectangle(width / 2, height / 2, width, height, 0x080810).setScrollFactor(0)

    // 맵 테두리
    const border = this.add.graphics().setScrollFactor(0).setDepth(20)
    border.lineStyle(1.5, 0x2a5080, 1)
    border.strokeRect(0, 0, MAP_W, height)

    this.add.rectangle(MAP_W + 1, height / 2, 1, height, 0x1a3a5c)
      .setScrollFactor(0).setDepth(20)

    this.mapGen = new MapGenerator(this, this.walls)
    this.mapGen.init(PLAYER_START_GY)

    this.player = new Player(this, PLAYER_START_GX, PLAYER_START_GY)
    this.startPlayerY = this.player.y

    this.cameras.main.startFollow(this.player.getRect(), true, 0.08, 0.08)
    this.cameras.main.setFollowOffset(0, height * 0.2)

    const dzStartY = (PLAYER_START_GY + 8) * TILE
    this.deathZone = new DeathZone(this, dzStartY)

    this.createPanel(height)
  }

  private createPanel(height: number) {
    // 패널 배경
    const bg = this.add.graphics().setScrollFactor(0).setDepth(20)
    bg.fillStyle(0x0a0f1a, 1)
    bg.fillRect(MAP_W, 0, PANEL_W, height)

    const bx = MAP_W + PANEL_W / 2  // 박스 중앙 x

    // SCORE 박스
    this.drawPanelBox(bx, 50, 80, 60, 'SCORE')
    this.scoreText = this.add.text(bx, 55, '0', {
      fontSize: '20px', fontFamily: 'monospace', color: '#00e5cc', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22)

    // HEIGHT 박스
    this.drawPanelBox(bx, 135, 80, 60, 'HEIGHT')
    this.heightText = this.add.text(bx, 140, '0m', {
      fontSize: '20px', fontFamily: 'monospace', color: '#f5a623', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22)
  }

  private drawPanelBox(x: number, y: number, w: number, h: number, label: string) {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(21)
    gfx.fillStyle(0x0d1a2e, 1)
    gfx.fillRect(x - w / 2, y - h / 2, w, h)
    gfx.lineStyle(1, 0x2a5080, 1)
    gfx.strokeRect(x - w / 2, y - h / 2, w, h)

    this.add.text(x, y - h / 2 + 10, label, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7799aa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22)
  }

  update(_: number, delta: number) {
    if (this.isDead) return

    this.player.update(this.walls)
    this.mapGen.update(this.player.gridY)
    this.deathZone.update(delta)

    const h = Math.max(0, Math.floor((this.startPlayerY - this.player.y) / TILE))
    this.heightText.setText(h + 'm')
    this.scoreText.setText(String(this.score))

    // 데스존 충돌 감지
    if (this.deathZone.isKilled(this.player.y)) {
      this.isDead = true
      this.triggerDeath(h)
    }
  }

  private triggerDeath(height: number) {
    // 플래시 효과
    this.cameras.main.flash(300, 255, 0, 50)

    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score: this.score, height })
    })
  }
}
