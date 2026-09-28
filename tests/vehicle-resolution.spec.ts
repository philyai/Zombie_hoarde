import {test,expect,type Page} from '@playwright/test'

async function boot(page:Page){
  await page.goto('/');await page.waitForFunction(()=>(window as any).__GAME__?.scene.isActive('menu'))
  await page.evaluate(()=>{const g=(window as any).__GAME__;g.scene.stop('menu');g.scene.start('game')})
  await page.waitForFunction(()=>(window as any).__GAME__.scene.getScene('game').collisions)
  await page.evaluate(()=>{(window as any).__GAME__.loop.stop()})
}

async function stage(page:Page,kind='car',count=4,distance=0,spacing=10){
  return page.evaluate(({kind,count,distance,spacing})=>{
    const s=(window as any).__GAME__.scene.getScene('game')
    for(const group of [s.spawner.obstacleGroup,s.spawner.coinGroup,s.spawner.civilianGroup,s.spawner.powerupGroup,s.spawner.groundGroup])for(const o of [...group.getChildren()])o.destroy()
    s.spawner.obstacles=[];s.spawner.coins=[];s.spawner.civilians=[];s.spawner.powerups=[];s.spawner.groundSegments=[]
    s.spawner.nextChunkX=1e9;s.spawner.chunksSpawned=99;s.spawner.ensureGround(0,5000)
    s.horde.setPush();s.horde.setFlightActive(false);s.powers.active.clear();s.state='playing';s.physics.resume();s.inputBlocked=false;s.pointerHeld=false;s.jumpQueued=false
    while(s.horde.count>count)s.horde.removeMember(s.horde.sprites.at(-1),'test')
    while(s.horde.count<count)s.horde.addZombie()
    s.horde.lost=0;s.score.distanceValue=distance;s.physics.world._elapsed=0;s.cameras.main.setScroll(0,0)
    s.spawner.spawnDefinition({kind,offsetX:2200,y:224},0)
    const o=s.spawner.obstacleGroup.getChildren()[0],face=o.collisionZones[0].x
    s.horde.sprites.forEach((m:any,i:number)=>{m.body.reset(face-4-(i%12)*spacing-Math.floor(i/12)*2,210);m.body.updateFromGameObject()})
    s.collisions.update(0);(window as any).__VEHICLE__=o
    return {marker:o.label.text,requirement:o.requirement}
  },{kind,count,distance,spacing})
}

test('regression: 4/3 PUSH succeeds even when only the front member is nearby',async({page})=>{
  await boot(page);await stage(page,'car',4,0,100)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__
    s.collisions.checkObstacles();s.collisions.update(600)
    return {spent:o.isSpent,count:s.horde.count,lost:s.horde.lost,state:s.state}
  })
  expect(r).toEqual({spent:true,count:4,lost:0,state:'playing'})
})

test('regression: locked successful push cannot fall through to airborne lethal damage',async({page})=>{
  await boot(page);await stage(page)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__
    s.collisions.checkObstacles()
    const m=s.horde.sprites[1];m.body.reset(o.collisionZones[0].x,199);m.body.updateFromGameObject();m.body.setVelocityY(-20)
    for(let i=0;i<10;i++)s.collisions.checkObstacles()
    s.collisions.update(600)
    return {spent:o.isSpent,count:s.horde.count,lost:s.horde.lost}
  })
  expect(r).toEqual({spent:true,count:4,lost:0})
})

