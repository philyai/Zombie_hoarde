import { test, expect, type Page } from '@playwright/test'

const state = (page:Page) => page.evaluate(()=>{const g=(window as any).__GAME__,s=g.scene.getScene('game');return {scene:g.scene.getScenes(true)[0].scene.key,state:s.state,count:s.horde?.count,x:s.horde?.leader.x,y:s.horde?.leader.y,coins:s.score?.runCoins,score:s.score?.score,elapsed:s.elapsed,visible:s.horde?.sprites.filter((m:any)=>m.active&&m.visible).length}})
async function boot(page:Page,save?:object){
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  if(save)await page.addInitScript(value=>localStorage.setItem('zombie-horde-runner:v1',JSON.stringify(value)),save)
  await page.goto('/');await page.waitForFunction(()=>(window as any).__GAME__?.scene.isActive('menu'))
  return errors
}
async function clickAt(page:Page,x:number,y:number){const box=await page.locator('canvas').boundingBox();if(!box)throw Error('No canvas');await page.mouse.click(box.x+x*box.width/480,box.y+y*box.height/270)}
async function play(page:Page){await clickAt(page,240,171);await page.waitForFunction(()=>(window as any).__GAME__.scene.isActive('game'));await page.waitForTimeout(120)}
async function inject(page:Page,kind:string){
  await page.evaluate(kind=>{
    const s=(window as any).__GAME__.scene.getScene('game')
    s.spawner.spawnDefinition({kind,offsetX:28,y:224},s.horde.leader.x)
  },kind)
}
async function buttonByLabel(page:Page,label:string){
  // Same canvas callback used by pointer/keyboard controls, for offscreen menu setup only.
  await page.evaluate(label=>{const s=(window as any).__GAME__.scene.getScenes(true)[0];const b=s.children.list.find((o:any)=>o.getData?.('label')===label);if(!b)throw Error(`Missing button ${label}`);b.getData('activate')()},label)
}

test('full flow: real intro, jump, growth, damage, smash, power, pause, death, save, retry, purchase',async({page})=>{
  const errors=await boot(page);await play(page)
  await page.waitForFunction(()=>{const s=(window as any).__GAME__.scene.getScene('game');return s.horde.count===3&&s.score.runCoins>=5})
  expect((await state(page)).visible).toBe(3)
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').horde.leader.x>=478)
  await page.keyboard.down('Space');await page.waitForTimeout(340);await page.keyboard.up('Space')
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').horde.leader.x>=575)
  expect((await state(page)).count).toBe(3)
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').horde.count>=5)
  const losses=await page.evaluate(()=>(window as any).__GAME__.scene.getScene('game').horde.lost);await inject(page,'spike')
  await page.waitForFunction(losses=>(window as any).__GAME__.scene.getScene('game').horde.lost>losses,losses)
  expect((await state(page)).state).toBe('playing')
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('zombie-horde-runner:v1')!).missions.vehicles>=1)
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').powers.active.size>0)
  await page.keyboard.press('Escape');expect((await state(page)).state).toBe('paused')
  const frozen=await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');return {elapsed:s.elapsed,x:s.horde.leader.x,powers:[...s.powers.active]}})
  await page.waitForTimeout(350)
  expect(await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');return {elapsed:s.elapsed,x:s.horde.leader.x,powers:[...s.powers.active]}})).toEqual(frozen)
  await page.keyboard.press('Escape');expect((await state(page)).state).toBe('playing')
  // Controlled fatal collision, after naturally completing the introductory sequence.
  await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');s.powers.active.clear();s.horde.removeZombies(s.horde.count-1)})
  await inject(page,'electric');await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').state==='dying')
  const finalRun=await state(page);expect(finalRun.count).toBe(0)
  await page.waitForTimeout(200);expect((await state(page)).scene).toBe('game')
  await page.waitForFunction(()=>(window as any).__GAME__.scene.isActive('game-over'))
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zombie-horde-runner:v1')!))
  expect(saved.coins).toBeGreaterThanOrEqual(finalRun.coins);expect(saved.bestScore).toBeGreaterThanOrEqual(finalRun.score)
  await clickAt(page,240,205);await page.waitForTimeout(150)
  expect((await state(page)).count).toBe(1);expect((await state(page)).coins).toBe(0)
  await page.keyboard.press('Escape');await buttonByLabel(page,'MAIN MENU')
  // Seed earned currency to test the affordable branch without a grinding session.
  await page.evaluate(()=>(window as any).__SAVE__.addCoins(150))
  await buttonByLabel(page,'UPGRADES');await page.waitForTimeout(100);await buttonByLabel(page,'100 BUY')
  await page.waitForTimeout(100);await buttonByLabel(page,'BACK');await page.waitForTimeout(100);await play(page)
  expect((await state(page)).count).toBe(2)
  expect(errors).toEqual([])
})

