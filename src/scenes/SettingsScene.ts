import Phaser from 'phaser'
import { GameSettings, loadSettings, saveSettings, DEFAULT_SETTINGS, keyName } from '../config/Settings'

const ACCENT = '#00e5cc'
const DIM = '#7799aa'

export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings
  private listening: keyof GameSettings | null = null

  constructor() { super('SettingsScene') }

  create() {
    this.settings = loadSettings()
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, 0x080810)

    this.add.text(cx, 36, 'SETTINGS', {
      fontSize: '28px', fontFamily: 'monospace', color: ACCENT, fontStyle: 'bold'
    }).setOrigin(0.5)

    let y = 90

    y = this.section(cx, y, 'THEME')
    y = this.optionRow(cx, y, ['DARK', 'LIGHT'],
      this.settings.theme === 'dark' ? 0 : 1,
      (i) => { this.settings.theme = i === 0 ? 'dark' : 'light'; saveSettings(this.settings) }
    )

    y += 10
    y = this.section(cx, y, 'TRAIL EFFECT')
    y = this.optionRow(cx, y, ['BOX', 'GRADIENT', 'SPARK', 'GHOST'],
      ['box', 'gradient', 'spark', 'ghost'].indexOf(this.settings.trailEffect),
      (i) => { this.settings.trailEffect = (['box', 'gradient', 'spark', 'ghost'] as const)[i]; saveSettings(this.settings) }
    )

    y += 10
    y = this.section(cx, y, 'KEY BINDINGS')
    const binds: Array<{ label: string; field: keyof GameSettings }> = [
      { label: 'UP',    field: 'keyUp' },
      { label: 'DOWN',  field: 'keyDown' },
      { label: 'LEFT',  field: 'keyLeft' },
      { label: 'RIGHT', field: 'keyRight' },
    ]
    for (const b of binds) y = this.keyBindRow(cx, y, b.label, b.field)

    y += 20
    this.createBtn(cx, y, 'RESET TO DEFAULT', () => {
      this.settings = { ...DEFAULT_SETTINGS }
      saveSettings(this.settings)
      this.scene.restart()
    }, true)

    y += 54
    this.createBtn(cx, y, '← BACK', () => this.scene.start('MainScene'))
  }

  private section(cx: number, y: number, label: string): number {
    this.add.text(cx - 160, y, label, { fontSize: '11px', fontFamily: 'monospace', color: DIM })
    const g = this.add.graphics()
    g.lineStyle(1, 0x1a3a5c, 1)
    g.lineBetween(cx - 160, y + 18, cx + 160, y + 18)
    return y + 28
  }

  private optionRow(cx: number, y: number, labels: string[], activeIdx: number, onChange: (i: number) => void): number {
    const n = labels.length
    const btnW = Math.min(78, 300 / n)
    const startX = cx - (n * btnW) / 2 + btnW / 2

    // draw 함수들을 배열로 관리해서 상호 배타 보장
    const drawFns: ((active: boolean) => void)[] = []

    labels.forEach((lbl, i) => {
      const bx = startX + i * btnW
      const gfx = this.add.graphics()
      const txt = this.add.text(bx, y + 18, lbl, {
        fontSize: '12px', fontFamily: 'monospace', color: '#000000'
      }).setOrigin(0.5)

      const draw = (active: boolean) => {
        gfx.clear()
        gfx.fillStyle(active ? 0x00e5cc : 0x0d1a2e, 1)
        gfx.fillRect(bx - btnW / 2 + 2, y + 6, btnW - 4, 24)
        gfx.lineStyle(1, active ? 0x00e5cc : 0x2a5080, 1)
        gfx.strokeRect(bx - btnW / 2 + 2, y + 6, btnW - 4, 24)
        txt.setColor(active ? '#000000' : ACCENT)
      }

      draw(i === activeIdx)
      drawFns.push(draw)

      const zone = this.add.zone(bx, y + 18, btnW - 4, 24).setInteractive({ useHandCursor: true })
      zone.on('pointerdown', () => {
        // 모든 버튼 비활성화 후 선택된 것만 활성화
        drawFns.forEach((fn, j) => fn(j === i))
        onChange(i)
      })
    })

    return y + 44
  }

  private keyBindRow(cx: number, y: number, label: string, field: keyof GameSettings): number {
    this.add.text(cx - 160, y + 11, label, {
      fontSize: '13px', fontFamily: 'monospace', color: '#aabbcc'
    }).setOrigin(0, 0.5)

    const gfx = this.add.graphics()
    const btn = this.add.text(cx + 61, y + 11, keyName(this.settings[field] as number), {
      fontSize: '14px', fontFamily: 'monospace', color: ACCENT, fontStyle: 'bold'
    }).setOrigin(0.5)

    const drawBtn = (hover: boolean, waiting = false) => {
      gfx.clear()
      gfx.fillStyle(waiting ? 0x1a3a5c : 0x0d1a2e, 1)
      gfx.fillRect(cx + 30, y, 62, 22)
      gfx.lineStyle(1, (hover || waiting) ? 0x00e5cc : 0x2a5080, 1)
      gfx.strokeRect(cx + 30, y, 62, 22)
    }
    drawBtn(false)

    const zone = this.add.zone(cx + 61, y + 11, 62, 22).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => { if (this.listening !== field) drawBtn(true) })
    zone.on('pointerout', () => { if (this.listening !== field) drawBtn(false) })
    zone.on('pointerdown', () => {
      if (this.listening) return
      this.listening = field
      btn.setText('...')
      drawBtn(false, true)

      this.input.keyboard!.once('keydown', (e: KeyboardEvent) => {
        e.stopPropagation();
        (this.settings as any)[field] = e.keyCode
        btn.setText(keyName(e.keyCode))
        saveSettings(this.settings)
        this.listening = null
        drawBtn(false)
      })
    })
    return y + 38
  }

  private createBtn(cx: number, y: number, label: string, cb: () => void, danger = false) {
    const w = 220, h = 38
    const gfx = this.add.graphics()
    const draw = (hover: boolean) => {
      gfx.clear()
      gfx.fillStyle(hover ? (danger ? 0x661133 : 0x1a3a5c) : (danger ? 0x441122 : 0x0d1a2e), 1)
      gfx.fillRect(cx - w / 2, y - h / 2, w, h)
      gfx.lineStyle(1, danger ? 0xff2255 : 0x2a5080, 1)
      gfx.strokeRect(cx - w / 2, y - h / 2, w, h)
    }
    draw(false)

    this.add.text(cx, y, label, {
      fontSize: '13px', fontFamily: 'monospace', color: danger ? '#ff2255' : '#aabbcc'
    }).setOrigin(0.5)

    const zone = this.add.zone(cx, y, w, h).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => draw(true))
    zone.on('pointerout', () => draw(false))
    zone.on('pointerdown', cb)
  }
}
