import Phaser from 'phaser'
import { audio } from './AudioManager'
import { pixelText } from '../ui/PixelUI'
import { saveManager } from './SaveManager'
export class Feedback {
  private particles: { image: Phaser.GameObjects.Image; vx: number; vy: number; life: number }[] = []
  private pool: Phaser.GameObjects.Image[] = []
  constructor(private scene: Phaser.Scene) {}
  burst(x: number, y: number, color: number, count = 8): void {
    for (let i = 0; i < count && this.particles.length < 100; i++) {
      const image = this.pool.pop() ?? this.scene.add.image(0, 0, 'pixel').setDepth(60)
      image.setPosition(x, y).setTint(color).setVisible(true).setAlpha(1)
      this.particles.push({ image, vx: Math.random() * 100 - 50, vy: -20 - Math.random() * 90, life: 400 + Math.random() * 250 })
    }
  }
  update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= delta; p.vy += delta * .25
      p.image.x += p.vx * delta / 1000; p.image.y += p.vy * delta / 1000
      if (p.life <= 0) { p.image.setVisible(false); this.pool.push(p.image); this.particles.splice(i, 1) }
    }
  }
  popup(x: number, y: number, label: string, color = 0xc3ed83): void {
    const text = pixelText(this.scene, x, y, label, 8, color).setOrigin(.5).setDepth(80)
    this.scene.tweens.add({ targets: text, y: y - 20, alpha: 0, duration: 750, onComplete: () => text.destroy() })
  }
  shake(strength = .003): void { if (saveManager.load().settings.shake) this.scene.cameras.main.shake(130, strength) }
  death(source: Phaser.GameObjects.Sprite, cause: string): void {
    const dead = source.setDepth(40).setTint(cause === 'electric' ? 0xe7f3ff : 0xeaa78d)
    const variant = source.texture.key.match(/^z\d/)
    if (variant) dead.setTexture(`${variant[0]}-${cause === 'pit' ? 'fall' : 'hit'}`)
    this.burst(source.x, source.y, cause === 'electric' ? 0x9ce5f5 : 0x9ba966, 8)
    this.scene.tweens.add({ targets: dead, x: source.x + (cause === 'pit' ? 7 : -28), y: source.y - (cause === 'pit' ? 0 : 25), angle: -75, duration: 170, onComplete: () => {
      this.scene.tweens.add({ targets: dead, x: dead.x - 15, y: 310, angle: -170, duration: 480, onComplete: () => dead.destroy() })
    } })
    audio.play('hit')
  }
}
const systems = new WeakMap<Phaser.Scene, Feedback>()
export function feedback(scene: Phaser.Scene): Feedback {
  let system = systems.get(scene)
  if (!system) { system = new Feedback(scene); systems.set(scene, system); scene.events.once('shutdown', () => systems.delete(scene)) }
  return system
}
