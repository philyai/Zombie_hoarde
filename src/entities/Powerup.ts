import Phaser from 'phaser'
import { TEXTURES } from '../config/GameConfig'

export type PowerupKind = 'flight'

export class Powerup extends Phaser.Physics.Arcade.Sprite {
  readonly kind: PowerupKind = 'flight'
  private collected = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURES.FLIGHT)
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
