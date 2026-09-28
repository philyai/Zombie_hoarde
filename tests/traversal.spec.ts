import { test, expect, type Page } from '@playwright/test'

async function arena(page:Page,count=1,distance=0){
  await page.goto('/')
  await page.waitForFunction(()=>(window as any).__GAME__?.scene.isActive('menu'))
  await page.evaluate(()=>{const g=(window as any).__GAME__;g.scene.start('game')})
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').horde?.count)
  await page.evaluate(({count,distance})=>{
    const game=(window as any).__GAME__,s=game.scene.getScene('game');game.loop.stop()
    for(const group of [s.spawner.obstacleGroup,s.spawner.coinGroup,s.spawner.civilianGroup,s.spawner.powerupGroup])for(const item of [...group.getChildren()])item.destroy()
    s.spawner.obstacles=[];s.spawner.coins=[];s.spawner.civilians=[];s.spawner.powerups=[]
    s.spawner.nextChunkX=1e8;s.spawner.ensureGround(0,6000)
    while(s.horde.count<count)s.horde.addZombie()
    s.horde.sprites.forEach((z:any,i:number)=>{z.body.reset(2000-(i%12)*10-Math.floor(i/12)*2,210);z.body.setVelocity(0,0)})
    s.score.distanceValue=distance;s.physics.world._elapsed=0;s.inputBlocked=false;s.pointerHeld=false
    for(let i=0;i<3;i++)s.sys.step(i*1000/60,1000/60)
  },{count,distance})
}

for(const [kind,required,counts] of [['bus',8,[1,7,8,20]],['airplane',16,[1,15,16,30]]] as const){
  for(const count of counts)test(`${kind}: grounded requirement with horde ${count}`,async({page})=>{
    await arena(page,count)
    const result=await page.evaluate(({kind,required})=>{
      const s=(window as any).__GAME__.scene.getScene('game'),before=s.horde.sprites
      const width=kind==='bus'?104:256
      s.spawner.spawnDefinition({kind,offsetX:2200,y:224},0)
      const o=s.spawner.obstacleGroup.getChildren()[0]
      const face=2200-width/2+(kind==='bus'?3:7)
      before.forEach((z:any,i:number)=>{z.body.reset(face-5-(i%12)*10-Math.floor(i/12)*2,210);z.body.updateFromGameObject()})
      s.collisions.checkObstacles()
      s.collisions.update(600)
      return {count:s.horde.count,spent:o.isSpent,firstAlive:s.horde.sprites.includes(before[0]),others:before.slice(1).every((z:any)=>s.horde.sprites.includes(z)),requirement:o.requirement,required}
    },{kind,required})
    expect(result.requirement).toBe(required)
    if(count<required){expect(result.count).toBeLessThan(count);expect(result.spent).toBe(false);expect(result.firstAlive).toBe(false)}
    else {expect(result.count).toBe(count+(kind==='bus'?0:2));expect(result.spent).toBe(true)}
  })
}

test('bus jump: five actual failures out of twelve leaves seven; hazard remains live',async({page})=>{
  await arena(page,12)
  const result=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),members=s.horde.sprites
    s.spawner.spawnDefinition({kind:'bus',offsetX:2200,y:224},0)
    const bus=s.spawner.obstacleGroup.getChildren()[0];bus.intent='jump'
    members.forEach((m:any,i:number)=>m.body.reset(2165,i<7?130:210))
    s.collisions.checkObstacles();s.collisions.checkObstacles()
    return {count:s.horde.count,lost:s.horde.lost,survivors:members.slice(0,7).every((m:any)=>s.horde.sprites.includes(m)),failed:members.slice(7).every((m:any)=>!m.body.enable&&!s.horde.sprites.includes(m)),spent:bus.isSpent}
  })
  expect(result).toEqual({count:7,lost:5,survivors:true,failed:true,spent:false})
})

