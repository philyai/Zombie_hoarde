import Phaser from 'phaser'
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  type GameOverData,
  SCENES,
} from '../config/GameConfig'

export class GameOverScene extends Phaser.Scene {
  private result: GameOverData = {
    score: 0,
    distance: 0,
    runCoins: 0,
    zombiesAbsorbed: 0,
    currentHorde: 0,
    peakHorde: 1,
    isNewBest: false,
  }

  constructor() {
    super(SCENES.GAME_OVER)
  }

  init(data: GameOverData): void {
    this.result = data
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x14191b)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x14191b)

    this.add
      .text(GAME_WIDTH / 2, 28, 'RUN OVER', {
        color: COLORS.DANGER_TEXT,
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    if (this.result.isNewBest) {
      this.add
        .text(GAME_WIDTH / 2, 51, 'NEW BEST!', {
          color: '#f4d35e',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    }

    this.add
      .text(
        GAME_WIDTH / 2,
        91,
        `SCORE          ${this.result.score}\nDISTANCE       ${this.result.distance}m\nPEAK HORDE     ${this.result.peakHorde}\nCOINS          ${this.result.runCoins}`,
        {
          color: COLORS.TEXT,
          fontFamily: 'monospace',
          fontSize: '11px',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5)

    this.createButton(128, 166, 'RETRY', () => this.scene.start(SCENES.GAME))
    this.createButton(256, 166, 'MENU', () => this.scene.start(SCENES.MENU))
  }

  private createButton(x: number, y: number, label: string, action: () => void): void {
    const button = this.add
      .rectangle(x, y, 94, 26, 0x3a5548)
      .setStrokeStyle(1, 0x7bbf72)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(x, y, label, {
        color: COLORS.TEXT,
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    button.on('pointerover', () => button.setFillStyle(0x4a6e56))
    button.on('pointerout', () => button.setFillStyle(0x3a5548))
    button.once('pointerup', action)
  }
}
