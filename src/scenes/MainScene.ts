import Phaser from 'phaser'

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene')
  }

  create() {
    const { width, height } = this.scale

    this.add.text(width / 2, height / 2 - 60, 'VOIDRUN', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    const startBtn = this.add.text(width / 2, height / 2 + 40, '[ START ]', {
      fontSize: '24px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    startBtn.on('pointerover', () => startBtn.setColor('#ffffff'))
    startBtn.on('pointerout', () => startBtn.setColor('#aaaaaa'))
    startBtn.on('pointerdown', () => {
      console.log('game start')
    })
  }
}
