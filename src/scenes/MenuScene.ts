import Phaser from 'phaser'
import { SCENES } from '../config/GameConfig'
import { CityWorld } from '../art/CityWorld'
import { button, keyboardNavigation, panel, pixelText, GREEN, MUTED, PAPER } from '../ui/PixelUI'
import { MISSIONS, saveManager, UPGRADES, type Upgrade } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'

export class MenuScene extends Phaser.Scene {
  private world!: CityWorld
  private runners:Phaser.GameObjects.Image[]=[]
  private buttons:Phaser.GameObjects.Container[]=[]
  private elapsed=0
  private page='home'
  constructor(){super(SCENES.MENU)}
  init(data:{page?:string}={}):void{this.page=data.page??'home'}
  create():void{
    this.elapsed=0;this.runners=[];this.buttons=[]
    this.world=new CityWorld(this);this.world.menuRoad()
    const save=saveManager.load()
    pixelText(this,16,13,`BEST ${save.bestScore}`,8,MUTED).setDepth(100)
    this.add.image(387,17,'coin0').setDepth(100)
    pixelText(this,400,13,`${save.coins}`,8,0xf4d182).setDepth(100)
    if(this.page==='home')this.home()
    else if(this.page==='upgrades')this.upgrades()
    else if(this.page==='missions')this.missions()
    else this.settings()
    keyboardNavigation(this,()=>this.buttons)
    const start=(e:KeyboardEvent)=>{if(!e.repeat&&this.page==='home'){audio.unlock();this.scene.start(SCENES.GAME)}}
    this.input.keyboard?.on('keydown-SPACE',start)
    this.events.once('shutdown',()=>this.input.keyboard?.off('keydown-SPACE',start))
    this.cameras.main.fadeIn(180,16,31,37)
  }
  private addButton(x:number,y:number,w:number,label:string,action:()=>void,primary=false,enabled=true):void{
    this.buttons.push(button(this,x,y,w,label,action,primary,enabled))
  }
  private navigate(page:string):void{this.scene.restart({page})}
  private home():void{
    pixelText(this,242,44,'ZOMBIE HORDE',24,0x122a30).setOrigin(.5).setDepth(50)
    pixelText(this,240,41,'ZOMBIE HORDE',24,PAPER).setOrigin(.5).setDepth(51)
    pixelText(this,240,68,'RUNNER',16,GREEN).setOrigin(.5).setDepth(51)
    pixelText(this,240,92,'ONE TOUCH. EVERYBODY RUNS.',8,0xd5d4b5).setOrigin(.5).setDepth(51)
    const showcase=panel(this,240,131,142,44).setDepth(6);showcase.setAlpha(.85)
    for(let i=0;i<4;i++)this.runners.push(this.add.image(202+i*23,132+(i%2)*3,`z${i}-run0`).setScale(1).setDepth(25))
    this.addButton(240,171,136,'PLAY  >',()=>this.scene.start(SCENES.GAME),true)
    this.addButton(135,207,94,'MISSIONS',()=>this.navigate('missions'))
    this.addButton(240,207,94,'UPGRADES',()=>this.navigate('upgrades'))
    this.addButton(345,207,94,'SETTINGS',()=>this.navigate('settings'))
    const m=MISSIONS.find(m=>!saveManager.load().claimed.includes(m.id))
    pixelText(this,240,240,m?`${m.detail}  ${saveManager.load().missions[m.id]}/${m.target}`:'ALL MISSIONS COMPLETE. KEEP RUNNING.',8,0xd1d7b9).setOrigin(.5).setDepth(100)
    pixelText(this,240,258,'SPACE / CLICK / TAP TO JUMP - HOLD TO GO HIGHER',8,MUTED).setOrigin(.5).setDepth(100)
  }
  private upgrades():void{
    panel(this,240,145,390,226)
    pixelText(this,240,46,'UPGRADES',16,GREEN).setOrigin(.5).setDepth(501)
    const save=saveManager.load()
    Object.entries(UPGRADES).forEach(([id,item],i)=>{
      const key=id as Upgrade,level=save.upgrades[key],cost=item.cost*(level+1),y=76+i*32
      pixelText(this,60,y,`${item.name}  ${level}/${item.max}`,8,PAPER).setDepth(501)
      pixelText(this,60,y+11,item.description,8,MUTED).setDepth(501)
      this.addButton(382,y+7,76,level>=item.max?'MAX':`${cost} BUY`,()=>{if(saveManager.purchase(key))this.navigate('upgrades')},false,level<item.max&&save.coins>=cost)
    })
    this.addButton(240,241,98,'BACK',()=>this.navigate('home'))
  }
  private missions():void{
    panel(this,240,145,350,224)
    pixelText(this,240,48,'MISSIONS',16,GREEN).setOrigin(.5).setDepth(501)
    const save=saveManager.load()
    MISSIONS.forEach((m,i)=>{
      const y=78+i*47,complete=save.claimed.includes(m.id)
      pixelText(this,82,y,m.title,8,PAPER).setDepth(501)
      pixelText(this,82,y+12,`${m.detail}  ${save.missions[m.id]}/${m.target}`,8,MUTED).setDepth(501)
      pixelText(this,397,y,complete?'DONE':`+${m.reward}`,8,GREEN).setOrigin(1,0).setDepth(501)
      this.add.rectangle(82,y+27,315,3,0x354c49).setOrigin(0).setDepth(501)
      this.add.rectangle(82,y+27,315*save.missions[m.id]/m.target,3,GREEN).setOrigin(0).setDepth(502)
    })
    pixelText(this,240,216,'REWARDS ARE BANKED AUTOMATICALLY',8,MUTED).setOrigin(.5).setDepth(501)
    this.addButton(240,240,98,'BACK',()=>this.navigate('home'))
  }
  private settings():void{
    panel(this,240,143,276,220)
    pixelText(this,240,49,'SETTINGS',16,GREEN).setOrigin(.5).setDepth(501)
    const save=saveManager.load()
    ;(['sound','music','shake'] as const).forEach((key,i)=>{
      const name={sound:'SOUND FX',music:'MUSIC',shake:'CAMERA SHAKE'}[key]
      this.addButton(240,87+i*35,222,`${name}: ${save.settings[key]?'ON':'OFF'}`,()=>{save.settings[key]=!save.settings[key];saveManager.save(save);this.navigate('settings')})
    })
    pixelText(this,240,195,'TAB + ENTER: MENU NAVIGATION',8,MUTED).setOrigin(.5).setDepth(501)
    pixelText(this,240,209,'ESC / P: PAUSE     SPACE: JUMP',8,MUTED).setOrigin(.5).setDepth(501)
    this.addButton(240,237,98,'BACK',()=>this.navigate('home'))
  }
  update(_time:number,delta:number):void{
    this.elapsed+=Math.min(delta,50);this.world.update(this.elapsed*.012,this.elapsed)
    this.runners.forEach((r,i)=>r.setTexture(`z${i}-run${Math.floor(this.elapsed/100+i*1.2)%6}`))
    audio.music(this.elapsed,true)
  }
}
