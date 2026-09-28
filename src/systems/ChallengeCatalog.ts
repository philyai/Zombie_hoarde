import type { ChunkDefinition, SpawnDefinition, TerrainSurface } from './ChunkSpawner'
import { DifficultyManager } from './DifficultyManager'
import { canClearGap, jumpClearance } from '../config/Traversal'

const road=(start:number,width:number,y=224,pillar=false):TerrainSurface=>({start,width,y,pillar})
const coins=(offsetX:number,count=5,y=180):SpawnDefinition=>({kind:'coin',offsetX,y,count,spacing:16})
const person=(offsetX:number,y=224):SpawnDefinition=>({kind:'civilian',offsetX,y,patrolWidth:8})
const vehicle=(kind:'car'|'bus'|'airplane',offsetX:number,y=224):SpawnDefinition=>({kind,offsetX,y})
const mines=(offsetX:number,count:number,spacing=20,y=224):SpawnDefinition=>({kind:'mine',offsetX,y,count,spacing})
function chunk(id:string,minDistance:number,width:number,spawns:SpawnDefinition[],terrain?:TerrainSurface[],complexity=1,recovery=false):ChunkDefinition{
  return {id,minDistance,width,spawns,terrain,ground:{},weight:2,complexity,recovery,
    difficulty:minDistance<250?'easy':minDistance<900?'medium':minDistance<1500?'hard':'chaos'}
}

export const CHALLENGE_CHUNKS:readonly ChunkDefinition[]=[
  chunk('small_pit',0,250,[coins(93)], [road(0,110),road(150,100)]),
  chunk('tiny_pit',0,230,[coins(100,4)], [road(0,110),road(134,96)]),
  chunk('medium_pit',300,290,[coins(103,6)], [road(0,120),road(180,110)]),
  chunk('large_pit',1100,330,[coins(122,7)], [road(0,140),road(220,110)],2),
  chunk('very_large_pit',2200,370,[coins(133,7)], [road(0,150),road(240,130)],3,true),
  chunk('pit_pillar_pit_easy',300,394,[coins(110,4),coins(209,5),person(195,208)],
    [road(0,120),road(160,64,208,true),road(264,130)],2,true),
  chunk('pit_pillar_pit_medium',650,408,[coins(116,5),coins(210,5),person(195,208)],
    [road(0,130),road(180,48,208,true),road(278,130)],3,true),
  chunk('pit_pillar_pit_hard',1100,432,[coins(126,5),coins(223,5)],
    [road(0,140),road(200,32,216,true),road(292,140)],4,true),
  chunk('double_pillar_gap',1500,514,[coins(116,5),coins(201,5),coins(290,5)],
    [road(0,130),road(178,40,208,true),road(266,40,200,true),road(354,160)],5,true),
  chunk('step_up_easy',0,300,[coins(88,5,173),person(169,208)],
    [road(0,110),road(110,110,208),road(220,80)]),
  chunk('step_up_medium',500,330,[coins(85,6,156),person(183,192)],
    [road(0,120),road(120,120,192),road(240,90)],2),
  chunk('step_down',250,360,[coins(130,5,215)],
    [road(0,115),road(115,135,240),road(250,110)],2),
  chunk('uneven_sequence',650,560,[coins(85,5,160),coins(305,5,169),person(390,200)],
    [road(0,110),road(110,120,208),road(230,100),road(330,120,200),road(450,110)],3),
  chunk('raised_car',650,530,[vehicle('car',270,208),coins(205,5,160)],
    [road(0,110),road(110,300,208),road(410,120)],3),
  chunk('raised_pit',650,490,[coins(92,5,170),coins(217,6,166)],
    [road(0,115),road(115,130,208),road(295,100,240),road(395,95)],3),
  chunk('pit_then_step',650,470,[coins(105),coins(270,5,163)],
    [road(0,125),road(175,140),road(315,80,200),road(395,75)],3),
  chunk('mine_single',0,260,[mines(116,1),coins(88,4),person(211)]),
  chunk('mine_double',250,285,[mines(116,2,24),coins(90,5),person(223)],undefined,2),
  chunk('mine_triple',500,315,[mines(125,3),coins(103,6)],undefined,3),
  chunk('mine_quad',900,500,[mines(140,2,24),mines(300,2,24),coins(118,5),coins(278,5)],undefined,4,true),
  chunk('mine_quad_tight',2500,380,[mines(140,4),coins(118,7)],undefined,5,true),
  chunk('mine_then_pit',500,470,[mines(112,2,24),coins(90,5),coins(267,6)],
    [road(0,290),road(350,120)],3),
  chunk('pit_then_mines',650,490,[coins(112),mines(322,3),coins(294,6)],
    [road(0,130),road(180,310)],3),
  chunk('car_requirement',0,290,[vehicle('car',140),coins(105,5,173),person(240)]),
  chunk('car_jump',0,300,[vehicle('car',155),coins(115,6,174)]),
  chunk('bus_requirement',250,390,[vehicle('bus',200),coins(140,6,168)],undefined,2,true),
  chunk('bus_jump',500,415,[vehicle('bus',215),coins(151,6,165),person(340)],undefined,2,true),
  chunk('bus_after_pit',900,650,[coins(105,6),vehicle('bus',430),coins(366,7,163)],
    [road(0,125),road(185,465)],4,true),
  chunk('bus_mine_combo',1500,710,[vehicle('bus',205),coins(141,7,163),mines(470,3),coins(445,6)],undefined,5,true),
  chunk('airplane_intro',1200,750,[vehicle('airplane',365),coins(240,3,186),coins(309,5,149),coins(421,4,113)],undefined,4,true),
  chunk('airplane_requirement',1500,770,[vehicle('airplane',380),coins(255,3,186),coins(324,5,149),coins(436,4,113)],undefined,5,true),
  chunk('advanced_mixed_chunk',2000,1000,[mines(130,3),coins(105,6),coins(337,5),vehicle('bus',765),coins(700,7,163),person(935)],
    [road(0,355),road(405,48,208,true),road(503,497)],5,true),
  {...chunk('recovery_cache',1500,370,[{kind:'civilian',offsetX:179,y:192,count:3,spacing:18,patrolWidth:5},coins(105,6,154)],
    [road(0,130),road(130,140,192),road(270,100)],3),weight:.15},
]

