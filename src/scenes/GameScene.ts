import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { Player } from '../objects/Player'
import { MapGenerator } from '../objects/MapGenerator'

const PLAYER_START_GX = Math.floor(COLS / 2)
const PLAYER_START_GY = 18

export class GameScene extends Phaser.Scene {
  private player!: Player
  private mapGen!: MapGenerator
  private walls: Set<string> = new Set()
  private scoreText!: Phaser.GameObjects.Text
  private heightText!: Phaser.GameObjects.Text
  private score = 0
  private startPlayerY = 0

  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale
    this.score = 0
    this.walls = new Set()

    this.cameras.main.setBounds(0, -99999, width, 99999 + height)

    this.add.rectangle(width / 2, height / 2, width, height, 0x080810)
      .setScrollFactor(0)

    this.mapGen = new MapGenerator(this, this.walls)
    this.mapGen.init(PLAYER_START_GY)

    this.player = new Player(this, PLAYER_START_GX, PLAYER_START_GY)
    this.startPlayerY = this.player.y

    // 카메라가 플레이어 rect 따라가게
    this.cameras.main.startFollow(this.player.getRect(), true, 0.08, 0.08)
    this.cameras.main.setFollowOffset(0, height * 0.25)

    this.createDeathZone(width, height)
    this.createHUD(width)
  }

  private createDeathZone(width: number, height: number) {
    const dz = this.add.graphics().setScrollFactor(0)
    dz.fillGradientStyle(0x440011, 0x440011, 0xff2255, 0xff2255, 0.0, 0.0, 0.9, 0.9)
    dz.fillRect(0, height - 80, width, 80)
    dz.lineStyle(2, 0xff2255, 0.8)
    dz.lineBetween(0, height - 80, width, height - 80)
  }

  private createHUD(width: number) {
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
    this.mapGen.update(this.player.gridY)

    const h = Math.max(0, Math.floor((this.startPlayerY - this.player.y) / TILE))
    this.heightText.setText(h + 'm')
    this.scoreText.setText(String(this.score))
  }
}