for(const [kind,requirement,counts] of [['car',3,[1,2,3,4,10]],['bus',8,[7,8,9,20]],['airplane',16,[15,16,17,30]],['truck',5,[4,5]],['moving-car',3,[2,3]],['armored',12,[11,12]],['fence',2,[1,2]]] as const){
  for(const count of counts)test(`${kind} authoritative threshold ${count}/${requirement}`,async({page})=>{
    await boot(page);const marker=await stage(page,kind,count)
    const r=await page.evaluate(()=>{
      const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__,original=[...s.horde.sprites]
      for(let i=0;i<150&&s.state==='playing'&&!o.isSpent;i++)s.sys.step(s.elapsed+1000/60,1000/60)
      const coins=s.score.runCoins,score=s.score.score
      for(let i=0;i<20;i++){s.collisions.checkObstacles();s.collisions.update(16)}
      return {spent:o.isSpent,count:s.horde.count,lost:s.horde.lost,originals:original.every(m=>s.horde.contains(m)),state:s.state,
        idempotent:coins===s.score.runCoins&&score===s.score.score,body:o.body.enable,interaction:o.interactionState}
    })
    expect(marker).toEqual({marker:`${count}/${requirement} ${count>=requirement?'PUSH':'JUMP'}`,requirement})
    expect(r.spent).toBe(count>=requirement)
    if(count>=requirement){expect(r.count).toBe(count+(kind==='airplane'?2:0));expect(r.lost).toBe(0);expect(r.originals).toBe(true);expect(r.state).toBe('playing');expect(r.body).toBe(false);expect(r.interaction).toBe('destroyed');expect(r.idempotent).toBe(true)}
    else expect(r.lost).toBeGreaterThan(0)
  })
}

for(const [kind,count] of [['car',4],['bus',8],['airplane',16]] as const){
  test(`${kind}: 30 repeated real-physics pushes across low, medium and maximum speed`,async({page})=>{
    await boot(page)
    for(const distance of [0,750,3000])for(let repeat=0;repeat<10;repeat++){
      await stage(page,kind,count,distance,[8,10,12][repeat%3])
      const r=await page.evaluate(repeat=>{
        const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__,original=[...s.horde.sprites]
        // Begin ahead of contact, with varied sub-frame approach alignment and spread.
        for(const m of original){m.body.reset(m.x-70-repeat*.13,210);m.body.updateFromGameObject()}
        const dt=[50,1000/60,1000/120][repeat%3];let starts=0,last=false
        for(let i=0;i<650&&!o.isSpent&&s.state==='playing';i++){
          s.sys.step(s.elapsed+dt,dt)
          if(o.push&&!last)starts++;last=!!o.push
          // Duplicate notifications within a frame must never restart or kill.
          s.collisions.checkObstacles();s.collisions.checkObstacles()
        }
        return {spent:o.isSpent,lost:s.horde.lost,originals:original.every(m=>s.horde.contains(m)),state:s.state,starts}
      },repeat)
      expect(r,JSON.stringify({kind,distance,repeat,r})).toEqual({spent:true,lost:0,originals:true,state:'playing',starts:1})
    }
  })
}

test('simultaneous bus contacts start once, preserve ten members and reward once',async({page})=>{
  await boot(page);await stage(page,'bus',10,3000,0)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__
    s.collisions.checkObstacles();const interaction=o.push
    for(let i=0;i<50;i++)s.collisions.checkObstacles()
    const same=o.push===interaction;s.collisions.update(600)
    for(let i=0;i<50;i++){s.collisions.checkObstacles();s.collisions.update(600);s.collisions.smash(o,s.horde.leader)}
    return {same,count:s.horde.count,lost:s.horde.lost,coins:s.score.runCoins,vehicles:JSON.parse(localStorage.getItem('zombie-horde-runner:v1')!).missions.vehicles}
  })
  expect(r).toEqual({same:true,count:10,lost:0,coins:5,vehicles:1})
})

test('earlier airborne approach clears jump intent after landing before the vehicle',async({page})=>{
  await boot(page);await stage(page)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__,leader=s.horde.leader
    leader.body.reset(o.leftEdge-50,160);leader.body.updateFromGameObject();s.collisions.checkObstacles();const first=o.intent
    leader.body.reset(o.leftEdge-30,210);leader.body.updateFromGameObject();s.collisions.checkObstacles();const grounded=o.intent
    leader.body.reset(o.collisionZones[0].x-4,210);leader.body.updateFromGameObject();s.collisions.checkObstacles();s.collisions.update(600)
    return {first,grounded,spent:o.isSpent,count:s.horde.count,lost:s.horde.lost}
  })
  expect(r).toEqual({first:'jump',grounded:null,spent:true,count:4,lost:0})
})

