import Phaser from 'phaser'
import { type GameOverData, SCENES } from '../config/GameConfig'
import { CityWorld } from '../art/CityWorld'
import { button, GREEN, keyboardNavigation, MUTED, panel, pixelText } from '../ui/PixelUI'
import { saveManager } from '../systems/SaveManager'
export class GameOverScene extends Phaser.Scene {
  private result!:GameOverData
  constructor(){super(SCENES.GAME_OVER)}
  init(data:GameOverData):void{this.result=data}
  create():void{
    const world=new CityWorld(this);world.menuRoad()
    panel(this,240,133,336,244)
    pixelText(this,240,32,this.result.isNewBest?'NEW BEST!':'RUN OVER',16,this.result.isNewBest?0xf3d184:0xe1a38b).setOrigin(.5).setDepth(501)
    pixelText(this,240,63,`${this.result.score}`,24,GREEN).setOrigin(.5).setDepth(501)
    pixelText(this,240,84,'SCORE',8,MUTED).setOrigin(.5).setDepth(501)
    const rows=[['DISTANCE',`${this.result.distance} M`],['PEAK HORDE',`${this.result.peakHorde}`],['HUMANS INFECTED',`${this.result.zombiesAbsorbed}`],['COINS EARNED',`+${this.result.runCoins}`],['BEST SCORE',`${saveManager.load().bestScore}`]]
    rows.forEach(([label,value],i)=>{pixelText(this,94,103+i*17,label,8,MUTED).setDepth(501);pixelText(this,386,103+i*17,value,8).setOrigin(1,0).setDepth(501)})
    const buttons=[button(this,240,205,138,'RETRY  >',()=>this.scene.start(SCENES.GAME),true),button(this,165,238,132,'UPGRADES',()=>this.scene.start(SCENES.MENU,{page:'upgrades'})),button(this,315,238,132,'MAIN MENU',()=>this.scene.start(SCENES.MENU))]
    keyboardNavigation(this,()=>buttons)
    this.cameras.main.fadeIn(200,15,29,35)
  }
}
