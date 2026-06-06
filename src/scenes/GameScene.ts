import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { Player } from '../objects/Player'
import { MapGenerator } from '../objects/MapGenerator'
import { DeathZone } from '../objects/DeathZone'
import { loadSettings } from '../config/Settings'
import { showGameUI, hideGameUI, updateScore, updateHeight } from '../config/DomUI'

const PLAYER_START_GX = Math.floor(COLS / 2)
const PLAYER_START_GY = 18
const MAP_W = COLS * TILE
const ORB_SCORE = 10

export class GameScene extends Phaser.Scene {
  private player!: Player
  private mapGen!: MapGenerator
  private deathZone!: DeathZone
  private walls: Set<string> = new Set()
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
    this.add.rectangle(width / 2, height / 2, width, height, 0x111318).setScrollFactor(0)

    const border = this.add.graphics().setScrollFactor(0).setDepth(20)
    border.lineStyle(1.5, 0x2a5080, 1)
    border.strokeRect(0, 0, MAP_W, height)

    this.mapGen = new MapGenerator(this, this.walls)
    this.mapGen.init(PLAYER_START_GY)

    this.player = new Player(
      this, PLAYER_START_GX, PLAYER_START_GY,
      settings.keyLeft, settings.keyRight, settings.keyUp, settings.keyDown,
      settings.trailEffect
    )
    this.startPlayerY = this.player.y

    // 이동 완료 시 타일 처리
    this.player.onArrived = (gx, gy) => this.handleTileArrival(gx, gy)

    this.cameras.main.startFollow(this.player.getRect(), true, 0.08, 0.08)
    this.cameras.main.setFollowOffset(0, height * 0.2)

    const dzStartY = (PLAYER_START_GY + 8) * TILE
    this.deathZone = new DeathZone(this, dzStartY)

    this.createPauseBtn()
    showGameUI()
    updateScore(0)
    updateHeight(0)
  }

  private handleTileArrival(gx: number, gy: number) {
    const type = this.mapGen.getTileType(gx, gy)
    switch (type) {
      case 2:  // 점수 오브
        this.score += ORB_SCORE
        this.mapGen.removeTile(gx, gy)
        this.spawnOrbEffect(gx, gy)
        break
      case 3:  // 레이저 (가시)
        if (!this.isDead) {
          this.isDead = true
          this.cameras.main.flash(200, 255, 30, 30)
          this.time.delayedCall(300, () => {
            hideGameUI()
            const h = Math.max(0, Math.floor((this.startPlayerY - this.player.y) / TILE))
            this.scene.start('GameOverScene', { score: this.score, height: h })
          })
        }
        break
    }
  }

  private spawnOrbEffect(gx: number, gy: number) {
    const x = gx * TILE + TILE / 2
    const y = gy * TILE + TILE / 2
    // 점수 텍스트 팝업
    const txt = this.add.text(x, y, `+${ORB_SCORE}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#f5a623', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(15)
    this.tweens.add({
      targets: txt, y: y - 30, alpha: 0, duration: 600,
      ease: 'Quad.easeOut', onComplete: () => txt.destroy()
    })
  }

  private createPauseBtn() {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(22)
    const bx = 22, by = 22, bw = 32, bh = 32
    const draw = (hover: boolean) => {
      gfx.clear()
      gfx.fillStyle(hover ? 0x1a3a5c : 0x0d1a2e, 0.9)
      gfx.fillRect(bx-bw/2, by-bh/2, bw, bh)
      gfx.lineStyle(1, hover ? 0x00e5cc : 0x2a5080, 1)
      gfx.strokeRect(bx-bw/2, by-bh/2, bw, bh)
    }
    draw(false)
    this.add.text(bx, by, '||', {
      fontSize: '12px', fontFamily: 'monospace', color: '#7799aa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(23)
    const zone = this.add.zone(bx, by, bw, bh).setScrollFactor(0).setDepth(24).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => draw(true))
    zone.on('pointerout', () => draw(false))
    zone.on('pointerdown', () => {
      if (!this.isDead) { this.scene.launch('PauseScene'); this.scene.pause('GameScene') }
    })
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.isDead) { this.scene.launch('PauseScene'); this.scene.pause('GameScene') }
    })
  }

  shutdown() { hideGameUI() }

  update(_: number, delta: number) {
    if (this.isDead) return
    this.player.update(this.walls)
    this.mapGen.update(this.player.gridY)
    this.deathZone.update(delta)
    const h = Math.max(0, Math.floor((this.startPlayerY - this.player.y) / TILE))
    updateScore(this.score)
    updateHeight(h)
    if (this.deathZone.isKilled(this.player.y)) {
      this.isDead = true
      this.cameras.main.flash(300, 255, 0, 50)
      this.time.delayedCall(400, () => {
        hideGameUI()
        this.scene.start('GameOverScene', { score: this.score, height: h })
      })
    }
  }
}
