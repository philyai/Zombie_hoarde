import Phaser from 'phaser'
import {
  CAMERA_FOLLOW_X,
  COLORS,
  CRITICAL_MASS_SIZE,
  FLIGHT_DURATION_MS,
  GAME_HEIGHT,
  GAME_WORLD_WIDTH,
  GAME_WIDTH,
  MAX_SPEED,
  SCENES,
  SPEED_ACCELERATION,
  START_SPEED,
  type GameOverData,
} from '../config/GameConfig'
import { Horde } from '../entities/Horde'
import { ChunkSpawner } from '../systems/ChunkSpawner'
import { CollisionManager } from '../systems/CollisionManager'
import { SaveManager, saveManager } from '../systems/SaveManager'
import { ScoreManager } from '../systems/ScoreManager'

export class GameScene extends Phaser.Scene {
  private horde!: Horde
  private spawner!: ChunkSpawner
  private collisions!: CollisionManager
  private score!: ScoreManager
  private readonly saves: SaveManager = saveManager

  private scoreText!: Phaser.GameObjects.Text
  private coinsText!: Phaser.GameObjects.Text
  private hordeText!: Phaser.GameObjects.Text
  private flightText!: Phaser.GameObjects.Text
  private flightBar!: Phaser.GameObjects.Graphics
  private pauseOverlay: Phaser.GameObjects.GameObject[] = []

  private upKey?: Phaser.Input.Keyboard.Key
  private spaceKey?: Phaser.Input.Keyboard.Key
  private pauseKey?: Phaser.Input.Keyboard.Key
  private escapeKey?: Phaser.Input.Keyboard.Key
  private worldSpeed = START_SPEED
  private flightRemainingMs = 0
  private criticalMassTriggered = false
  private isPaused = false
  private isEnding = false
  private shutdownComplete = false

  constructor() {
    super(SCENES.GAME)
  }

