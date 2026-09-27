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
import { feedback } from './Feedback'
import { audio } from './AudioManager'
import { saveManager } from './SaveManager'
import type { PowerupKind } from '../entities/Powerup'
import type { PowerupManager } from './PowerupManager'

interface CollisionCallbacks {
  onPopulationChanged: (count: number) => void
  onDamage: (removed: number) => void
  onFenceSmashed: () => void
  onFlightCollected: (kind: PowerupKind) => void
  onMission: (title: string) => void
}

export class CollisionManager {
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = []

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly horde: Horde,
    private readonly spawner: ChunkSpawner,
    private readonly score: ScoreManager,
    private readonly callbacks: CollisionCallbacks,
    private readonly powers: PowerupManager,
  ) {
    this.colliders.push(
      scene.physics.add.collider(horde.group, spawner.groundGroup),
      scene.physics.add.overlap(horde.group, spawner.civilianGroup, this.handleCivilian),
      scene.physics.add.overlap(horde.group, spawner.coinGroup, this.handleCoin),
      scene.physics.add.overlap(horde.group, spawner.powerupGroup, this.handlePowerup),
      scene.physics.add.overlap(horde.group, spawner.obstacleGroup, this.handleObstacle),
    )
  }

  updateFlightCollection(): void {
    if (!this.horde.isFlightActive || !this.horde.count) {
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
    if (this.horde.count && powerup?.consume()) {
      this.callbacks.onFlightCollected(powerup.kind)
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
    if (obstacle.isSpent || this.horde.count === 0) {
      return
    }

    if (this.horde.isFlightActive && !obstacle.isAerial) {
      obstacle.markSpent(false)
      return
    }

    const leaderBody = this.horde.leader.body as Phaser.Physics.Arcade.Body
    const enoughHorde = obstacle.requirement > 0 && this.horde.count * (this.powers.has('giant') ? 2 : 1) >= obstacle.requirement
    if (this.powers.has('rage') || enoughHorde || (obstacle.kind === 'fence' && leaderBody.velocity.y >= DIVE_THRESHOLD)) {
      obstacle.markSpent(true)
      this.score.addBonus(obstacle.requirement ? 100 : 25)
      const fx = feedback(this.scene)
      fx.burst(obstacle.x, obstacle.y - 12, 0xdab57d, 18)
      fx.popup(obstacle.x, obstacle.y - 38, '+100 SMASH', 0xf2d58b)
      const wreck = this.scene.add.image(obstacle.x, obstacle.y - 10, obstacle.texture.key).setDepth(15)
      this.scene.tweens.add({targets:wreck,y:obstacle.y-40,x:obstacle.x+35,angle:170,alpha:0,duration:550,onComplete:()=>wreck.destroy()})
      audio.play('smash')
      if (obstacle.requirement >= 3) {
        this.horde.addZombie(); this.score.recordAbsorption(this.horde.count)
        this.progress('vehicles'); this.progress('infected')
        this.callbacks.onPopulationChanged(this.horde.count)
      }
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
    const removed = this.horde.removeZombies(damage, obstacle.kind === 'electric' ? 'electric' : 'hit')
    this.score.setHorde(this.horde.count)
    this.callbacks.onDamage(removed)
    this.callbacks.onPopulationChanged(this.horde.count)
  }

  private collectCivilian(civilian: Civilian): void {
    if (!this.horde.count || !civilian.consume()) {
      return
    }
    const count = this.horde.addZombie()
    this.score.recordAbsorption(count)
    feedback(this.scene).burst(civilian.x, civilian.y - 12, 0xb2d87f)
    feedback(this.scene).popup(civilian.x, civilian.y - 32, '+1 FRIEND')
    const bite = this.scene.add.image(civilian.x, civilian.y - 14, 'z0-bite').setDepth(40)
    this.scene.tweens.add({ targets: bite, y: bite.y - 8, alpha: 0, duration: 240, onComplete: () => bite.destroy() })
    audio.play('convert'); this.progress('infected')
    this.callbacks.onPopulationChanged(count)
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Image): void {
    if (!coin.active || !this.horde.count) {
      return
    }
    coin.disableBody(true, true)
    const bonus = (this.score.coinPickups + 1) % 5 === 0 ? saveManager.load().upgrades.coins : 0
    this.score.collectCoin((this.powers.has('boost') ? 2 : 1) + bonus)
    feedback(this.scene).burst(coin.x, coin.y, 0xf5d77b, 4)
    audio.play('coin'); this.progress('coins')
  }

  private progress(id: string): void { for (const title of saveManager.progress(id)) this.callbacks.onMission(title) }
}
