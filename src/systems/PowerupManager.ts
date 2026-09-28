import Phaser from 'phaser'
import type { PowerupKind } from '../entities/Powerup'
import type { Horde } from '../entities/Horde'
import type { ChunkSpawner } from './ChunkSpawner'
import { saveManager } from './SaveManager'
import { feedback } from './Feedback'
import { audio } from './AudioManager'
import { FlightRouteManager } from './FlightRouteManager'
export class PowerupManager {
  readonly active = new Map<PowerupKind, { remaining:number; duration:number }>()
  private route=new FlightRouteManager()
  private distance=0
  constructor(private scene:Phaser.Scene,private horde:Horde){}
  activate(kind:PowerupKind):void{
    const upgrades=saveManager.load().upgrades
    const duration=(kind==='flight'?10000:6000)+(kind==='magnet'?upgrades.magnet:kind==='rage'?upgrades.rage:0)*2000
    this.active.set(kind,{remaining:duration,duration});this.sync()
    if(kind==='flight')this.route.start(this.horde)
    audio.play('power');feedback(this.scene).burst(this.horde.leader.x,this.horde.leader.y,0xf5d98b,16)
    feedback(this.scene).popup(this.horde.leader.x,this.horde.leader.y-28,`${kind.toUpperCase()}!`)
  }
  has(kind:PowerupKind):boolean{return this.active.has(kind)}
  private sync():void{this.horde.setFlightActive(this.has('flight'));this.horde.giant=this.has('giant');this.horde.invulnerable=this.has('rage')}
  update(delta:number,spawner:ChunkSpawner,distance=this.distance):void{
    this.distance=distance
    for(const [kind,effect] of this.active){
      effect.remaining=Math.max(0,effect.remaining-delta)
      if(kind==='flight'){
        this.route.update(this.horde,spawner,effect.remaining,effect.duration,distance)
        if(effect.remaining>0||!this.horde.allGrounded||!this.horde.sprites.every(s=>spawner.isSafeLanding(s.x)))continue
      }
      if(effect.remaining<=0){this.active.delete(kind);feedback(this.scene).popup(this.horde.leader.x,this.horde.leader.y-25,`${kind} END`,0xcac5a4)}
    }
    this.sync()
    if(this.has('magnet'))for(const child of spawner.coinGroup.getChildren()){
      const coin=child as Phaser.Physics.Arcade.Image
      if(!coin.active)continue
      const target=this.horde.sprites.reduce((a,b)=>Math.abs(b.x-coin.x)<Math.abs(a.x-coin.x)?b:a,this.horde.leader)
      if(Phaser.Math.Distance.Between(coin.x,coin.y,target.x,target.y)<100){const t=Math.min(1,delta/100);coin.setPosition(Phaser.Math.Linear(coin.x,target.x,t),Phaser.Math.Linear(coin.y,target.y,t));coin.body?.updateFromGameObject()}
    }
    if(this.active.size && Math.random()<delta/70)feedback(this.scene).burst(this.horde.leader.x-8,this.horde.leader.y, this.has('rage')?0xf1bc73:0xb9d890,1)
  }
}
