import Phaser from 'phaser'
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/GameConfig'
import { saveManager } from '../systems/SaveManager'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU)
  }

  create(): void {
    const save = saveManager.load()
    this.cameras.main.setBackgroundColor(COLORS.SKY)

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 28, GAME_WIDTH, 56, COLORS.SKY_ACCENT)

    this.add
      .text(GAME_WIDTH / 2, 46, 'ZOMBIE HORDE\nRUNNER', {
        color: COLORS.TEXT,
        fontFamily: 'monospace',
        fontSize: '23px',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 96, `BEST SCORE  ${save.bestScore}\nCOINS       ${save.coins}`, {
        color: COLORS.MUTED_TEXT,
        fontFamily: 'monospace',
        fontSize: '11px',
        lineSpacing: 4,
      })
      .setOrigin(0.5)

    this.createButton(GAME_WIDTH / 2, 145, 'PLAY', () => {
      this.scene.start(SCENES.GAME)
    })
  }

  private createButton(x: number, y: number, label: string, action: () => void): void {
    const button = this.add
      .rectangle(x, y, 96, 28, 0x4f8f50)
      .setStrokeStyle(2, 0x93dd78)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(x, y, label, {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    button.on('pointerover', () => button.setFillStyle(0x63a95c))
    button.on('pointerout', () => button.setFillStyle(0x4f8f50))
    button.once('pointerup', action)
  }
}