test('distance curve, authored gaps, pattern shapes and swept collision invariants',async({page})=>{
  await arena(page)
  const result=await page.evaluate(async()=>{
    const {DifficultyManager}=await import('/src/systems/DifficultyManager.ts' as string)
    const {PIT_TYPES,pitGaps,jumpRange}=await import('/src/config/Traversal.ts' as string)
    const {validateChunks}=await import('/src/systems/ChunkSpawner.ts' as string)
    const {FLIGHT_PATTERNS,flightCoins}=await import('/src/systems/FlightRouteManager.ts' as string)
    const {sweptHit}=await import('/src/entities/ObstacleGeometry.ts' as string)
    return {settings:[0,250,500,1000,1500,2000,3000,10000].map(d=>DifficultyManager.at(d)),
      gaps:Object.keys(PIT_TYPES).map(size=>({size,range:jumpRange(DifficultyManager.at(PIT_TYPES[size].minDistance).speed),gaps:pitGaps(size)})),
      patterns:FLIGHT_PATTERNS.map(p=>flightCoins(p,0)),chunks:validateChunks(),
      tunnel:sweptHit({x:0,y:0,width:11,height:23},{x:100,y:0,width:11,height:23},{x:50,y:0,width:2,height:23}),
      roof:sweptHit({x:0,y:0,width:11,height:23},{x:10,y:0,width:11,height:23},{x:5,y:23,width:30,height:33})}
  })
  expect(result.chunks).toEqual([]);expect(result.tunnel).toBe(true);expect(result.roof).toBe(false)
  expect(result.settings[0].speed).toBe(66);expect(result.settings[6].speed).toBe(112);expect(result.settings[7].speed).toBe(112)
  for(let i=1;i<result.settings.length;i++)expect(result.settings[i].speed).toBeGreaterThanOrEqual(result.settings[i-1].speed)
  expect(result.settings[0].busWeight).toBe(0);expect(result.settings[3].airplaneWeight).toBe(0)
  for(const p of result.gaps)for(const gap of p.gaps)expect(gap.width+4).toBeLessThanOrEqual(p.range)
  expect(result.patterns).toHaveLength(5)
  for(const p of result.patterns){expect(p).toHaveLength(13);expect(p.every((c:any)=>c.y>=56&&c.y<=143)).toBe(true)}
})

test('Flight steers, protects whole formation, and waits for safe ground after expiry',async({page})=>{
  await arena(page,20,1500)
  const result=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game')
    const step=(n:number,held:boolean)=>{s.pointerHeld=held;for(let i=0;i<n;i++)s.sys.step(s.elapsed+1000/60,1000/60)}
    s.powers.activate('flight');step(90,true)
    const high=s.horde.leader.y;step(60,false);const low=s.horde.leader.y
    const coins=s.spawner.coinGroup.getLength()
    // A real gap under the trailing members and a pre-streamed plane must be cleared before descent.
    const pitStart=Math.min(...s.horde.sprites.map((m:any)=>m.x))-10
    for(const g of [...s.spawner.groundGroup.getChildren()])if(g.x+g.displayWidth>pitStart&&g.x<pitStart+80)g.destroy()
    s.spawner.groundSegments=s.spawner.groundSegments.filter((g:any)=>g.active)
    s.spawner.spawnChunk({id:'flight-pit',width:180,ground:{pitStart:0,pitSize:'large'},spawns:[]},pitStart,1500)
    s.spawner.spawnDefinition({kind:'airplane',offsetX:s.horde.leader.x+100,y:224},0)
    s.powers.active.get('flight').remaining=100
    step(10,true)
    const warning=s.horde.flightPhase,retained=s.powers.has('flight')
    step(160,true)
    return {high,low,coins,warning,retained,count:s.horde.count,active:s.powers.has('flight'),grounded:s.horde.allGrounded,safe:s.horde.sprites.every((m:any)=>s.spawner.isSafeLanding(m.x)),liveHazards:s.spawner.obstacleGroup.getChildren().filter((o:any)=>!o.isSpent).length}
  })
  expect(result.high).toBeLessThan(90);expect(result.low).toBeGreaterThan(result.high+30);expect(result.coins).toBeGreaterThan(10)
  expect(result.warning).toBe('landing');expect(result.retained).toBe(true);expect(result.active).toBe(false)
  expect(result.count).toBe(20);expect(result.grounded).toBe(true);expect(result.safe).toBe(true);expect(result.liveHazards).toBe(0)
})