/** Validate the same authored geometry the spawner instantiates, at its slowest eligible speed. */
export function validateChallenge(c:ChunkDefinition):string[]{
  const errors:string[]=[],settings=DifficultyManager.at(c.minDistance??0),surfaces=c.terrain??[road(0,c.width)]
  const fail=(s:string)=>errors.push(`${c.id}: ${s}`)
  if(surfaces[0].start!==0||surfaces[0].y!==224||surfaces.at(-1)!.start+surfaces.at(-1)!.width!==c.width)fail('unsafe entry/exit')
  if(surfaces.at(-1)!.y!==224)fail('exit elevation mismatch')
  const events:{left:number;right:number;kind:string}[]=[]
  surfaces.forEach((surface,i)=>{
    if(surface.width<24||surface.y<182||surface.y>240)fail('invalid landing surface')
    if(!i)return
    const previous=surfaces[i-1],gap=surface.start-previous.start-previous.width,rise=previous.y-surface.y
    if(gap<0)fail('overlapping terrain')
    if(gap>0){if(!canClearGap(settings.speed,gap,rise))fail('unreachable elevated gap');events.push({left:previous.start+previous.width,right:surface.start,kind:'gap'})}
    else if(rise>0){if(rise>settings.maxStep)fail('step exceeds tier');events.push({left:surface.start,right:surface.start+25,kind:'step'})}
  })
  const mineXs:{x:number;y:number}[]=[]
  for(const spawn of c.spawns){
    const width=({car:40,bus:104,airplane:256,mine:16} as Record<string,number>)[spawn.kind]
    for(let i=0;i<(spawn.count??1);i++){
      const x=spawn.offsetX+i*(spawn.spacing??0)
      if(x<0||x>c.width)fail('spawn out of bounds')
      if(spawn.kind==='coin')continue
      const platform=surfaces.find(p=>x>=p.start&&x<=p.start+p.width&&p.y===spawn.y)
      if(!platform)fail('entity without matching ground')
      if(width&&platform&&(x-width/2<platform.start||x+width/2>platform.start+platform.width))fail('hazard on landing edge')
      if(spawn.kind==='mine')mineXs.push({x,y:spawn.y})
      else if(width)events.push({left:x-width/2,right:x+width/2,kind:spawn.kind})
    }
  }
  mineXs.sort((a,b)=>a.x-b.x)
  for(let i=0;i<mineXs.length;){let j=i+1;while(j<mineXs.length&&mineXs[j].x-mineXs[j-1].x<90)j++
    if(j-i>settings.maxMines)fail('mine count exceeds tier')
    for(let k=i+1;k<j;k++)if(mineXs[k].x-mineXs[k-1].x<20)fail('touching mines')
    const left=mineXs[i].x-8,right=mineXs[j-1].x+8
    if(right-left+11>jumpClearance(settings.speed,7))fail('mine group exceeds body clearance')
    events.push({left,right,kind:'mines'});i=j
  }
  events.sort((a,b)=>a.left-b.left)
  for(let i=0;i<events.length;i++){
    const e=events[i],prior=events[i-1]
    if(e.left<75||e.right>c.width-65)fail('insufficient reaction/recovery boundary')
    const pillarPair=e.kind==='gap'&&prior?.kind==='gap'
    if(prior&&!pillarPair&&e.left-prior.right<100)fail('crowded challenge transition')
  }
  return errors
}
