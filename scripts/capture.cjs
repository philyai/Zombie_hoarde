const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__GAME__?.scene.isActive('menu'));
  fs.mkdirSync('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/menu-desktop.png'});
  const navigate=async label=>{await page.evaluate(label=>window.__GAME__.scene.getScenes(true)[0].children.list.find(o=>o.getData?.('label')===label).getData('activate')(),label);await page.waitForTimeout(230)};
  for(const label of ['MISSIONS','UPGRADES','SETTINGS']){await navigate(label);await page.screenshot({path:`artifacts/${label.toLowerCase()}-desktop.png`});await navigate('BACK')}
  await page.keyboard.press('Space');await page.waitForTimeout(3000);
  await page.screenshot({path:'artifacts/gameplay-desktop.png'});
  await page.keyboard.press('Escape');await page.screenshot({path:'artifacts/pause-desktop.png'});
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);await page.screenshot({path:'artifacts/pause-mobile.png'});
  await page.keyboard.press('Escape');await page.waitForTimeout(150);await page.screenshot({path:'artifacts/gameplay-mobile.png'});
  await page.waitForTimeout(5000);await page.screenshot({path:'artifacts/results-mobile.png'});
  await page.evaluate(()=>window.__GAME__.scene.getScenes(true)[0].scene.start('game'));await page.waitForTimeout(200);
  await page.evaluate(()=>{const s=window.__GAME__.scene.getScene('game');while(s.horde.count<60)s.horde.addZombie();s.powers.activate('flight');s.powers.activate('rage')});
  await page.waitForTimeout(1000);
  const measurements=await page.evaluate(()=>{const s=window.__GAME__.scene.getScene('game');return {fps:window.__GAME__.loop.actualFps,horde:s.horde.count,visible:s.horde.sprites.filter(o=>o.visible&&o.active).length,sceneObjects:s.children.length}});
  await page.screenshot({path:'artifacts/horde-60-mobile.png'});
  fs.writeFileSync('artifacts/runtime.json',JSON.stringify({errors,measurements},null,2));console.log({errors,measurements});
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
