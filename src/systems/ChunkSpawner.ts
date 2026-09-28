import Phaser from 'phaser'
import {
  CHUNK_GAP,
  CHUNK_SPAWN_AHEAD,
  CLEANUP_X,
  FLIGHT_MIN_DISTANCE,
  GAME_WIDTH,
  GROUND_HEIGHT,
  GROUND_Y,
  TEXTURES,
} from '../config/GameConfig'
import { Civilian } from '../entities/Civilian'
import { Obstacle, type ObstacleKind } from '../entities/Obstacle'
import { Powerup } from '../entities/Powerup'
import { saveManager } from './SaveManager'
import { DifficultyManager, INTRO_DISTANCE } from './DifficultyManager'
import { PIT_TYPES, pitGaps, jumpRange, type PitSize } from '../config/Traversal'
import { CHALLENGE_CHUNKS, validateChallenge } from './ChallengeCatalog'
import { terrainTexture } from '../art/TerrainArt'

export type ChunkDifficulty = 'easy' | 'medium' | 'hard' | 'chaos'
type SpawnKind =
  | 'civilian'
  | 'coin'
  | 'fence'
  | 'spike'
  | 'car'
  | 'truck'
  | 'bus'
  | 'airplane'
  | 'drone'
  | 'mine'
  | 'flight'
  | 'magnet' | 'rage' | 'giant' | 'boost' | 'electric' | 'armored' | 'moving-car' | 'falling'

export interface SpawnDefinition {
  kind: SpawnKind
  offsetX: number
  y: number
  count?: number
  spacing?: number
  patrolWidth?: number
}

interface GroundDefinition {
  pitStart?: number
  pitWidth?: number
  pitSize?: PitSize
}

export interface TerrainSurface { start:number; width:number; y:number; pillar?:boolean }
export interface ChunkDefinition {
  id: string
  difficulty: ChunkDifficulty
  weight: number
  width: number
  ground: GroundDefinition
  spawns: readonly SpawnDefinition[]
  minDistance?: number
  terrain?: readonly TerrainSurface[]
  complexity?: number
  recovery?: boolean
}

