export const UPGRADES = {
  starting: { name: 'STARTING HORDE', description: 'ONE MORE ZOMBIE AT THE START', cost: 100, max: 4 },
  magnet: { name: 'MAGNET TIME', description: 'MAGNET LASTS 2 SECONDS LONGER', cost: 70, max: 4 },
  rage: { name: 'RAGE TIME', description: 'RAGE LASTS 2 SECONDS LONGER', cost: 90, max: 4 },
  coins: { name: 'COIN BONUS', description: 'ONE EXTRA COIN PER FIVE PICKUPS', cost: 80, max: 4 },
  frequency: { name: 'SUPPLY FREQUENCY', description: 'POWER-UPS ARRIVE MORE OFTEN', cost: 120, max: 3 },
} as const
export type Upgrade = keyof typeof UPGRADES
export const MISSIONS = [
  { id: 'infected', title: 'MAKE NEW FRIENDS', detail: 'CONVERT 20 CIVILIANS', target: 20, reward: 40 },
  { id: 'vehicles', title: 'ROAD CLEARANCE', detail: 'SMASH 3 VEHICLES', target: 3, reward: 60 },
  { id: 'coins', title: 'POCKET CHANGE', detail: 'COLLECT 50 COINS', target: 50, reward: 50 },
] as const
export interface SaveData {
  version: 2
  coins: number
  bestScore: number
  bestDistance: number
  upgrades: Record<Upgrade, number>
  missions: Record<string, number>
  claimed: string[]
  settings: { sound: boolean; music: boolean; shake: boolean }
  tutorialSeen: boolean
}
export const STORAGE_KEY = 'zombie-horde-runner:v1'
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1e12, Math.floor(v))) : 0
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
export function normalizeSave(value: unknown): SaveData {
  const r = record(value), u = record(r.upgrades), m = record(r.missions), s = record(r.settings)
  return { version: 2, coins: num(r.coins), bestScore: num(r.bestScore), bestDistance: num(r.bestDistance),
    upgrades: Object.fromEntries(Object.entries(UPGRADES).map(([k, v]) => [k, Math.min(v.max, num(u[k]))])) as Record<Upgrade, number>,
    missions: Object.fromEntries(MISSIONS.map(v => [v.id, Math.min(v.target, num(m[v.id]))])),
    claimed: Array.isArray(r.claimed) ? r.claimed.filter((v): v is string => typeof v === 'string' && MISSIONS.some(m => m.id === v)) : [],
    settings: { sound: s.sound !== false, music: s.music === true, shake: s.shake !== false }, tutorialSeen: r.tutorialSeen === true }
}
export class SaveManager {
  private cached?: SaveData
  storageAvailable = true
  load(): SaveData {
    if (!this.cached) {
      try { this.cached = normalizeSave(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')) }
      catch { this.cached = normalizeSave({}) }
    }
    return structuredClone(this.cached)
  }
  save(data: SaveData): void {
    this.cached = normalizeSave(data)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cached)); this.storageAvailable = true }
    catch { this.storageAvailable = false }
  }
  addCoins(amount: number): SaveData { const d = this.load(); d.coins += num(amount); this.save(d); return d }
  updateBest(score: number, distance: number): boolean {
    const d = this.load(), best = num(score) > d.bestScore
    d.bestScore = Math.max(d.bestScore, num(score)); d.bestDistance = Math.max(d.bestDistance, num(distance)); this.save(d); return best
  }
  purchase(key: Upgrade): boolean {
    const d = this.load(), upgrade = UPGRADES[key], cost = upgrade.cost * (d.upgrades[key] + 1)
    if (d.upgrades[key] >= upgrade.max || d.coins < cost) return false
    d.coins -= cost; d.upgrades[key]++; this.save(d); return true
  }
  progress(id: string, amount = 1): string[] {
    const d = this.load(), mission = MISSIONS.find(m => m.id === id)
    if (!mission || d.claimed.includes(id)) return []
    d.missions[id] = Math.min(mission.target, (d.missions[id] ?? 0) + amount)
    const completed = d.missions[id] >= mission.target
    if (completed) { d.claimed.push(id); d.coins += mission.reward }
    this.save(d)
    return completed ? [mission.title] : []
  }
}
export const saveManager = new SaveManager()
