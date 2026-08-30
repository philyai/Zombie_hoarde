import Phaser from 'phaser'
import {
  DROP_ACCELERATION,
  FOLLOWER_SPACING,
  GROUND_Y,
  HOVER_CEILING_Y,
  HISTORY_SAMPLE_DISTANCE,
  LEADER_GRAVITY,
  MAX_JUMP_HOLD_MS,
  MAX_SPEED,
  MAX_FALL_SPEED,
  MAX_RISE_SPEED,
  MAX_VISIBLE_FOLLOWERS,
  PLAYER_X,
  PIT_GROUNDED_TOLERANCE,
  RISE_ACCELERATION,
  START_HORDE_SIZE,
  TEXTURES,
  FLIGHT_CRUISE_Y,
} from '../config/GameConfig'

interface HistoryPoint {
  pathX: number
  y: number
}

export interface PitLossResult {
  removed: number
  leaderCaught: boolean
}

export class Horde {
  readonly leader: Phaser.Physics.Arcade.Sprite
  readonly followers: Phaser.GameObjects.Image[] = []

  private readonly history: HistoryPoint[]
  private historyWriteIndex = 0
  private nextHistorySampleX = PLAYER_X + HISTORY_SAMPLE_DISTANCE
  private population = START_HORDE_SIZE
  private flightActive = false
  private jumpInputHeld = false
  private jumpHoldElapsedMs = 0
  private jumpSpent = false
  private forwardSpeed = 0

  constructor(private readonly scene: Phaser.Scene) {
    this.leader = scene.physics.add
      .sprite(PLAYER_X, GROUND_Y - 16, TEXTURES.LEADER)
      .setDepth(20)
      .setCollideWorldBounds(true)

    this.leader.setGravityY(LEADER_GRAVITY)
    this.leader.setMaxVelocity(MAX_SPEED, MAX_FALL_SPEED)
    this.leader.setAccelerationY(DROP_ACCELERATION)

    const historySize = Math.ceil(
      (MAX_VISIBLE_FOLLOWERS * FOLLOWER_SPACING) / HISTORY_SAMPLE_DISTANCE + 24,
    )
    this.history = Array.from({ length: historySize }, () => ({
      pathX: PLAYER_X,
      y: this.leader.y,
    }))

    this.updateCollisionBody()
  }

  get count(): number {
    return this.population
  }

  get isFlightActive(): boolean {
    return this.flightActive
  }

  get isGrounded(): boolean {
    const body = this.body
    return body.blocked.down || body.touching.down || (body.bottom >= GROUND_Y - 1 && body.velocity.y >= 0)
  }

  applyInput(isHeld: boolean, deltaMs: number): void {
    if (this.population === 0 || this.flightActive) {
      return
    }

    const body = this.body
    body.setGravityY(LEADER_GRAVITY)

    if (!isHeld) {
      this.jumpInputHeld = false
      this.jumpHoldElapsedMs = 0
      this.jumpSpent = false
      this.startFastDrop()
      return
    }

    if (!this.jumpInputHeld) {
      this.jumpInputHeld = true
      this.jumpHoldElapsedMs = 0
    }

    this.jumpHoldElapsedMs += Math.max(0, deltaMs)
    if (this.jumpHoldElapsedMs >= MAX_JUMP_HOLD_MS || this.leader.y <= HOVER_CEILING_Y) {
      this.jumpSpent = true
    }

    if (this.jumpSpent) {
      this.startFastDrop()
      return
    }

    this.leader.setAccelerationY(-RISE_ACCELERATION)
    body.velocity.y = Phaser.Math.Clamp(body.velocity.y, -MAX_RISE_SPEED, MAX_FALL_SPEED)
  }

  setForwardSpeed(speed: number): void {
    this.forwardSpeed = speed
    if (this.population > 0) {
      this.leader.setVelocityX(speed)
    }
  }

  updateFlight(): void {
    if (!this.flightActive || this.population === 0) {
      return
    }

    const targetVelocity = Phaser.Math.Clamp((FLIGHT_CRUISE_Y - this.leader.y) * 5, -80, 80)
    this.leader.setVelocityY(targetVelocity)
  }

  setFlightActive(active: boolean): void {
    if (this.flightActive === active || this.population === 0) {
      return
    }

    this.flightActive = active
    this.jumpInputHeld = false
    this.jumpHoldElapsedMs = 0
    this.jumpSpent = false
    this.leader.setGravityY(active ? 0 : LEADER_GRAVITY)
    this.leader.setAccelerationY(active ? 0 : DROP_ACCELERATION)
    if (active) {
      this.leader.setVelocityY(Math.min(this.body.velocity.y, 0))
    }
  }

  update(runPathX: number): void {
    while (runPathX >= this.nextHistorySampleX) {
      const point = this.history[this.historyWriteIndex]
      point.pathX = this.nextHistorySampleX
      point.y = this.leader.y
      this.historyWriteIndex = (this.historyWriteIndex + 1) % this.history.length
      this.nextHistorySampleX += HISTORY_SAMPLE_DISTANCE
    }

    for (let index = 0; index < this.followers.length; index += 1) {
      const delay = Math.ceil(((index + 1) * FOLLOWER_SPACING) / HISTORY_SAMPLE_DISTANCE)
      const historyIndex =
        (this.historyWriteIndex - 1 - delay + this.history.length) % this.history.length
      const point = this.history[historyIndex]
      const follower = this.followers[index]

      follower.x = point.pathX - (index % 3) * 0.4
      follower.y = point.y + ((index % 5) - 2) * 0.65
    }
  }

