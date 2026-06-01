import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const MAX_SLIDE = 30
const MAP_WIDTH = COLS * TILE  // 480px

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
  private lastTrailPos = { x: 0, y: 0 }

  gridX: number
  gridY: number

  get x() { return this.rect.x }
  get y() { return this.rect.y }

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    this.scene = scene
    this.gridX = gridX
    this.gridY = gridY

    this.rect = scene.add.rectangle(
      gridX * TILE + TILE / 2,
      gridY * TILE + TILE / 2,
      TILE - 6, TILE - 6,
      0x00e5cc
    )
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
    let steps = 0

    while (
      steps < MAX_SLIDE &&
      nx >= 0 && nx < COLS &&
      !walls.has(`${nx},${ny}`)
    ) {
      nx += dx
      ny += dy
      steps++
    }
    nx -= dx
    ny -= dy

    if (nx === this.gridX && ny === this.gridY) {
      this.spawnHitEffect(
        (this.gridX + dx) * TILE + TILE / 2,
        (this.gridY + dy) * TILE + TILE / 2
      )
      return
    }

    this.isMoving = true
    this.lastTrailPos = { x: this.rect.x, y: this.rect.y }

    const dist = Math.abs(nx - this.gridX) + Math.abs(ny - this.gridY)
    const duration = Math.max(50, dist * 18)  // 속도 증가

    this.scene.tweens.add({
      targets: this.rect,
      x: nx * TILE + TILE / 2,
      y: ny * TILE + TILE / 2,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const ddx = this.rect.x - this.lastTrailPos.x
        const ddy = this.rect.y - this.lastTrailPos.y
        if (Math.sqrt(ddx * ddx + ddy * ddy) > TILE * 0.4) {
          this.createTrailAt(this.lastTrailPos.x, this.lastTrailPos.y)
          this.lastTrailPos = { x: this.rect.x, y: this.rect.y }
        }
      },
      onComplete: () => {
        this.gridX = nx
        this.gridY = ny
        this.isMoving = false
      }
    })
  }

  private createTrailAt(x: number, y: number) {
    const trail = this.scene.add.rectangle(x, y, TILE - 8, TILE - 8, 0x00e5cc)
    trail.setAlpha(0.5).setDepth(9)
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 280,
      onComplete: () => trail.destroy()
    })
  }

  private spawnHitEffect(wx: number, wy: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const p = this.scene.add.rectangle(wx, wy, 4, 4, 0x00e5cc)
      p.setDepth(11)
      this.scene.tweens.add({
        targets: p,
        x: wx + Math.cos(angle) * 14,
        y: wy + Math.sin(angle) * 14,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 200,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      })
    }
  }

  getRect() { return this.rect }
}
