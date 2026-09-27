import Phaser from 'phaser'
import { GAME_HEIGHT, GROUND_Y, TEXTURES } from '../config/GameConfig'

export type ObstacleKind = 'fence' | 'spike' | 'pit' | 'car' | 'truck' | 'bus' | 'airplane' | 'electric' | 'armored' | 'moving-car' | 'falling'
export type ObstacleCategory = 'damage' | 'pit' | 'aerial-damage'

interface ObstacleOptions {
  pitWidth?: number
  y?: number
}

const DAMAGE_MULTIPLIERS: Record<ObstacleKind, number> = {
  fence: 1,
  spike: 1.6,
  pit: 1.25,
  car: 1,
  truck: 1.35,
  bus: 1.6,
  airplane: 1.25,
  electric: 2.5,
  armored: 2,
  'moving-car': 1.5,
  falling: 2,
}

const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  fence: TEXTURES.FENCE,
  spike: TEXTURES.SPIKE,
  pit: TEXTURES.PIT,
  car: TEXTURES.CAR,
  truck: TEXTURES.TRUCK,
  bus: TEXTURES.BUS,
  airplane: TEXTURES.AIRPLANE,
  electric: 'electric',
  armored: 'armored',
  'moving-car': TEXTURES.CAR,
  falling: 'crate',
}

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly kind: ObstacleKind
  readonly damageMultiplier: number
  readonly category: ObstacleCategory
  private spent = false
  private pitLeaderCaught = false
  label?: Phaser.GameObjects.BitmapText
  readonly requirement: number
  private hazardTime = 0
  private warning?: Phaser.GameObjects.BitmapText

  constructor(
    scene: Phaser.Scene,
    x: number,
    kind: ObstacleKind,
    options: ObstacleOptions = {},
  ) {
    const y = options.y ?? (kind === 'pit' ? GROUND_Y : kind === 'airplane' ? 108 : GROUND_Y)
    super(scene, x, y, TEXTURE_BY_KIND[kind])

    this.kind = kind
    this.requirement = ({ fence: 2, car: 3, 'moving-car': 3, truck: 5, bus: 8, armored: 12 } as Partial<Record<ObstacleKind, number>>)[kind] ?? 0
    this.damageMultiplier = DAMAGE_MULTIPLIERS[kind]
    this.category = kind === 'pit' ? 'pit' : kind === 'airplane' ? 'aerial-damage' : 'damage'
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(kind === 'pit' ? 4 : 12).setOrigin(
      0.5,
      kind === 'pit' ? 0 : kind === 'airplane' ? 0.5 : 1,
    )
    this.setImmovable(true)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    if (kind === 'pit') {
      const pitWidth = options.pitWidth ?? 48
      const pitDepth = GAME_HEIGHT - GROUND_Y + 64
      this.setDisplaySize(pitWidth, pitDepth)
      body.setSize(pitWidth, pitDepth, true)
    } else {
      body.setSize(this.width - 6, this.height - 5).setOffset(3, 4)
    }
    if (this.requirement) this.label = scene.add.bitmapText(x, y - this.height - 11, 'pixel-font', `${this.requirement} HORDE`, 8).setOrigin(.5).setTint(0xffdd98).setDepth(30)
    if (kind === 'falling') {
      this.setY(GROUND_Y - 145); body.enable = false
      this.warning = scene.add.bitmapText(x, GROUND_Y - 45, 'pixel-font', 'FALLING\n   !', 8).setOrigin(.5).setTint(0xf0ba85).setDepth(35)
    }
  }

  get isSpent(): boolean {
    return this.spent
  }

  get isSmashable(): boolean {
    return this.requirement > 0
  }

  get isAerial(): boolean {
    return this.category === 'aerial-damage'
  }

  overlapsHorizontal(body: Phaser.Physics.Arcade.Body): boolean {
    const obstacleBody = this.body as Phaser.Physics.Arcade.Body
    return obstacleBody.left <= body.right && obstacleBody.right >= body.left
  }

  get leftEdge(): number {
    return this.x - this.displayWidth * this.originX
  }

  get rightEdge(): number {
    return this.leftEdge + this.displayWidth
  }

  get hasCaughtPitLeader(): boolean {
    return this.pitLeaderCaught
  }

  markPitLeaderCaught(): void {
    this.pitLeaderCaught = true
  }

  markSpent(hide = false): boolean {
    if (this.spent) {
      return false
    }
    this.spent = true
    this.label?.setVisible(false)
    this.warning?.setVisible(false)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.enable = false
    if (hide) {
      this.setVisible(false)
    }
    return true
  }

  updateHazard(frontX: number, delta: number): void {
    if (this.spent) return
    if (this.kind === 'moving-car' && this.x - frontX < 210) this.setVelocityX(-18)
    if (this.label) this.label.x = this.x
    if (this.kind === 'falling' && this.x - frontX < 160) {
      this.hazardTime += delta
      this.warning?.setAlpha(Math.floor(this.hazardTime / 120) % 2 ? 1 : .5)
      if (this.hazardTime > 1000) {
        const body = this.body as Phaser.Physics.Arcade.Body
        body.enable = true
        this.y = Math.min(GROUND_Y, this.y + delta * .18)
        body.updateFromGameObject()
        if (this.y >= GROUND_Y) this.warning?.setVisible(false)
      }
    }
  }
  destroy(fromScene?: boolean): void { this.label?.destroy(); this.warning?.destroy(); super.destroy(fromScene) }
}
