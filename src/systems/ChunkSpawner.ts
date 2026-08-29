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

export type ChunkDifficulty = 'easy' | 'medium' | 'hard'
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

const CHUNKS: readonly ChunkDefinition[] = [
  {
    id: 'civilian-lane',
    difficulty: 'easy',
    weight: 5,
    width: 240,
    ground: {},
    spawns: [
      { kind: 'civilian', offsetX: 34, y: GROUND_Y, count: 5, spacing: 27 },
      { kind: 'coin', offsetX: 45, y: 127, count: 7, spacing: 20 },
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
      { kind: 'coin', offsetX: 124, y: 118, count: 4, spacing: 14 },
    ],
  },
  {
    id: 'spike-hop',
    difficulty: 'medium',
    weight: 3,
    width: 228,
    ground: {},
    spawns: [
      { kind: 'coin', offsetX: 65, y: 108, count: 7, spacing: 17 },
      { kind: 'spike', offsetX: 145, y: GROUND_Y },
    ],
  },
  {
    id: 'short-pit',
    difficulty: 'medium',
    weight: 3,
    width: 240,
    ground: { pitStart: 92, pitWidth: 54 },
    spawns: [
      { kind: 'coin', offsetX: 76, y: 104, count: 6, spacing: 18 },
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
      { kind: 'coin', offsetX: 50, y: 104, count: 6, spacing: 18 },
      { kind: 'flight', offsetX: 175, y: 112 },
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
      { kind: 'coin', offsetX: 132, y: 124, count: 4, spacing: 16 },
    ],
  },
  {
    id: 'truck-route',
    difficulty: 'medium',
    weight: 2,
    width: 240,
    ground: {},
    spawns: [
      { kind: 'coin', offsetX: 82, y: 100, count: 7, spacing: 17 },
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
      { kind: 'coin', offsetX: 136, y: 92, count: 6, spacing: 18 },
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
      { kind: 'airplane', offsetX: 172, y: 108 },
      { kind: 'coin', offsetX: 202, y: 145, count: 3, spacing: 16 },
    ],
  },
]

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
  private nextChunkX = 220
  private chunksSpawned = 0

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isFlightActive: () => boolean,
  ) {
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

  update(cameraScrollX: number, distance: number): void {
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
    const shouldSupplyFlight =
      distance >= FLIGHT_MIN_DISTANCE &&
      !this.isFlightActive() &&
      this.chunksSpawned > 0 &&
      this.chunksSpawned % 6 === 0

    if (shouldSupplyFlight) {
      return CHUNKS[4]
    }

    const maxDifficulty: ChunkDifficulty = distance < 55 ? 'easy' : distance < 125 ? 'medium' : 'hard'
    const allowed = (difficulty: ChunkDifficulty): boolean => {
      if (maxDifficulty === 'hard') return true
      if (maxDifficulty === 'medium') return difficulty !== 'hard'
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
        const coin = this.scene.physics.add.image(x, definition.y, TEXTURES.COIN)
        coin.setDepth(10).setImmovable(true)
        coin.body.setAllowGravity(false)
        this.coins.push(coin)
        this.coinGroup.add(coin)
      } else if (definition.kind === 'flight') {
        const powerup = new Powerup(this.scene, x, definition.y)
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
