import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const MAX_SLIDE = 30
export const SLIDE_SPEED_MIN = 60
export const SLIDE_SPEED_PER_TILE = 25
export const GRADIENT_FADE_DURATION = 120

export type TrailEffect = 'box' | 'gradient' | 'spark' | 'ghost'

export class Player {
  private rect: Phaser.GameObjects.Rectangle
  private scene: Phaser.Scene
  private customKeys!: {
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
  }
  private currentTween: Phaser.Tweens.Tween | null = null
  private nextMove: { dx: number, dy: number } | null = null
  private walls: Set<string> = new Set()
  private lastTrailPos = { x: 0, y: 0 }
  private isMoving = false
  private gradientGfx: Phaser.GameObjects.Graphics | null = null
  trailEffect: TrailEffect = 'box'

  gridX: number
  gridY: number

  get x() { return this.rect.x }
  get y() { return this.rect.y }

  constructor(
    scene: Phaser.Scene, gridX: number, gridY: number,
    keyLeft = 37, keyRight = 39, keyUp = 38, keyDown = 40,
    trailEffect: TrailEffect = 'box'
  ) {
    this.scene = scene
    this.gridX = gridX
    this.gridY = gridY
    this.trailEffect = trailEffect

    this.rect = scene.add.rectangle(
      gridX * TILE + TILE / 2, gridY * TILE + TILE / 2,
      TILE - 6, TILE - 6, 0x00e5cc
    ).setDepth(10)

    this.customKeys = {
      left: scene.input.keyboard!.addKey(keyLeft),
      right: scene.input.keyboard!.addKey(keyRight),
      up: scene.input.keyboard!.addKey(keyUp),
      down: scene.input.keyboard!.addKey(keyDown),
    }
  }

  update(walls: Set<string>) {
    this.walls = walls
    const { JustDown } = Phaser.Input.Keyboard
    let dx = 0, dy = 0

    if (JustDown(this.customKeys.left)) dx = -1
    else if (JustDown(this.customKeys.right)) dx = 1
    else if (JustDown(this.customKeys.up)) dy = -1
    else if (JustDown(this.customKeys.down)) dy = 1

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
      nx += dx; ny += dy; steps++
    }
    nx -= dx; ny -= dy

    if (nx === this.gridX && ny === this.gridY) {
      this.spawnHitEffect((this.gridX + dx) * TILE + TILE / 2, (this.gridY + dy) * TILE + TILE / 2)
      return
    }

    this.isMoving = true
    this.lastTrailPos = { x: this.rect.x, y: this.rect.y }
    const dist = Math.abs(nx - this.gridX) + Math.abs(ny - this.gridY)
    const duration = Math.max(SLIDE_SPEED_MIN, dist * SLIDE_SPEED_PER_TILE)

    if (this.trailEffect === 'gradient') {
      if (this.gradientGfx) {
        const old = this.gradientGfx
        this.gradientGfx = null
        this.scene.tweens.add({
          targets: old, alpha: 0, duration: GRADIENT_FADE_DURATION,
          onComplete: () => old.destroy()
        })
      }
      this.gradientGfx = this.scene.add.graphics().setDepth(9)
    }

    const startX = this.rect.x
    const startY = this.rect.y

