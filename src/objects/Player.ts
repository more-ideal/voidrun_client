import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

export class Player {
  private rect: Phaser.GameObjects.Rectangle
  private scene: Phaser.Scene
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

  get x() { return this.rect.x }
  get y() { return this.rect.y }

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    this.scene = scene
    this.gridX = gridX
    this.gridY = gridY

    const px = gridX * TILE + TILE / 2
    const py = gridY * TILE + TILE / 2

    // 네모 캐릭터 직접 생성
    this.rect = scene.add.rectangle(px, py, TILE - 8, TILE - 8, 0x00e5cc)
    this.rect.setDepth(10)

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

    while (nx >= 0 && nx < COLS && !walls.has(`${nx},${ny}`)) {
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
      targets: this.rect,
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
    if (steps === 0) return
    const dx = (targetGX - this.gridX) / steps
    const dy = (targetGY - this.gridY) / steps

    for (let i = 1; i < steps; i++) {
      const tx = (this.gridX + dx * i) * TILE + TILE / 2
      const ty = (this.gridY + dy * i) * TILE + TILE / 2
      const alpha = Math.max(0.05, 0.3 - i * 0.03)

      const trail = this.scene.add.rectangle(tx, ty, TILE - 14, TILE - 14, 0x00e5cc)
      trail.setAlpha(alpha)
      trail.setDepth(9)

      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        duration: 180,
        onComplete: () => trail.destroy()
      })
    }
  }

  // 카메라 follow용 getter
  getRect() { return this.rect }
}