  addZombie(): number {
    if (this.population === 0) {
      return 0
    }

    this.population += 1
    if (this.followers.length < MAX_VISIBLE_FOLLOWERS) {
      const follower = this.scene.add
        .image(this.leader.x, this.leader.y, TEXTURES.FOLLOWER)
        .setDepth(19)
      this.followers.push(follower)
    }
    this.updateCollisionBody()
    return this.population
  }

  removeZombies(amount: number): number {
    if (this.population === 0) {
      return 0
    }

    const removed = Math.min(this.population, Math.max(0, Math.floor(amount)))
    this.population -= removed
    const targetFollowers = Math.min(MAX_VISIBLE_FOLLOWERS, Math.max(0, this.population - 1))

    while (this.followers.length > targetFollowers) {
      this.followers.pop()?.destroy()
    }

    if (this.population === 0) {
      this.leader.disableBody(true, true)
    } else {
      this.updateCollisionBody()
    }

    return removed
  }

  loseGroundedMembersInPit(
    pitLeft: number,
    pitRight: number,
    pitX: number,
    includeLeader: boolean,
  ): PitLossResult {
    if (this.population === 0) {
      return { removed: 0, leaderCaught: false }
    }

    let removed = 0
    for (let index = this.followers.length - 1; index >= 0; index -= 1) {
      const follower = this.followers[index]
      const isInsidePit = follower.x > pitLeft && follower.x < pitRight
      const isGrounded =
        follower.y + follower.displayHeight * (1 - follower.originY) >=
        GROUND_Y - PIT_GROUNDED_TOLERANCE
      if (!isInsidePit || !isGrounded) {
        continue
      }

      this.createFallingZombie(follower, TEXTURES.FOLLOWER, pitX, removed)
      follower.destroy()
      this.followers.splice(index, 1)
      this.population = Math.max(0, this.population - 1)
      removed += 1
    }

    const leaderInsidePit = this.leader.x > pitLeft && this.leader.x < pitRight
    const leaderFootY =
      this.leader.y + this.leader.displayHeight * (1 - this.leader.originY)
    const leaderIsLow = leaderFootY >= GROUND_Y - PIT_GROUNDED_TOLERANCE
    const leaderCaught = includeLeader && leaderInsidePit && leaderIsLow
    if (leaderCaught && this.population > 0) {
      this.createFallingZombie(this.leader, TEXTURES.LEADER, pitX, removed)
      this.population -= 1
      removed += 1

      const targetFollowers = Math.min(
        MAX_VISIBLE_FOLLOWERS,
        Math.max(0, this.population - 1),
      )
      while (this.followers.length > targetFollowers) {
        this.followers.shift()?.destroy()
      }
    }

    if (this.population === 0) {
      this.leader.disableBody(true, true)
    } else if (removed > 0) {
      this.updateCollisionBody()
      if (leaderCaught) {
        this.body.reset(this.leader.x, GROUND_Y - 42)
        this.leader.setVelocity(this.forwardSpeed, -45)
      }
    }

    return { removed, leaderCaught }
  }

  destroy(): void {
    for (const follower of this.followers) {
      follower.destroy()
    }
    this.followers.length = 0
    this.leader.destroy()
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.leader.body as Phaser.Physics.Arcade.Body
  }

  private startFastDrop(): void {
    const body = this.body
    body.setGravityY(LEADER_GRAVITY)
    this.leader.setAccelerationY(DROP_ACCELERATION)
    body.velocity.y = Phaser.Math.Clamp(Math.max(body.velocity.y, 35), 35, MAX_FALL_SPEED)
  }

  private createFallingZombie(
    source: Phaser.GameObjects.Image | Phaser.Physics.Arcade.Sprite,
    texture: string,
    pitX: number,
    order: number,
  ): void {
    const fallingZombie = this.scene.add
      .image(source.x, source.y, texture)
      .setDepth(18)
      .setTint(0xc45b5b)

    this.scene.tweens.add({
      targets: fallingZombie,
      x: Phaser.Math.Clamp(source.x, pitX - 14, pitX + 14),
      y: this.scene.scale.height + 36 + order * 2,
      angle: (order % 2 === 0 ? 1 : -1) * 45,
      alpha: 0.15,
      duration: 500 + Math.min(order, 12) * 18,
      ease: 'Quad.easeIn',
      onComplete: () => fallingZombie.destroy(),
    })
  }

  private updateCollisionBody(): void {
    const spread = Math.sqrt(this.population)
    const width = 10 + Math.min(42, spread * 4.5)
    const height = 13 + Math.min(12, spread * 1.4)
    this.body.setSize(width, height, false)
    this.body.setOffset(10 - width, (14 - height) / 2)
  }
}
