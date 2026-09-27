import Phaser from 'phaser'

// Authored 5x7 glyphs, drawn into a bitmap atlas. No platform font rasterization.
const GLYPHS: Record<string, string> = {
  A:'01110 10001 10001 11111 10001 10001 10001',B:'11110 10001 10001 11110 10001 10001 11110',C:'01111 10000 10000 10000 10000 10000 01111',D:'11110 10001 10001 10001 10001 10001 11110',E:'11111 10000 10000 11110 10000 10000 11111',F:'11111 10000 10000 11110 10000 10000 10000',G:'01111 10000 10000 10111 10001 10001 01111',H:'10001 10001 10001 11111 10001 10001 10001',I:'11111 00100 00100 00100 00100 00100 11111',J:'00111 00010 00010 00010 10010 10010 01100',K:'10001 10010 10100 11000 10100 10010 10001',L:'10000 10000 10000 10000 10000 10000 11111',M:'10001 11011 10101 10101 10001 10001 10001',N:'10001 11001 10101 10011 10001 10001 10001',O:'01110 10001 10001 10001 10001 10001 01110',P:'11110 10001 10001 11110 10000 10000 10000',Q:'01110 10001 10001 10001 10101 10010 01101',R:'11110 10001 10001 11110 10100 10010 10001',S:'01111 10000 10000 01110 00001 00001 11110',T:'11111 00100 00100 00100 00100 00100 00100',U:'10001 10001 10001 10001 10001 10001 01110',V:'10001 10001 10001 10001 10001 01010 00100',W:'10001 10001 10001 10101 10101 10101 01010',X:'10001 10001 01010 00100 01010 10001 10001',Y:'10001 10001 01010 00100 00100 00100 00100',Z:'11111 00001 00010 00100 01000 10000 11111',
  '0':'01110 10001 10011 10101 11001 10001 01110','1':'00100 01100 00100 00100 00100 00100 01110','2':'01110 10001 00001 00010 00100 01000 11111','3':'11110 00001 00001 01110 00001 00001 11110','4':'00010 00110 01010 10010 11111 00010 00010','5':'11111 10000 10000 11110 00001 00001 11110','6':'01110 10000 10000 11110 10001 10001 01110','7':'11111 00001 00010 00100 01000 01000 01000','8':'01110 10001 10001 01110 10001 10001 01110','9':'01110 10001 10001 01111 00001 00001 01110',
  '!':'00100 00100 00100 00100 00100 00000 00100','?':'01110 10001 00001 00010 00100 00000 00100','+':'00000 00100 00100 11111 00100 00100 00000','-':'00000 00000 00000 11111 00000 00000 00000','/':'00001 00001 00010 00100 01000 10000 10000',':':'00000 00100 00100 00000 00100 00100 00000','.':'00000 00000 00000 00000 00000 00100 00100','>':'10000 01000 00100 00010 00100 01000 10000','<':'00001 00010 00100 01000 00100 00010 00001','[':'01110 01000 01000 01000 01000 01000 01110',']':'01110 00010 00010 00010 00010 00010 01110',' ':'00000 00000 00000 00000 00000 00000 00000',
}