const LEGACY_CHUNKS: readonly ChunkDefinition[] = [
  {
    id: 'civilian-lane',
    difficulty: 'easy',
    weight: 1,
    width: 190,
    ground: {},
    spawns: [
      { kind: 'civilian', offsetX: 34, y: GROUND_Y, count: 2, spacing: 55 },
      { kind: 'coin', offsetX: 42, y: GROUND_Y - 16, count: 7, spacing: 20 },
    ],
  },
  {
    id: 'weak-fence',
    difficulty: 'easy',
    weight: 3,
    width: 220,
    ground: {},
    spawns: [
      { kind: 'civilian', offsetX: 30, y: GROUND_Y, count: 2, spacing: 24 },
      { kind: 'fence', offsetX: 145, y: GROUND_Y },
      { kind: 'coin', offsetX: 114, y: GROUND_Y - 52, count: 4, spacing: 14 },
    ],
  },
  {
    id: 'spike-hop',
    difficulty: 'medium',
    weight: 3,
    width: 228,
    ground: {},
    spawns: [
      { kind: 'coin', offsetX: 90, y: GROUND_Y - 45, count: 6, spacing: 17 },
      { kind: 'spike', offsetX: 145, y: GROUND_Y },
    ],
  },
  {
    id: 'short-pit',
    difficulty: 'medium',
    weight: 3,
    width: 240,
    ground: { pitStart: 92, pitWidth: 40 },
    spawns: [
      { kind: 'coin', offsetX: 70, y: GROUND_Y - 40, count: 6, spacing: 14 },
      { kind: 'civilian', offsetX: 188, y: GROUND_Y, count: 2, spacing: 22 },
    ],
  },
  {
    id: 'supply-run',
    difficulty: 'hard',
    weight: 2,
    width: 270,
    ground: {},
    spawns: [
      { kind: 'spike', offsetX: 72, y: GROUND_Y },
      { kind: 'coin', offsetX: 50, y: GROUND_Y - 45, count: 6, spacing: 18 },
      { kind: 'flight', offsetX: 175, y: GROUND_Y - 18 },
      { kind: 'civilian', offsetX: 220, y: GROUND_Y, count: 2, spacing: 23 },
    ],
  },
  {
    id: 'car-lane',
    difficulty: 'easy',
    weight: 3,
    width: 225,
    ground: {},
    spawns: [
      { kind: 'civilian', offsetX: 28, y: GROUND_Y, count: 2, spacing: 23 },
      { kind: 'car', offsetX: 150, y: GROUND_Y },
      { kind: 'coin', offsetX: 115, y: GROUND_Y - 49, count: 5, spacing: 16 },
    ],
  },
  {
    id: 'truck-route',
    difficulty: 'medium',
    weight: 2,
    width: 240,
    ground: {},
    spawns: [
      { kind: 'coin', offsetX: 92, y: GROUND_Y - 55, count: 7, spacing: 17 },
      { kind: 'truck', offsetX: 158, y: GROUND_Y },
    ],
  },
  {
    id: 'bus-route',
    difficulty: 'medium',
    weight: 1,
    width: 360,
    minDistance: INTRO_DISTANCE.bus,
    ground: {},
    spawns: [
      { kind: 'civilian', offsetX: 30, y: GROUND_Y, count: 3, spacing: 22 },
      { kind: 'coin', offsetX: 136, y: GROUND_Y - 56, count: 6, spacing: 18 },
      { kind: 'bus', offsetX: 185, y: GROUND_Y },
    ],
  },
  {
    id: 'airplane-pass',
    difficulty: 'hard',
    weight: 1,
    width: 720,
    minDistance: INTRO_DISTANCE.airplane,
    ground: {},
    spawns: [
      { kind: 'civilian', offsetX: 40, y: GROUND_Y, count: 3, spacing: 24 },
      { kind: 'airplane', offsetX: 360, y: GROUND_Y },
      { kind: 'coin', offsetX: 234, y: GROUND_Y - 38, count: 3, spacing: 16 },
      { kind: 'coin', offsetX: 300, y: GROUND_Y - 76, count: 5, spacing: 18 },
      { kind: 'coin', offsetX: 411, y: GROUND_Y - 111, count: 4, spacing: 18 },
    ],
  },
  { id:'power-lane', difficulty:'easy', weight:1, width:280, ground:{}, spawns:[{kind:'magnet',offsetX:40,y:GROUND_Y-16},{kind:'coin',offsetX:80,y:GROUND_Y-40,count:8,spacing:19},{kind:'civilian',offsetX:235,y:GROUND_Y}] },
  { id:'electric-block', difficulty:'hard', weight:2, width:280, ground:{}, spawns:[{kind:'coin',offsetX:90,y:GROUND_Y-58,count:6,spacing:16},{kind:'electric',offsetX:143,y:GROUND_Y},{kind:'civilian',offsetX:238,y:GROUND_Y}] },
  { id:'armored-route', difficulty:'chaos', weight:2, width:320, ground:{}, spawns:[{kind:'civilian',offsetX:35,y:GROUND_Y,count:3,spacing:24},{kind:'armored',offsetX:215,y:GROUND_Y},{kind:'coin',offsetX:175,y:GROUND_Y-62,count:6,spacing:16}] },
  { id:'oncoming-car', difficulty:'hard', weight:2, width:310, ground:{}, spawns:[{kind:'moving-car',offsetX:215,y:GROUND_Y},{kind:'coin',offsetX:75,y:GROUND_Y-52,count:5,spacing:18},{kind:'civilian',offsetX:280,y:GROUND_Y}] },
  { id:'falling-cargo', difficulty:'hard', weight:2, width:285, ground:{}, spawns:[{kind:'falling',offsetX:155,y:GROUND_Y},{kind:'coin',offsetX:98,y:GROUND_Y-49,count:6,spacing:16},{kind:'civilian',offsetX:242,y:GROUND_Y}] },
  ...(['medium','large','extraLarge'] as const).map(size => ({
    id:`${size}-pit`, difficulty:'medium' as const, weight:2, width:PIT_TYPES[size].width+300,
    minDistance:PIT_TYPES[size].minDistance, ground:{pitStart:150,pitSize:size},
    spawns:[{kind:'coin' as const,offsetX:130,y:GROUND_Y-45,count:Math.ceil(PIT_TYPES[size].width/18)+2,spacing:18}],
  })),
  { id:'late-combination', difficulty:'chaos', weight:3, width:660, ground:{pitStart:160,pitSize:'medium'}, minDistance:2000,
    spawns:[{kind:'coin',offsetX:140,y:GROUND_Y-45,count:6,spacing:16},{kind:'bus',offsetX:450,y:GROUND_Y},{kind:'civilian',offsetX:605,y:GROUND_Y}] },
]

