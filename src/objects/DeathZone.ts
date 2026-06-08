import Phaser from 'phaser'

export class DeathZone {
  private line: Phaser.GameObjects.Rectangle
  private glow: Phaser.GameObjects.Rectangle
  worldY: number
  private speed: number

  constructor(scene: Phaser.Scene, startWorldY: number) {
    this.worldY = startWorldY
    this.speed = 50  // 28 → 50 px/s

    const w = scene.scale.width

    this.glow = scene.add.rectangle(w / 2, startWorldY + 120, w, 240, 0xff2255)
    this.glow.setAlpha(0.28).setDepth(5)

    this.line = scene.add.rectangle(w / 2, startWorldY, w, 3, 0xff2255)
    this.line.setAlpha(0.95).setDepth(6)
  }

  update(delta: number) {
    this.worldY -= this.speed * delta / 1000
    this.line.y = this.worldY
    this.glow.y = this.worldY + 120
  }

  getY() { return this.worldY }

  isKilled(playerWorldY: number): boolean {
    return playerWorldY >= this.worldY
  }
}
