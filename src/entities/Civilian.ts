import Phaser from 'phaser'
import { TEXTURES } from '../config/GameConfig'

export class Civilian extends Phaser.Physics.Arcade.Sprite {
  private absorbed = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURES.CIVILIAN)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(11).setOrigin(0.5, 1)
    this.setImmovable(true)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
  }

  consume(): boolean {
    if (this.absorbed || !this.active) {
      return false
    }
    this.absorbed = true
    this.disableBody(true, true)
    return true
  }
}
