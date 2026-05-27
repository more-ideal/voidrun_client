import Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale
    this.add.text(width / 2, height / 2, 'GAME SCENE\n(준비중)', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00e5cc',
      align: 'center',
    }).setOrigin(0.5)

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MainScene'))
  }
}
