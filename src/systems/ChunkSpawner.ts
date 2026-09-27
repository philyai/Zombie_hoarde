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
  | 'flight'
  | 'magnet' | 'rage' | 'giant' | 'boost' | 'electric' | 'armored' | 'moving-car' | 'falling'

interface SpawnDefinition {
  kind: SpawnKind
  offsetX: number
  y: number
  count?: number
  spacing?: number
}

interface GroundDefinition {
  pitStart?: number
  pitWidth?: number
}

interface ChunkDefinition {
  id: string
  difficulty: ChunkDifficulty
  weight: number
  width: number
  ground: GroundDefinition
  spawns: readonly SpawnDefinition[]
}

export const CHUNKS: readonly ChunkDefinition[] = [
  {
    id: 'civilian-lane',
    difficulty: 'easy',
    weight: 5,
    width: 240,
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
    difficulty: 'hard',
    weight: 1,
    width: 270,
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
    weight: 2,
    width: 260,
    ground: {},
    spawns: [
      { kind: 'civilian', offsetX: 40, y: GROUND_Y, count: 3, spacing: 24 },
      { kind: 'airplane', offsetX: 172, y: GROUND_Y - 68 },
      { kind: 'coin', offsetX: 202, y: GROUND_Y - 16, count: 3, spacing: 16 },
    ],
  },
  { id:'power-lane', difficulty:'easy', weight:1, width:280, ground:{}, spawns:[{kind:'magnet',offsetX:40,y:GROUND_Y-16},{kind:'coin',offsetX:80,y:GROUND_Y-40,count:8,spacing:19},{kind:'civilian',offsetX:235,y:GROUND_Y}] },
  { id:'electric-block', difficulty:'hard', weight:2, width:280, ground:{}, spawns:[{kind:'coin',offsetX:90,y:GROUND_Y-58,count:6,spacing:16},{kind:'electric',offsetX:143,y:GROUND_Y},{kind:'civilian',offsetX:238,y:GROUND_Y}] },
  { id:'armored-route', difficulty:'chaos', weight:2, width:320, ground:{}, spawns:[{kind:'civilian',offsetX:35,y:GROUND_Y,count:3,spacing:24},{kind:'armored',offsetX:215,y:GROUND_Y},{kind:'coin',offsetX:175,y:GROUND_Y-62,count:6,spacing:16}] },
  { id:'oncoming-car', difficulty:'hard', weight:2, width:310, ground:{}, spawns:[{kind:'moving-car',offsetX:215,y:GROUND_Y},{kind:'coin',offsetX:75,y:GROUND_Y-52,count:5,spacing:18},{kind:'civilian',offsetX:280,y:GROUND_Y}] },
  { id:'falling-cargo', difficulty:'hard', weight:2, width:285, ground:{}, spawns:[{kind:'falling',offsetX:155,y:GROUND_Y},{kind:'coin',offsetX:98,y:GROUND_Y-49,count:6,spacing:16},{kind:'civilian',offsetX:242,y:GROUND_Y}] },
]

/** Reject overlap, unreachable gaps and crowded hazard boundaries before spawning. */
export function validateChunks(): string[] {
  const errors:string[]=[]
  const width:Record<string,number>={fence:22,spike:26,car:40,truck:48,bus:66,airplane:46,electric:24,armored:62,'moving-car':40,falling:22}
  for(const c of CHUNKS){
    const hazards=c.spawns.filter(s=>width[s.kind]).map(s=>({left:s.offsetX-width[s.kind]/2,right:s.offsetX+width[s.kind]/2}))
    if(c.ground.pitStart!==undefined){const p=c.ground.pitStart,w=c.ground.pitWidth??0;hazards.push({left:p,right:p+w});if(w>44)errors.push(`${c.id}: gap too wide`)}
    hazards.sort((a,b)=>a.left-b.left)
    hazards.forEach((h,i)=>{if(h.left<55||h.right>c.width-45)errors.push(`${c.id}: unsafe boundary`);if(i&&h.left-hazards[i-1].right<95)errors.push(`${c.id}: recovery too short`)})
    for(const s of c.spawns)for(let i=0;i<(s.count??1);i++){const x=s.offsetX+i*(s.spacing??0);if(x<0||x>c.width)errors.push(`${c.id}: spawn out of bounds`);if(s.kind==='civilian'&&hazards.some(h=>x>h.left-12&&x<h.right+12))errors.push(`${c.id}: civilian inside hazard`)}
  }
  return errors
}

