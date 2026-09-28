import {test,expect,type Page} from '@playwright/test'

async function setup(page:Page,id='mine_single',count=1,distance?:number){
  await page.goto('/');await page.waitForFunction(()=>(window as any).__GAME__?.scene.isActive('menu'))
  await page.evaluate(()=>{const g=(window as any).__GAME__;g.scene.stop('menu');g.scene.start('game')})
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').horde?.count)
  await page.evaluate(async({id,count,distance})=>{
    const g=(window as any).__GAME__,s=g.scene.getScene('game');g.loop.stop()
    for(const group of [s.spawner.obstacleGroup,s.spawner.coinGroup,s.spawner.civilianGroup,s.spawner.powerupGroup,s.spawner.groundGroup])for(const o of [...group.getChildren()])o.destroy()
    s.spawner.obstacles=[];s.spawner.coins=[];s.spawner.civilians=[];s.spawner.powerups=[];s.spawner.groundSegments=[]
    s.spawner.nextChunkX=1e9;s.spawner.chunksSpawned=99;s.spawner.nextCivilianX=Infinity
    const {CHUNKS}=await import('/src/systems/ChunkSpawner.ts' as string)
    const c=CHUNKS.find((c:any)=>c.id===id);if(!c)throw Error(id)
    s.spawner.ensureGround(0,2000);s.spawner.spawnChunk(c,2000,distance??c.minDistance??0);s.spawner.ensureGround(2000+c.width,5000)
    while(s.horde.count<count)s.horde.addZombie()
    s.horde.sprites.forEach((m:any,i:number)=>m.body.reset(1930-i%12*10-Math.floor(i/12)*2,210))
    s.score.distanceValue=distance??c.minDistance??0;s.physics.world._elapsed=0;s.inputBlocked=false
    for(let i=0;i<3;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    ;(window as any).__CHALLENGE__=c
  },{id,count,distance})
}

async function traverse(page:Page,timing='perfect'){
  return page.evaluate(timing=>{
    const s=(window as any).__GAME__.scene.getScene('game'),c=(window as any).__CHALLENGE__,base=2000
    const triggers:number[]=[]
    if(c.terrain)for(let i=1;i<c.terrain.length;i++){
      const p=c.terrain[i-1],n=c.terrain[i],gap=n.start-p.start-p.width
      if(gap>0)triggers.push(base+p.start+p.width-8)
      else if(n.y<p.y)triggers.push(base+n.start-32)
    }
    const mines:number[]=[]
    for(const d of c.spawns){
      if(d.kind==='mine')for(let i=0;i<(d.count??1);i++)mines.push(base+d.offsetX+i*(d.spacing??0))
      if(d.kind==='car'||d.kind==='bus')triggers.push(base+d.offsetX-(d.kind==='bus'?52+30:20+(s.worldSpeed>80?18:12)))
    }
    mines.sort((a,b)=>a-b);mines.forEach((x,i)=>{if(!i||x-mines[i-1]>90)triggers.push(x-(s.worldSpeed>100?22:18))})
    triggers.sort((a,b)=>a-b)
    const shift=timing==='early'?-100:timing==='late'?16:timing==='very late'?35:0
    let next=0,jumps=0,lastJump=-1000,minY=210,releaseAt=Infinity
    const plane=c.spawns.find((d:any)=>d.kind==='airplane')
    if(plane)triggers.push(base+plane.offsetX-128-30)
    for(let i=0;i<1500&&s.state==='playing'&&s.horde.leader.x<base+c.width+140;i++){
      const x=s.horde.leader.x
      if(next<triggers.length&&x>=triggers[next]+shift){s.jumpQueued=true;s.pointerHeld=true;next++;jumps++;lastJump=x;releaseAt=c.id==='double_pillar_gap'&&s.worldSpeed>100?s.elapsed+140:Infinity}
      if(plane&&jumps&&s.horde.allGrounded&&x>lastJump+25&&x<base+plane.offsetX+82){s.jumpQueued=true;s.pointerHeld=true;lastJump=x;jumps++}
      if(s.elapsed>=releaseAt)s.pointerHeld=false
      s.sys.step(s.elapsed+1000/60,1000/60);minY=Math.min(minY,s.horde.leader.y)
    }
    return {count:s.horde.count,lost:s.horde.lost,x:s.horde.leader.x,finish:base+c.width,jumps,minY,state:s.state}
  },timing)
}

const routes=['tiny_pit','small_pit','medium_pit','large_pit','very_large_pit','pit_pillar_pit_easy','pit_pillar_pit_medium','pit_pillar_pit_hard','double_pillar_gap','step_up_easy','step_up_medium','step_down','uneven_sequence','raised_car','raised_pit','pit_then_step','mine_single','mine_double','mine_triple','mine_quad','mine_quad_tight','mine_then_pit','pit_then_mines','car_jump','bus_jump','bus_after_pit','bus_mine_combo','airplane_intro','advanced_mixed_chunk','recovery_cache']
for(const id of routes)test(`authored physical route: ${id}`,async({page})=>{
  await setup(page,id);const r=await traverse(page);expect(r.count,JSON.stringify(r)).toBe(1);expect(r.x).toBeGreaterThan(r.finish)
})

for(const [kind,requirement,counts] of [['car',3,[2,3,4]],['bus',8,[7,8,9]],['airplane',16,[15,16,17]]] as const){
  for(const count of counts)test(`${kind} push participation ${count}/${requirement}`,async({page})=>{
    await setup(page,`${kind==='car'?'car_requirement':kind==='bus'?'bus_requirement':'airplane_requirement'}`,count)
    const r=await page.evaluate(({count,requirement})=>{
      const s=(window as any).__GAME__.scene.getScene('game'),o=s.spawner.obstacleGroup.getChildren()[0]
      const marker=o.label.text
      const face=o.leftEdge+(o.kind==='airplane'?7:3)
      s.horde.sprites.forEach((m:any,i:number)=>m.body.reset(face-18-(i%12)*8-Math.floor(i/12)*2,210))
      let started=false,visible=false,participants=0,pushMs=0,maxCompressed=0
      for(let i=0;i<180&&s.state==='playing'&&!o.isSpent;i++){
        s.sys.step(s.elapsed+1000/60,1000/60)
        if(o.push){started=true;visible=o.visible;participants=Math.max(participants,s.collisions.participants(o).length);pushMs=Math.max(pushMs,o.push.elapsed);maxCompressed=Math.max(maxCompressed,s.horde.sprites.filter((z:any)=>z.texture.key.endsWith('push')).length)}
      }
      return {marker,started,visible,participants,pushMs,maxCompressed,spent:o.isSpent,count:s.horde.count,lost:s.horde.lost,requirement:o.requirement,expected:count>=requirement}
    },{count,requirement})
    expect(r.started).toBe(true);expect(r.visible).toBe(true);expect(r.pushMs).toBeGreaterThanOrEqual(250);expect(r.maxCompressed).toBeGreaterThan(0)
    expect(r.requirement).toBe(requirement);expect(r.spent).toBe(count>=requirement)
    expect(r.marker).toBe(`${count}/${requirement} ${count>=requirement?'PUSH':'JUMP'}`)
    if(count>=requirement)expect(r.count).toBe(count+(kind==='airplane'?2:0));else expect(r.lost).toBeGreaterThan(0)
  })
}

test('markers and grounded pushes share the authoritative living count',async({page})=>{
  await setup(page,'bus_requirement',8)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),bus=s.spawner.obstacleGroup.getChildren()[0]
    s.collisions.update(0);const ready=bus.label.text
    const face=bus.leftEdge+3
    s.horde.sprites.forEach((m:any,i:number)=>{m.body.reset(i?face-300:face-5,i?100:210);m.body.updateFromGameObject()})
    s.collisions.checkObstacles();const participants=s.collisions.participants(bus).length;s.collisions.update(600)
    s.collisions.update(0)
    return {ready,failed:bus.label.text,count:s.horde.count,participants,spent:bus.isSpent}
  })
  expect(r.ready).toBe('8/8 PUSH');expect(r.participants).toBe(1);expect(r.count).toBe(8);expect(r.spent).toBe(true)
})

