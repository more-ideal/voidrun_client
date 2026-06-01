import Phaser from 'phaser'
import { TILE, COLS } from '../constants'
import { Player } from '../objects/Player'
import { MapGenerator } from '../objects/MapGenerator'
import { DeathZone } from '../objects/DeathZone'

const PLAYER_START_GX = Math.floor(COLS / 2)
const PLAYER_START_GY = 18
const MAP_W = COLS * TILE
const PANEL_X = MAP_W + 10

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

    this.cameras.main.setBounds(0, -99999, MAP_W, 99999 + height)

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x080810).setScrollFactor(0)

    // 맵 테두리 (밝은 색으로 배경과 구분)
    const border = this.add.graphics().setScrollFactor(0).setDepth(20)
    border.lineStyle(1.5, 0x2a5080, 1)
    border.strokeRect(0, 0, MAP_W, height)

    // 맵/UI 구분선
    this.add.rectangle(MAP_W + 1, height / 2, 1, height, 0x1a3a5c)
      .setScrollFactor(0).setDepth(20)

    // 맵 생성
    this.mapGen = new MapGenerator(this, this.walls)
    this.mapGen.init(PLAYER_START_GY)

    // 플레이어
    this.player = new Player(this, PLAYER_START_GX, PLAYER_START_GY)
    this.startPlayerY = this.player.y

    this.cameras.main.startFollow(this.player.getRect(), true, 0.08, 0.08)
    this.cameras.main.setFollowOffset(0, height * 0.2)

    // 데스존
    const dzStartY = (PLAYER_START_GY + 8) * TILE
    this.deathZone = new DeathZone(this, dzStartY)

    this.createPanel(height)
  }

  private createPanel(height: number) {
    const bg = this.add.graphics().setScrollFactor(0).setDepth(20)
    bg.fillStyle(0x0a0f1a, 1)
    bg.fillRect(MAP_W, 0, 100, height)

    this.add.text(PANEL_X, 20, 'SCORE', {
      fontSize: '10px', fontFamily: 'monospace', color: '#7799aa'
    }).setScrollFactor(0).setDepth(21)

    this.scoreText = this.add.text(PANEL_X, 36, '0', {
      fontSize: '22px', fontFamily: 'monospace', color: '#00e5cc', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(21)

    const div = this.add.graphics().setScrollFactor(0).setDepth(21)
    div.lineStyle(1, 0x1a3a5c, 1)
    div.lineBetween(PANEL_X, 75, MAP_W + 90, 75)

    this.add.text(PANEL_X, 84, 'HEIGHT', {
      fontSize: '10px', fontFamily: 'monospace', color: '#7799aa'
    }).setScrollFactor(0).setDepth(21)

    this.heightText = this.add.text(PANEL_X, 100, '0m', {
      fontSize: '22px', fontFamily: 'monospace', color: '#f5a623', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(21)
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
