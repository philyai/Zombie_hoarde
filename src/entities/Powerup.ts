import Phaser from 'phaser'
export type PowerupKind = 'flight' | 'magnet' | 'rage' | 'giant' | 'boost'

export class Powerup extends Phaser.Physics.Arcade.Sprite {
  readonly kind: PowerupKind
  private collected = false

  constructor(scene: Phaser.Scene, x: number, y: number, kind: PowerupKind = 'flight') {
    super(scene, x, y, `power-${kind}`)
    this.kind = kind
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(12)
    this.setImmovable(true)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
  }

  consume(): boolean {
    if (this.collected || !this.active) {
      return false
    }
    this.collected = true
    this.disableBody(true, true)
    return true
  }
}
