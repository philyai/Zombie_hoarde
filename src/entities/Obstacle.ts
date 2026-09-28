import Phaser from 'phaser'
import { GAME_HEIGHT, GROUND_Y, TEXTURES } from '../config/GameConfig'
import { LARGE_VEHICLES, type CollisionZone } from './ObstacleGeometry'
import type { PitTheme } from '../config/Traversal'

export type ObstacleKind = 'fence' | 'spike' | 'pit' | 'car' | 'truck' | 'bus' | 'airplane' | 'electric' | 'armored' | 'moving-car' | 'falling' | 'drone' | 'mine'
export type ObstacleCategory = 'damage' | 'pit' | 'aerial-damage'

interface ObstacleOptions {
  pitWidth?: number
  y?: number
  pitTheme?: PitTheme
  fallY?:number
  leftY?:number
  rightY?:number
}

const DAMAGE_MULTIPLIERS: Record<ObstacleKind, number> = {
  fence: 1,
  spike: 1.6,
  pit: 1.25,
  car: 1,
  truck: 1.35,
  bus: 1.6,
  airplane: 1.25,
  electric: 2.5,
  armored: 2,
  'moving-car': 1.5,
  falling: 2,
  drone: 1,
  mine: 1,
}

const TEXTURE_BY_KIND: Record<ObstacleKind, string> = {
  fence: TEXTURES.FENCE,
  spike: TEXTURES.SPIKE,
  pit: TEXTURES.PIT,
  car: TEXTURES.CAR,
  truck: TEXTURES.TRUCK,
  bus: TEXTURES.BUS,
  airplane: TEXTURES.AIRPLANE,
  electric: 'electric',
  armored: 'armored',
  'moving-car': TEXTURES.CAR,
  falling: 'crate',
  drone: 'drone',
  mine: 'mine0',
}

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly kind: ObstacleKind
  readonly damageMultiplier: number
  readonly category: ObstacleCategory
  private spent = false
  private pitLeaderCaught = false
  label?: Phaser.GameObjects.BitmapText
  readonly requirement: number
  private hazardTime = 0
  private warning?: Phaser.GameObjects.BitmapText
  private requirementIcon?: Phaser.GameObjects.Image
  private markerPlate?:Phaser.GameObjects.Rectangle
  private pitArt?: Phaser.GameObjects.Graphics
  private roofBodies: Phaser.Physics.Arcade.Image[] = []
  intent: 'jump' | 'smash' | null = null
  readonly fallY:number
  push?:{decision:'success'|'failure';elapsed:number;duration:number;face:number;contact:Phaser.Physics.Arcade.Sprite}
  get interactionState(): 'active'|'pushing-success'|'pushing-failure'|'destroyed' {
    return this.spent ? 'destroyed' : this.push ? `pushing-${this.push.decision}` : 'active'
  }
  private markerCount=-1
  private markerReady=false
  private pitEdges:[number,number]

  constructor(
    scene: Phaser.Scene,
    x: number,
    kind: ObstacleKind,
    options: ObstacleOptions = {},
  ) {
    const y = options.y ?? (kind === 'drone' ? 110 : GROUND_Y)
    super(scene, x, y, TEXTURE_BY_KIND[kind])

    this.kind = kind
    this.pitEdges=[options.leftY??y,options.rightY??y]
    this.fallY=options.fallY??GROUND_Y+7
    this.requirement = ({ fence: 2, car: 3, 'moving-car': 3, truck: 5, bus: 8, airplane: 16, armored: 12 } as Partial<Record<ObstacleKind, number>>)[kind] ?? 0
    this.damageMultiplier = DAMAGE_MULTIPLIERS[kind]
    this.category = kind === 'pit' ? 'pit' : kind === 'drone' ? 'aerial-damage' : 'damage'
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(kind === 'pit' ? 4 : 12).setOrigin(
      0.5,
      kind === 'pit' ? 0 : kind === 'drone' ? 0.5 : 1,
    )
    this.setImmovable(true)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    if (kind === 'pit') {
      const pitWidth = options.pitWidth ?? 48
      const pitDepth = GAME_HEIGHT - GROUND_Y + 64
      this.setDisplaySize(pitWidth, pitDepth)
      body.enable = false
      this.setVisible(false)
      this.drawPit(options.pitTheme ?? 'sewer')
    } else {
      body.setSize(this.width - 6, this.height - 5).setOffset(3, 4)
      if(kind==='mine')body.setSize(14,7).setOffset(1,2)
    }
    if (this.requirement) {
      this.label = scene.add.bitmapText(x + 6, y - this.height - 13, 'pixel-font', `${this.requirement}`, 8).setOrigin(0,.5).setTint(0xffdd98).setDepth(30)
      this.requirementIcon = scene.add.image(x - 6, y - this.height - 13, 'zombie-head').setDepth(30)
      this.markerPlate=scene.add.rectangle(x,y-this.height-15,64,18,0x152b32,.96).setStrokeStyle(1,0x8b9876).setDepth(29)
    }
    if (kind === 'falling') {
      this.setY(GROUND_Y - 145); body.enable = false
      this.warning = scene.add.bitmapText(x, GROUND_Y - 45, 'pixel-font', 'FALLING\n   !', 8).setOrigin(.5).setTint(0xf0ba85).setDepth(35)
    }
    if(kind==='airplane')this.warning=scene.add.bitmapText(this.leftEdge-110,GROUND_Y-55,'pixel-font','WRECK AHEAD\nJUMP ON WING',8).setTint(0xf0ba85).setDepth(30)
  }

  get isSpent(): boolean {
    return this.spent
  }

  get isSmashable(): boolean {
    return this.requirement > 0
  }

  get isAerial(): boolean {
    return this.category === 'aerial-damage'
  }

  get isLarge(): boolean { return this.kind === 'bus' || this.kind === 'airplane' }
  get isVehicle():boolean{return ['car','moving-car','truck','bus','airplane','armored'].includes(this.kind)}

  updateRequirement(count:number,boosted=false):void{
    if(!this.label||this.spent)return
    const ready=count>=this.requirement||boosted
    if(this.markerCount!==count||this.markerReady!==ready){
      this.markerCount=count;this.markerReady=ready
      this.label.setText(`${count}/${this.requirement} ${ready?'PUSH':'JUMP'}`).setOrigin(.5,.5).setTint(ready?0xc5df92:0xffc396)
    }
    this.label.setPosition(this.x,Math.max(72,this.y-this.height-15))
    this.requirementIcon?.setPosition(this.label.x-this.label.width/2-9,this.label.y)
    this.markerPlate?.setPosition(this.label.x-7,this.label.y).setSize(this.label.width+25,18).setStrokeStyle(1,ready?0x8baf6f:0xb28c69)
  }

  get collisionZones(): CollisionZone[] {
    if (this.isLarge) return LARGE_VEHICLES[this.kind as 'bus' | 'airplane'].zones.map(z => ({ ...z, x: this.leftEdge + z.x, y: this.y - this.height + z.y }))
    const body = this.body as Phaser.Physics.Arcade.Body
    return [{ name: this.kind, x: body.x, y: body.y, width: body.width, height: body.height }]
  }

  attachRoofs(group: Phaser.Physics.Arcade.StaticGroup): void {
    if (!this.isLarge) return
    for (const zone of this.collisionZones.filter(z => z.roof)) {
      const roof = this.scene.physics.add.staticImage(zone.x, zone.y, 'pixel').setOrigin(0).setDisplaySize(zone.width, 3).setVisible(false)
      roof.refreshBody(); group.add(roof); this.roofBodies.push(roof)
    }
  }

  private drawPit(theme: PitTheme): void {
    const x = this.leftEdge, width = this.displayWidth, top=this.y
    const art = this.scene.add.graphics().setDepth(4)
    this.pitArt = art
    art.fillStyle(0x091b23).fillRect(x, top, width, GAME_HEIGHT - top)
    const [leftY,rightY]=this.pitEdges
    art.fillStyle(0x475552).fillRect(x, leftY, 4, GAME_HEIGHT-leftY).fillRect(x + width - 4, rightY, 4, GAME_HEIGHT-rightY)
    art.fillStyle(0xadb09a).fillRect(x, leftY, 5, 3).fillRect(x + width - 6, rightY, 6, 3)
    for (let i = 0; i < 5; i++) art.fillStyle(0x647568).fillRect(x + (i % 2 ? width - 7 : 3), top + 5 + i * 8, 4, 3)
    if (theme === 'water') {
      art.fillStyle(0x355e62).fillRect(x + 4, top + 30, width - 8, 16)
      for (let i = 7; i < width - 5; i += 12) art.fillStyle(0x72978b).fillRect(x + i, top + 32 + i % 3, 7, 1)
    } else if (theme === 'sewer') {
      art.fillStyle(0x7c8878).fillRect(x, top + 14, 12, 7).fillRect(x + width - 12, top + 24, 12, 6)
      art.fillStyle(0x303f3d).fillRect(x + 8, top + 15, 4, 5)
    } else if (theme === 'subway') {
      art.fillStyle(0x6a6860).fillRect(x + 7, top + 35, width - 14, 2).fillRect(x + 7, top + 42, width - 14, 2)
      for (let i = 10; i < width - 8; i += 13) art.fillStyle(0x90714f).fillRect(x + i, top + 33, 3, 12)
    } else {
      for (let i = 10; i < width - 4; i += 14) art.fillStyle(0x596862).fillRect(x + i, top + 10, 3, 28)
      art.fillStyle(0xb49156).fillRect(x + 2, top + 5, 7, 2).fillRect(x + width - 9, top + 5, 7, 2)
    }
  }

  overlapsHorizontal(body: Phaser.Physics.Arcade.Body): boolean {
    const obstacleBody = this.body as Phaser.Physics.Arcade.Body
    return obstacleBody.left <= body.right && obstacleBody.right >= body.left
  }

  get leftEdge(): number {
    return this.x - this.displayWidth * this.originX
  }

  get rightEdge(): number {
    return this.leftEdge + this.displayWidth
  }

  get hasCaughtPitLeader(): boolean {
    return this.pitLeaderCaught
  }

  markPitLeaderCaught(): void {
    this.pitLeaderCaught = true
  }

  markSpent(hide = false): boolean {
    if (this.spent) {
      return false
    }
    this.spent = true
    this.push = undefined
    this.label?.setVisible(false)
    this.requirementIcon?.setVisible(false)
    this.markerPlate?.setVisible(false)
    this.roofBodies.forEach(roof => roof.destroy()); this.roofBodies = []
    this.warning?.setVisible(false)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.enable = false
    if (hide) {
      this.setVisible(false)
      this.pitArt?.setVisible(false)
    }
    return true
  }

  updateHazard(frontX: number, delta: number): void {
    if (this.spent) return
    if (this.kind === 'moving-car' && this.x - frontX < 210) this.setVelocityX(this.push?0:-18)
    if(this.kind==='mine'){this.hazardTime+=delta;this.setTexture(`mine${Math.floor(this.hazardTime/240)%2}`)}
    if (this.kind === 'falling' && this.x - frontX < 160) {
      this.hazardTime += delta
      this.warning?.setAlpha(Math.floor(this.hazardTime / 120) % 2 ? 1 : .5)
      if (this.hazardTime > 1000) {
        const body = this.body as Phaser.Physics.Arcade.Body
        body.enable = true
        this.y = Math.min(GROUND_Y, this.y + delta * .18)
        body.updateFromGameObject()
        if (this.y >= GROUND_Y) this.warning?.setVisible(false)
      }
    }
  }
  destroy(fromScene?: boolean): void {
    this.label?.destroy(); this.warning?.destroy(); this.requirementIcon?.destroy(); this.markerPlate?.destroy(); this.pitArt?.destroy()
    this.roofBodies.forEach(roof => roof.destroy()); this.roofBodies = []
    super.destroy(fromScene)
  }
}
