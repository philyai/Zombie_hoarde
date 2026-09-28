import { MAX_SPEED, START_SPEED } from '../config/GameConfig'

export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'chaos'
export const INTRO_DISTANCE = { car: 0, bus: 250, mediumPit: 300, largePit: 1100, airplane: 1200, extraLargePit: 1500 } as const

/** Progression is a pure function of meters, independent of frame rate or run duration. */
export class DifficultyManager {
  static at(distance: number) {
    const meters = Math.max(0, distance)
    const progress = Math.min(1, meters / 3000)
    const speed = START_SPEED + (MAX_SPEED - START_SPEED) * Math.sqrt(progress)
    const tier: DifficultyTier = meters < 250 ? 'easy' : meters < 900 ? 'medium' : meters < 1500 ? 'hard' : 'chaos'
    return {
      speed, tier,
      hazardProbability: Math.min(.97, .78 + meters / 8000),
      civilianChance: Math.max(.22, .72 - meters / 3500),
      civilianSpacing: Math.min(1100, 340 + meters * .35),
      maxMines: meters < 250 ? 1 : meters < 500 ? 2 : meters < 900 ? 3 : 4,
      maxStep: meters < 250 ? 16 : meters < 500 ? 24 : 32,
      complexity: meters < 250 ? 1 : meters < 500 ? 2 : meters < 900 ? 3 : meters < 1500 ? 4 : 5,
      busWeight: meters < INTRO_DISTANCE.bus ? 0 : Math.min(4, 1 + (meters - 250) / 600),
      airplaneWeight: meters < INTRO_DISTANCE.airplane ? 0 : Math.min(.8, .35 + meters / 10000),
      recoveryPixels: Math.ceil(speed * (meters < 250 ? 1.8 : meters < 900 ? 1.55 : 1.35)),
    }
  }
}
