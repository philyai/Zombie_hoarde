import Phaser from 'phaser'
import {
  DIVE_THRESHOLD,
  FLIGHT_COLLECTION_RADIUS,
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
import { LARGE_VEHICLES, sweptHit } from '../entities/ObstacleGeometry'

interface CollisionCallbacks {
  onPopulationChanged: (count: number) => void
  onDamage: (removed: number) => void
  onFenceSmashed: () => void
  onFlightCollected: (kind: PowerupKind) => void
  onMission: (title: string) => void
}

export class CollisionManager {
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = []
  private readonly debug = import.meta.env.DEV && new URLSearchParams(location.search).has('debug')
  private readonly debugIds = new WeakMap<object, number>()
  private nextDebugId = 1

  /** The marker and resolver share the live member registry, including existing powers. */
  private canPush(obstacle:Obstacle):boolean {
    return this.powers.has('rage') || this.horde.count * (this.powers.has('giant') ? 2 : 1) >= obstacle.requirement
  }

  private trace(obstacle:Obstacle,member:Phaser.Physics.Arcade.Sprite,decision:string,before=this.horde.count):void {
    if(!this.debug)return
    const id=(object:object)=>{let value=this.debugIds.get(object);if(!value){value=this.nextDebugId++;this.debugIds.set(object,value)}return value}
    console.debug('[obstacle]',{obstacle:obstacle.kind,obstacleId:id(obstacle),zombieId:id(member),
      timestamp:this.scene.time.now,handler:'CollisionManager',required:obstacle.requirement,
      hordeBefore:before,hordeAfter:this.horde.count,state:obstacle.interactionState,decision})
  }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly horde: Horde,
    private readonly spawner: ChunkSpawner,
    private readonly score: ScoreManager,
    private readonly callbacks: CollisionCallbacks,
    private readonly powers: PowerupManager,
  ) {
    this.colliders.push(
      scene.physics.add.collider(horde.group, spawner.groundGroup, (member,ground)=>{
        const sprite=member as Phaser.Physics.Arcade.Sprite,body=sprite.body as Phaser.Physics.Arcade.Body
        const surface=(ground as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody
        if(body.blocked.right&&body.bottom>surface.top+5&&this.horde.contains(sprite))this.loseMember(sprite,'hit')
      }),
      scene.physics.add.collider(horde.group, spawner.surfaceGroup, undefined, (member, roof) => {
        const body = (member as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body
        const surface = (roof as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody
        return body.velocity.y >= 0 && body.prev.y + body.height <= surface.top + 4
      }),
      scene.physics.add.overlap(horde.group, spawner.civilianGroup, this.handleCivilian),
      scene.physics.add.overlap(horde.group, spawner.coinGroup, this.handleCoin),
      scene.physics.add.overlap(horde.group, spawner.powerupGroup, this.handlePowerup),
    )
    scene.physics.world.on('worldstep', this.checkObstacles, this)
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
          child.fallY,
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

  private participants(obstacle:Obstacle):Phaser.Physics.Arcade.Sprite[]{
    const face=obstacle.push!.face
    const candidates=this.horde.sprites.filter(s=>{
      const b=s.body as Phaser.Physics.Arcade.Body
      return s.x<=face+12&&s.x>=face-140&&Math.abs(b.bottom-obstacle.y)<8&&!this.horde.isAirborne(s,obstacle.y)
    }).sort((a,b)=>b.x-a.x)
    const connected:Phaser.Physics.Arcade.Sprite[]=[];let previous=face
    for(const sprite of candidates){if(previous-sprite.x>24)break;connected.push(sprite);previous=sprite.x}
    return connected
  }

  update(delta:number):void{
    for(const child of this.spawner.obstacleGroup.getChildren()){
      const obstacle=child as Obstacle
      if(!obstacle.active||obstacle.isSpent)continue
      obstacle.updateRequirement(this.horde.count,this.canPush(obstacle))
      const push=obstacle.push;if(!push)continue
      if(this.horde.isFlightActive){obstacle.push=undefined;obstacle.setAngle(0);this.horde.setPush();continue}
      const members=this.participants(obstacle)
      // Readiness can improve during the struggle; an accepted success never downgrades.
      if(this.canPush(obstacle))push.decision='success'
      if(!members.length&&push.decision==='failure'){obstacle.push=undefined;obstacle.setAngle(0);this.horde.setPush();continue}
      push.elapsed+=delta;obstacle.setAngle(Math.sin(push.elapsed/28)*1.2)
      if(Math.floor(push.elapsed/90)!==Math.floor((push.elapsed-delta)/90))feedback(this.scene).burst(push.face,obstacle.y-2,0xb0a381,3)
      if(push.elapsed<push.duration)continue
      const enough=push.decision==='success'
      obstacle.setAngle(0);obstacle.push=undefined;this.horde.setPush()
      if(enough)this.smash(obstacle,push.contact)
      else {
        // Only the bodies compressed against the face fail; separated members are untouched.
        for(const member of members)if((member.body as Phaser.Physics.Arcade.Body).right>=push.face-9){const before=this.horde.count;this.loseMember(member,'hit');this.trace(obstacle,member,'failed-push-damage',before)}
        feedback(this.scene).popup(push.face,obstacle.y-obstacle.height-30,'PUSH FAILED',0xffc396)
      }
    }
  }

  destroy(): void {
    this.scene.physics.world?.off('worldstep', this.checkObstacles, this)
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

  private checkObstacles(): void {
    if (!this.horde.count) return
    for (const child of this.spawner.obstacleGroup.getChildren()) {
      const obstacle = child as Obstacle
      if (!obstacle.active || obstacle.isSpent || obstacle.kind === 'pit' || !(obstacle.body as Phaser.Physics.Arcade.Body).enable) continue
      if(obstacle.rightEdge<this.horde.leader.x-175||obstacle.leftEdge>this.horde.leader.x+180)continue
      if (this.horde.isFlightActive && !obstacle.isAerial) continue
      const leader = this.horde.leader
      // An earlier terrain jump must not permanently poison a later grounded approach.
      if(!obstacle.push&&obstacle.intent==='jump'&&leader.x<obstacle.leftEdge&&!this.horde.isAirborne(leader,obstacle.y))obstacle.intent=null
      if (obstacle.isSmashable && !obstacle.push && obstacle.intent === null && leader.x > obstacle.leftEdge - 90 && leader.x < obstacle.rightEdge && this.horde.isAirborne(leader,obstacle.y)) obstacle.intent = 'jump'
      for (const member of [...this.horde.sprites]) {
        if (obstacle.isSpent || !this.horde.contains(member)) break
        const body = member.body as Phaser.Physics.Arcade.Body
        const current = { x: body.x, y: body.y, width: body.width, height: body.height }
        const previous = { ...current, x: body.prev.x, y: body.prev.y }
        if (obstacle.collisionZones.some(zone => {
          // Walking off a supporting roof can sweep a fractional corner after gravity resumes.
          // Arcade already resolves top landings; do not reinterpret that departure as a side hit.
          if(zone.roof&&previous.y+previous.height<=zone.y+.5&&body.velocity.y>=0&&
            (current.y+current.height<=zone.y+.5||current.x>=zone.x+zone.width))return false
          return sweptHit(previous,current,zone)
        })) this.resolveObstacle(obstacle, member)
      }
    }
  }

  private resolveObstacle(obstacle: Obstacle, member: Phaser.Physics.Arcade.Sprite): void {
    if (obstacle.isSpent || !this.horde.contains(member)) {
      return
    }

    if (this.horde.isFlightActive && !obstacle.isAerial) {
      return
    }

    const memberBody = member.body as Phaser.Physics.Arcade.Body
    if(obstacle.kind==='mine'){this.explodeMine(obstacle);return}
    // A grounded push owns this obstacle before any subsequent member callback runs.
    // In particular a rising/overlapping follower cannot fall through to lethal damage.
    if(obstacle.push){
      if(this.canPush(obstacle))obstacle.push.decision='success'
      memberBody.x=Math.min(memberBody.x,obstacle.push.face-memberBody.width);memberBody.setVelocityX(0)
      this.trace(obstacle,member,'push-contact');return
    }
    if(obstacle.isSmashable&&obstacle.intent!=='jump'&&!this.horde.isAirborne(member,obstacle.y)){
      if(!obstacle.push){
        const zones=obstacle.collisionZones.filter(z=>memberBody.bottom>z.y&&memberBody.y<z.y+z.height)
        const face=Math.min(...zones.map(z=>z.x))
        obstacle.push={decision:this.canPush(obstacle)?'success':'failure',elapsed:0,duration:Math.max(280,520-this.score.distance*.08),face,contact:member}
        obstacle.setVelocityX(0);this.horde.setPush(face,obstacle.y)
        this.trace(obstacle,member,'start-'+obstacle.push.decision)
      }
      memberBody.x=Math.min(memberBody.x,obstacle.push.face-memberBody.width);memberBody.setVelocityX(0)
      return
    }
    if (this.powers.has('rage') || (obstacle.kind === 'fence' && memberBody.velocity.y >= DIVE_THRESHOLD)) {
      this.smash(obstacle,member);return
    }
    const before=this.horde.count
    this.loseMember(member,obstacle.kind==='electric'?'electric':'hit')
    this.trace(obstacle,member,'individual-hit',before)
  }

  private smash(obstacle:Obstacle,member:Phaser.Physics.Arcade.Sprite):void{
      if(!obstacle.markSpent(true))return
      obstacle.intent = 'smash'
      this.trace(obstacle,member,'break-success')
      const large = obstacle.isLarge ? LARGE_VEHICLES[obstacle.kind as 'bus' | 'airplane'] : undefined
      const reward = large?.score ?? (obstacle.requirement ? 100 : 25)
      this.score.addBonus(reward)
      const fx = feedback(this.scene)
      fx.burst(member.x, member.y, 0xdab57d, large ? 20 : 12)
      fx.burst(member.x + 18, member.y - 15, 0xb6d7cc, large ? 14 : 4)
      fx.popup(member.x, member.y - 38, `+${reward} SMASH`, 0xf2d58b)
      const wreck = this.scene.add.image(obstacle.x, obstacle.y, obstacle.texture.key).setOrigin(.5,1).setDepth(15)
      if (obstacle.kind === 'airplane') {
        fx.burst(member.x + 40, member.y - 36, 0x7b8981, 18)
        this.scene.tweens.add({targets:wreck,x:obstacle.x+7,angle:-3,duration:80,yoyo:true,repeat:1,onComplete:()=>{
          this.scene.tweens.add({targets:wreck,x:obstacle.x+45,y:obstacle.y+90,angle:13,alpha:0,duration:850,onComplete:()=>wreck.destroy()})
        }})
        fx.shake(.009); audio.play('heavy')
      } else {
        this.scene.tweens.add({targets:wreck,y:obstacle.y-35,x:obstacle.x+35,angle:large?125:170,alpha:0,duration:large?800:550,onComplete:()=>wreck.destroy()})
        fx.shake(large?.006:.003); audio.play('smash')
      }
      if (obstacle.requirement >= 3) {
        for (let i = 0; i < (large?.passengers ?? 0); i++) {
          this.horde.addZombie(); this.score.recordAbsorption(this.horde.count); this.progress('infected')
        }
        if (large) this.score.awardCoins(obstacle.kind === 'airplane' ? 15 : 5)
        this.progress('vehicles')
        this.callbacks.onPopulationChanged(this.horde.count)
      }
      if(!large)this.callbacks.onFenceSmashed()
  }

  private loseMember(member:Phaser.Physics.Arcade.Sprite,cause:string):void{
    const removed = this.horde.removeMember(member,cause)
    this.score.setHorde(this.horde.count)
    this.callbacks.onDamage(removed)
    this.callbacks.onPopulationChanged(this.horde.count)
  }

  private explodeMine(mine:Obstacle):void{
    if(!mine.markSpent(true))return
    const x=mine.x,y=mine.y-3,radius=26,fx=feedback(this.scene)
    fx.burst(x,y,0xffd28a,18);fx.burst(x,y-8,0x829084,10);fx.shake(.005);audio.play('heavy')
    const flash=this.scene.add.image(x,y,'pixel').setDisplaySize(18,18).setTint(0xffe7a1).setDepth(40)
    this.scene.tweens.add({targets:flash,scaleX:18,scaleY:18,alpha:0,duration:130,onComplete:()=>flash.destroy()})
    for(const member of [...this.horde.sprites]){
      const body=member.body as Phaser.Physics.Arcade.Body
      const dx=x-Phaser.Math.Clamp(x,body.left,body.right),dy=y-Phaser.Math.Clamp(y,body.top,body.bottom)
      if(dx*dx+dy*dy<=radius*radius&&!this.powers.has('rage'))this.loseMember(member,'hit')
    }
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