type Rect = (x: number, y: number, w: number, h: number, color: string) => void
export function buildArt(scene: Phaser.Scene): void {
  const texture = (key: string, w: number, h: number, draw: (r: Rect) => void) => {
    if (scene.textures.exists(key)) return
    const t = scene.textures.createCanvas(key, w, h)!
    const c = t.context; c.imageSmoothingEnabled = false
    draw((x,y,w,h,color) => { c.fillStyle = color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)) })
    t.refresh(); t.setFilter(Phaser.Textures.FilterMode.NEAREST)
  }
  const chars = Object.keys(GLYPHS).join('')
  texture('font-atlas', chars.length * 6, 8, r => {
    [...chars].forEach((char, i) => GLYPHS[char].split(' ').forEach((row,y) => [...row].forEach((v,x) => { if(v === '1') r(i * 6 + x,y,1,1,'#ffffff') })))
  })
  const xml = `<font><info face="StreetPixel" size="8"/><common lineHeight="9"/><pages><page id="0" file="font-atlas"/></pages><chars count="${chars.length}">${[...chars].map((c,i) => `<char id="${c.charCodeAt(0)}" x="${i*6}" y="0" width="5" height="7" xoffset="0" yoffset="0" xadvance="6" page="0" chnl="15"/>`).join('')}</chars></font>`
  scene.cache.xml.add('font-data', new DOMParser().parseFromString(xml,'text/xml'))
  Phaser.GameObjects.BitmapText.ParseFromAtlas(scene, 'pixel-font','font-atlas','__BASE','font-data')

  for (let variant = 0; variant < 10; variant++) {
    const human = variant >= 4
    const prefix = human ? `h${variant-4}` : `z${variant}`
    const skin = human ? ['#dfa779','#bf8467','#e5b699'][variant%3] : ['#a8d477','#87bc70','#c0cd76','#7eae83'][variant]
    const shirt = ['#647c89','#985f54','#caa54f','#706b8e','#b8b9a1','#438887'][variant%6]
    for (const pose of ['idle','jump','fall','land','bite','hit','death',...Array.from({length:6},(_,i)=>`run${i}`)]) {
      texture(`${prefix}-${pose}`,24,28,r => {
        const f = pose.startsWith('run') ? +pose.slice(3) : 0
        const step = [0,2,3,0,-2,-3][f], bob = f===1 || f===4 ? 1 : 0
        const airborne = pose==='jump' || pose==='fall'
        const headY = (pose==='land' ? 5 : 3) + bob
        const dark='#1b2c2d'
        r(8,headY-1,11,2,dark); r(6,headY+1,15,7,dark); r(8,headY+8,11,3,dark)
        r(8,headY,10,8,skin); r(18,headY+3,3,3,skin); r(7,headY+3,3,5,skin)
        r(8,headY,10,2,human?'#4c3b37':'#4e6d46'); r(7,headY+2,3,2,human?'#4c3b37':'#709659')
        r(13,headY+3,3,3,'#eef2bf'); r(18,headY+3,2,3,'#eef2bf'); r(15,headY+4,1,2,dark); r(19,headY+4,1,2,dark)
        r(14,headY+7,6,2,dark); r(16,headY+7,2,1,'#f1e1ad')
        if(!human) r(9,headY+6,2,2,'#718f59')
        if(variant===6) { r(7,headY-2,13,3,'#edbb50'); r(6,headY,15,1,'#f9d777') }
        if(variant===8) r(11,headY,7,2,'#d8d4b4')
        r(7,12+bob,10,10,dark); r(8,12+bob,8,8,shirt); r(12,12+bob,2,6,human?'#e1d6b1':'#b6b98b')
        r(7,15+bob,4,5,shirt); r(5,18+bob,5,3,skin)
        const armY = airborne ? 10 : 14 + (f%3)
        r(15,armY,5,4,shirt); r(18,armY+2,5,3,skin)
        if(pose==='bite') r(19,headY+7,4,2,'#eaa386')
        if(human && airborne) r(4,9,3,8,skin)
        r(8,21,4,Math.max(2,5-Math.abs(step)),dark); r(7-step,24-Math.abs(step),6,3,dark)
        r(13,21,4,airborne?3:5,dark); r(13+step,airborne?23:25,6,2,dark)
        r(8-step,24-Math.abs(step),3,1,'#718084'); r(14+step,airborne?23:25,3,1,'#718084')
      })
    }
  }
  texture('pixel',2,2,r=>r(0,0,2,2,'#ffffff'))
  for(let f=0;f<6;f++) texture(`coin${f}`,12,12,r=>{
    const width=[8,6,3,2,3,6][f],x=6-Math.floor(width/2)
    r(x,2,width,8,'#986438');r(x-1,3,width+2,6,'#986438');r(x,2,width,7,'#e8b84f');r(x,3,Math.max(1,width-2),5,'#ffe69a');r(x+1,4,1,3,'#b78136')
  })
  texture('ground',32,46,r=>{
    r(0,0,32,46,'#28383b');r(0,0,32,3,'#abb2a0');r(0,3,32,3,'#5b6d67');r(0,6,32,1,'#172c31');r(2,1,12,1,'#d2c9a7');r(16,0,1,6,'#394e50');r(3,18,13,2,'#a38f60');r(7,33,8,2,'#1e3034');r(25,11,3,1,'#4b5a59');r(20,30,1,4,'#425252')
  })
  texture('pit',32,64,r=>{r(0,0,32,64,'#0b1b23');r(0,3,4,55,'#283536');r(28,0,4,64,'#3c4842');r(3,9,2,18,'#5d6552');r(26,17,3,12,'#5d6552')})
  texture('fence',22,25,r=>{r(3,4,3,21,'#77684c');r(17,4,3,21,'#77684c');r(0,6,22,6,'#cba85e');r(0,16,22,5,'#cba85e');for(let i=1;i<22;i+=7)r(i,6,3,6,'#453f35');r(2,6,18,1,'#efd694')})
  texture('spike',26,12,r=>{r(0,9,26,3,'#785455');for(let i=0;i<3;i++){r(2+i*9,6,6,4,'#b0b9b3');r(3+i*9,3,4,4,'#d4d8be');r(4+i*9,0,2,5,'#ece5c9')}})
  for(const [key,w,h,col] of [['car',40,23,'#b45f50'],['truck',48,34,'#729198'],['bus',66,34,'#c49b4f'],['armored',62,35,'#788568']] as const) texture(key,w,h,r=>{
    r(2,9,w-4,h-13,'#23383b');r(4,7,w-8,h-13,col);r(10,2,w-22,12,col);r(11,3,w-25,7,'#354d55');r(12,3,w-27,2,'#95b6b5')
    if(key==='car'){r(w-13,10,10,5,col);r(w-11,10,7,1,'#daa181')}else{for(let x=6;x<w-6;x+=10){r(x,6,7,8,'#304a54');r(x,6,7,2,'#a0bdaf')}r(4,18,w-9,2,'#dfbe78')}
    r(0,h-9,w,3,'#293738');r(3,h-10,5,3,'#d98165');r(w-6,h-11,4,3,'#ffdea0')
    r(6,h-7,9,7,'#17262c');r(w-17,h-7,9,7,'#17262c');r(8,h-5,5,3,'#7a8985');r(w-15,h-5,5,3,'#7a8985');r(19,h-13,5,1,'#ddc095')
  })
  texture('airplane',46,20,r=>{r(5,9,36,6,'#8da9a8');r(12,3,8,15,'#c0caba');r(10,0,4,20,'#728f90');r(4,10,5,3,'#dfa974');r(28,6,8,4,'#304e57');r(38,7,5,10,'#bc7c61')})
  texture('electric',24,36,r=>{r(0,0,5,36,'#778a89');r(19,0,5,36,'#778a89');for(let y=3;y<31;y+=7){r(5,y,11,2,'#b8e5d5');r(12,y+2,8,2,'#72aaa9')}r(0,31,24,5,'#a5874e')})
  texture('crate',22,22,r=>{r(0,0,22,22,'#4e4638');r(2,2,18,18,'#a78859');r(3,3,16,2,'#dcc38b');r(3,17,16,2,'#d0b482');r(4,5,2,12,'#65583d');r(16,5,2,12,'#65583d');for(let i=0;i<5;i++)r(5+i*2,5+i*2,3,3,'#d0b482')})
  for(const kind of ['flight','magnet','rage','giant','boost']) texture(`power-${kind}`,18,18,r=>{
    r(3,0,12,18,'#253d43');r(0,3,18,12,'#253d43');r(3,1,12,16,'#d9c99a');r(1,3,16,12,'#d9c99a');r(3,3,12,12,'#35595c')
    if(kind==='flight'){r(7,4,4,8,'#becfc3');r(3,7,12,3,'#becfc3');r(7,12,4,3,'#e5a459')}
    if(kind==='magnet'){r(4,4,3,8,'#d78467');r(11,4,3,8,'#d78467');r(6,11,6,3,'#d78467');r(4,4,3,3,'#e4e7c4');r(11,4,3,3,'#e4e7c4')}
    if(kind==='rage'){r(9,3,4,4,'#e5ac5e');r(6,6,6,4,'#e5ac5e');r(4,9,6,3,'#e5ac5e');r(6,11,3,4,'#e5ac5e')}
    if(kind==='giant'){r(5,4,8,8,'#b8d981');r(4,12,4,3,'#b8d981');r(10,12,4,3,'#b8d981');r(7,7,2,2,'#35595c');r(11,7,2,2,'#35595c')}
    if(kind==='boost'){r(4,5,5,8,'#f0c364');r(9,3,5,8,'#f0c364');r(6,7,1,4,'#96733f');r(11,5,1,4,'#96733f')}
  })
  // Compatibility keys for the incumbent entity interfaces.
  for(const [alias,source] of [['leader-zombie','z0-run0'],['follower-zombie','z1-run0'],['civilian','h0-idle'],['coin','coin0'],['flight-pack','power-flight']]) {
    const src=scene.textures.get(source).getSourceImage() as HTMLCanvasElement
    scene.textures.addCanvas(alias,src)
  }
}
