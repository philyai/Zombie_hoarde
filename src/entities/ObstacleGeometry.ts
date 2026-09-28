export interface Rect { x: number; y: number; width: number; height: number }
export interface CollisionZone extends Rect { name: string; roof?: boolean }
export const LARGE_VEHICLES = {
  bus: {
    width: 104, height: 44, requirement: 8, score: 250, passengers: 0,
    zones: [
      { name: 'rear', x: 3, y: 9, width: 15, height: 28, roof: true },
      { name: 'roof-body', x: 18, y: 4, width: 65, height: 33, roof: true },
      { name: 'front', x: 83, y: 10, width: 18, height: 27, roof: true },
      { name: 'rear-wheel', x: 14, y: 35, width: 13, height: 9 },
      { name: 'front-wheel', x: 80, y: 35, width: 13, height: 9 },
    ] as CollisionZone[],
  },
  airplane: {
    width: 256, height: 92, requirement: 16, score: 900, passengers: 2,
    zones: [
      { name: 'nose', x: 7, y: 66, width: 23, height: 13, roof: true },
      { name: 'wing', x: 30, y: 55, width: 37, height: 17, roof: true },
      { name: 'fuselage', x: 67, y: 34, width: 125, height: 37, roof: true },
      { name: 'tail-fin', x: 192, y: 8, width: 25, height: 63, roof: true },
      { name: 'tail-wing', x: 217, y: 61, width: 31, height: 11, roof: true },
      { name: 'nose-gear', x: 33, y: 72, width: 11, height: 20 },
      { name: 'main-gear', x: 150, y: 70, width: 16, height: 22 },
    ] as CollisionZone[],
  },
} as const

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width - .01 && a.x + a.width > b.x + .01 && a.y < b.y + b.height - .01 && a.y + a.height > b.y + .01
}

/** Swept AABB for thin hazards. Touching a supporting top edge alone is not a hit. */
export function sweptHit(previous: Rect, current: Rect, zone: Rect): boolean {
  if (intersects(current, zone)) return true
  const dx = current.x - previous.x, dy = current.y - previous.y
  let enter = 0, exit = 1
  for (const [position, movement, minimum, maximum] of [
    [previous.x, dx, zone.x - previous.width + .01, zone.x + zone.width - .01],
    [previous.y, dy, zone.y - previous.height + .01, zone.y + zone.height - .01],
  ]) {
    if (Math.abs(movement) < .0001) { if (position < minimum || position > maximum) return false }
    else {
      const a = (minimum - position) / movement, b = (maximum - position) / movement
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b))
      if (enter > exit) return false
    }
  }
  return exit >= 0 && enter <= 1 && enter <= exit
}
