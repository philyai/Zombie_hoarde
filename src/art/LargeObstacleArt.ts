import Phaser from 'phaser'
import { LARGE_VEHICLES } from '../entities/ObstacleGeometry'

export function buildLargeObstacleArt(scene: Phaser.Scene): void {
  for (const kind of ['bus', 'airplane'] as const) {
    const { width, height } = LARGE_VEHICLES[kind]
    const texture = scene.textures.createCanvas(kind, width, height)!
    const c = texture.context
    c.imageSmoothingEnabled = false
    const r = (x:number,y:number,w:number,h:number,color:string) => { c.fillStyle=color; c.fillRect(x,y,w,h) }
    if (kind === 'bus') {
      r(3,9,98,28,'#253b3d'); r(18,4,65,33,'#ba9655'); r(4,10,96,23,'#ba9655')
      r(18,3,65,2,'#d9c48e'); r(6,12,92,2,'#e0bc77'); r(5,31,94,6,'#8a6c44')
      for(let x=10;x<80;x+=12) { r(x,14,9,10,'#294750'); r(x+1,14,7,2,'#90b4aa'); r(x+7,16,1,6,'#476b70') }
      r(84,15,12,17,'#30474a'); r(85,16,4,14,'#769085'); r(91,16,3,14,'#5b7975')
      r(39,15,2,5,'#e4d1a3'); r(41,19,3,2,'#e4d1a3'); r(52,16,3,2,'#d5cda6')
      r(24,29,49,2,'#e5c57c'); r(42,33,12,1,'#614f3a'); r(59,31,8,2,'#614f3a')
      r(2,28,4,4,'#d38361'); r(96,26,5,4,'#f5dea0'); r(0,36,104,2,'#172e33')
      for(const x of [14,80]) { r(x,35,13,9,'#12262d'); r(x+2,37,9,6,'#596c68'); r(x+4,38,5,3,'#a5b0a0') }
      r(69,7,9,3,'#9b7d49'); r(30,7,21,2,'#ece0b3')
    } else {
      // Broken nose and low wing form the first steps; roof and tail are distinct traversal surfaces.
      r(7,66,23,13,'#93aaa5'); r(3,70,5,6,'#c6cdb0'); r(10,66,18,2,'#e0dec1')
      r(30,55,37,17,'#78928f'); r(28,57,5,12,'#b4c5b2'); r(34,55,29,2,'#d1d3b8')
      r(67,34,125,37,'#bcc7b0'); r(62,39,7,28,'#96aaa0'); r(71,32,110,2,'#d9dbc0')
      r(68,61,124,10,'#668381'); r(69,59,120,2,'#84998c')
      r(71,41,21,13,'#284853'); r(73,42,8,3,'#96b8ad'); r(83,42,7,3,'#96b8ad'); r(81,43,2,10,'#9daea0')
      for(let x=102;x<183;x+=13) { r(x,43,8,8,'#294b57'); r(x+1,43,6,2,'#7fa69c') }
      r(134,41,3,6,'#d9d7b4'); r(138,46,3,3,'#d9d7b4')
      r(192,8,25,63,'#75928e'); r(193,6,20,3,'#bdc7ac'); r(196,10,16,24,'#435f65')
      r(197,13,3,13,'#dcb878'); r(200,22,9,3,'#dcb878'); r(191,62,27,9,'#556f70')
      r(217,61,31,11,'#95a99c'); r(219,61,26,2,'#d4d1ad'); r(246,65,7,5,'#617b79')
      r(34,72,5,15,'#9ea997'); r(30,84,17,8,'#152c34'); r(34,86,9,4,'#6c8078')
      r(153,71,7,15,'#91a393'); r(145,84,25,8,'#162d35'); r(149,86,6,4,'#75867a'); r(160,86,6,4,'#75867a')
      r(93,69,41,5,'#415f63'); r(95,73,30,6,'#617a78'); r(100,74,19,2,'#b1b9a1')
      for(const [x,y] of [[78,57],[161,57],[119,37],[177,66],[44,65]]) { r(x,y,9,1,'#5b7974'); r(x+3,y+1,3,2,'#7c8a77') }
      r(180,52,8,5,'#b99b6c'); r(186,48,3,12,'#49696a')
    }
    texture.refresh(); texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
  }
}