test('pause freezes a vehicle struggle and resume completes it once',async({page})=>{
  await setup(page,'bus_requirement',8)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),bus=s.spawner.obstacleGroup.getChildren()[0],face=bus.leftEdge+3
    s.horde.sprites.forEach((m:any,i:number)=>{m.body.reset(face-5-i*8,210);m.body.updateFromGameObject()})
    s.collisions.checkObstacles();s.collisions.update(100);s.pauseGame();const before=bus.push.elapsed
    for(let i=0;i<40;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    const after=bus.push.elapsed;s.resumeGame()
    for(let i=0;i<40;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    return {before,after,count:s.horde.count,spent:bus.isSpent,vehicles:JSON.parse(localStorage.getItem('zombie-horde-runner:v1')!).missions.vehicles}
  })
  expect(r.after).toBe(r.before);expect(r.count).toBe(8);expect(r.spent).toBe(true);expect(r.vehicles).toBe(1)
})

test('first and middle mine blasts respect radius across all group sizes',async({page})=>{
  for(const id of ['mine_single','mine_double','mine_triple','mine_quad_tight'])for(const position of ['first','middle']){
    await setup(page,id,20)
    const r=await page.evaluate(position=>{
      const s=(window as any).__GAME__.scene.getScene('game'),mines=s.spawner.obstacleGroup.getChildren().filter((o:any)=>o.kind==='mine'),mine=mines[position==='first'?0:Math.floor(mines.length/2)]
      const members=s.horde.sprites;members.forEach((m:any,i:number)=>{m.body.reset(i<3?mine.x+i*7:mine.x-100-i*5,i===3?145:210);m.body.updateFromGameObject()})
      s.collisions.explodeMine(mine);s.collisions.explodeMine(mine)
      return {count:s.horde.count,lost:s.horde.lost,survivors:members.slice(3).every((m:any)=>s.horde.sprites.includes(m))}
    },position)
    expect(r,`${id} ${position}`).toEqual({count:17,lost:3,survivors:true})
  }
})

