import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { Player } from '../objects/Player'
import { MapGenerator } from '../objects/MapGenerator'
import { DeathZone } from '../objects/DeathZone'
import { loadSettings } from '../config/Settings'

const PLAYER_START_GX = Math.floor(COLS / 2)
const PLAYER_START_GY = 18
const MAP_W = COLS * TILE       // 480
const PANEL_W = 200             // UI 패널 너비 2배
const PANEL_X = MAP_W + PANEL_W / 2

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

  constructor() { super('GameScene') }

  create() {
    const { width, height } = this.scale
    const settings = loadSettings()
    this.score = 0
    this.isDead = false
    this.walls = new Set()

    this.cameras.main.setBounds(0, -99999, MAP_W, 99999 + height)
    this.add.rectangle(width / 2, height / 2, width, height, 0x080810).setScrollFactor(0)

    // 맵 테두리
    const border = this.add.graphics().setScrollFactor(0).setDepth(20)
    border.lineStyle(1.5, 0x2a5080, 1)
    border.strokeRect(0, 0, MAP_W, height)

    // 구분선
    this.add.rectangle(MAP_W + 1, height / 2, 1, height, 0x1a3a5c).setScrollFactor(0).setDepth(20)

    // 맵 생성
    this.mapGen = new MapGenerator(this, this.walls)
    this.mapGen.init(PLAYER_START_GY)

    // 플레이어 (설정에서 키 바인딩 + 잔상 불러오기)
    this.player = new Player(
      this, PLAYER_START_GX, PLAYER_START_GY,
      settings.keyLeft, settings.keyRight, settings.keyUp, settings.keyDown,
      settings.trailEffect
    )
    this.startPlayerY = this.player.y

    this.cameras.main.startFollow(this.player.getRect(), true, 0.08, 0.08)
    this.cameras.main.setFollowOffset(0, height * 0.2)

    const dzStartY = (PLAYER_START_GY + 8) * TILE
    this.deathZone = new DeathZone(this, dzStartY)

    this.createPanel(height)
    this.createPauseBtn()
  }

  private createPanel(height: number) {
    // 패널 배경 없음 — 텍스트만
    const cx = PANEL_X

    // SCORE
    this.add.text(cx, 28, 'SCORE', {
      fontSize: '11px', fontFamily: 'monospace', color: '#7799aa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21)

    this.scoreText = this.add.text(cx, 52, '0', {
      fontSize: '26px', fontFamily: 'monospace', color: '#00e5cc', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21)

    // 구분
    const div = this.add.graphics().setScrollFactor(0).setDepth(21)
    div.lineStyle(1, 0x1a3a5c, 0.6)
    div.lineBetween(MAP_W + 16, 84, MAP_W + PANEL_W - 16, 84)

    // HEIGHT
    this.add.text(cx, 96, 'HEIGHT', {
      fontSize: '11px', fontFamily: 'monospace', color: '#7799aa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21)

    this.heightText = this.add.text(cx, 120, '0m', {
      fontSize: '26px', fontFamily: 'monospace', color: '#f5a623', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21)
  }

  private createPauseBtn() {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(22)
    const bx = 22, by = 22, bw = 32, bh = 32

    const draw = (hover: boolean) => {
      gfx.clear()
      gfx.fillStyle(hover ? 0x1a3a5c : 0x0d1a2e, 0.9)
      gfx.fillRect(bx - bw / 2, by - bh / 2, bw, bh)
      gfx.lineStyle(1, hover ? 0x00e5cc : 0x2a5080, 1)
      gfx.strokeRect(bx - bw / 2, by - bh / 2, bw, bh)
    }
    draw(false)

    this.add.text(bx, by, '⏸', {
      fontSize: '14px', fontFamily: 'monospace', color: '#7799aa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(23)

    const zone = this.add.zone(bx, by, bw, bh).setScrollFactor(0).setDepth(24).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => draw(true))
    zone.on('pointerout', () => draw(false))
    zone.on('pointerdown', () => {
      if (!this.isDead) {
        this.scene.launch('PauseScene')
        this.scene.pause('GameScene')
      }
    })
  }

  update(_: number, delta: number) {
    if (this.isDead) return

    this.player.update(this.walls)
    this.mapGen.update(this.player.gridY)
    this.deathZone.update(delta)

    const h = Math.max(0, Math.floor((this.startPlayerY - this.player.y) / TILE))
    this.heightText.setText(h + 'm')
    this.scoreText.setText(String(this.score))

    if (this.deathZone.isKilled(this.player.y)) {
      this.isDead = true
      this.cameras.main.flash(300, 255, 0, 50)
      this.time.delayedCall(400, () => {
        this.scene.start('GameOverScene', { score: this.score, height: h })
      })
    }
  }
}
