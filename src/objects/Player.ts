import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

export class Player extends Phaser.GameObjects.Container {
  private body!: Phaser.GameObjects.Rectangle
  private isMoving = false
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }

  gridX: number
  gridY: number

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    const px = gridX * TILE + TILE / 2
    const py = gridY * TILE + TILE / 2
    super(scene, px, py)

    this.gridX = gridX
    this.gridY = gridY

    // 네모 캐릭터
    this.body = scene.add.rectangle(0, 0, TILE - 8, TILE - 8, 0x00e5cc)
    this.add(this.body)
    scene.add.existing(this)

    this.cursors = scene.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
  }

  update(walls: Set<string>) {
    if (this.isMoving) return

    let dx = 0, dy = 0
    const { JustDown } = Phaser.Input.Keyboard

    if (JustDown(this.cursors.left) || JustDown(this.wasd.left)) dx = -1
    else if (JustDown(this.cursors.right) || JustDown(this.wasd.right)) dx = 1
    else if (JustDown(this.cursors.up) || JustDown(this.wasd.up)) dy = -1
    else if (JustDown(this.cursors.down) || JustDown(this.wasd.down)) dy = 1

    if (dx !== 0 || dy !== 0) this.slide(dx, dy, walls)
  }

  private slide(dx: number, dy: number, walls: Set<string>) {
    let nx = this.gridX + dx
    let ny = this.gridY + dy

    while (nx >= 0 && nx < COLS && ny >= 0 && !walls.has(`${nx},${ny}`)) {
      nx += dx
      ny += dy
    }
    nx -= dx
    ny -= dy

    if (nx === this.gridX && ny === this.gridY) return

    this.isMoving = true
    this.spawnTrails(nx, ny)

    const dist = Math.abs(nx - this.gridX) + Math.abs(ny - this.gridY)

    this.scene.tweens.add({
      targets: this,
      x: nx * TILE + TILE / 2,
      y: ny * TILE + TILE / 2,
      duration: Math.max(80, dist * 35),
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.gridX = nx
        this.gridY = ny
        this.isMoving = false
      }
    })
  }

  private spawnTrails(targetGX: number, targetGY: number) {
    const steps = Math.max(
      Math.abs(targetGX - this.gridX),
      Math.abs(targetGY - this.gridY)
    )
    const dx = (targetGX - this.gridX) / steps
    const dy = (targetGY - this.gridY) / steps

    for (let i = 1; i < steps; i++) {
      const tx = (this.gridX + dx * i) * TILE + TILE / 2
      const ty = (this.gridY + dy * i) * TILE + TILE / 2
      const alpha = Math.max(0.05, 0.35 - i * 0.04)

      const trail = this.scene.add.rectangle(tx, ty, TILE - 12, TILE - 12, 0x00e5cc)
      trail.setAlpha(alpha)

      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        duration: 180,
        onComplete: () => trail.destroy()
      })
    }
  }
}
