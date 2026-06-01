import Phaser from 'phaser'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene')
  }

  init(data: { score: number; height: number }) {
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, 0x080810)

    // 타이틀
    this.add.text(cx, height * 0.22, 'GAME OVER', {
      fontSize: '36px', fontFamily: 'monospace',
      color: '#ff2255', fontStyle: 'bold',
    }).setOrigin(0.5)

    // 점수 박스
    this.drawBox(cx - 82, height * 0.40, 148, 70, 'SCORE', String(data.score), '#00e5cc')
    this.drawBox(cx + 82, height * 0.40, 148, 70, 'HEIGHT', data.height + 'm', '#f5a623')

    // 최고 기록 갱신 처리
    const prevBest = parseInt(localStorage.getItem('voidrun_highscore') ?? '0')
    const prevBestH = parseInt(localStorage.getItem('voidrun_maxheight') ?? '0')
    if (data.score > prevBest) localStorage.setItem('voidrun_highscore', String(data.score))
    if (data.height > prevBestH) localStorage.setItem('voidrun_maxheight', String(data.height))

    const isNewScore = data.score > prevBest
    const isNewHeight = data.height > prevBestH
    if (isNewScore || isNewHeight) {
      this.add.text(cx, height * 0.54, '✦ NEW RECORD ✦', {
        fontSize: '14px', fontFamily: 'monospace', color: '#f5a623'
      }).setOrigin(0.5)
    }

    // 재시작 버튼
    this.createButton(cx, height * 0.65, '▶  RETRY', 0x00b8a2, () => {
      this.scene.start('GameScene')
    })

    // 메인 버튼
    this.createButton(cx, height * 0.75, 'MAIN MENU', 0x0a0f1a, () => {
      this.scene.start('MainScene')
    }, true)
  }

  private drawBox(x: number, y: number, w: number, h: number, label: string, value: string, color: string) {
    const gfx = this.add.graphics()
    gfx.fillStyle(0x0d1a2e, 1)
    gfx.fillRect(x - w / 2, y - h / 2, w, h)
    gfx.lineStyle(1, 0x2a5080, 1)
    gfx.strokeRect(x - w / 2, y - h / 2, w, h)

    this.add.text(x, y - 10, label, {
      fontSize: '11px', fontFamily: 'monospace', color: '#7799aa'
    }).setOrigin(0.5)

    this.add.text(x, y + 14, value, {
      fontSize: '26px', fontFamily: 'monospace', color, fontStyle: 'bold'
    }).setOrigin(0.5)
  }

  private createButton(x: number, y: number, label: string, color: number, cb: () => void, outline = false) {
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
        gfx.fillStyle(hover ? 0x00e5cc : color, 1)
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
