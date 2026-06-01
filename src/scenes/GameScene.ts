import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { Player } from '../objects/Player'
import { MapGenerator } from '../objects/MapGenerator'
import { DeathZone } from '../objects/DeathZone'

const PLAYER_START_GX = Math.floor(COLS / 2)
const PLAYER_START_GY = 18

export class GameScene extends Phaser.Scene {
  private player!: Player
  private mapGen!: MapGenerator
  private deathZone!: DeathZone
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
    this.add.rectangle(width / 2, height / 2, width, height, 0x080810).setScrollFactor(0)

    // 맵 생성
    this.mapGen = new MapGenerator(this, this.walls)
    this.mapGen.init(PLAYER_START_GY)

    // 플레이어
    this.player = new Player(this, PLAYER_START_GX, PLAYER_START_GY)
    this.startPlayerY = this.player.y

    // 카메라
    this.cameras.main.startFollow(this.player.getRect(), true, 0.08, 0.08)
    this.cameras.main.setFollowOffset(0, height * 0.2)

    // 데스존 - 플레이어 아래 월드 좌표에서 시작
    const dzStartY = (PLAYER_START_GY + 8) * TILE
    this.deathZone = new DeathZone(this, dzStartY)

    this.createHUD(width)
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

  update(_: number, delta: number) {
    this.player.update(this.walls)
    this.mapGen.update(this.player.gridY)
    this.deathZone.update(delta)

    const h = Math.max(0, Math.floor((this.startPlayerY - this.player.y) / TILE))
    this.heightText.setText(h + 'm')
    this.scoreText.setText(String(this.score))
  }
}
