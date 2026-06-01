import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'
import { PauseScene } from './scenes/PauseScene'
import { SettingsScene } from './scenes/SettingsScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#080810',
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,   // 맵만 (UI는 HTML)
    height: 720,
  },
  scene: [MainScene, GameScene, GameOverScene, PauseScene, SettingsScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  }
}

new Phaser.Game(config)
