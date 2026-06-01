import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const MAX_SLIDE = 30
export const SLIDE_SPEED_MIN = 30
export const SLIDE_SPEED_PER_TILE = 9

export type TrailEffect = 'box' | 'gradient' | 'spark' | 'ghost'

// 그라데이션 잔상용 색상 팔레트 (냥캣 느낌)
const GRADIENT_COLORS = [0xff6ec7, 0xffb347, 0xffff66, 0x66ff66, 0x66cfff, 0xb366ff]

export class Player {
  private rect: Phaser.GameObjects.Rectangle
  private scene: Phaser.Scene
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
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
  private trailIndex = 0
  private isMoving = false
  trailEffect: TrailEffect = 'box'

  gridX: number
  gridY: number

  get x() { return this.rect.x }
  get y() { return this.rect.y }

  constructor(scene: Phaser.Scene, gridX: number, gridY: number,
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

    this.cursors = scene.input.keyboard!.createCursorKeys()
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

    this.currentTween = this.scene.tweens.add({
      targets: this.rect,
      x: nx * TILE + TILE / 2,
      y: ny * TILE + TILE / 2,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const ddx = this.rect.x - this.lastTrailPos.x
        const ddy = this.rect.y - this.lastTrailPos.y
        if (Math.sqrt(ddx * ddx + ddy * ddy) > TILE * 0.3) {
          this.spawnTrail(this.lastTrailPos.x, this.lastTrailPos.y)
          this.lastTrailPos = { x: this.rect.x, y: this.rect.y }
        }
      },
      onComplete: () => {
        this.gridX = nx; this.gridY = ny
        this.isMoving = false; this.currentTween = null
        if (this.nextMove) {
          const m = this.nextMove; this.nextMove = null
          this.slide(m.dx, m.dy)
        }
      }
    })
  }

  private spawnTrail(x: number, y: number) {
    switch (this.trailEffect) {
      case 'box': this.trailBox(x, y); break
      case 'gradient': this.trailGradient(x, y); break
      case 'spark': this.trailSpark(x, y); break
      case 'ghost': this.trailGhost(x, y); break
    }
  }

  // 1. 네모 잔상
  private trailBox(x: number, y: number) {
    const t = this.scene.add.rectangle(x, y, TILE - 8, TILE - 8, 0x00e5cc).setAlpha(0.45).setDepth(9)
    this.scene.tweens.add({ targets: t, alpha: 0, duration: 260, onComplete: () => t.destroy() })
  }

  // 2. 그라데이션 잔상 (냥캣 느낌 - 무지개 색 순환)
  private trailGradient(x: number, y: number) {
    const color = GRADIENT_COLORS[this.trailIndex % GRADIENT_COLORS.length]
    this.trailIndex++
    const t = this.scene.add.rectangle(x, y, TILE - 6, TILE - 6, color).setAlpha(0.6).setDepth(9)
    this.scene.tweens.add({
      targets: t, alpha: 0, scaleX: 0.6, scaleY: 0.6,
      duration: 320, ease: 'Quad.easeOut',
      onComplete: () => t.destroy()
    })
  }

  // 3. 스파크 잔상 (작은 파티클들이 퍼짐)
  private trailSpark(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 4 + Math.random() * 8
      const p = this.scene.add.rectangle(x, y, 4, 4, 0x00e5cc).setAlpha(0.7).setDepth(9)
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 200 + Math.random() * 100,
        onComplete: () => p.destroy()
      })
    }
  }

  // 4. 고스트 잔상 (큰 실루엣이 천천히 사라짐)
  private trailGhost(x: number, y: number) {
    const t = this.scene.add.rectangle(x, y, TILE - 2, TILE - 2, 0x00e5cc).setAlpha(0.25).setDepth(8)
    this.scene.tweens.add({
      targets: t, alpha: 0, scaleX: 1.4, scaleY: 1.4,
      duration: 450, ease: 'Quad.easeOut',
      onComplete: () => t.destroy()
    })
  }

  private spawnHitEffect(wx: number, wy: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const p = this.scene.add.rectangle(wx, wy, 4, 4, 0x00e5cc).setDepth(11)
      this.scene.tweens.add({
        targets: p,
        x: wx + Math.cos(angle) * 14, y: wy + Math.sin(angle) * 14,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 180, ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      })
    }
  }

  getRect() { return this.rect }
}
