const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
  const out='.impeccable/review/challenge';fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:5173');await p.waitForFunction(()=>window.__GAME__?.scene.isActive('menu'));
  await p.evaluate(()=>{const g=window.__GAME__;g.scene.stop('menu');g.scene.start('game')});
  await p.waitForFunction(()=>window.__GAME__.scene.getScene('game').collisions);await p.waitForTimeout(100);
  const stage=async(kind,count)=>p.evaluate(async({kind,count})=>{
    const g=window.__GAME__,s=g.scene.getScene('game');g.loop.stop();s.state='playing';s.physics.resume();s.horde.setPush();s.horde.setFlightActive(false);s.powers.active.clear();
    for(const group of [s.spawner.obstacleGroup,s.spawner.coinGroup,s.spawner.civilianGroup,s.spawner.powerupGroup,s.spawner.groundGroup])for(const o of [...group.getChildren()])o.destroy();
    s.spawner.obstacles=[];s.spawner.coins=[];s.spawner.civilians=[];s.spawner.powerups=[];s.spawner.groundSegments=[];s.spawner.nextChunkX=1e9;s.spawner.nextCivilianX=Infinity;s.spawner.chunksSpawned=99;
    while(s.horde.count<count)s.horde.addZombie();
    while(s.horde.count>count){const m=s.horde.members.pop();m.sprite.destroy()}
    s.horde.sprites.forEach((m,i)=>m.body.reset(100-i%12*10-Math.floor(i/12)*2,210));
    s.elapsed=25000;s.score.distanceValue=kind==='mines'?3000:1500;s.cameras.main.setScroll(0,0);s.spawner.difficulty='hard';s.inputBlocked=false;s.pointerHeld=false;s.physics.world._elapsed=0;
    if(kind==='vehicles'){s.spawner.ensureGround(0,1200);for(const [k,x] of [['car',205],['bus',375]])s.spawner.spawnDefinition({kind:k,offsetX:x,y:224},0)}
    else if(kind==='plane'){s.spawner.ensureGround(0,1200);s.spawner.spawnDefinition({kind:'airplane',offsetX:338,y:224},0)}
    else if(kind==='push'){
      s.spawner.ensureGround(0,1200);s.spawner.spawnDefinition({kind:'bus',offsetX:310,y:224},0);
      s.horde.sprites.forEach((m,i)=>m.body.reset(242-i*8,210));
      for(let i=0;i<16;i++)s.sys.step(s.elapsed+1000/60,1000/60)
    }else{
      const {CHUNKS}=await import('/src/systems/ChunkSpawner.ts');const id=kind==='mines'?'mine_quad_tight':kind==='pillars'?'double_pillar_gap':'uneven_sequence';const c=CHUNKS.find(c=>c.id===id);
      s.spawner.spawnChunk(c,0,c.minDistance);s.spawner.ensureGround(c.width,1200)
    }
    s.collisions.update(0);s.updateHud(0);
  },{kind,count});
  const capture=async(name,size)=>{
    await p.setViewportSize(size);await p.waitForTimeout(80);
    await p.evaluate(()=>{const g=window.__GAME__;g.scale.getParentBounds();g.scale.refresh();g.renderer.preRender();g.scene.render(g.renderer);g.renderer.postRender()});
    await p.screenshot({path:`${out}/${name}.png`});
  };
  for(const [kind,count] of [['vehicles',7],['plane',15],['push',8],['pillars',5],['mines',5],['terrain',5]]){
    await stage(kind,count);await capture(`${kind}-desktop`,{width:1440,height:900});
    if(['vehicles','push','pillars','mines'].includes(kind))await capture(`${kind}-mobile`,{width:844,height:390});
  }
  fs.writeFileSync(`${out}/runtime.json`,JSON.stringify({errors,staged:true,description:'Original source-pixel runtime fixtures; mechanical tests recorded separately.'},null,2));
  console.log({errors});await b.close();
})().catch(e=>{console.error(e);process.exitCode=1});
