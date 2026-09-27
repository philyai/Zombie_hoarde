import Phaser from 'phaser'
import { GAME_WIDTH, GROUND_Y } from '../config/GameConfig'
export interface Biome { id:string; sky:number; haze:number; skyline:number; buildings:number; speedModifier:number; obstaclePool:string[]; civilianVariants:number[] }
export const CITY:Biome={id:'deadlight-city',sky:0x203c49,haze:0x677367,skyline:0x354f54,buildings:0x29444a,speedModifier:1,obstaclePool:['car','truck','bus','fence','spike','pit','electric','airplane','armored'],civilianVariants:[0,1,2,3,4,5]}
export class CityWorld {
  private layers:{objects:Phaser.GameObjects.Container[];ratio:number;width:number}[]=[]
  private lamps:Phaser.GameObjects.Graphics[]=[]
  constructor(private scene:Phaser.Scene,biome:Biome=CITY){
    scene.cameras.main.setBackgroundColor(biome.sky)
    const sky=scene.add.graphics().setScrollFactor(0).setDepth(-20)
    sky.fillStyle(0x41575b).fillRect(0,92,480,60).fillStyle(biome.haze).fillRect(0,152,480,80)
    // Stepped moon silhouette and crater pixels, deliberately no circles or filtered glow.
    sky.fillStyle(0xc6c8a4).fillRect(356,22,22,30).fillRect(352,27,30,20).fillRect(359,19,16,35)
    sky.fillStyle(0xabb699).fillRect(356,29,6,5).fillRect(367,39,8,6).fillRect(364,22,4,3)
    sky.fillStyle(0x839893).fillRect(360,33,3,2).fillRect(375,31,3,5)
    for(let i=0;i<28;i++)sky.fillStyle(i%3?0x718b88:0xc6c7aa).fillRect((i*79+31)%480,(i*37+11)%99,1,1)
    for(const [ratio,depth,color,base,span] of [[.06,-18,0x738780,94,480],[.15,-15,biome.skyline,191,512],[.35,-10,biome.buildings,218,512],[.65,-5,0x243e40,224,512]]){
      const objects:Phaser.GameObjects.Container[]=[]
      for(let copy=0;copy<2;copy++){
        const c=scene.add.container(copy*span,0).setDepth(depth).setScrollFactor(0),g=scene.add.graphics();c.add(g)
        if(ratio===.06){
          for(let i=0;i<5;i++){const x=i*111,y=35+(i*19)%55;g.fillStyle(color,.25).fillRect(x,y,52,3).fillRect(x+8,y-3,29,3)}
        }else if(ratio<.65){
          for(let i=0,x=0;x<span;i++){
            const w=31+(i*17)%35,h=40+(i*31+(ratio===.35?19:0))%84,y=base-h
            g.fillStyle(color).fillRect(x,y,w,h).fillRect(x+3,y-3,w-6,3)
            g.fillStyle(ratio===.35?0x52605a:0x456064).fillRect(x+2,y,w-4,2)
            if(i%3===0){g.fillStyle(color).fillRect(x+9,y-12,2,12).fillRect(x+4,y-10,13,1)}
            for(let row=0;row<h-13;row+=13)for(let col=6;col<w-4;col+=10){
              const lit=(row+col+i*7)%5===0
              g.fillStyle(lit?(ratio===.35?0xc3a46b:0x7e8a71):0x345055).fillRect(x+col,y+8+row,4,6)
              if(lit)g.fillStyle(0xe0bd7c).fillRect(x+col,y+8+row,4,1)
            }
            if(ratio===.35){g.fillStyle(0x172f36).fillRect(x+8,base-17,12,17);g.fillStyle(0x5d7168).fillRect(x+9,base-18,12,2)
              for(let brick=0;brick<5;brick++)g.fillStyle(0x40534f).fillRect(x+(brick*11)%w,base-28-brick*6,6,1)
              if(i%3===1){g.fillStyle(0x916b52).fillRect(x-3,y+24,15,25);g.fillStyle(0xd3ac72).fillRect(x-2,y+26,13,2).fillRect(x+3,y+31,3,11)}
            }
            x+=w+8
          }
        }else{
          for(let i=0;i<4;i++){
            const x=45+i*134
            g.fillStyle(0x1a3237).fillRect(x,164,3,60).fillRect(x-8,160,21,4).fillRect(x-6,158,17,2)
            g.fillStyle(0xc8b17a).fillRect(x-5,164,15,3)
            g.fillStyle(0xc3b27b,.10).fillRect(x-7,169,20,40)
            g.fillStyle(0x364d47).fillRect(x+33,213,10,11).fillRect(x+30,216,16,8)
            g.fillStyle(0x597064).fillRect(x+34,212,7,2)
            g.fillStyle(0x95765d).fillRect(x+65,211,5,13).fillRect(x+63,215,9,4)
            g.fillStyle(0x738079).fillRect(x+87,196,1,28).fillRect(x+94,197,1,27)
            for(let j=0;j<5;j++)g.fillRect(x+82,199+j*4,18,1)
          }
          this.lamps.push(g)
        }
        objects.push(c)
      }
      this.layers.push({objects,ratio,width:span})
    }
  }
  update(distance:number,time:number):void{
    for(const layer of this.layers)layer.objects.forEach((o,i)=>o.x=Math.round(i*layer.width-(distance*layer.ratio)%layer.width))
    for(const lamp of this.lamps)lamp.setAlpha(Math.floor(time/170)%37===0?.8:1)
  }
  menuRoad():void {
    for(let x=0;x<GAME_WIDTH;x+=32)this.scene.add.image(x,GROUND_Y,'ground').setOrigin(0).setDepth(5)
  }
}
