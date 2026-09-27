import Phaser from 'phaser'
import { FLIGHT_CRUISE_Y, GROUND_Y, MAX_JUMP_HOLD_MS, PLAYER_X } from '../config/GameConfig'
import { feedback } from '../systems/Feedback'
import { audio } from '../systems/AudioManager'

interface Member {
  sprite: Phaser.Physics.Arcade.Sprite
  variant: number
  buffer: number
  coyote: number
  hold: number
  grounded: boolean
  jumpAt: number
  releaseAt: number
  inputDelay: number
  poseUntil: number
}
export interface PitLossResult { removed: number; leaderCaught: boolean }

/** Independent bodies follow a compact formation and a delayed history of jump commands. */
export class Horde {
  readonly group: Phaser.Physics.Arcade.Group
  private members: Member[] = []
  private anchor!: Phaser.Physics.Arcade.Sprite
  private elapsed = 0
  private held = false
  private flight = false
  private speed = 66
  giant = false
  invulnerable = false
  lost = 0
  private nextVariant = 0
  constructor(private readonly scene: Phaser.Scene, count = 1) {
    this.group = scene.physics.add.group({ allowGravity: true })
    for (let i = 0; i < count; i++) this.spawn(PLAYER_X - i * 9, GROUND_Y - 14)
  }
  get leader() { return this.members[0]?.sprite ?? this.anchor }
  get followers() { return this.members.slice(1).map(m => m.sprite) }
  get count() { return this.members.length }
  get isFlightActive() { return this.flight }
  get isGrounded() { return this.members[0]?.grounded ?? false }
  get sprites() { return this.members.map(m => m.sprite) }
  private spawn(x: number, y: number): void {
    const variant = this.nextVariant++ % 4
    const sprite = this.scene.physics.add.sprite(x, y, `z${variant}-run0`).setDepth(20 + variant)
    this.group.add(sprite)
    sprite.setGravityY(540).setMaxVelocity(150, 280)
    ;(sprite.body as Phaser.Physics.Arcade.Body).setSize(11, 23).setOffset(7, 5)
    this.members.push({ sprite, variant, buffer: 0, coyote: 0, hold: 0, grounded: false, jumpAt: -1, releaseAt: 0, inputDelay: 0, poseUntil: 0 })
    this.anchor = this.members[0].sprite
  }
  applyInput(isHeld: boolean, deltaMs: number, pressed = false): void {
    this.elapsed += deltaMs
    if (pressed || (isHeld && !this.held)) this.members.forEach(m => {
      // Replay the leader's press AND release at the same point along the path.
      // A fixed delay or shared release makes rear members land inside a cleared pit.
      m.inputDelay = Math.max(0, this.leader.x - m.sprite.x) / this.speed * 1000
      m.jumpAt = this.elapsed + m.inputDelay
      m.releaseAt = isHeld ? Infinity : m.jumpAt
    })
    if (this.held && !isHeld) this.members.forEach(m => { m.releaseAt = this.elapsed + m.inputDelay })
    this.held = isHeld
    for (const m of this.members) {
      const b = m.sprite.body as Phaser.Physics.Arcade.Body
      const grounded = b.blocked.down || b.touching.down
      if (grounded && !m.grounded && b.velocity.y >= 0) {
        m.poseUntil = this.elapsed + 85
        feedback(this.scene).burst(m.sprite.x, GROUND_Y - 2, 0x999879, 3)
        if (m === this.members[0]) audio.play('land')
      }
      m.grounded = grounded
      m.coyote = grounded ? 85 : Math.max(0, m.coyote - deltaMs)
      m.buffer = Math.max(0, m.buffer - deltaMs)
      if (m.jumpAt >= 0 && this.elapsed >= m.jumpAt) { m.buffer = 120; m.jumpAt = -1 }
      if (!this.flight && m.buffer > 0 && m.coyote > 0) {
        b.setVelocityY(-205); m.buffer = 0; m.coyote = 0; m.hold = MAX_JUMP_HOLD_MS; m.grounded = false
        if (m === this.members[0]) audio.play('jump')
      }
      if (this.flight) b.setGravityY(0).setVelocityY(Phaser.Math.Clamp((FLIGHT_CRUISE_Y - m.sprite.y) * 5, -100, 100))
      else {
        m.hold = Math.max(0, m.hold - deltaMs)
        const memberHeld = this.elapsed < m.releaseAt
        b.setGravityY(memberHeld && m.hold > 0 && b.velocity.y < 0 ? 230 : 620)
        if (!memberHeld && b.velocity.y < -135) b.setVelocityY(-135)
      }
    }
  }
  releaseInput(): void { this.held = false; this.members.forEach(m => { m.buffer = 0; m.jumpAt = -1; m.hold = 0; m.releaseAt = 0 }) }
  setForwardSpeed(speed: number): void { this.speed = speed }
  updateFlight(): void { /* Shared per-member flight update in applyInput. */ }
  setFlightActive(active: boolean): void { this.flight = active }
  update(_runPathX: number): void {
    const frontX = this.leader.x
    this.members.forEach((m, i) => {
      const b = m.sprite.body as Phaser.Physics.Arcade.Body
      const target = frontX - (i % 12) * 10 - Math.floor(i / 12) * 2
      b.setVelocityX(this.speed + Phaser.Math.Clamp((target - m.sprite.x) * 3, -25, 25))
      const pose = this.flight ? 'jump' : m.poseUntil > this.elapsed ? 'land' : !m.grounded ? (b.velocity.y < 0 ? 'jump' : 'fall') : `run${Math.floor(this.elapsed / 90 + i * 1.7) % 6}`
      m.sprite.setTexture(`z${m.variant}-${pose}`).setScale(this.giant ? 1.35 : 1).setDepth(20 + i % 3)
      if (this.invulnerable && Math.floor(this.elapsed / 100) % 2 === 0) m.sprite.setTint(0xffeaa0)
      else m.sprite.clearTint()
    })
  }
  addZombie(): number {
    if (!this.count) return 0
    const i = this.count
    this.spawn(this.leader.x - (i % 12) * 10 - Math.floor(i / 12) * 2, this.leader.y)
    const m = this.members[this.members.length - 1]
    m.sprite.setVelocity(this.speed, (this.leader.body as Phaser.Physics.Arcade.Body).velocity.y)
    m.poseUntil = this.elapsed + 100
    return this.count
  }
  removeMember(sprite: Phaser.Physics.Arcade.Sprite, cause = 'hit'): number {
    const i = this.members.findIndex(m => m.sprite === sprite)
    if (i < 0) return 0
    this.members.splice(i, 1)
    this.lost++
    feedback(this.scene).death(sprite, cause)
    if (this.members.length) { sprite.destroy(); this.anchor = this.members[0].sprite }
    else { this.anchor = sprite; sprite.disableBody(true, true) }
    return 1
  }
  removeZombies(amount: number, cause = 'hit'): number {
    let removed = 0
    for (let i = 0; i < Math.max(0, Math.floor(amount)) && this.count; i++) removed += this.removeMember(this.members[this.members.length - 1].sprite, cause)
    return removed
  }
  loseGroundedMembersInPit(left: number, right: number, _x: number, _include: boolean): PitLossResult {
    let removed = 0
    const leader = this.leader
    let leaderCaught = false
    for (const m of [...this.members]) {
      const body = m.sprite.body as Phaser.Physics.Arcade.Body
      if (m.sprite.x > left + 2 && m.sprite.x < right - 2 && body.bottom > GROUND_Y + 7) {
        leaderCaught ||= m.sprite === leader
        removed += this.removeMember(m.sprite, 'pit')
      }
    }
    return { removed, leaderCaught }
  }
  destroy(): void { this.group.destroy(true, true); this.members = [] }
}
