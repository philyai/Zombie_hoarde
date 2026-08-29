export interface SaveData {
  coins: number
  bestScore: number
  bestDistance: number
}

const STORAGE_KEY = 'zombie-horde-runner:v1'
const EMPTY_SAVE: SaveData = {
  coins: 0,
  bestScore: 0,
  bestDistance: 0,
}

function validNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0
}

export class SaveManager {
  load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return { ...EMPTY_SAVE }
      }

      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) {
        return { ...EMPTY_SAVE }
      }

      const record = parsed as Record<string, unknown>
      return {
        coins: validNumber(record.coins),
        bestScore: validNumber(record.bestScore),
        bestDistance: validNumber(record.bestDistance),
      }
    } catch {
      return { ...EMPTY_SAVE }
    }
  }

  save(data: SaveData): void {
    const safeData: SaveData = {
      coins: validNumber(data.coins),
      bestScore: validNumber(data.bestScore),
      bestDistance: validNumber(data.bestDistance),
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData))
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }

  addCoins(amount: number): SaveData {
    const data = this.load()
    data.coins += validNumber(amount)
    this.save(data)
    return data
  }

  updateBest(score: number, distance: number): boolean {
    const data = this.load()
    const safeScore = validNumber(score)
    const safeDistance = validNumber(distance)
    const isNewBest = safeScore > data.bestScore

    data.bestScore = Math.max(data.bestScore, safeScore)
    data.bestDistance = Math.max(data.bestDistance, safeDistance)
    this.save(data)
    return isNewBest
  }
}

export const saveManager = new SaveManager()
