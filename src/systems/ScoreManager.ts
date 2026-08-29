import type { RunSummary } from '../config/GameConfig'

export class ScoreManager {
  private distanceValue = 0
  private scoreValue = 0
  private coinsValue = 0
  private absorbedValue = 0
  private currentHordeValue = 1
  private peakHordeValue = 1

  get distance(): number {
    return this.distanceValue
  }

  get score(): number {
    return Math.floor(this.scoreValue)
  }

  get runCoins(): number {
    return this.coinsValue
  }

  get currentHorde(): number {
    return this.currentHordeValue
  }

  updateDistance(worldPixels: number, hordeCount: number): void {
    const meters = worldPixels / 10
    const multiplier = 1 + Math.min(100, hordeCount) * 0.01
    this.distanceValue += meters
    this.scoreValue += meters * multiplier
  }

  recordAbsorption(hordeCount: number): void {
    this.absorbedValue += 1
    this.scoreValue += 25
    this.setHorde(hordeCount)
  }

  collectCoin(): void {
    this.coinsValue += 1
    this.scoreValue += 5
  }

  addBonus(points: number): void {
    this.scoreValue += Math.max(0, points)
  }

  setHorde(count: number): void {
    this.currentHordeValue = Math.max(0, Math.floor(count))
    this.peakHordeValue = Math.max(this.peakHordeValue, this.currentHordeValue)
  }

  summary(): RunSummary {
    return {
      score: this.score,
      distance: Math.floor(this.distanceValue),
      runCoins: this.coinsValue,
      zombiesAbsorbed: this.absorbedValue,
      currentHorde: this.currentHordeValue,
      peakHorde: this.peakHordeValue,
    }
  }
}
