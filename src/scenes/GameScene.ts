import Phaser from 'phaser'
import { CAMERA_FOLLOW_X, CRITICAL_MASS_SIZE, GAME_HEIGHT, GAME_WORLD_WIDTH, SCENES, START_SPEED } from '../config/GameConfig'
import { Horde } from '../entities/Horde'
import { ChunkSpawner } from '../systems/ChunkSpawner'
import { CollisionManager } from '../systems/CollisionManager'
import { saveManager } from '../systems/SaveManager'
import { ScoreManager } from '../systems/ScoreManager'
import { PowerupManager } from '../systems/PowerupManager'
import { DifficultyManager } from '../systems/DifficultyManager'
import { audio } from '../systems/AudioManager'
import { feedback } from '../systems/Feedback'
import { CityWorld } from '../art/CityWorld'
import { button, GREEN, keyboardNavigation, panel, pixelText } from '../ui/PixelUI'

export type RunState='playing'|'paused'|'dying'|'results'
export class GameScene extends Phaser.Scene {
  horde!:Horde
  spawner!:ChunkSpawner
  collisions!:CollisionManager
  score!:ScoreManager
  powers!:PowerupManager
  state:RunState='playing'
  elapsed=0
  private world!:CityWorld
  private worldSpeed=START_SPEED
  private deathElapsed=0
  private criticalMassTriggered=false
  private pointerHeld=false
  private jumpQueued=false
  private inputBlocked=true
  private space?:Phaser.Input.Keyboard.Key
  private up?:Phaser.Input.Keyboard.Key
  private overlay:Phaser.GameObjects.GameObject[]=[]
  private buttons:Phaser.GameObjects.Container[]=[]
  private scoreText!:Phaser.GameObjects.BitmapText
  private coinsText!:Phaser.GameObjects.BitmapText
  private hordeText!:Phaser.GameObjects.BitmapText
  private tutorial!:Phaser.GameObjects.BitmapText
  private banner!:Phaser.GameObjects.BitmapText
  private powerText!:Phaser.GameObjects.BitmapText
  private powerBar!:Phaser.GameObjects.Graphics
  private powerIcons:Phaser.GameObjects.Image[]=[]
  private debugText?:Phaser.GameObjects.BitmapText
  private lastCoins=-1
  private lastHorde=-1
  private bannerRemaining=0
  private banked=false
  private milestone=0
  constructor(){super(SCENES.GAME)}
  create():void{
    this.state='playing';this.elapsed=0;this.deathElapsed=0;this.worldSpeed=START_SPEED
    this.criticalMassTriggered=false;this.pointerHeld=false;this.jumpQueued=false;this.inputBlocked=true;this.overlay=[];this.buttons=[]
    this.lastCoins=-1;this.lastHorde=-1;this.banked=false;this.bannerRemaining=0;this.milestone=0
    this.time.paused=false;this.tweens.resumeAll();this.physics.resume()
    this.physics.world.setBounds(0,0,GAME_WORLD_WIDTH,GAME_HEIGHT+100)
    this.cameras.main.setScroll(0,0);this.world=new CityWorld(this)
    this.score=new ScoreManager();this.horde=new Horde(this,1+saveManager.load().upgrades.starting);this.score.setHorde(this.horde.count)
    this.spawner=new ChunkSpawner(this,()=>this.horde.isFlightActive)
    this.powers=new PowerupManager(this,this.horde)
    this.collisions=new CollisionManager(this,this.horde,this.spawner,this.score,{
      onPopulationChanged:()=>this.populationChanged(),
      onDamage:removed=>{if(removed){feedback(this).shake(.004);this.hordeText?.setTint(0xef9b80);this.time.delayedCall(220,()=>this.hordeText?.setTint(GREEN))}},
      onFenceSmashed:()=>feedback(this).shake(),
      onFlightCollected:kind=>this.powers.activate(kind),
      onMission:title=>{this.showBanner(`MISSION COMPLETE: ${title}`);audio.play('mission')},
    },this.powers)
    this.space=this.input.keyboard?.addKey('SPACE');this.up=this.input.keyboard?.addKey('UP')
    this.input.on('pointerdown',this.pointerDown,this);this.input.on('pointerup',this.pointerUp,this)
    this.input.on('pointerupoutside',this.pointerUp,this)
    this.input.keyboard?.on('keydown-ESC',this.togglePause,this);this.input.keyboard?.on('keydown-P',this.togglePause,this)
    this.input.keyboard?.on('keydown-SPACE',this.queueJump,this);this.input.keyboard?.on('keydown-UP',this.queueJump,this)
    this.game.events.on('blur',this.focusLost,this)
    this.createHud();keyboardNavigation(this,()=>this.state==='paused'?this.buttons:[])
    if(import.meta.env.DEV&&new URLSearchParams(location.search).has('debug')){
      this.debugText=pixelText(this,8,246,'',8).setDepth(600).setScrollFactor(0)
      this.physics.world.createDebugGraphic();this.physics.world.drawDebug=true
    }else this.physics.world.drawDebug=false
    this.events.once('shutdown',this.shutdown,this)
    this.cameras.main.fadeIn(150,15,29,35)
  }
  private queueJump(event?:KeyboardEvent):void{if(this.state==='playing'&&!event?.repeat&&!this.inputBlocked)this.jumpQueued=true}
  private pointerDown():void{if(this.state==='playing'){audio.unlock();this.pointerHeld=true;this.queueJump()}}
  private pointerUp():void{this.pointerHeld=false}
  private focusLost():void{if(this.state==='playing')this.pauseGame()}
  private togglePause(event?:KeyboardEvent):void{if(event?.repeat)return;if(this.state==='playing')this.pauseGame();else if(this.state==='paused')this.resumeGame()}
  update(_time:number,rawDelta:number):void{
    const delta=Math.min(rawDelta,50)
    if(this.state==='paused'||this.state==='results')return
    feedback(this).update(delta)
    if(this.state==='dying'){
      this.deathElapsed+=delta
      if(this.deathElapsed>=850){this.state='results';this.bankRun();this.scene.start(SCENES.GAME_OVER,{...this.score.summary(),isNewBest:this.score.score>this.bestBefore})}
      return
    }
    this.elapsed+=delta;this.worldSpeed=DifficultyManager.at(this.score.distance).speed
    let held=this.pointerHeld||!!this.space?.isDown||!!this.up?.isDown
    if(this.inputBlocked){if(!held)this.inputBlocked=false;held=false}
    this.horde.setForwardSpeed(this.worldSpeed);this.horde.applyInput(held,delta,this.jumpQueued);this.jumpQueued=false;this.horde.update(this.horde.leader.x)
    const travelStart=(this.horde.leader.body as Phaser.Physics.Arcade.Body).x
    // One bounded delta drives both physics and game timers, including low-frame-rate play.
    this.physics.world.update(_time,delta)
    const traveled=Math.max(0,(this.horde.leader.body as Phaser.Physics.Arcade.Body).x-travelStart)
    this.score.updateDistance(traveled,this.horde.count)
    this.collisions.update(delta)
    this.cameras.main.scrollX=Math.max(this.cameras.main.scrollX,this.horde.leader.x-CAMERA_FOLLOW_X,0)
    this.world.update(this.cameras.main.scrollX,this.elapsed)
    this.spawner.update(this.cameras.main.scrollX,this.score.distance,delta,this.horde.leader.x)
    this.powers.update(delta,this.spawner,this.score.distance);this.collisions.updatePitFalls();this.collisions.updateFlightCollection()
    // A fall beyond the pit volume remains lethal; no world-bottom platform.
    for(const sprite of [...this.horde.sprites])if(sprite.y>GAME_HEIGHT+20)this.horde.removeMember(sprite,'pit')
    this.score.setHorde(this.horde.count)
    const milestone=Math.floor(this.score.distance/500)
    if(milestone>this.milestone){this.milestone=milestone;this.showBanner(`${milestone*500} M - KEEP RUNNING!`)}
    this.updateHud(delta);audio.music(this.elapsed)
    if(!this.horde.count)this.finishRun()
  }
  private createHud():void{
    this.add.rectangle(0,0,480,34,0x122b34,.9).setOrigin(0).setScrollFactor(0).setDepth(100)
    this.scoreText=pixelText(this,10,7,'SCORE 0',8).setDepth(101).setScrollFactor(0)
    this.add.image(243,15,'coin0').setDepth(101).setScrollFactor(0)
    this.coinsText=pixelText(this,255,11,'0',8,0xf0cc81).setDepth(101).setScrollFactor(0)
    this.add.image(352,17,'z0-idle').setDepth(101).setScrollFactor(0)
    this.hordeText=pixelText(this,366,11,`HORDE ${this.horde.count}`,8,GREEN).setDepth(101).setScrollFactor(0)
    button(this,458,16,32,'II',()=>this.pauseGame())
    this.tutorial=pixelText(this,240,57,'TAP / SPACE: JUMP. HOLD: GO HIGHER.',8).setOrigin(.5).setDepth(100).setScrollFactor(0)
    this.banner=pixelText(this,240,76,'',8,GREEN).setOrigin(.5).setDepth(110).setScrollFactor(0)
    this.powerText=pixelText(this,32,42,'',8,0xf3d48f).setLineSpacing(11).setDepth(101).setScrollFactor(0)
    this.powerBar=this.add.graphics().setDepth(101).setScrollFactor(0)
    this.powerIcons=Array.from({length:5},(_,i)=>this.add.image(18,46+i*20,'power-flight').setVisible(false).setDepth(101).setScrollFactor(0))
  }
  private updateHud(delta:number):void{
    this.scoreText.setText(`SCORE ${this.score.score}\n${Math.floor(this.score.distance)} M  /  ${this.spawner.difficulty.toUpperCase()}`)
    this.coinsText.setText(`${this.score.runCoins}`);this.hordeText.setText(`HORDE ${this.horde.count}`)
    if(this.lastCoins>=0&&this.lastCoins!==this.score.runCoins)this.pulse(this.coinsText)
    if(this.lastHorde>=0&&this.lastHorde!==this.horde.count)this.pulse(this.hordeText)
    this.lastCoins=this.score.runCoins;this.lastHorde=this.horde.count
    const messages=this.elapsed<4200?'TAP / SPACE: JUMP. HOLD: GO HIGHER.':this.elapsed<9500?'JUMP THE GAP. FOLLOW THE COINS.':this.elapsed<16000?'3 ZOMBIES CAN SMASH A CAR.':this.elapsed<22000?'COLLECT SUPPLIES FOR A POWER-UP.':''
    this.tutorial.setText(this.horde.isFlightActive?(this.horde.flightPhase==='landing'?'LANDING - SAFE ROAD AHEAD':'FLIGHT: HOLD TO RISE. RELEASE TO DESCEND.'):messages)
    this.tutorial.setY(this.horde.isFlightActive&&this.horde.flightPhase!=='landing'?173:57)
    this.bannerRemaining-=delta;if(this.bannerRemaining<=0)this.banner.setText('')
    this.powerBar.clear();const lines:string[]=[]
    this.powerIcons.forEach(icon=>icon.setVisible(false))
    let i=0
    for(const [kind,power] of this.powers.active){
      const landing=kind==='flight'&&this.horde.flightPhase==='landing'
      lines.push(landing?'FLIGHT LAND':`${kind.toUpperCase()} ${Math.ceil(power.remaining/1000)}S`)
      this.powerIcons[i].setTexture(`power-${kind}`).setVisible(true).setAlpha(landing&&Math.floor(this.elapsed/180)%2?.45:1)
      this.powerBar.fillStyle(0x45605a).fillRect(99,43+i*20,40,4).fillStyle(landing?0xf0ba85:0xc5d889).fillRect(99,43+i*20,Math.ceil(40*power.remaining/power.duration),4);i++
    }
    this.powerText.setText(lines.join('\n'))
    this.debugText?.setText(`FPS ${Math.round(this.game.loop.actualFps)} VY ${Math.round((this.horde.leader.body as Phaser.Physics.Arcade.Body).velocity.y)} HORDE ${this.horde.count}\n${this.spawner.currentChunk}  SPEED ${Math.round(this.worldSpeed)}  OBJECTS ${this.children.length}`)
  }
  private pulse(text:Phaser.GameObjects.BitmapText):void{this.tweens.killTweensOf(text);text.setAlpha(.45);this.tweens.add({targets:text,alpha:1,duration:180})}
  private populationChanged():void{
    if(this.horde.count>=CRITICAL_MASS_SIZE&&!this.criticalMassTriggered){this.criticalMassTriggered=true;this.score.addBonus(500);this.showBanner('CRITICAL MASS! +500');feedback(this).shake()}
  }
  private showBanner(text:string):void{this.banner?.setText(text);this.bannerRemaining=2500}
  pauseGame():void{
    if(this.state!=='playing')return
    this.state='paused';this.physics.pause();this.time.paused=true;this.tweens.pauseAll();this.horde.releaseInput();this.pointerHeld=false;this.jumpQueued=false
    this.showPause()
  }
  resumeGame():void{
    if(this.state!=='paused')return
    this.clearOverlay();this.physics.resume();this.time.paused=false;this.tweens.resumeAll();this.state='playing';this.inputBlocked=true;this.pointerHeld=false
  }
  private showPause(settings=false):void{
    this.clearOverlay()
    const before=new Set(this.children.list)
    this.add.rectangle(240,135,480,270,0x091a21,.35).setDepth(499).setScrollFactor(0).setInteractive()
    panel(this,240,142,206,166)
    pixelText(this,240,75,settings?'SETTINGS':'PAUSED',16,GREEN).setOrigin(.5).setDepth(501).setScrollFactor(0)
    const rows:{label:string;action:()=>void}[]=settings?(['sound','music','shake'] as const).map(key=>({label:`${key.toUpperCase()}: ${saveManager.load().settings[key]?'ON':'OFF'}`,action:()=>{const d=saveManager.load();d.settings[key]=!d.settings[key];saveManager.save(d);this.showPause(true)}})):[
      {label:'RESUME',action:()=>this.resumeGame()},
      {label:'RESTART',action:()=>{this.bankRun();this.scene.restart()}},
      {label:'SETTINGS',action:()=>this.showPause(true)},
    ]
    rows.push({label:settings?'BACK':'MAIN MENU',action:()=>{if(settings)this.showPause();else{this.bankRun();this.scene.start(SCENES.MENU)}}})
    this.buttons=rows.map((r,i)=>button(this,240,103+i*34,166,r.label,r.action,i===0&&!settings))
    this.overlay=this.children.list.filter(o=>!before.has(o))
  }
  private clearOverlay():void{this.overlay.forEach(o=>o.destroy());this.overlay=[];this.buttons=[]}
  private bestBefore=0
  private bankRun():void{
    if(this.banked)return;this.banked=true
    this.bestBefore=saveManager.load().bestScore
    saveManager.addCoins(this.score.runCoins);saveManager.updateBest(this.score.score,this.score.distance)
    const data=saveManager.load();data.tutorialSeen=true;saveManager.save(data)
  }
  finishRun():void{
    if(this.state!=='playing'||this.horde.count!==0)return
    this.state='dying';this.physics.pause();this.pointerHeld=false;this.deathElapsed=0
    this.tutorial.setText('');audio.play('death');feedback(this).shake(.005)
  }
  private shutdown():void{
    this.game.events.off('blur',this.focusLost,this)
    this.input.off('pointerdown',this.pointerDown,this);this.input.off('pointerup',this.pointerUp,this);this.input.off('pointerupoutside',this.pointerUp,this)
    this.input.keyboard?.off('keydown-ESC',this.togglePause,this);this.input.keyboard?.off('keydown-P',this.togglePause,this)
    this.input.keyboard?.off('keydown-SPACE',this.queueJump,this);this.input.keyboard?.off('keydown-UP',this.queueJump,this)
    this.time.paused=false;this.time.removeAllEvents();this.tweens.killAll();this.clearOverlay()
    this.collisions?.destroy();this.spawner?.destroy();this.horde?.destroy()
    this.debugText=undefined
  }
}