test('short and held jumps differ; held Space does not auto-jump on landing',async({page})=>{
  const errors=await boot(page);await play(page)
  const baseline=(await state(page)).y
  await page.keyboard.down('Space');await page.waitForTimeout(35);await page.keyboard.up('Space');await page.waitForTimeout(130)
  const short=(await state(page)).y;expect(short).toBeLessThan(baseline-8)
  await page.waitForTimeout(420)
  await page.keyboard.down('Space');await page.waitForTimeout(300)
  const high=(await state(page)).y;expect(high).toBeLessThan(short-15)
  await page.waitForTimeout(850);expect((await state(page)).y).toBeCloseTo(baseline,0)
  await page.keyboard.up('Space');expect(errors).toEqual([])
})

test('pause midair, focus loss, rapid retries, UI clicks never jump',async({page})=>{
  const errors=await boot(page);await play(page)
  await page.keyboard.down('Space');await page.waitForTimeout(130);await page.keyboard.press('Escape')
  const y=(await state(page)).y;await page.waitForTimeout(200);expect((await state(page)).y).toBe(y)
  await page.keyboard.up('Space');await page.keyboard.press('Escape');await page.waitForTimeout(450)
  await page.evaluate(()=>(window as any).__GAME__.events.emit('blur'))
  expect((await state(page)).state).toBe('paused')
  for(let i=0;i<4;i++){await buttonByLabel(page,'RESTART');await page.waitForTimeout(120);expect((await state(page)).count).toBe(1);await page.keyboard.press('Escape')}
  await buttonByLabel(page,'RESUME');await page.waitForTimeout(120)
  expect((await state(page)).y).toBeCloseTo(210,0)
  const listeners=await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');return s.input.listenerCount('pointerdown')})
  expect(listeners).toBe(1);expect(errors).toEqual([])
})

test('five powers apply and expire, 60 members stay visible, dead horde cannot collect',async({page})=>{
  const errors=await boot(page);await play(page)
  await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');for(let i=1;i<60;i++)s.horde.addZombie();for(const k of ['flight','magnet','rage','giant','boost'])s.powers.activate(k)})
  await page.waitForTimeout(100)
  const snapshot=await state(page);expect(snapshot.count).toBeGreaterThanOrEqual(60);expect(snapshot.visible).toBe(snapshot.count)
  const active=await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');return {flight:s.horde.isFlightActive,giant:s.horde.giant,rage:s.horde.invulnerable}})
  expect(active).toEqual({flight:true,giant:true,rage:true})
  await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');for(const p of s.powers.active.values())p.remaining=40})
  await page.waitForTimeout(100)
  expect(await page.evaluate(()=>(window as any).__GAME__.scene.getScene('game').powers.active.size)).toBe(0)
  const coinsBefore=(await state(page)).coins
  await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');s.horde.removeZombies(999);const coins=s.spawner.coinGroup.getChildren();for(const coin of coins)s.collisions.collectCoin(coin)})
  expect((await state(page)).coins).toBe(coinsBefore);expect(errors).toEqual([])
})

test('migration, corrupted data, mission rewards once, upgrade cost and safe chunk definitions',async({page})=>{
  await boot(page,{coins:123,bestScore:45,bestDistance:67})
  const result=await page.evaluate(async()=>{
    const {saveManager,normalizeSave}=await import('/src/systems/SaveManager.ts' as string)
    const {validateChunks}=await import('/src/systems/ChunkSpawner.ts' as string)
    const old=saveManager.load();const invalid=normalizeSave({coins:-1,bestScore:'bad',upgrades:{starting:1e20},settings:null})
    const first=saveManager.progress('infected',20),second=saveManager.progress('infected',20)
    const purchased=saveManager.purchase('starting'),balance=saveManager.load().coins
    return {old,invalid,first,second,purchased,balance,chunks:validateChunks()}
  })
  expect(result.old.coins).toBe(123);expect(result.old.upgrades.starting).toBe(0)
  expect(result.invalid.coins).toBe(0);expect(result.invalid.bestScore).toBe(0);expect(result.invalid.upgrades.starting).toBe(4)
  expect(result.first).toHaveLength(1);expect(result.second).toHaveLength(0)
  expect(result.purchased).toBe(true);expect(result.balance).toBe(63);expect(result.chunks).toEqual([])
  await page.evaluate(()=>localStorage.setItem('zombie-horde-runner:v1','{broken'))
  // Read normalization with a fresh manager; avoids replacing this test's seed init script.
  expect(await page.evaluate(async()=>{const {SaveManager}=await import('/src/systems/SaveManager.ts' as string);return new SaveManager().load().coins})).toBe(0)
})