test('genuine failed car jump removes only the two colliding trailing members',async({page})=>{
  await boot(page);await stage(page,'car',5)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__,original=[...s.horde.sprites]
    o.intent='jump'
    original.forEach((m:any,i:number)=>{m.body.reset(i<3?o.rightEdge+20:o.collisionZones[0].x, i<3?170:210);m.body.updateFromGameObject()})
    for(let i=0;i<20;i++)s.collisions.checkObstacles()
    return {count:s.horde.count,lost:s.horde.lost,spent:o.isSpent,survivors:original.slice(0,3).every(m=>s.horde.contains(m))}
  })
  expect(r).toEqual({count:3,lost:2,spent:false,survivors:true})
})

test('live recruitment upgrades a pending failed push before damage',async({page})=>{
  await boot(page);await stage(page,'car',2)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__
    s.collisions.checkObstacles();const first=o.interactionState;s.horde.addZombie();s.collisions.update(0);const marker=o.label.text
    s.collisions.update(600);return {first,marker,spent:o.isSpent,count:s.horde.count,lost:s.horde.lost}
  })
  expect(r).toEqual({first:'pushing-failure',marker:'3/3 PUSH',spent:true,count:3,lost:0})
})

test('pause before contact and during push preserves the decision; living horde cannot finish',async({page})=>{
  await boot(page);await stage(page)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__
    s.pauseGame();for(let i=0;i<20;i++)s.sys.step(s.elapsed+16,16);const pre=o.interactionState;s.resumeGame()
    s.collisions.checkObstacles();s.collisions.update(100);const elapsed=o.push.elapsed
    s.pauseGame();for(let i=0;i<20;i++)s.sys.step(s.elapsed+16,16);const frozen=o.push.elapsed===elapsed
    s.resumeGame();s.collisions.update(600);s.finishRun()
    return {pre,frozen,spent:o.isSpent,count:s.horde.count,state:s.state}
  })
  expect(r).toEqual({pre:'active',frozen:true,spent:true,count:4,state:'playing'})
})

test('successful push, later death and real Retry leave one collision listener and fresh state',async({page})=>{
  await boot(page);await stage(page)
  await page.evaluate(()=>{
    const g=(window as any).__GAME__,s=g.scene.getScene('game')
    s.collisions.checkObstacles();s.collisions.update(600)
    ;(window as any).__OLD_COLLISIONS__=s.collisions
    s.horde.removeZombies(s.horde.count,'test');s.finishRun();const elapsed=s.deathElapsed;s.finishRun()
    if(s.state!=='dying'||s.deathElapsed!==elapsed)throw Error('non-idempotent game over')
    g.loop.start(g.step.bind(g))
  })
  await page.waitForFunction(()=>(window as any).__GAME__.scene.isActive('game-over'))
  await page.evaluate(()=>{
    const g=(window as any).__GAME__,s=g.scene.getScene('game-over')
    const retry=s.children.list.find((o:any)=>o.getData?.('label')==='RETRY  >');retry.getData('activate')()
  })
  await page.waitForFunction(()=>(window as any).__GAME__.scene.isActive('game'))
  await page.evaluate(()=>{(window as any).__GAME__.loop.stop()})
  await stage(page)
  const r=await page.evaluate(()=>{
    const s=(window as any).__GAME__.scene.getScene('game'),o=(window as any).__VEHICLE__
    const listeners=s.physics.world.listeners('worldstep'),old=(window as any).__OLD_COLLISIONS__
    s.collisions.checkObstacles();s.collisions.update(600)
    return {fresh:s.collisions!==old,oldDestroyed:old.colliders.length===0,newListeners:listeners.filter((f:any)=>f===s.collisions.checkObstacles).length,spent:o.isSpent,count:s.horde.count,lost:s.horde.lost}
  })
  expect(r).toEqual({fresh:true,oldDestroyed:true,newListeners:1,spent:true,count:4,lost:0})
})

