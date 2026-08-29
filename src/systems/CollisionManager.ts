import Phaser from 'phaser'
import {
  DAMAGE_PERCENT,
  DIVE_THRESHOLD,
  FLIGHT_COLLECTION_RADIUS,
  MAX_DAMAGE,
  MIN_DAMAGE,
} from '../config/GameConfig'
import { Civilian } from '../entities/Civilian'
import { Horde } from '../entities/Horde'
import { Obstacle } from '../entities/Obstacle'
import { Powerup } from '../entities/Powerup'
import type { ChunkSpawner } from './ChunkSpawner'
import { ScoreManager } from './ScoreManager'

interface CollisionCallbacks {
  onPopulationChanged: (count: number) => void
  onDamage: (removed: number) => void
  onFenceSmashed: () => void
  onFlightCollected: () => void
}

export class CollisionManager {
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = []

  constructor(
    scene: Phaser.Scene,
    private readonly horde: Horde,
    private readonly spawner: ChunkSpawner,
    private readonly score: ScoreManager,
    private readonly callbacks: CollisionCallbacks,
  ) {
    this.colliders.push(
      scene.physics.add.collider(horde.leader, spawner.groundGroup),
      scene.physics.add.overlap(horde.leader, spawner.civilianGroup, this.handleCivilian),
      scene.physics.add.overlap(horde.leader, spawner.coinGroup, this.handleCoin),
      scene.physics.add.overlap(horde.leader, spawner.powerupGroup, this.handlePowerup),
      scene.physics.add.overlap(horde.leader, spawner.obstacleGroup, this.handleObstacle),
    )
  }

  updateFlightCollection(): void {
    if (!this.horde.isFlightActive) {
      return
    }

    const radiusSquared = FLIGHT_COLLECTION_RADIUS * FLIGHT_COLLECTION_RADIUS
    const civilians = this.spawner.civilianGroup.getChildren()
    for (const child of civilians) {
      if (child instanceof Civilian && child.active) {
        const distance = Phaser.Math.Distance.Squared(
          this.horde.leader.x,
          this.horde.leader.y,
          child.x,
          child.y,
        )
        if (distance <= radiusSquared) {
          this.collectCivilian(child)
        }
      }
    }

    const coins = this.spawner.coinGroup.getChildren()
    for (const child of coins) {
      if (child instanceof Phaser.Physics.Arcade.Image && child.active) {
        const distance = Phaser.Math.Distance.Squared(
          this.horde.leader.x,
          this.horde.leader.y,
          child.x,
          child.y,
        )
        if (distance <= radiusSquared) {
          this.collectCoin(child)
        }
      }
    }
  }

  updatePitFalls(): void {
    if (this.horde.isFlightActive) {
      return
    }

    for (const child of this.spawner.obstacleGroup.getChildren()) {
      if (
        child instanceof Obstacle &&
        child.kind === 'pit' &&
        child.active &&
        !child.isSpent
      ) {
        const result = this.horde.loseGroundedMembersInPit(
          child.leftEdge,
          child.rightEdge,
          child.x,
          !child.hasCaughtPitLeader,
        )
        if (result.leaderCaught) {
          child.markPitLeaderCaught()
        }
        if (result.removed > 0) {
          this.score.setHorde(this.horde.count)
          this.callbacks.onDamage(result.removed)
          this.callbacks.onPopulationChanged(this.horde.count)
        }
      }
    }
  }

  destroy(): void {
    for (const collider of this.colliders) {
      collider.destroy()
    }
    this.colliders.length = 0
  }

  private readonly handleCivilian: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    object1,
    object2,
  ) => {
    const civilian = object1 instanceof Civilian ? object1 : object2 instanceof Civilian ? object2 : null
    if (civilian) {
      this.collectCivilian(civilian)
    }
  }

  private readonly handleCoin: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    object1,
    object2,
  ) => {
    const coin =
      object1 instanceof Phaser.Physics.Arcade.Image
        ? object1
        : object2 instanceof Phaser.Physics.Arcade.Image
          ? object2
          : null
    if (coin) {
      this.collectCoin(coin)
    }
  }

  private readonly handlePowerup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    object1,
    object2,
  ) => {
    const powerup = object1 instanceof Powerup ? object1 : object2 instanceof Powerup ? object2 : null
    if (powerup?.consume()) {
      this.callbacks.onFlightCollected()
    }
  }

  private readonly handleObstacle: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    object1,
    object2,
  ) => {
    const obstacle = object1 instanceof Obstacle ? object1 : object2 instanceof Obstacle ? object2 : null
    if (obstacle) {
      if (obstacle.kind === 'pit') {
        return
      }
      this.resolveObstacle(obstacle)
    }
  }

  private resolveObstacle(obstacle: Obstacle): void {
    if (obstacle.isSpent) {
      return
    }

    if (this.horde.isFlightActive && !obstacle.isAerial) {
      obstacle.markSpent(false)
      return
    }

    const leaderBody = this.horde.leader.body as Phaser.Physics.Arcade.Body
    if (obstacle.isSmashable && leaderBody.velocity.y >= DIVE_THRESHOLD) {
      obstacle.markSpent(true)
      this.score.addBonus(25)
      this.callbacks.onFenceSmashed()
      return
    }

    if (!obstacle.markSpent(false)) {
      return
    }

    const baseDamage = Phaser.Math.Clamp(
      Math.round(this.horde.count * DAMAGE_PERCENT),
      MIN_DAMAGE,
      MAX_DAMAGE,
    )
    const damage = Phaser.Math.Clamp(
      Math.round(baseDamage * obstacle.damageMultiplier),
      MIN_DAMAGE,
      this.horde.count,
    )
    const removed = this.horde.removeZombies(damage)
    this.score.setHorde(this.horde.count)
    this.callbacks.onDamage(removed)
    this.callbacks.onPopulationChanged(this.horde.count)
  }

  private collectCivilian(civilian: Civilian): void {
    if (!civilian.consume()) {
      return
    }
    const count = this.horde.addZombie()
    this.score.recordAbsorption(count)
    this.callbacks.onPopulationChanged(count)
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Image): void {
    if (!coin.active) {
      return
    }
    coin.disableBody(true, true)
    this.score.collectCoin()
  }
}