export const CHUNKS:readonly ChunkDefinition[]=[...LEGACY_CHUNKS.map(c=>({...c,spawns:c.spawns.map(s=>s.kind==='civilian'?{...s,count:1}:s)})),...CHALLENGE_CHUNKS]

/** Reject overlap, unreachable gaps and crowded hazard boundaries before spawning. */
export function validateChunks(): string[] {
  const errors:string[]=[]
  const width:Record<string,number>={fence:22,spike:26,car:40,truck:48,bus:104,airplane:256,electric:24,armored:62,'moving-car':40,falling:22}
  for(const c of CHUNKS){
    if(CHALLENGE_CHUNKS.includes(c)){errors.push(...validateChallenge(c));continue}
    const hazards=c.spawns.filter(s=>width[s.kind]).map(s=>({left:s.offsetX-width[s.kind]/2,right:s.offsetX+width[s.kind]/2}))
    if(c.ground.pitStart!==undefined){
      const size=c.ground.pitSize??'small',p=c.ground.pitStart,w=PIT_TYPES[size].width
      hazards.push({left:p,right:p+w})
      const range=jumpRange(DifficultyManager.at(c.minDistance??0).speed)
      if(pitGaps(size).some(g=>g.width+4>range))errors.push(`${c.id}: gap exceeds jump range`)
    }
    hazards.sort((a,b)=>a.left-b.left)
    hazards.forEach((h,i)=>{if(h.left<55||h.right>c.width-45)errors.push(`${c.id}: unsafe boundary`);if(i&&h.left-hazards[i-1].right<95)errors.push(`${c.id}: recovery too short`)})
    for(const s of c.spawns)for(let i=0;i<(s.count??1);i++){const x=s.offsetX+i*(s.spacing??0);if(x<0||x>c.width)errors.push(`${c.id}: spawn out of bounds`);if(s.kind==='civilian'&&hazards.some(h=>x>h.left-12&&x<h.right+12))errors.push(`${c.id}: civilian inside hazard`)}
  }
  return errors
}

type MovingEntity = Civilian | Obstacle | Powerup | Phaser.Physics.Arcade.Image

export class ChunkSpawner {
  readonly groundGroup: Phaser.Physics.Arcade.StaticGroup
  readonly surfaceGroup: Phaser.Physics.Arcade.StaticGroup
  readonly civilianGroup: Phaser.Physics.Arcade.Group
  readonly obstacleGroup: Phaser.Physics.Arcade.Group
  readonly coinGroup: Phaser.Physics.Arcade.Group
  readonly powerupGroup: Phaser.Physics.Arcade.Group