test('responsive screens stay within canvas and no runtime errors',async({page})=>{
  const errors=await boot(page)
  for(const size of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
    await page.setViewportSize(size);await page.waitForTimeout(120)
    const box=await page.locator('canvas').boundingBox();expect(box).not.toBeNull()
    expect(box!.width/box!.height).toBeCloseTo(16/9,2)
    expect(box!.x).toBeGreaterThanOrEqual(-1);expect(box!.y).toBeGreaterThanOrEqual(-1)
    expect(box!.x+box!.width).toBeLessThanOrEqual(size.width+1);expect(box!.y+box!.height).toBeLessThanOrEqual(size.height+1)
    expect(Math.abs(box!.x-(size.width-box!.width)/2)).toBeLessThan(2)
    expect(Math.abs(box!.y-(size.height-box!.height)/2)).toBeLessThan(2)
  }
  expect(errors).toEqual([])
})

test('simultaneous civilians convert once and overlapping hazards never underflow the horde',async({page})=>{
  const errors=await boot(page);await play(page)
  await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');s.spawner.spawnDefinition({kind:'civilian',offsetX:6,y:224,count:6,spacing:0},s.horde.leader.x)})
  await page.waitForTimeout(150)
  expect((await state(page)).count).toBe(7)
  expect(await page.evaluate(()=>(window as any).__GAME__.scene.getScene('game').score.summary().zombiesAbsorbed)).toBe(6)
  await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');s.horde.removeZombies(6);s.spawner.spawnDefinition({kind:'electric',offsetX:8,y:224,count:2,spacing:0},s.horde.leader.x)})
  await page.waitForTimeout(120);expect((await state(page)).count).toBe(0);expect((await state(page)).state).toBe('dying')
  expect(errors).toEqual([])
})

test('long world streaming removes old entities and has bounded active objects',async({page})=>{
  await boot(page);await play(page);await page.keyboard.press('Escape')
  const counts=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game');let peak=0
    for(let x=0;x<200000;x+=200){s.spawner.update(x,x/10,16,x+145);peak=Math.max(peak,s.spawner.groundGroup.getLength()+s.spawner.obstacleGroup.getLength()+s.spawner.coinGroup.getLength()+s.spawner.civilianGroup.getLength()+s.spawner.powerupGroup.getLength())}
    return {peak,objects:s.children.length}
  })
  expect(counts.peak).toBeLessThan(170);expect(counts.objects).toBeLessThan(250)
})

test('touch jump and pause work in mobile landscape',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true})
  const page=await context.newPage();await boot(page)
  const box=await page.locator('canvas').boundingBox();if(!box)throw Error('No canvas')
  const tap=async(x:number,y:number)=>page.touchscreen.tap(box.x+x*box.width/480,box.y+y*box.height/270)
  await tap(240,171);await page.waitForTimeout(180);await tap(300,160);await page.waitForTimeout(100)
  expect((await state(page)).y).toBeLessThan(205)
  await tap(458,16);expect((await state(page)).state).toBe('paused')
  await tap(240,103);expect((await state(page)).state).toBe('playing')
  await context.close()
})

test('30/60/120 FPS simulations preserve distance and jump height',async({browser})=>{
  const samples:{distance:number;height:number}[]=[]
  for(const fps of [30,60,120]){
    const context=await browser.newContext(),page=await context.newPage();await boot(page);await play(page)
    samples.push(await page.evaluate(fps=>{
      const game=(window as any).__GAME__,s=game.scene.getScene('game');game.loop.stop()
      const start=s.horde.leader.x,baseline=s.horde.leader.y
      s.physics.world._elapsed=0;s.inputBlocked=false;s.pointerHeld=true;s.jumpQueued=true
      let minimum=baseline
      for(let i=0;i<fps;i++){if(i/fps>.22)s.pointerHeld=false;s.sys.step(i*1000/fps,1000/fps);minimum=Math.min(minimum,s.horde.leader.y)}
      return {distance:s.horde.leader.x-start,height:baseline-minimum}
    },fps))
    await context.close()
  }
  expect(Math.max(...samples.map(s=>s.distance))-Math.min(...samples.map(s=>s.distance))).toBeLessThan(2)
  expect(Math.max(...samples.map(s=>s.height))-Math.min(...samples.map(s=>s.height))).toBeLessThan(6)
})

test('coin upgrade pays per five pickups, independently of awarded coins',async({page})=>{
  await boot(page,{upgrades:{coins:4}});await play(page)
  await page.evaluate(()=>{const s=(window as any).__GAME__.scene.getScene('game');s.spawner.spawnDefinition({kind:'coin',offsetX:8,y:210,count:10,spacing:0},s.horde.leader.x)})
  await page.waitForTimeout(150)
  expect((await state(page)).coins).toBe(18)
  expect(await page.evaluate(()=>(window as any).__GAME__.scene.getScene('game').score.coinPickups)).toBe(10)
})
