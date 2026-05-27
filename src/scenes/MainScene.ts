import Phaser from 'phaser'

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene')
  }

  create() {
    const { width, height } = this.scale
    const cx = width / 2

    this.drawBackground(width, height)
    this.drawTitle(cx, height * 0.28)
    this.drawSubtitle(cx, height * 0.35)
    this.drawStatBoxes(cx, height * 0.47)
    this.createStartButton(cx, height * 0.60)
    this.createSettingsButton(cx, height * 0.70)
    this.drawControls(cx, height * 0.86)
  }

  private drawBackground(width: number, height: number) {
    const bg = this.add.graphics()
    bg.fillStyle(0x080810, 1)
    bg.fillRect(0, 0, width, height)
  }

  private drawTitle(x: number, y: number) {
    this.add.text(x, y, 'VOIDRUN', {
      fontSize: '56px',
      fontFamily: 'monospace',
      color: '#00e5cc',
      fontStyle: 'bold',
      stroke: '#003d36',
      strokeThickness: 6,
    }).setOrigin(0.5)
  }

  private drawSubtitle(x: number, y: number) {
    this.add.text(x, y, '슬라이드  ·  상승  ·  생존', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#334455',
    }).setOrigin(0.5)
  }

  private drawStatBoxes(cx: number, y: number) {
    this.drawStatBox(cx - 82, y, 148, 66, 'HIGH SCORE', this.getHighScore(), '#00e5cc')
    this.drawStatBox(cx + 82, y, 148, 66, 'MAX HEIGHT', this.getMaxHeight() + 'm', '#f5a623')
  }

  private drawStatBox(x: number, y: number, w: number, h: number, label: string, value: string | number, valueColor: string) {
    const gfx = this.add.graphics()
    gfx.fillStyle(0x0d1a2e, 0.9)
    gfx.fillRect(x - w / 2, y - h / 2, w, h)
    gfx.lineStyle(1, 0x1a3a5c, 1)
    gfx.strokeRect(x - w / 2, y - h / 2, w, h)

    this.add.text(x, y - 10, label, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#7799aa',
    }).setOrigin(0.5)

    this.add.text(x, y + 14, String(value), {
      fontSize: '26px',
      fontFamily: 'monospace',
      color: valueColor,
      fontStyle: 'bold',
    }).setOrigin(0.5)
  }

  private createStartButton(x: number, y: number) {
    const w = 240, h = 50
    const gfx = this.add.graphics()

    const draw = (hover: boolean) => {
      gfx.clear()
      gfx.fillStyle(hover ? 0x00e5cc : 0x00b8a2, 1)
      gfx.fillRect(x - w / 2, y - h / 2, w, h)
    }
    draw(false)

    const label = this.add.text(x, y, '▶  START', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => draw(true))
    zone.on('pointerout', () => draw(false))
    zone.on('pointerdown', () => this.scene.start('GameScene'))
  }

  private createSettingsButton(x: number, y: number) {
    const w = 240, h = 44
    const gfx = this.add.graphics()

    const draw = (hover: boolean) => {
      gfx.clear()
      gfx.fillStyle(0x080810, 1)
      gfx.fillRect(x - w / 2, y - h / 2, w, h)
      gfx.lineStyle(1, hover ? 0x00e5cc : 0x223344, 1)
      gfx.strokeRect(x - w / 2, y - h / 2, w, h)
    }
    draw(false)

    const label = this.add.text(x, y, 'SETTINGS', {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: '#7799aa',
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => { draw(true); label.setColor('#ffffff') })
    zone.on('pointerout', () => { draw(false); label.setColor('#7799aa') })
    zone.on('pointerdown', () => this.scene.start('SettingsScene'))
  }

  private drawControls(cx: number, y: number) {
    const keys = ['↑', '↓', '←', '→']
    const startX = cx - 72
    keys.forEach((k, i) => {
      const gfx = this.add.graphics()
      gfx.lineStyle(1, 0x223344, 1)
      gfx.strokeRect(startX + i * 36 - 12, y - 12, 24, 24)
      this.add.text(startX + i * 36, y, k, {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#445566',
      }).setOrigin(0.5)
    })

    this.add.text(cx + 65, y, 'TO SLIDE', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#334455',
    }).setOrigin(0, 0.5)
  }

  private getHighScore(): number {
    return parseInt(localStorage.getItem('voidrun_highscore') ?? '0')
  }

  private getMaxHeight(): number {
    return parseInt(localStorage.getItem('voidrun_maxheight') ?? '0')
  }
}
