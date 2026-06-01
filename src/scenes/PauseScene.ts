import Phaser from 'phaser'

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene') }

  create() {
    const { width, height } = this.scale
    const cx = width / 2

    // 반투명 오버레이
    this.add.rectangle(cx, height / 2, width, height, 0x000000).setAlpha(0.65)

    this.add.text(cx, height * 0.35, 'PAUSED', {
      fontSize: '32px', fontFamily: 'monospace',
      color: '#00e5cc', fontStyle: 'bold'
    }).setOrigin(0.5)

    // 계속하기
    this.createBtn(cx, height * 0.52, '▶  CONTINUE', () => {
      this.scene.resume('GameScene')
      this.scene.stop('PauseScene')
    })

    // 메인으로
    this.createBtn(cx, height * 0.63, 'MAIN MENU', () => {
      this.scene.stop('GameScene')
      this.scene.stop('PauseScene')
      this.scene.start('MainScene')
    }, true)
  }

  private createBtn(x: number, y: number, label: string, cb: () => void, outline = false) {
    const w = 220, h = 46
    const gfx = this.add.graphics()

    const draw = (hover: boolean) => {
      gfx.clear()
      if (outline) {
        gfx.fillStyle(0x080810, 1)
        gfx.fillRect(x - w / 2, y - h / 2, w, h)
        gfx.lineStyle(1, hover ? 0x00e5cc : 0x223344, 1)
        gfx.strokeRect(x - w / 2, y - h / 2, w, h)
      } else {
        gfx.fillStyle(hover ? 0x00e5cc : 0x00b8a2, 1)
        gfx.fillRect(x - w / 2, y - h / 2, w, h)
      }
    }
    draw(false)

    const txt = this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: 'monospace',
      color: outline ? '#7799aa' : '#000000',
      fontStyle: outline ? 'normal' : 'bold',
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => { draw(true); if (outline) txt.setColor('#ffffff') })
    zone.on('pointerout', () => { draw(false); if (outline) txt.setColor('#7799aa') })
    zone.on('pointerdown', cb)
  }
}
