import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const MAX_SLIDE = 30
export const SLIDE_SPEED_MIN = 30   // 최소 이동 시간(ms) — 낮을수록 빠름
export const SLIDE_SPEED_PER_TILE = 9  // 타일당 추가 시간(ms) — 낮을수록 빠름

export class Player {
  private rect: Phaser.GameObjects.Rectangle
  private scene: Phaser.Scene
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }
  private currentTween: Phaser.Tweens.Tween | null = null
  private nextMove: { dx: number, dy: number } | null = null
  private walls: Set<string> = new Set()
  private lastTrailPos = { x: 0, y: 0 }
  private isMoving = false

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
    this.walls = walls
    const { JustDown } = Phaser.Input.Keyboard
    let dx = 0, dy = 0

    if (JustDown(this.cursors.left) || JustDown(this.wasd.left)) dx = -1
    else if (JustDown(this.cursors.right) || JustDown(this.wasd.right)) dx = 1
    else if (JustDown(this.cursors.up) || JustDown(this.wasd.up)) dy = -1
    else if (JustDown(this.cursors.down) || JustDown(this.wasd.down)) dy = 1

    if (dx !== 0 || dy !== 0) {
      if (!this.isMoving) this.slide(dx, dy)
      else this.nextMove = { dx, dy }
    }
  }

  private slide(dx: number, dy: number) {
    let nx = this.gridX + dx
    let ny = this.gridY + dy
    let steps = 0

    while (steps < MAX_SLIDE && nx >= 0 && nx < COLS && !this.walls.has(`${nx},${ny}`)) {
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
    const duration = Math.max(SLIDE_SPEED_MIN, dist * SLIDE_SPEED_PER_TILE)

    this.currentTween = this.scene.tweens.add({
      targets: this.rect,
      x: nx * TILE + TILE / 2,
      y: ny * TILE + TILE / 2,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const ddx = this.rect.x - this.lastTrailPos.x
        const ddy = this.rect.y - this.lastTrailPos.y
        if (Math.sqrt(ddx * ddx + ddy * ddy) > TILE * 0.35) {
          this.createTrailAt(this.lastTrailPos.x, this.lastTrailPos.y)
          this.lastTrailPos = { x: this.rect.x, y: this.rect.y }
        }
      },
      onComplete: () => {
        this.gridX = nx
        this.gridY = ny
        this.isMoving = false
        this.currentTween = null
        if (this.nextMove) {
          const m = this.nextMove
          this.nextMove = null
          this.slide(m.dx, m.dy)
        }
      }
    })
  }

  private createTrailAt(x: number, y: number) {
    const trail = this.scene.add.rectangle(x, y, TILE - 8, TILE - 8, 0x00e5cc)
    trail.setAlpha(0.45).setDepth(9)
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 250,
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
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      })
    }
  }

  getRect() { return this.rect }
}
