import Phaser from 'phaser'
import { audio } from '../systems/AudioManager'
export const INK = 0x13292f, PAPER = 0xe8e4c6, GREEN = 0xb4d77b, MUTED = 0xa6b9ac
export function pixelText(scene: Phaser.Scene,x:number,y:number,value:string,size=8,color=PAPER): Phaser.GameObjects.BitmapText {
  return scene.add.bitmapText(Math.round(x),Math.round(y),'pixel-font',value.toUpperCase(),size).setTint(color)
}
export function panel(scene: Phaser.Scene,x:number,y:number,w:number,h:number): Phaser.GameObjects.Container {
  const g=scene.add.graphics().fillStyle(0x091b22).fillRect(-w/2+3,-h/2+4,w,h)
  g.fillStyle(0x71877b).fillRect(-w/2,-h/2,w,h).fillStyle(INK).fillRect(-w/2+2,-h/2+2,w-4,h-4)
  g.fillStyle(0x334c4b).fillRect(-w/2+4,-h/2+4,w-8,2)
  return scene.add.container(x,y,[g]).setDepth(500).setScrollFactor(0)
}
export function button(scene:Phaser.Scene,x:number,y:number,w:number,label:string,action:()=>void,primary=false,enabled=true): Phaser.GameObjects.Container {
  const c=scene.add.container(x,y).setDepth(510).setScrollFactor(0)
  const bg=scene.add.graphics(),text=pixelText(scene,0,0,label,8,primary?INK:PAPER).setOrigin(.5)
  const draw=(hover=false,pressed=false)=>{
    bg.clear().fillStyle(0x0b2027).fillRect(-w/2+2,-11+3,w,24)
    bg.fillStyle(enabled?(primary?0xb5d884:0x7f9588):0x435a57).fillRect(-w/2,-11,w,24)
    bg.fillStyle(enabled?(primary?(hover?0xcdeaa2:0xa6cb72):(hover?0x3f5e55:0x243f40)):0x203337).fillRect(-w/2+2,-9,w-4,20)
    bg.fillStyle(primary?0xcce6a4:0x526b5e).fillRect(-w/2+3,-8,w-6,1)
    text.y=pressed?1:0
  }
  draw(); c.add([bg,text]);c.setSize(Math.max(32,w),32).setInteractive({useHandCursor:enabled})
  if(!enabled)text.setTint(0x87938a)
  const fire=()=>{if(enabled){audio.unlock();audio.play('click');action()}}
  c.on('pointerover',()=>draw(true));c.on('pointerout',()=>draw());c.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();draw(true,true)})
  c.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();draw(true);fire()})
  c.setData('label',label);c.setData('activate',fire);c.setData('focus',(on:boolean)=>draw(on))
  return c
}
/** Canvas controls also support Tab/arrow focus and Enter activation. */
export function keyboardNavigation(scene:Phaser.Scene,getButtons:()=>Phaser.GameObjects.Container[]):void {
  let selected=-1
  const handler=(event:KeyboardEvent)=>{
    const list=getButtons().filter(b=>b.active && b.visible)
    if(!list.length)return
    if(['Tab','ArrowDown','ArrowUp'].includes(event.code)){
      event.preventDefault();list[selected]?.getData('focus')?.(false)
      selected=(selected+(event.shiftKey||event.code==='ArrowUp'?-1:1)+list.length)%list.length
      list[selected]?.getData('focus')?.(true)
    } else if(event.code==='Enter'&&!event.repeat){list[Math.max(0,selected)]?.getData('activate')?.()}
  }
  scene.input.keyboard?.on('keydown',handler)
  scene.events.once('shutdown',()=>scene.input.keyboard?.off('keydown',handler))
}
