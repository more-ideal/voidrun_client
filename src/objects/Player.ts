import Phaser from 'phaser'
import { TILE, COLS } from '../constants'

const MAX_SLIDE = 30

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

    // 제자리 = 벽에 바로 붙어있는 경우 → 충돌 이펙트만
    if (nx === this.gridX && ny === this.gridY) {
      this.spawnHitEffect(
        (this.gridX + dx) * TILE + TILE / 2,
        (this.gridY + dy) * TILE + TILE / 2
      )
      return
    }

    this.isMoving = true

    // 잔상: 지나온 모든 타일에 남기기
    this.spawnTrails(nx, ny)

    const dist = Math.abs(nx - this.gridX) + Math.abs(ny - this.gridY)

    this.scene.tweens.add({
      targets: this.rect,
      x: nx * TILE + TILE / 2,
      y: ny * TILE + TILE / 2,
      duration: Math.max(70, dist * 28),
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.gridX = nx
        this.gridY = ny
        this.isMoving = false
        // 도착 시 작은 충돌 이펙트
        this.spawnHitEffect(this.rect.x, this.rect.y, true)
      }
    })
  }

  private spawnTrails(targetGX: number, targetGY: number) {
    const steps = Math.max(
      Math.abs(targetGX - this.gridX),
      Math.abs(targetGY - this.gridY)
    )
    if (steps <= 0) return

    const dx = (targetGX - this.gridX) / steps
    const dy = (targetGY - this.gridY) / steps

    // 출발지부터 도착지 직전까지 잔상
    for (let i = 0; i < steps; i++) {
      const tx = (this.gridX + dx * i) * TILE + TILE / 2
      const ty = (this.gridY + dy * i) * TILE + TILE / 2
      const alpha = 0.55 - (i / steps) * 0.45

      const trail = this.scene.add.rectangle(tx, ty, TILE - 8, TILE - 8, 0x00e5cc)
      trail.setAlpha(alpha).setDepth(9)

      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        duration: 350,
        delay: i * 15,
        onComplete: () => trail.destroy()
      })
    }
  }

  private spawnHitEffect(wx: number, wy: number, soft = false) {
    const count = soft ? 3 : 6
    const spread = soft ? 8 : 16

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const p = this.scene.add.rectangle(wx, wy, 5, 5, 0x00e5cc)
      p.setDepth(11)

      this.scene.tweens.add({
        targets: p,
        x: wx + Math.cos(angle) * spread,
        y: wy + Math.sin(angle) * spread,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: soft ? 150 : 220,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      })
    }

    // 캐릭터 flash
    if (!soft) {
      this.scene.tweens.add({
        targets: this.rect,
        alpha: 0.2,
        yoyo: true,
        duration: 70,
        repeat: 1,
      })
    }
  }

  getRect() { return this.rect }
}