    this.currentTween = this.scene.tweens.add({
      targets: this.rect,
      x: nx * TILE + TILE / 2,
      y: ny * TILE + TILE / 2,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        if (this.trailEffect === 'gradient' && this.gradientGfx) {
          this.drawLiveGradient(this.gradientGfx, startX, startY, this.rect.x, this.rect.y, dx, dy)
        } else {
          const ddx = this.rect.x - this.lastTrailPos.x
          const ddy = this.rect.y - this.lastTrailPos.y
          if (Math.sqrt(ddx * ddx + ddy * ddy) > TILE * 0.3) {
            this.spawnTrailAt(this.lastTrailPos.x, this.lastTrailPos.y)
            this.lastTrailPos = { x: this.rect.x, y: this.rect.y }
          }
        }
      },
      onComplete: () => {
        this.gridX = nx; this.gridY = ny
        this.isMoving = false; this.currentTween = null
        if (this.gradientGfx) {
          const g = this.gradientGfx
          this.gradientGfx = null
          this.scene.tweens.add({
            targets: g, alpha: 0, duration: GRADIENT_FADE_DURATION,
            onComplete: () => g.destroy()
          })
        }
        if (this.nextMove) {
          const m = this.nextMove; this.nextMove = null
          this.slide(m.dx, m.dy)
        }
      }
    })
  }

  private drawLiveGradient(
    gfx: Phaser.GameObjects.Graphics,
    sx: number, sy: number,
    cx: number, cy: number,
    dx: number, dy: number
  ) {
    gfx.clear()
    const W = TILE - 4

    if (dx !== 0) {
      const x1 = Math.min(sx, cx) - W / 2
      const w = Math.abs(cx - sx) + W
      if (dx > 0) {
        gfx.fillGradientStyle(0x00e5cc, 0x00e5cc, 0x00e5cc, 0x00e5cc, 0, 0.7, 0, 0.7)
      } else {
        gfx.fillGradientStyle(0x00e5cc, 0x00e5cc, 0x00e5cc, 0x00e5cc, 0.7, 0, 0.7, 0)
      }
      gfx.fillRect(x1, sy - W / 2, w, W)
    } else {
      const y1 = Math.min(sy, cy) - W / 2
      const h = Math.abs(cy - sy) + W
      if (dy < 0) {
        gfx.fillGradientStyle(0x00e5cc, 0x00e5cc, 0x00e5cc, 0x00e5cc, 0.7, 0.7, 0, 0)
      } else {
        gfx.fillGradientStyle(0x00e5cc, 0x00e5cc, 0x00e5cc, 0x00e5cc, 0, 0, 0.7, 0.7)
      }
      gfx.fillRect(sx - W / 2, y1, W, h)
    }
  }

  private spawnTrailAt(x: number, y: number) {
    switch (this.trailEffect) {
      case 'box':   this.trailBox(x, y); break
      case 'spark': this.trailSpark(x, y); break
      case 'ghost': this.trailGhost(x, y); break
    }
  }

  private trailBox(x: number, y: number) {
    const t = this.scene.add.rectangle(x, y, TILE - 8, TILE - 8, 0x00e5cc).setAlpha(0.45).setDepth(9)
    this.scene.tweens.add({ targets: t, alpha: 0, duration: 260, onComplete: () => t.destroy() })
  }

  private trailSpark(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2
      const d = 4 + Math.random() * 8
      const p = this.scene.add.rectangle(x, y, 4, 4, 0x00e5cc).setAlpha(0.7).setDepth(9)
      this.scene.tweens.add({
        targets: p, x: x + Math.cos(angle) * d, y: y + Math.sin(angle) * d,
        alpha: 0, scaleX: 0, scaleY: 0, duration: 200 + Math.random() * 100,
        onComplete: () => p.destroy()
      })
    }
  }

  private trailGhost(x: number, y: number) {
    const t = this.scene.add.rectangle(x, y, TILE - 2, TILE - 2, 0x00e5cc).setAlpha(0.22).setDepth(8)
    this.scene.tweens.add({
      targets: t, alpha: 0, scaleX: 1.4, scaleY: 1.4,
      duration: 450, ease: 'Quad.easeOut', onComplete: () => t.destroy()
    })
  }

  private spawnHitEffect(wx: number, wy: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const p = this.scene.add.rectangle(wx, wy, 4, 4, 0x00e5cc).setDepth(11)
      this.scene.tweens.add({
        targets: p,
        x: wx + Math.cos(angle) * 14, y: wy + Math.sin(angle) * 14,
        alpha: 0, scaleX: 0, scaleY: 0, duration: 180, ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      })
    }
  }

  getRect() { return this.rect }
}
