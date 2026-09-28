export const JUMP = { speed: 205, holdMs: 220, riseGravity: 230, fallGravity: 620, terminal: 280, releaseSpeed: 135 } as const
export const PIT_TYPES = {
  tiny: { width: 24, minDistance: 0, theme: 'sewer', island: 0 },
  small: { width: 40, minDistance: 0, theme: 'sewer', island: 0 },
  medium: { width: 60, minDistance: 300, theme: 'water', island: 0 },
  large: { width: 80, minDistance: 1100, theme: 'subway', island: 0 },
  extraLarge: { width: 160, minDistance: 1500, theme: 'bridge', island: 48 },
  veryLarge: { width: 90, minDistance: 2200, theme: 'subway', island: 0 },
} as const
export type PitSize = keyof typeof PIT_TYPES
export type PitTheme = typeof PIT_TYPES[PitSize]['theme']

/** Conservative flight range using the same gravity/hold parameters as the live controller. */
export function jumpRange(speed: number): number {
  const dt = 1 / 120
  let y = 0, velocity: number = -JUMP.speed, time = 0
  do {
    velocity = Math.min(JUMP.terminal, velocity + (time * 1000 < JUMP.holdMs && velocity < 0 ? JUMP.riseGravity : JUMP.fallGravity) * dt)
    y += velocity * dt
    time += dt
  } while (y < 0 && time < 2)
  return speed * time
}

/** Horizontal reach at the target elevation, using the controller's full held jump. */
export function canClearGap(speed:number,gap:number,rise=0):boolean{
  let y=0,v:number=-JUMP.speed,t=0,descendingRange=0
  const dt=1/120
  while(t<2){
    v=Math.min(JUMP.terminal,v+(t*1000<JUMP.holdMs&&v<0?JUMP.riseGravity:JUMP.fallGravity)*dt)
    y+=v*dt;t+=dt
    if(v>0&&y<=-rise)descendingRange=speed*t
    if(v>0&&y>Math.max(0,-rise)+4)break
  }
  return rise<=42&&gap+4<=descendingRange
}

export function jumpClearance(speed:number,height:number):number{
  let y=0,v:number=-JUMP.speed,t=0,first=-1,last=0
  while(t<2){v+=(t*1000<JUMP.holdMs&&v<0?JUMP.riseGravity:JUMP.fallGravity)/120;y+=v/120;t+=1/120
    if(y<=-height){if(first<0)first=t;last=t}if(t>.25&&y>=0)break
  }
  return first<0?0:(last-first)*speed
}

export function pitGaps(size: PitSize): { start: number; width: number }[] {
  const pit = PIT_TYPES[size]
  if (!pit.island) return [{ start: 0, width: pit.width }]
  const gap = (pit.width - pit.island) / 2
  return [{ start: 0, width: gap }, { start: gap + pit.island, width: gap }]
}