for(const size of ['small','medium','large','extraLarge'])test(`${size} pit: independent falls and physical safe jump route`,async({page})=>{
  await arena(page,3)
  const result=await page.evaluate(async size=>{
    const s=(window as any).__GAME__.scene.getScene('game')
    const {PIT_TYPES}=await import('/src/config/Traversal.ts' as string)
    const p=PIT_TYPES[size];s.score.distanceValue=p.minDistance
    // Remove only the arena ground spanning this authored pit.
    const start=2200,end=start+p.width
    for(const g of [...s.spawner.groundGroup.getChildren()])if(g.x+g.displayWidth>start&&g.x<end)g.destroy()
    s.spawner.groundSegments=s.spawner.groundSegments.filter((g:any)=>g.active)
    s.spawner.ensureGround(start-64,start)
    s.spawner.spawnChunk({id:'test-pit',width:p.width+200,ground:{pitStart:0,pitSize:size},spawns:[]},start,p.minDistance)
    const members=s.horde.sprites
    members[1].body.reset(start+18,235);members[2].body.reset(start+24,235)
    s.collisions.updatePitFalls()
    const partial=s.horde.count,leaderSurvived=s.horde.leader===members[0]
    members[0].body.reset(start-10,210)
    for(let i=0;i<3;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    s.pointerHeld=true;s.jumpQueued=true
    let second=false
    for(let i=0;i<220&&s.state==='playing';i++){
      if(size==='extraLarge'&&!second&&s.horde.leader.x>start+85&&s.horde.allGrounded){s.jumpQueued=true;s.pointerHeld=true;second=true}
      s.sys.step(s.elapsed+1000/60,1000/60)
    }
    return {partial,leaderSurvived,count:s.horde.count,x:s.horde.leader.x,end,second}
  },size)
  expect(result.partial).toBe(1);expect(result.leaderSurvived).toBe(true)
  expect(result.count).toBe(1);expect(result.x).toBeGreaterThan(result.end)
})

for(const kind of ['bus','airplane'])test(`${kind}: one zombie can traverse the actual roof geometry`,async({page})=>{
  await arena(page,1,kind==='bus'?250:1200)
  const result=await page.evaluate(kind=>{
    const s=(window as any).__GAME__.scene.getScene('game'),left=2200,width=kind==='bus'?104:256
    s.spawner.spawnDefinition({kind,offsetX:left+width/2,y:224},0)
    const obstacle=s.spawner.obstacleGroup.getChildren()[0]
    let first=false,lastJump=-1000,jumps=0
    for(let i=0;i<450&&s.state==='playing';i++){
      const x=s.horde.leader.x
      if(!first&&x>=left-30){first=true;s.pointerHeld=true;s.jumpQueued=true;lastJump=x;jumps++}
      else if(kind==='airplane'&&first&&s.horde.allGrounded&&x>lastJump+25&&x<left+210){s.pointerHeld=true;s.jumpQueued=true;lastJump=x;jumps++}
      s.sys.step(s.elapsed+1000/60,1000/60)
    }
    return {count:s.horde.count,x:s.horde.leader.x,right:left+width,jumps,spent:obstacle.isSpent}
  },kind)
  expect(result.count,JSON.stringify(result)).toBe(1);expect(result.x).toBeGreaterThan(result.right);expect(result.spent).toBe(false)
})

for(const timing of ['early','late','missed'])test(`all pit sizes: ${timing} jumps lose the actual failing member`,async({page})=>{
  for(const size of ['small','medium','large','extraLarge']){
    await arena(page,1)
    const result=await page.evaluate(async({size,timing})=>{
      const s=(window as any).__GAME__.scene.getScene('game'),{PIT_TYPES}=await import('/src/config/Traversal.ts' as string)
      const p=PIT_TYPES[size],left=2200;s.score.distanceValue=p.minDistance
      for(const g of [...s.spawner.groundGroup.getChildren()])if(g.x+g.displayWidth>left&&g.x<left+p.width)g.destroy()
      s.spawner.groundSegments=s.spawner.groundSegments.filter((g:any)=>g.active);s.spawner.ensureGround(left-64,left)
      s.spawner.spawnChunk({id:'timing-pit',width:p.width+200,ground:{pitStart:0,pitSize:size},spawns:[]},left,p.minDistance)
      let jumped=false
      for(let i=0;i<350&&s.state==='playing';i++){
        if(!jumped&&timing!=='missed'&&s.horde.leader.x>=left+(timing==='early'?-140:28)){s.pointerHeld=true;s.jumpQueued=true;jumped=true}
        s.sys.step(s.elapsed+1000/60,1000/60)
      }
      return {count:s.horde.count,lost:s.horde.lost}
    },{size,timing})
    expect(result,`${size} ${timing}`).toEqual({count:0,lost:1})
  }
})

test('maximum-speed formation and jumps stay bounded at 20/30/60/120 FPS',async({page})=>{
  const results=[]
  for(const fps of [20,30,60,120]){
    await arena(page,50,3000)
    results.push(await page.evaluate(fps=>{
      const s=(window as any).__GAME__.scene.getScene('game'),start=s.horde.leader.x;let high=210
      s.pointerHeld=true;s.jumpQueued=true
      for(let i=0;i<fps*3;i++){if(i/fps>.22)s.pointerHeld=false;s.sys.step(s.elapsed+1000/fps,1000/fps);high=Math.min(high,s.horde.leader.y)}
      return {count:s.horde.count,spread:Math.max(...s.horde.sprites.map((m:any)=>m.x))-Math.min(...s.horde.sprites.map((m:any)=>m.x)),distance:s.horde.leader.x-start,height:210-high}
    },fps))
  }
  for(const r of results){expect(r.count).toBe(50);expect(r.spread).toBeLessThan(130)}
  expect(Math.max(...results.map(r=>r.distance))-Math.min(...results.map(r=>r.distance))).toBeLessThan(3)
  expect(Math.max(...results.map(r=>r.height))-Math.min(...results.map(r=>r.height))).toBeLessThan(8)
})
