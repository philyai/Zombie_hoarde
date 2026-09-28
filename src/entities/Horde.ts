import Phaser from 'phaser'
import { GROUND_Y, PLAYER_X } from '../config/GameConfig'
import { JUMP } from '../config/Traversal'
import { feedback } from '../systems/Feedback'
import { audio } from '../systems/AudioManager'

interface Member {
  sprite: Phaser.Physics.Arcade.Sprite
  variant: number
  buffer: number
  coyote: number
  hold: number
  grounded: boolean
  commands: JumpCommand[]
  jump?: JumpCommand
  poseUntil: number
}
interface JumpCommand { x: number; releaseX: number }
export type FlightPhase = 'takeoff' | 'cruise' | 'landing'
export interface PitLossResult { removed: number; leaderCaught: boolean }

/** Independent bodies follow a compact formation and a delayed history of jump commands. */
export class Horde {
  readonly group: Phaser.Physics.Arcade.Group
  private members: Member[] = []
  private anchor!: Phaser.Physics.Arcade.Sprite
  private elapsed = 0
  private held = false
  private flight = false
  flightPhase: FlightPhase = 'takeoff'
  private command?: JumpCommand
  private recentCommands: JumpCommand[] = []
  private speed = 66
  private pushing?:{face:number;groundY:number}
  giant = false
  invulnerable = false
  lost = 0
  private nextVariant = 0
  constructor(private readonly scene: Phaser.Scene, count = 1) {
    this.group = scene.physics.add.group({ allowGravity: true })
    for (let i = 0; i < count; i++) this.spawn(PLAYER_X - (i % 12) * 10 - Math.floor(i / 12) * 2, GROUND_Y - 14)
  }
  get leader() { return this.members[0]?.sprite ?? this.anchor }
  get followers() { return this.members.slice(1).map(m => m.sprite) }
  get count() { return this.members.length }
  get isFlightActive() { return this.flight }
  get isGrounded() { return this.members[0]?.grounded ?? false }
  get sprites() { return this.members.map(m => m.sprite) }
  get allGrounded() { return this.members.length > 0 && this.members.every(m => { const b=m.sprite.body as Phaser.Physics.Arcade.Body; return b.blocked.down || b.touching.down }) }
  contains(sprite: Phaser.Physics.Arcade.Sprite): boolean { return this.members.some(m => m.sprite === sprite) }
  isAirborne(sprite: Phaser.Physics.Arcade.Sprite,groundY=GROUND_Y): boolean {
    const body = sprite.body as Phaser.Physics.Arcade.Body
    return body.bottom < groundY - 5 || body.velocity.y < -10
  }
  setPush(face?:number,groundY=GROUND_Y):void{this.pushing=face===undefined?undefined:{face,groundY}}
  private spawn(x: number, y: number): void {
    const variant = this.nextVariant++ % 4
    const sprite = this.scene.physics.add.sprite(x, y, `z${variant}-run0`).setDepth(20 + variant)
    this.group.add(sprite)
    sprite.setGravityY(540).setMaxVelocity(150, 280)
    ;(sprite.body as Phaser.Physics.Arcade.Body).setSize(11, 23).setOffset(7, 5)
    this.members.push({ sprite, variant, buffer: 0, coyote: 0, hold: 0, grounded: false, commands: this.recentCommands.filter(c => c.x > x), poseUntil: 0 })
    this.anchor = this.members[0].sprite
  }
  applyInput(isHeld: boolean, deltaMs: number, pressed = false): void {
    this.elapsed += deltaMs
    if (!this.flight && (pressed || (isHeld && !this.held))) {
      this.command = { x: this.leader.x, releaseX: isHeld ? Infinity : this.leader.x }
      this.recentCommands.push(this.command)
      this.members.forEach(m => m.commands.push(this.command!))
    }
    if (this.held && !isHeld && this.command) this.command.releaseX = this.leader.x
    this.recentCommands = this.recentCommands.filter(c => c.x >= this.leader.x - 200)
    this.held = isHeld
    for (const [index, m] of this.members.entries()) {
      const b = m.sprite.body as Phaser.Physics.Arcade.Body
      const grounded = b.blocked.down || b.touching.down
      if (grounded && !m.grounded && b.velocity.y >= 0) {
        m.poseUntil = this.elapsed + 85
        feedback(this.scene).burst(m.sprite.x, b.bottom - 2, 0x999879, 3)
        if (m === this.members[0]) audio.play('land')
      }
      m.grounded = grounded
      m.coyote = grounded ? 85 : Math.max(0, m.coyote - deltaMs)
      m.buffer = Math.max(0, m.buffer - deltaMs)
      // Consume a follower command in the frame that crosses its position, rather than one frame late.
      const nextX=m.sprite.x+Math.max(0,b.velocity.x)*deltaMs/1000
      if (m.commands[0] && nextX >= m.commands[0].x - .01) { m.jump = m.commands.shift(); m.buffer = 120 }
      if (!this.flight && m.buffer > 0 && m.coyote > 0) {
        b.setVelocityY(-JUMP.speed); m.buffer = 0; m.coyote = 0; m.hold = JUMP.holdMs; m.grounded = false
        if (m === this.members[0]) audio.play('jump')
      }
      if (this.flight) {
        b.setGravityY(0).setMaxVelocity(150,95)
        const ceiling = 76 + (this.giant ? 16 : 0) + index % 3 * 3, floor = 143 + index % 3 * 3
        if (this.flightPhase === 'landing') {
          // Keep light downward pressure so every body's grounded flag remains stable together.
          b.setAccelerationY(0).setVelocityY(Math.min(95, Math.max(35, (GROUND_Y - 14 - m.sprite.y) * 4)))
        } else {
          let acceleration = isHeld ? -420 : 320
          if (m.sprite.y > floor) acceleration = -600
          if (m.sprite.y < ceiling + 8 && isHeld) acceleration = (ceiling + 4 - m.sprite.y) * 25 - b.velocity.y * 8
          if (m.sprite.y > floor - 8 && !isHeld) acceleration = (floor - 4 - m.sprite.y) * 25 - b.velocity.y * 8
          b.setAccelerationY(acceleration)
          b.setVelocityY(Phaser.Math.Clamp(b.velocity.y, -95, 90))
        }
      }
      else {
        b.setAccelerationY(0).setMaxVelocity(150,JUMP.terminal)
        m.hold = Math.max(0, m.hold - deltaMs)
        const memberHeld = m.jump !== undefined && m.sprite.x < m.jump.releaseX
        b.setGravityY(memberHeld && m.hold > 0 && b.velocity.y < 0 ? JUMP.riseGravity : JUMP.fallGravity)
        if (!memberHeld && b.velocity.y < -JUMP.releaseSpeed) b.setVelocityY(-JUMP.releaseSpeed)
      }
    }
  }
  releaseInput(): void {
    this.held = false
    if (this.command) this.command.releaseX = this.leader.x
    // Preserve queued follower presses across pause; only release the held key.
  }
  setForwardSpeed(speed: number): void { this.speed = speed }
  updateFlight(): void { /* Shared per-member flight update in applyInput. */ }
  setFlightActive(active: boolean): void {
    if (this.flight === active) return
    this.flight = active
    this.flightPhase = 'takeoff'
    this.command = undefined; this.recentCommands = []
    this.members.forEach(m => { m.commands = []; m.jump = undefined; m.hold = 0; m.buffer = 0; (m.sprite.body as Phaser.Physics.Arcade.Body).setAccelerationY(0) })
  }
  update(_runPathX: number): void {
    const frontX = this.leader.x
    this.members.forEach((m, i) => {
      const b = m.sprite.body as Phaser.Physics.Arcade.Body
      const target = frontX - (i % 12) * 10 - Math.floor(i / 12) * 2
      b.setVelocityX(this.speed + Phaser.Math.Clamp((target - m.sprite.x) * 3, -25, 25))
      const pushing=this.pushing&&!this.flight&&!this.isAirborne(m.sprite,this.pushing.groundY)&&m.sprite.x>this.pushing.face-145
      if(pushing){const limit=this.pushing!.face-6-(i%12)*2;b.setVelocityX(Math.max(0,Math.min(this.speed,(limit-m.sprite.x)*8)))}
      const pose = this.flight ? 'jump' : pushing?'push': m.poseUntil > this.elapsed ? 'land' : !m.grounded ? (b.velocity.y < 0 ? 'jump' : 'fall') : `run${Math.floor(this.elapsed / 90 + i * 1.7) % 6}`
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
    sprite.disableBody(false, false)
    feedback(this.scene).death(sprite, cause)
    if (this.members.length) this.anchor = this.members[0].sprite
    else this.anchor = sprite
    return 1
  }
  removeZombies(amount: number, cause = 'hit'): number {
    let removed = 0
    for (let i = 0; i < Math.max(0, Math.floor(amount)) && this.count; i++) removed += this.removeMember(this.members[this.members.length - 1].sprite, cause)
    return removed
  }
  loseGroundedMembersInPit(left: number, right: number, _x: number, _include: boolean,fallY=GROUND_Y+7): PitLossResult {
    let removed = 0
    const leader = this.leader
    let leaderCaught = false
    for (const m of [...this.members]) {
      const body = m.sprite.body as Phaser.Physics.Arcade.Body
      if (m.sprite.x > left + 2 && m.sprite.x < right - 2 && body.bottom > fallY) {
        leaderCaught ||= m.sprite === leader
        removed += this.removeMember(m.sprite, 'pit')
      }
    }
    return { removed, leaderCaught }
  }
  destroy(): void { this.group.destroy(true, true); this.members = [] }
}