test('mine blast removes only bodies within its radius and triggers once',async({page})=>{
  await setup(page,'mine_single',9)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),mine=s.spawner.obstacleGroup.getChildren()[0],members=s.horde.sprites
    members.forEach((m:any,i:number)=>m.body.reset(mine.x+(i<3?i*8:70+i*12),i===8?140:210))
    s.collisions.checkObstacles();s.collisions.checkObstacles()
    return {count:s.horde.count,lost:s.horde.lost,spent:mine.isSpent,survivors:members.slice(3).every((m:any)=>s.horde.sprites.includes(m))}
  })
  expect(r).toEqual({count:6,lost:3,spent:true,survivors:true})
})

for(const count of [1,5,10,20])test(`pit timing matrix, horde ${count}`,async({page})=>{
  for(const id of ['small_pit','medium_pit','large_pit','pit_pillar_pit_medium'])for(const timing of ['early','perfect','late','very late']){
    await setup(page,id,count);const r=await traverse(page,timing)
    if(timing==='perfect'){expect(r.count,`${id} ${count}: ${JSON.stringify(r)}`).toBe(count);expect(r.x).toBeGreaterThan(r.finish)}
    else {if(timing!=='late')expect(r.count,`${id} ${timing}`).toBeLessThan(count);expect(r.lost+r.count).toBe(count)}
  }
})

