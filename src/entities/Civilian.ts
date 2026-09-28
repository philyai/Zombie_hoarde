import Phaser from 'phaser'
import { TEXTURES } from '../config/GameConfig'

export class Civilian extends Phaser.Physics.Arcade.Sprite {
  private absorbed = false
  private variant = 0
  patrolWidth=24
  private homeX:number

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURES.CIVILIAN)
    this.homeX=x
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setDepth(11).setOrigin(0.5, 1)
    this.setImmovable(true)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    this.variant = Math.floor(x / 19) % 6
    body.setSize(12, 23).setOffset(6, 5)
    this.setTexture(`h${this.variant}-idle`)
  }

  react(frontX: number, elapsed: number): void {
    if (!this.active) return
    const panic = this.x - frontX < 100
    this.setTexture(`h${this.variant}-${panic ? `run${Math.floor(elapsed / 110 + this.variant) % 6}` : 'idle'}`)
    this.setVelocityX(panic && this.x<this.homeX+this.patrolWidth ? 12 : 0)
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