type MovingEntity = Civilian | Obstacle | Powerup | Phaser.Physics.Arcade.Image

export class ChunkSpawner {
  readonly groundGroup: Phaser.Physics.Arcade.StaticGroup
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

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isFlightActive: () => boolean,
  ) {
    const errors=validateChunks();if(errors.length)throw new Error(errors.join('\n'))
    this.groundGroup = scene.physics.add.staticGroup()
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
      this.nextChunkX += template.width + CHUNK_GAP
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
    this.civilianGroup.destroy()
    this.obstacleGroup.destroy()
    this.coinGroup.destroy()
    this.powerupGroup.destroy()
  }

  private chooseChunk(distance: number): ChunkDefinition {
    // Authored opening: friends, a readable gap, recruits and the first car, then a magnet.
    const opening=[0,3,5,9,1]
    if(this.chunksSpawned<opening.length)return CHUNKS[opening[this.chunksSpawned]]
    const shouldSupplyFlight =
      distance >= FLIGHT_MIN_DISTANCE &&
      !this.isFlightActive() &&
      this.chunksSpawned > 0 &&
      this.chunksSpawned % (6 - saveManager.load().upgrades.frequency) === 0

    if (shouldSupplyFlight) {
      return CHUNKS[9]
    }

    const maxDifficulty: ChunkDifficulty = distance < 160 ? 'easy' : distance < 380 ? 'medium' : distance < 850 ? 'hard' : 'chaos'
    this.difficulty = maxDifficulty
    const allowed = (difficulty: ChunkDifficulty): boolean => {
      if (maxDifficulty === 'chaos') return true
      if (maxDifficulty === 'hard') return difficulty !== 'chaos'
      if (maxDifficulty === 'medium') return difficulty === 'easy' || difficulty === 'medium'
      return difficulty === 'easy'
    }

    let totalWeight = 0
    for (const chunk of CHUNKS) {
      if (allowed(chunk.difficulty)) {
        totalWeight += chunk.weight
      }
    }

    let roll = Math.random() * totalWeight
    for (const chunk of CHUNKS) {
      if (!allowed(chunk.difficulty)) {
        continue
      }
      roll -= chunk.weight
      if (roll <= 0) {
        return chunk
      }
    }

    return CHUNKS[0]
  }

  private spawnChunk(template: ChunkDefinition, startX: number, distance: number): void {
    this.currentChunk = template.id
    const pitStart = template.ground.pitStart
    const pitWidth = template.ground.pitWidth

    if (pitStart !== undefined && pitWidth !== undefined) {
      this.spawnGroundRange(startX, startX + pitStart)
      this.spawnGroundRange(startX + pitStart + pitWidth, startX + template.width)
      const pit = new Obstacle(this.scene, startX + pitStart + pitWidth / 2, 'pit', {
        pitWidth,
      })
      this.obstacles.push(pit)
      this.obstacleGroup.add(pit)
    } else {
      this.spawnGroundRange(startX, startX + template.width)
    }

    for (const spawn of template.spawns) {
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

  private spawnDefinition(definition: SpawnDefinition, startX: number): void {
    const count = definition.count ?? 1
    const spacing = definition.spacing ?? 0

    for (let index = 0; index < count; index += 1) {
      const x = startX + definition.offsetX + spacing * index

      if (definition.kind === 'civilian') {
        const civilian = new Civilian(this.scene, x, definition.y)
        this.civilians.push(civilian)
        this.civilianGroup.add(civilian)
      } else if (definition.kind === 'coin') {
        const arc = definition.y < GROUND_Y - 25 && count > 1 ? (1 - Math.sin(Math.PI * index / (count - 1))) * 16 : 0
        const coin = this.scene.physics.add.image(x, Math.round(definition.y + arc), TEXTURES.COIN)
        coin.setDepth(10).setImmovable(true)
        coin.body.setAllowGravity(false)
        this.coins.push(coin)
        this.coinGroup.add(coin)
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
      }
    }
  }

  private spawnGroundRange(startX: number, endX: number): void {
    let cursor = startX
    while (cursor < endX) {
      const width = Math.min(32, endX - cursor)
      const segment = this.scene.physics.add
        .staticImage(cursor, GROUND_Y, TEXTURES.GROUND)
        .setOrigin(0, 0)
        .setDisplaySize(width, GROUND_HEIGHT)
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
