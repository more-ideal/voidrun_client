import Phaser from 'phaser'
import { GameSettings, loadSettings, saveSettings, DEFAULT_SETTINGS, keyName } from '../config/Settings'

const ACCENT = '#00e5cc'
const DIM = '#7799aa'
const BG = 0x080810

export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings
  private listening: keyof GameSettings | null = null
  private keyBtnTexts: Partial<Record<keyof GameSettings, Phaser.GameObjects.Text>> = {}

  constructor() { super('SettingsScene') }

  create() {
    this.settings = loadSettings()
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(cx, height / 2, width, height, BG)

    // 타이틀
    this.add.text(cx, 36, 'SETTINGS', {
      fontSize: '28px', fontFamily: 'monospace', color: ACCENT, fontStyle: 'bold'
    }).setOrigin(0.5)

    let y = 90

    // ── 테마 ──
    y = this.section(cx, y, 'THEME')
    y = this.optionRow(cx, y, ['DARK', 'LIGHT'],
      this.settings.theme === 'dark' ? 0 : 1,
      (i) => {
        this.settings.theme = i === 0 ? 'dark' : 'light'
        saveSettings(this.settings)
      }
    )

    // ── 잔상 이펙트 ──
    y += 10
    y = this.section(cx, y, 'TRAIL EFFECT')
    y = this.optionRow(cx, y, ['BOX', 'GRADIENT', 'SPARK', 'GHOST'],
      ['box', 'gradient', 'spark', 'ghost'].indexOf(this.settings.trailEffect),
      (i) => {
        this.settings.trailEffect = (['box', 'gradient', 'spark', 'ghost'] as const)[i]
        saveSettings(this.settings)
      }
    )

    // ── 키 바인딩 ──
    y += 10
    y = this.section(cx, y, 'KEY BINDINGS')
    const binds: Array<{ label: string; field: keyof GameSettings }> = [
      { label: 'UP',    field: 'keyUp' },
      { label: 'DOWN',  field: 'keyDown' },
      { label: 'LEFT',  field: 'keyLeft' },
      { label: 'RIGHT', field: 'keyRight' },
    ]
    for (const b of binds) {
      y = this.keyBindRow(cx, y, b.label, b.field)
    }

    // ── 초기화 ──
    y += 20
    this.createBtn(cx, y, 'RESET TO DEFAULT', () => {
      this.settings = { ...DEFAULT_SETTINGS }
      saveSettings(this.settings)
      this.scene.restart()
    }, true)

    // ── 뒤로가기 ──
    y += 54
    this.createBtn(cx, y, '← BACK', () => this.scene.start('MainScene'))
  }

  private section(cx: number, y: number, label: string): number {
    this.add.text(cx - 160, y, label, {
      fontSize: '11px', fontFamily: 'monospace', color: DIM
    })
    const line = this.add.graphics()
    line.lineStyle(1, 0x1a3a5c, 1)
    line.lineBetween(cx - 160, y + 18, cx + 160, y + 18)
    return y + 28
  }

  private optionRow(cx: number, y: number, labels: string[], activeIdx: number, onChange: (i: number) => void): number {
    const btns: Phaser.GameObjects.Text[] = []
    const total = labels.length
    const btnW = Math.min(80, 320 / total)
    const startX = cx - (total * btnW) / 2 + btnW / 2

    labels.forEach((lbl, i) => {
      const bx = startX + i * btnW
      const gfx = this.add.graphics()
      const txt = this.add.text(bx, y + 18, lbl, {
        fontSize: '12px', fontFamily: 'monospace',
        color: i === activeIdx ? '#000000' : ACCENT,
      }).setOrigin(0.5)

      const draw = (active: boolean) => {
        gfx.clear()
        gfx.fillStyle(active ? 0x00e5cc : 0x0d1a2e, 1)
        gfx.fillRect(bx - btnW / 2 + 2, y + 6, btnW - 4, 24)
        gfx.lineStyle(1, active ? 0x00e5cc : 0x2a5080, 1)
        gfx.strokeRect(bx - btnW / 2 + 2, y + 6, btnW - 4, 24)
      }
      draw(i === activeIdx)
      btns.push(txt)

      const zone = this.add.zone(bx, y + 18, btnW - 4, 24).setInteractive({ useHandCursor: true })
      zone.on('pointerdown', () => {
        btns.forEach((b, j) => { b.setColor(j === i ? '#000000' : ACCENT) })
        labels.forEach((_, j) => {
          // 모든 버튼 리드로우
        })
        draw(true)
        // 다른 버튼들 비활성화 (간단히 씬 리스타트 대신 직접 업데이트)
        onChange(i)
      })
    })
    return y + 44
  }

  private keyBindRow(cx: number, y: number, label: string, field: keyof GameSettings): number {
    this.add.text(cx - 160, y + 10, label, {
      fontSize: '13px', fontFamily: 'monospace', color: '#aabbcc'
    }).setOrigin(0, 0.5)

    const gfx = this.add.graphics()
    const currentCode = this.settings[field] as number
    const btn = this.add.text(cx + 60, y + 10, keyName(currentCode), {
      fontSize: '14px', fontFamily: 'monospace', color: ACCENT, fontStyle: 'bold'
    }).setOrigin(0.5)

    const drawBtn = (active: boolean, waiting = false) => {
      gfx.clear()
      gfx.fillStyle(waiting ? 0x1a3a5c : 0x0d1a2e, 1)
      gfx.fillRect(cx + 30, y, 62, 22)
      gfx.lineStyle(1, active || waiting ? 0x00e5cc : 0x2a5080, 1)
      gfx.strokeRect(cx + 30, y, 62, 22)
    }
    drawBtn(false)
    this.keyBtnTexts[field] = btn

    const zone = this.add.zone(cx + 61, y + 11, 62, 22).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => drawBtn(true))
    zone.on('pointerout', () => {
      if (this.listening !== field) drawBtn(false)
    })
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
    const col = danger ? 0x441122 : 0x0d1a2e
    const borderCol = danger ? 0xff2255 : 0x2a5080

    const draw = (hover: boolean) => {
      gfx.clear()
      gfx.fillStyle(hover ? (danger ? 0x661133 : 0x1a3a5c) : col, 1)
      gfx.fillRect(cx - w / 2, y - h / 2, w, h)
      gfx.lineStyle(1, borderCol, 1)
      gfx.strokeRect(cx - w / 2, y - h / 2, w, h)
    }
    draw(false)

    const txt = this.add.text(cx, y, label, {
      fontSize: '13px', fontFamily: 'monospace',
      color: danger ? '#ff2255' : '#aabbcc'
    }).setOrigin(0.5)

    const zone = this.add.zone(cx, y, w, h).setInteractive({ useHandCursor: true })
    zone.on('pointerover', () => draw(true))
    zone.on('pointerout', () => draw(false))
    zone.on('pointerdown', cb)
  }
}