  private readonly groundSegments: Phaser.Types.Physics.Arcade.ImageWithStaticBody[] = []
  private readonly civilians: Civilian[] = []
  private readonly obstacles: Obstacle[] = []
  private readonly coins: Phaser.Physics.Arcade.Image[] = []
  private readonly powerups: Powerup[] = []
  private nextChunkX = 165
  private chunksSpawned = 0
  currentChunk = 'civilian-lane'
  difficulty: ChunkDifficulty = 'easy'
  private elapsed = 0
  private lastAircraftChunk = -10
  private lastBusChunk = -10
  private nextCivilianX=0
  private landing?: { start:number; end:number }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isFlightActive: () => boolean,
  ) {
    const errors=validateChunks();if(errors.length)throw new Error(errors.join('\n'))
    this.groundGroup = scene.physics.add.staticGroup()
    this.surfaceGroup = scene.physics.add.staticGroup()
    this.civilianGroup = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.obstacleGroup = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.coinGroup = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.powerupGroup = scene.physics.add.group({ allowGravity: false, immovable: true })

    this.spawnGroundRange(0, this.nextChunkX)
    this.spawnChunk(CHUNKS[0], this.nextChunkX, 0)
    this.spawnInterChunkPit(this.nextChunkX + CHUNKS[0].width)
    this.nextChunkX += CHUNKS[0].width + CHUNK_GAP
    this.chunksSpawned = 1
  }

  update(cameraScrollX: number, distance: number, delta = 16.67, frontX = cameraScrollX + 145): void {
    this.difficulty=DifficultyManager.at(distance).tier
    if(this.landing && cameraScrollX>this.landing.end+150)this.landing=undefined
    this.elapsed += delta
    this.civilians.forEach(c=>c.react(frontX,this.elapsed))
    this.obstacles.forEach(o=>o.updateHazard(frontX,delta))
    this.coins.forEach(c=>{if(c.active)c.setTexture(`coin${Math.floor(this.elapsed/100+c.x/17)%6}`)})
    this.powerups.forEach(p=>{if(p.active)p.setAngle(Math.sin(this.elapsed/300+p.x)*5)})
    this.cleanupGround(cameraScrollX)
    this.cleanupEntities(this.civilians, cameraScrollX)
    this.cleanupEntities(this.obstacles, cameraScrollX)
    this.cleanupEntities(this.coins, cameraScrollX)
    this.cleanupEntities(this.powerups, cameraScrollX)

    while (this.nextChunkX < cameraScrollX + GAME_WIDTH + CHUNK_SPAWN_AHEAD) {
      const template = this.chooseChunk(distance)
      this.spawnChunk(template, this.nextChunkX, distance)
      this.spawnInterChunkPit(this.nextChunkX + template.width)
      const recovery=this.chunksSpawned>=6?Math.max(0,DifficultyManager.at(distance).recoveryPixels-95)+(template.recovery?60:0):0
      if(recovery>0)this.ensureGround(this.nextChunkX+template.width,this.nextChunkX+template.width+recovery)
      this.nextChunkX += template.width + CHUNK_GAP + recovery
      this.chunksSpawned += 1
    }
  }

  destroy(): void {
    this.destroyObjects(this.groundSegments)
    this.destroyObjects(this.civilians)
    this.destroyObjects(this.obstacles)
    this.destroyObjects(this.coins)
    this.destroyObjects(this.powerups)
    this.groundGroup.destroy()
    this.surfaceGroup.destroy()
    this.civilianGroup.destroy()
    this.obstacleGroup.destroy()
    this.coinGroup.destroy()
    this.powerupGroup.destroy()
  }

  private chooseChunk(distance: number): ChunkDefinition {
    // Authored opening: friends, a readable gap, recruits and the first car, then a magnet.
    const opening=['civilian-lane','short-pit','car-lane','mine_single','step_up_easy','power-lane']
    if(this.chunksSpawned<opening.length)return CHUNKS.find(c=>c.id===opening[this.chunksSpawned])!
    const shouldSupplyFlight =
      distance >= FLIGHT_MIN_DISTANCE &&
      !this.isFlightActive() &&
      this.chunksSpawned > 0 &&
      this.chunksSpawned % (6 - saveManager.load().upgrades.frequency) === 0

    if (shouldSupplyFlight) {
      return CHUNKS[9]
    }

    const settings=DifficultyManager.at(distance)
    if(distance>=INTRO_DISTANCE.airplane&&this.lastAircraftChunk<0)return CHUNKS.find(c=>c.id==='airplane_intro')!
    if(distance>=INTRO_DISTANCE.bus&&this.lastBusChunk<0)return CHUNKS.find(c=>c.id==='bus_requirement')!
    const maxDifficulty: ChunkDifficulty = settings.tier
    this.difficulty = maxDifficulty
    const allowed = (difficulty: ChunkDifficulty): boolean => {
      if (maxDifficulty === 'chaos') return true
      if (maxDifficulty === 'hard') return difficulty !== 'chaos'
      if (maxDifficulty === 'medium') return difficulty === 'easy' || difficulty === 'medium'
      return difficulty === 'easy'
    }

    if(Math.random()>settings.hazardProbability)return CHUNKS[0]
    const candidates=CHUNKS.filter(c=>allowed(c.difficulty)&&distance>=(c.minDistance??0)&&(c.complexity??1)<=settings.complexity&&
      !['civilian-lane','power-lane'].includes(c.id)&&
      (!c.spawns.some(s=>s.kind==='bus')||this.chunksSpawned-this.lastBusChunk>=2)&&
      (!c.spawns.some(s=>s.kind==='airplane')||this.chunksSpawned-this.lastAircraftChunk>=9))
    const weight=(c:ChunkDefinition)=>c.spawns.some(s=>s.kind==='airplane')?settings.airplaneWeight*4/3:
      c.spawns.some(s=>s.kind==='bus')?settings.busWeight*(1+Math.min(1,distance/1800)):c.weight*(1+(c.complexity??1)*Math.min(2,distance/1500))
    let roll = Math.random() * candidates.reduce((sum,c)=>sum+weight(c),0)
    for (const chunk of candidates) {
      roll -= weight(chunk)
      if (roll <= 0) {
        return chunk
      }
    }

    return CHUNKS[0]
  }

  private spawnChunk(template: ChunkDefinition, startX: number, distance: number): void {
    this.currentChunk = template.id
    if(this.landing&&startX<this.landing.end&&startX+template.width>this.landing.start){this.ensureGround(startX,startX+template.width);return}
    if(template.spawns.some(s=>s.kind==='airplane'))this.lastAircraftChunk=this.chunksSpawned
    if(template.spawns.some(s=>s.kind==='bus'))this.lastBusChunk=this.chunksSpawned
    const pitStart = template.ground.pitStart
    const size=template.ground.pitSize??'small'
    const pitWidth = template.ground.pitWidth??(pitStart!==undefined?PIT_TYPES[size].width:undefined)

    if(template.terrain){
      const surfaces=[...template.terrain].sort((a,b)=>a.start-b.start)
      for(const surface of surfaces)this.spawnGroundRange(startX+surface.start,startX+surface.start+surface.width,surface.y,!!surface.pillar)
      for(let i=1;i<surfaces.length;i++){
        const prev=surfaces[i-1],next=surfaces[i],gap=next.start-prev.start-prev.width
        if(gap>0){const pit=new Obstacle(this.scene,startX+next.start-gap/2,'pit',{pitWidth:gap,y:Math.min(prev.y,next.y),leftY:prev.y,rightY:next.y,fallY:Math.max(prev.y,next.y)+7,pitTheme:'bridge'});this.obstacles.push(pit);this.obstacleGroup.add(pit)}
      }
    } else if (pitStart !== undefined && pitWidth !== undefined) {
      this.spawnGroundRange(startX, startX + pitStart)
      this.spawnGroundRange(startX + pitStart + pitWidth, startX + template.width)
      const gaps=pitGaps(size)
      for(const gap of gaps){
        const pit=new Obstacle(this.scene,startX+pitStart+gap.start+gap.width/2,'pit',{pitWidth:gap.width,pitTheme:PIT_TYPES[size].theme})
        this.obstacles.push(pit);this.obstacleGroup.add(pit)
      }
      if(gaps.length>1)this.spawnGroundRange(startX+pitStart+gaps[0].width,startX+pitStart+gaps[1].start)
    } else {
      this.spawnGroundRange(startX, startX + template.width)
    }

    for (const spawn of template.spawns) {
      if(spawn.kind==='civilian'){
        const settings=DifficultyManager.at(distance),x=startX+spawn.offsetX
        const opening=this.chunksSpawned<3
        if(!opening&&(x<this.nextCivilianX||Math.random()>settings.civilianChance))continue
        this.nextCivilianX=x+settings.civilianSpacing
      }
      if (spawn.kind === 'flight' && (distance < FLIGHT_MIN_DISTANCE || this.isFlightActive())) {
        continue
      }
      this.spawnDefinition(spawn, startX)
    }
  }

  private spawnInterChunkPit(startX: number): void {
    if (CHUNK_GAP <= 0) {
      return
    }

    const pit = new Obstacle(this.scene, startX + CHUNK_GAP / 2, 'pit', {
      pitWidth: CHUNK_GAP,
    })
    this.obstacles.push(pit)
    this.obstacleGroup.add(pit)
  }

  spawnDefinition(definition: SpawnDefinition, startX: number): void {
    const count = definition.count ?? 1
    const spacing = definition.spacing ?? 0

    for (let index = 0; index < count; index += 1) {
      const x = startX + definition.offsetX + spacing * index

      if (definition.kind === 'civilian') {
        const civilian = new Civilian(this.scene, x, definition.y)
        civilian.patrolWidth=definition.patrolWidth??24
        this.civilians.push(civilian)
        this.civilianGroup.add(civilian)
      } else if (definition.kind === 'coin') {
        const arc = definition.y < GROUND_Y - 25 && count > 1 ? (1 - Math.sin(Math.PI * index / (count - 1))) * 16 : 0
        this.spawnCoin(x,Math.round(definition.y+arc))
      } else if (['flight','magnet','rage','giant','boost'].includes(definition.kind)) {
        const kinds = ['magnet','rage','giant','flight','boost'] as const
        const kind = definition.kind === 'magnet' ? kinds[Math.max(0, Math.floor((this.chunksSpawned - 3) / 3)) % kinds.length] : definition.kind as typeof kinds[number]
        const powerup = new Powerup(this.scene, x, definition.y, kind)
        this.powerups.push(powerup)
        this.powerupGroup.add(powerup)
      } else {
        const obstacle = new Obstacle(this.scene, x, definition.kind as ObstacleKind, {
          y: definition.y,
        })
        this.obstacles.push(obstacle)
        this.obstacleGroup.add(obstacle)
        obstacle.attachRoofs(this.surfaceGroup)
      }
    }
  }

  spawnCoin(x:number,y:number):void{
    const coin=this.scene.physics.add.image(Math.round(x),Math.round(y),TEXTURES.COIN).setDepth(10).setImmovable(true)
    coin.body.setAllowGravity(false);this.coins.push(coin);this.coinGroup.add(coin)
  }

  /** Reserve the entire formation's descent, including chunks already streamed ahead. */
  reserveLanding(start:number,end:number):void{
    for(let i=this.groundSegments.length-1;i>=0;i--){const g=this.groundSegments[i];if(g.y!==GROUND_Y&&g.x+g.displayWidth>=start&&g.x<=end){start=Math.min(start,g.x);end=Math.max(end,g.x+g.displayWidth);g.destroy();this.groundSegments.splice(i,1)}}
    this.landing={start:Math.min(start,this.landing?.start??start),end:Math.max(end,this.landing?.end??end)}
    for(const obstacle of this.obstacles){
      if(!obstacle.active||obstacle.isSpent||obstacle.rightEdge<start||obstacle.leftEdge>end)continue
      if(obstacle.kind==='pit')this.ensureGround(obstacle.leftEdge,obstacle.rightEdge)
      obstacle.markSpent(true)
    }
    this.ensureGround(start,end)
  }

  isSafeLanding(x:number):boolean{return !!this.landing&&x>=this.landing.start&&x<=this.landing.end}

  private ensureGround(start:number,end:number):void{
    let cursor=start
    for(const segment of [...this.groundSegments].sort((a,b)=>a.x-b.x)){
      if(segment.x+segment.displayWidth<=cursor||segment.x>=end)continue
      if(segment.x>cursor)this.spawnGroundRange(cursor,Math.min(end,segment.x))
      cursor=Math.max(cursor,segment.x+segment.displayWidth)
      if(cursor>=end)return
    }
    if(cursor<end)this.spawnGroundRange(cursor,end)
  }

  private spawnGroundRange(startX: number, endX: number,y=GROUND_Y,pillar=false): void {
    let cursor = startX
    while (cursor < endX) {
      const width = Math.min(32, endX - cursor)
      const segment = this.scene.physics.add
        .staticImage(cursor, y, y===GROUND_Y&&!pillar?TEXTURES.GROUND:terrainTexture(this.scene,y,pillar))
        .setOrigin(0, 0)
        .setDisplaySize(width, y===GROUND_Y?GROUND_HEIGHT:270-y)
        .setDepth(5)
      segment.refreshBody()
      this.groundSegments.push(segment)
      this.groundGroup.add(segment)
      cursor += width
    }
  }

  private cleanupGround(cameraScrollX: number): void {
    const cleanupX = cameraScrollX + CLEANUP_X
    for (let index = this.groundSegments.length - 1; index >= 0; index -= 1) {
      const segment = this.groundSegments[index]
      if (segment.x + segment.displayWidth < cleanupX) {
        segment.destroy()
        this.groundSegments.splice(index, 1)
      }
    }
  }

  private cleanupEntities<T extends MovingEntity>(objects: T[], cameraScrollX: number): void {
    const cleanupX = cameraScrollX + CLEANUP_X
    for (let index = objects.length - 1; index >= 0; index -= 1) {
      const object = objects[index]
      if (!object.active) {
        object.destroy()
        objects.splice(index, 1)
        continue
      }

      if (object.x + object.displayWidth < cleanupX) {
        object.destroy()
        objects.splice(index, 1)
      }
    }
  }

  private destroyObjects(objects: Phaser.GameObjects.GameObject[]): void {
    for (const object of objects) {
      if (object.scene) {
        object.destroy()
      }
    }
    objects.length = 0
  }
}
