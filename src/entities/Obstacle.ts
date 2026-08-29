import Phaser from 'phaser'
import { GAME_HEIGHT, GROUND_Y, TEXTURES } from '../config/GameConfig'

export type ObstacleKind = 'fence' | 'spike' | 'pit' | 'car' | 'truck' | 'bus' | 'airplane'
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
}

const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  fence: TEXTURES.FENCE,
  spike: TEXTURES.SPIKE,
  pit: TEXTURES.PIT,
  car: TEXTURES.CAR,
  truck: TEXTURES.TRUCK,
  bus: TEXTURES.BUS,
  airplane: TEXTURES.AIRPLANE,
}

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly kind: ObstacleKind
  readonly damageMultiplier: number
  readonly category: ObstacleCategory
  private spent = false
  private pitLeaderCaught = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    kind: ObstacleKind,
    options: ObstacleOptions = {},
  ) {
    const y = options.y ?? (kind === 'pit' ? GROUND_Y : kind === 'airplane' ? 108 : GROUND_Y)
    super(scene, x, y, TEXTURE_BY_KIND[kind])

    this.kind = kind
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
    } else if (kind === 'spike') {
      body.setSize(18, 7, true)
    } else if (kind === 'fence') {
      body.setSize(12, 27, true)
    } else if (kind === 'car') {
      body.setSize(21, 10, true)
    } else if (kind === 'truck') {
      body.setSize(23, 21, true)
    } else if (kind === 'bus') {
      body.setSize(33, 22, true)
    } else {
      body.setSize(35, 12, true)
    }
  }

  get isSpent(): boolean {
    return this.spent
  }

  get isSmashable(): boolean {
    return this.kind === 'fence' || this.kind === 'car'
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
    const body = this.body as Phaser.Physics.Arcade.Body
    body.enable = false
    if (hide) {
      this.setVisible(false)
    }
    return true
  }
}
