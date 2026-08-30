export const SCENES = {
  BOOT: 'boot',
  MENU: 'menu',
  GAME: 'game',
  GAME_OVER: 'game-over',
} as const

export const TEXTURES = {
  LEADER: 'leader-zombie',
  FOLLOWER: 'follower-zombie',
  CIVILIAN: 'civilian',
  COIN: 'coin',
  FENCE: 'fence',
  SPIKE: 'spike',
  PIT: 'pit',
  CAR: 'car',
  TRUCK: 'truck',
  BUS: 'bus',
  AIRPLANE: 'airplane',
  FLIGHT: 'flight-pack',
  GROUND: 'ground',
} as const

export const GAME_WIDTH = 384
export const GAME_HEIGHT = 216
export const GROUND_Y = 184
export const GROUND_HEIGHT = GAME_HEIGHT - GROUND_Y
export const PLAYER_X = 74
export const CAMERA_FOLLOW_X = 118
export const GAME_WORLD_WIDTH = 10_000_000

export const START_SPEED = 66
export const MAX_SPEED = 130
export const SPEED_ACCELERATION = 1.8

export const LEADER_GRAVITY = 450
export const RISE_ACCELERATION = 1600
export const DROP_ACCELERATION = 950
export const MAX_RISE_SPEED = 105
export const MAX_FALL_SPEED = 210
export const DIVE_THRESHOLD = 150
export const HOVER_CEILING_Y = 98
export const MAX_JUMP_HOLD_MS = 650
export const PIT_GROUNDED_TOLERANCE = 4

export const HISTORY_SAMPLE_DISTANCE = 2
export const FOLLOWER_SPACING = 3
export const MAX_VISIBLE_FOLLOWERS = 100
export const START_HORDE_SIZE = 1
export const CRITICAL_MASS_SIZE = 50

export const DAMAGE_PERCENT = 0.125
export const MIN_DAMAGE = 1
export const MAX_DAMAGE = 12

export const FLIGHT_DURATION_MS = 6000
export const FLIGHT_CRUISE_Y = 82
export const FLIGHT_COLLECTION_RADIUS = 68
export const FLIGHT_MIN_DISTANCE = 60

export const CHUNK_GAP = 16
export const CHUNK_SPAWN_AHEAD = 90
export const CLEANUP_X = -80

export const COLORS = {
  SKY: 0x10191d,
  SKY_ACCENT: 0x172a2d,
  GROUND: 0x27342d,
  GROUND_EDGE: 0x52705a,
  LEADER: 0x8ee36b,
  FOLLOWER: 0x5caf55,
  CIVILIAN: 0x67b8ff,
  COIN: 0xf4d35e,
  FENCE: 0xa66f3f,
  SPIKE: 0xd8d9df,
  PIT: 0x050708,
  CAR: 0xe85d75,
  TRUCK: 0xf29e4c,
  BUS: 0xe4c84b,
  AIRPLANE: 0xa4d5e6,
  FLIGHT: 0xff7b54,
  TEXT: '#ecf6e8',
  MUTED_TEXT: '#91aaa0',
  DANGER_TEXT: '#ff7069',
} as const

export interface RunSummary {
  score: number
  distance: number
  runCoins: number
  zombiesAbsorbed: number
  currentHorde: number
  peakHorde: number
}

export interface GameOverData extends RunSummary {
  isNewBest: boolean
}