test('distance selection reduces civilians and increases authored challenge complexity',async({page})=>{
  await setup(page)
  const r=await page.evaluate(async()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),{DifficultyManager}=await import('/src/systems/DifficultyManager.ts' as string)
    const {validateChunks}=await import('/src/systems/ChunkSpawner.ts' as string)
    let seed=349;const random=Math.random;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    const samples=[]
    for(const distance of [0,250,500,750,1000,1500,2000,3000,5000]){
      let humans=0,complexity=0,hazards=0,planes=0,buses=0,mines=0,terrain=0,pixels=0
      s.spawner.nextCivilianX=0;s.spawner.lastAircraftChunk=-10;s.spawner.lastBusChunk=-10
      for(let i=0;i<180;i++){
        s.spawner.chunksSpawned=i+10
        const c=s.spawner.chooseChunk(distance);complexity+=c.complexity??1
        const before=s.spawner.civilianGroup.getLength();s.spawner.spawnChunk(c,pixels,distance);humans+=s.spawner.civilianGroup.getLength()-before
        hazards+=c.spawns.filter((d:any)=>['mine','car','bus','airplane','spike','fence','electric','truck','falling','armored','moving-car'].includes(d.kind)).reduce((n:number,d:any)=>n+(d.count??1),0)+(c.ground.pitStart!==undefined?1:0)
        if(c.terrain){terrain++;hazards+=c.terrain.length-1}
        mines+=c.spawns.filter((d:any)=>d.kind==='mine').reduce((n:number,d:any)=>n+(d.count??1),0)
        planes+=c.spawns.some((d:any)=>d.kind==='airplane')?1:0;buses+=c.spawns.some((d:any)=>d.kind==='bus')?1:0
        pixels+=c.width+40
        s.spawner.cleanupGround(pixels-500);for(const key of ['civilians','obstacles','coins','powerups'])s.spawner.cleanupEntities(s.spawner[key],pixels-500)
      }
      samples.push({distance,humansPer1000:humans/pixels*1000,hazardsPer1000:hazards/pixels*1000,complexity:complexity/180,planes,buses,mines,terrain,settings:DifficultyManager.at(distance)})
    }
    Math.random=random;return {samples,errors:validateChunks()}
  })
  expect(r.errors).toEqual([])
  console.log('Progression sample:',JSON.stringify(r.samples.map(({distance,humansPer1000,hazardsPer1000,complexity,planes,buses,mines,terrain})=>({distance,humansPer1000,hazardsPer1000,complexity,planes,buses,mines,terrain}))))
  expect(r.samples.at(-1)!.humansPer1000).toBeLessThan(r.samples[0].humansPer1000*.6)
  expect(r.samples.at(-1)!.hazardsPer1000).toBeGreaterThan(r.samples[0].hazardsPer1000)
  expect(r.samples.at(-1)!.complexity).toBeGreaterThan(r.samples[0].complexity)
  for(const row of r.samples){expect(row.settings.speed).toBeLessThanOrEqual(112);expect(row.planes).toBeLessThan(12);if(row.distance>=1500)expect(row.buses).toBeGreaterThan(row.planes)}
})

test('twenty members clear mine groups and elevation routes at maximum speed',async({page})=>{
  for(const id of ['mine_single','mine_double','mine_triple','mine_quad','mine_quad_tight','step_up_easy','step_up_medium','step_down','raised_pit','pit_then_step','uneven_sequence','double_pillar_gap']){
    await setup(page,id,20,3000);const r=await traverse(page)
    expect(r.count,`${id}: ${JSON.stringify(r)}`).toBe(20);expect(r.x).toBeGreaterThan(r.finish)
  }
})

test('terrain side failures and partial pit losses affect actual individual bodies',async({page})=>{
  await setup(page,'step_up_medium',5)
  const wall=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),members=s.horde.sprites
    members.forEach((m:any,i:number)=>m.body.reset(2110-i*3,i<2?145:210))
    for(let i=0;i<20;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    return {lost:s.horde.lost,survivors:members.slice(0,2).every((m:any)=>s.horde.sprites.includes(m)),count:s.horde.count}
  })
  expect(wall.lost).toBe(3);expect(wall.count).toBe(2);expect(wall.survivors).toBe(true)
  await setup(page,'large_pit',8)
  const pit=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),members=s.horde.sprites
    members.forEach((m:any,i:number)=>{m.body.reset(2160+i, i<5?155:235);m.body.updateFromGameObject()})
    s.collisions.updatePitFalls();return {count:s.horde.count,lost:s.horde.lost,survivors:members.slice(0,5).every((m:any)=>s.horde.sprites.includes(m))}
  })
  expect(pit).toEqual({count:5,lost:3,survivors:true})
})

test('Flight exit flattens raised/lowered terrain and disarms mines',async({page})=>{
  await setup(page,'raised_pit',20)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game');s.powers.activate('flight')
    s.pointerHeld=true;for(let i=0;i<140;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    s.spawner.spawnDefinition({kind:'mine',offsetX:s.horde.leader.x+70,y:224,count:4,spacing:20},0)
    s.powers.active.get('flight').remaining=100
    for(let i=0;i<180;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    return {count:s.horde.count,active:s.powers.has('flight'),grounded:s.horde.allGrounded,unsafe:s.spawner.obstacleGroup.getChildren().some((o:any)=>!o.isSpent&&s.spawner.isSafeLanding(o.x))}
  })
  expect(r).toEqual({count:20,active:false,grounded:true,unsafe:false})
})
