import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'
import { GameScene } from './scenes/GameScene'
import { SettingsScene } from './scenes/SettingsScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 720,
  backgroundColor: '#080810',
  parent: 'game',
  scene: [MainScene, GameScene, SettingsScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  }
}

new Phaser.Game(config)
