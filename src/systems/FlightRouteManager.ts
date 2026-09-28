import type { Horde } from '../entities/Horde'
import type { ChunkSpawner } from './ChunkSpawner'
import { MAX_SPEED } from '../config/GameConfig'

export const FLIGHT_PATTERNS = ['line','wave','high-low','ring','zigzag'] as const
export type FlightPattern = typeof FLIGHT_PATTERNS[number]

/** Patterns have enough horizontal lead for the 95 px/s vertical controller. */
export function flightCoins(pattern:FlightPattern,start:number):{x:number;y:number}[]{
  return Array.from({length:13},(_,i)=>{
    const t=i/12
    if(pattern==='ring')return {x:start+120+85*Math.cos(t*Math.PI*2),y:111+29*Math.sin(t*Math.PI*2)}
    const y=pattern==='line'?112:pattern==='wave'?111+29*Math.sin(t*Math.PI*2):
      pattern==='high-low'?82+58*(.5-.5*Math.cos(t*Math.PI*2)):82+58*(1-Math.abs(2*t-1))
    return {x:start+i*20,y}
  })
}

export class FlightRouteManager {
  private nextX=0
  private serial=0
  private landing=false
  start(horde:Horde):void{this.nextX=horde.leader.x+90;this.landing=false;horde.flightPhase='takeoff'}
  update(horde:Horde,spawner:ChunkSpawner,remaining:number,duration:number,distance:number):void{
    if(remaining<=duration*.2){
      if(!this.landing){
        this.landing=true
        const start=Math.min(...horde.sprites.map(s=>s.x))-60
        const end=horde.leader.x+MAX_SPEED*5+180
        spawner.reserveLanding(start,end)
        for(let i=0;i<9;i++)spawner.spawnCoin(horde.leader.x+25+i*20,Math.min(205,horde.leader.y+12+i*13))
      }
      horde.flightPhase='landing'
      return
    }
    if(horde.leader.y<148)horde.flightPhase='cruise'
    if(this.nextX<horde.leader.x+300&&this.nextX+240<horde.leader.x+remaining/1000*MAX_SPEED){
      for(const p of flightCoins(FLIGHT_PATTERNS[this.serial++%FLIGHT_PATTERNS.length],this.nextX))spawner.spawnCoin(p.x,p.y)
      // One late-game drone away from the coin path; always optional to fly around.
      if(distance>=1000&&this.serial%3===0)spawner.spawnDefinition({kind:'drone',offsetX:this.nextX+280,y:83},0)
      this.nextX+=310
    }
  }
}
