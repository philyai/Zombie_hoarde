import Phaser from 'phaser'
import { SCENES } from '../config/GameConfig'
import { buildArt } from '../art/PixelArt'
export class BootScene extends Phaser.Scene {
  constructor(){super(SCENES.BOOT)}
  create():void {buildArt(this);this.scene.start(SCENES.MENU)}
}