  create(): void {
    this.resetRunState()
    this.physics.resume()
    this.physics.world.setBounds(0, 0, GAME_WORLD_WIDTH, GAME_HEIGHT)
    this.physics.world.setBoundsCollision(true, true, true, true)
    this.cameras.main.setBackgroundColor(COLORS.SKY)
    this.cameras.main.setScroll(0, 0)
    this.createBackdrop()

    this.score = new ScoreManager()
    this.horde = new Horde(this)
    this.spawner = new ChunkSpawner(this, () => this.horde.isFlightActive)
    this.collisions = new CollisionManager(this, this.horde, this.spawner, this.score, {
      onPopulationChanged: (count) => this.handlePopulationChanged(count),
      onDamage: (removed) => this.handleDamage(removed),
      onFenceSmashed: () => this.handleFenceSmashed(),
      onFlightCollected: () => this.activateFlight(),
    })

    this.upKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.pauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.createHud()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)
  }

  update(_time: number, delta: number): void {
    if (this.isEnding) {
      return
    }

    const pausePressed =
      (this.pauseKey ? Phaser.Input.Keyboard.JustDown(this.pauseKey) : false) ||
      (this.escapeKey ? Phaser.Input.Keyboard.JustDown(this.escapeKey) : false)
    if (pausePressed) {
      if (this.isPaused) {
        this.resumeGame()
      } else {
        this.pauseGame()
      }
      return
    }

    if (this.isPaused) {
      return
    }

    const deltaSeconds = delta / 1000
    this.worldSpeed = Math.min(MAX_SPEED, this.worldSpeed + SPEED_ACCELERATION * deltaSeconds)
    this.horde.setForwardSpeed(this.worldSpeed)

    if (this.horde.isFlightActive) {
      this.horde.updateFlight()
    } else {
      const isHeld =
        this.input.activePointer.isDown ||
        (this.upKey?.isDown ?? false) ||
        (this.spaceKey?.isDown ?? false)
      this.horde.applyInput(isHeld, delta)
    }

    const travel = this.worldSpeed * deltaSeconds
    this.horde.update(this.horde.leader.x)
    this.score.updateDistance(travel, this.horde.count)
    this.cameras.main.scrollX = Math.max(0, this.horde.leader.x - CAMERA_FOLLOW_X)
    this.spawner.update(this.cameras.main.scrollX, this.score.distance)
    this.collisions.updatePitFalls()
    this.collisions.updateFlightCollection()
    this.updateFlight(delta)
    this.updateHud()

    if (this.horde.count === 0) {
      this.finishRun()
    }
  }

  private resetRunState(): void {
    this.worldSpeed = START_SPEED
    this.flightRemainingMs = 0
    this.criticalMassTriggered = false
    this.isPaused = false
    this.isEnding = false
    this.shutdownComplete = false
  }

  private createBackdrop(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.SKY)
      .setScrollFactor(0)
    this.add.circle(324, 42, 18, 0xd9e0c7, 0.22).setScrollFactor(0)
    this.add
      .rectangle(GAME_WIDTH / 2, 163, GAME_WIDTH, 42, COLORS.SKY_ACCENT)
      .setScrollFactor(0)

    const skyline = this.add.graphics().setDepth(1).setScrollFactor(0)
    skyline.fillStyle(0x0b1114, 1)
    const buildings = [
      [0, 143, 42, 41],
      [48, 151, 29, 33],
      [84, 136, 50, 48],
      [143, 148, 36, 36],
      [190, 132, 46, 52],
      [244, 146, 25, 38],
      [278, 138, 42, 46],
      [330, 150, 54, 34],
    ]
    for (const [x, y, width, height] of buildings) {
      skyline.fillRect(x, y, width, height)
    }
  }

  private createHud(): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: COLORS.TEXT,
      fontFamily: 'monospace',
      fontSize: '10px',
      fontStyle: 'bold',
    }

    this.scoreText = this.add.text(7, 6, 'SCORE 0', textStyle).setDepth(100).setScrollFactor(0)
    this.coinsText = this.add.text(143, 6, 'COINS 0', textStyle).setDepth(100).setScrollFactor(0)
    this.hordeText = this.add.text(283, 6, 'HORDE 1', textStyle).setDepth(100).setScrollFactor(0)
    this.flightText = this.add
      .text(7, 22, 'FLIGHT', { ...textStyle, color: '#ffb29b' })
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false)
    this.flightBar = this.add.graphics().setDepth(100).setScrollFactor(0)

    const pauseButton = this.add
      .rectangle(GAME_WIDTH - 14, 28, 22, 18, 0x283a32, 0.95)
      .setStrokeStyle(1, 0x7bbf72)
      .setDepth(110)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
    this.add
      .text(GAME_WIDTH - 14, 28, 'II', {
        color: COLORS.TEXT,
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(111)
      .setScrollFactor(0)
    pauseButton.on('pointerover', () => pauseButton.setFillStyle(0x3f5d4a, 1))
    pauseButton.on('pointerout', () => pauseButton.setFillStyle(0x283a32, 0.95))
    pauseButton.on('pointerdown', () => this.pauseGame())
  }

  private pauseGame(): void {
    if (this.isPaused || this.isEnding) {
      return
    }

    this.isPaused = true
    this.physics.pause()
    this.tweens.pauseAll()
    this.pauseOverlay = this.createPauseOverlay()
  }

  private resumeGame(): void {
    if (!this.isPaused || this.isEnding) {
      return
    }

    this.destroyPauseOverlay()
    this.tweens.resumeAll()
    this.physics.resume()
    this.isPaused = false
  }

  private createPauseOverlay(): Phaser.GameObjects.GameObject[] {
    const overlay: Phaser.GameObjects.GameObject[] = []
    const blocker = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x06090a, 0.82)
      .setDepth(500)
      .setScrollFactor(0)
      .setInteractive()
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 190, 124, 0x17211d, 1)
      .setStrokeStyle(2, 0x6ca665)
      .setDepth(501)
      .setScrollFactor(0)
    const title = this.add
      .text(GAME_WIDTH / 2, 72, 'PAUSED', {
        color: COLORS.TEXT,
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(502)
      .setScrollFactor(0)

    overlay.push(blocker, panel, title)
    this.addPauseOverlayButton(overlay, GAME_WIDTH / 2, 112, 'RESUME', () => this.resumeGame())
    this.addPauseOverlayButton(overlay, GAME_WIDTH / 2, 147, 'MENU', () => {
      this.scene.start(SCENES.MENU)
    })
    return overlay
  }

  private addPauseOverlayButton(
    overlay: Phaser.GameObjects.GameObject[],
    x: number,
    y: number,
    label: string,
    action: () => void,
  ): void {
    const button = this.add
      .rectangle(x, y, 104, 26, 0x3a5548)
      .setStrokeStyle(1, 0x7bbf72)
      .setDepth(503)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(x, y, label, {
        color: COLORS.TEXT,
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(504)
      .setScrollFactor(0)

    button.on('pointerover', () => button.setFillStyle(0x4a6e56))
    button.on('pointerout', () => button.setFillStyle(0x3a5548))
    button.on('pointerdown', action)
    overlay.push(button, text)
  }

  private destroyPauseOverlay(): void {
    for (const object of this.pauseOverlay) {
      object.destroy()
    }
    this.pauseOverlay.length = 0
  }

  private updateHud(): void {
    this.scoreText.setText(`SCORE ${this.score.score}`)
    this.coinsText.setText(`COINS ${this.score.runCoins}`)
    this.hordeText.setText(`HORDE ${this.horde.count}`)

    const flightActive = this.flightRemainingMs > 0
    this.flightText.setVisible(flightActive)
    this.flightBar.clear()
    if (flightActive) {
      const ratio = Phaser.Math.Clamp(this.flightRemainingMs / FLIGHT_DURATION_MS, 0, 1)
      this.flightBar.fillStyle(0x283134, 0.9).fillRect(48, 23, 58, 6)
      this.flightBar.fillStyle(COLORS.FLIGHT, 1).fillRect(49, 24, 56 * ratio, 4)
    }
  }

  private activateFlight(): void {
    this.flightRemainingMs = FLIGHT_DURATION_MS
    this.horde.setFlightActive(true)
    this.cameras.main.flash(120, 255, 156, 105, false)
  }

  private updateFlight(delta: number): void {
    if (this.flightRemainingMs <= 0) {
      return
    }

    this.flightRemainingMs = Math.max(0, this.flightRemainingMs - delta)
    if (this.flightRemainingMs === 0) {
      this.horde.setFlightActive(false)
    }
  }

  private handlePopulationChanged(count: number): void {
    if (!this.criticalMassTriggered && count >= CRITICAL_MASS_SIZE) {
      this.criticalMassTriggered = true
      this.score.addBonus(500)
      this.cameras.main.flash(220, 130, 255, 115, false)
      this.cameras.main.shake(220, 0.004)
      const message = this.add
        .text(GAME_WIDTH / 2, 67, 'CRITICAL MASS +500', {
          color: '#d7ff9c',
          fontFamily: 'monospace',
          fontSize: '15px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(200)
        .setScrollFactor(0)

      this.tweens.add({
        targets: message,
        y: 51,
        alpha: 0,
        duration: 900,
        ease: 'Quad.easeOut',
        onComplete: () => message.destroy(),
      })
    }
  }

  private handleDamage(removed: number): void {
    if (removed <= 0) {
      return
    }
    this.cameras.main.shake(130, 0.007)
    this.cameras.main.flash(80, 170, 35, 35, false)
  }

  private handleFenceSmashed(): void {
    this.cameras.main.shake(80, 0.003)
  }

  private finishRun(): void {
    if (this.isEnding) {
      return
    }
    this.isEnding = true
    this.physics.pause()
    this.horde.setFlightActive(false)

    const summary = this.score.summary()
    this.saves.addCoins(summary.runCoins)
    const isNewBest = this.saves.updateBest(summary.score, summary.distance)
    const result: GameOverData = { ...summary, isNewBest }
    this.scene.start(SCENES.GAME_OVER, result)
  }

  private shutdown(): void {
    if (this.shutdownComplete) {
      return
    }
    this.shutdownComplete = true
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.destroyPauseOverlay()
    this.collisions?.destroy()
    this.spawner?.destroy()
    this.horde?.destroy()
    this.upKey = undefined
    this.spaceKey = undefined
    this.pauseKey = undefined
    this.escapeKey = undefined
  }
}
