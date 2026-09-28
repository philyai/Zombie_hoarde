const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
  fs.mkdirSync('.impeccable/review/extension',{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__GAME__?.scene.isActive('menu'));
  const reset=async()=>{
    await page.evaluate(()=>window.__GAME__.scene.start('game'));await page.waitForFunction(()=>window.__GAME__.scene.isActive('game'));await page.waitForTimeout(200);
    await page.evaluate(()=>{
      const g=window.__GAME__,s=g.scene.getScene('game');g.loop.stop();
      for(const group of [s.spawner.obstacleGroup,s.spawner.coinGroup,s.spawner.civilianGroup,s.spawner.powerupGroup])for(const o of [...group.getChildren()])o.destroy();
      s.spawner.obstacles=[];s.spawner.coins=[];s.spawner.civilians=[];s.spawner.powerups=[];s.spawner.nextChunkX=1e8;
      s.spawner.ensureGround(0,1500);s.horde.leader.body.reset(18,210);s.cameras.main.setScroll(0,0);s.elapsed=25000;s.updateHud(0);
      s.horde.sprites.forEach((z,i)=>z.body.reset(18-i*10,210));
    });
  };
  const render=()=>page.evaluate(()=>{const g=window.__GAME__;g.scale.getParentBounds();g.scale.refresh();g.renderer.preRender();g.scene.render(g.renderer);g.renderer.postRender()});
  const shot=async name=>{await render();await page.screenshot({path:`.impeccable/review/extension/${name}.png`})};
  await reset();
  await page.evaluate(()=>{const s=window.__GAME__.scene.getScene('game');for(const [kind,x] of [['car',51],['bus',145],['airplane',340]])s.spawner.spawnDefinition({kind,offsetX:x,y:224},0);s.spawner.obstacles.find(o=>o.kind==='airplane').warning.setVisible(false)});
  await shot('vehicles-desktop');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);await shot('vehicles-mobile');
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);
  await page.evaluate(()=>{
    const s=window.__GAME__.scene.getScene('game');for(const o of [...s.spawner.obstacleGroup.getChildren()])o.destroy();s.spawner.obstacles=[];
    for(const g of [...s.spawner.groundGroup.getChildren()])g.destroy();s.spawner.groundSegments=[];
    let start=34;for(const [pitSize,width] of [['small',40],['medium',60],['large',80],['extraLarge',160]]){s.spawner.spawnChunk({id:pitSize,width:width+30,ground:{pitStart:0,pitSize},spawns:[]},start,3000);start+=width+30}
    s.spawner.ensureGround(0,34);s.spawner.ensureGround(start,600);
  });
  await shot('pits-desktop');
  await page.evaluate(()=>{
    const s=window.__GAME__.scene.getScene('game');s.spawner.reserveLanding(0,1800);
    while(s.horde.count<8)s.horde.addZombie();s.powers.activate('flight');s.pointerHeld=true;s.inputBlocked=false;
    for(let i=0;i<120;i++)s.sys.step(s.elapsed+1000/60,1000/60);
  });
  await shot('flight-desktop');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);await shot('flight-mobile');
  await page.evaluate(()=>{const s=window.__GAME__.scene.getScene('game');s.powers.active.get('flight').remaining=1800;for(let i=0;i<30;i++)s.sys.step(s.elapsed+1000/60,1000/60)});
  await shot('landing-mobile');
  fs.writeFileSync('.impeccable/review/extension/runtime.json',JSON.stringify({errors,staged:true,description:'Runtime art and controller fixtures; gameplay verified separately in Playwright.'},null,2));
  console.log({errors});await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
