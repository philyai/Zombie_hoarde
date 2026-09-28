import Phaser from 'phaser'

/** Source-pixel road/column textures keep the collision top and visible edge identical. */
export function terrainTexture(scene:Phaser.Scene,y:number,pillar=false):string{
  const key=`terrain-${y}-${pillar?'pillar':'road'}`
  if(scene.textures.exists(key))return key
  const t=scene.textures.createCanvas(key,32,270-y)!,c=t.context
  const rect=(x:number,top:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(x,top,w,h)}
  rect(0,0,32,270-y,pillar?'#435555':'#28383b')
  rect(0,0,32,3,'#abb2a0');rect(2,0,13,1,'#d2c9a7');rect(0,3,32,3,'#5b6d67');rect(0,6,32,2,'#172c31')
  for(let row=12;row<270-y;row+=13){rect(3+(row%3)*4,row,12,2,'#243638');rect(22,row+4,5,3,'#65746b')}
  if(pillar){rect(2,8,3,270-y,'#819084');rect(27,8,3,270-y,'#283b3e');for(let x=3;x<30;x+=10)rect(x,8,5,3,'#d2ab62')}
  else {rect(3,18,13,2,'#a38f60');rect(16,0,1,6,'#394e50')}
  t.refresh();t.setFilter(Phaser.Textures.FilterMode.NEAREST);return key
}
