import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'
import { GameScene } from './scenes/GameScene'
import { SettingsScene } from './scenes/SettingsScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#080810',
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 580,
    height: 720,
  },
  scene: [MainScene, GameScene, SettingsScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  }
}

new Phaser.Game(config)
