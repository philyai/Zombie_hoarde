import Phaser from 'phaser'
import { COLORS, SCENES, TEXTURES } from '../config/GameConfig'

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT)
  }

  create(): void {
    this.createPlaceholderTextures()
    this.scene.start(SCENES.MENU)
  }

  private createPlaceholderTextures(): void {
    const graphics = this.add.graphics()

    const generate = (
      key: string,
      width: number,
      height: number,
      draw: () => void,
    ): void => {
      if (this.textures.exists(key)) {
        return
      }
      graphics.clear()
      draw()
      graphics.generateTexture(key, width, height)
    }

    generate(TEXTURES.LEADER, 12, 14, () => {
      graphics.fillStyle(COLORS.LEADER).fillRect(1, 3, 10, 10)
      graphics.fillStyle(0x18201a).fillRect(3, 5, 2, 2).fillRect(8, 5, 2, 2)
      graphics.fillStyle(0x314d2b).fillRect(0, 11, 4, 3).fillRect(8, 11, 4, 3)
    })

    generate(TEXTURES.FOLLOWER, 10, 12, () => {
      graphics.fillStyle(COLORS.FOLLOWER).fillRect(1, 2, 8, 8)
      graphics.fillStyle(0x172019).fillRect(2, 4, 2, 2).fillRect(6, 4, 2, 2)
      graphics.fillStyle(0x365a32).fillRect(0, 9, 4, 3).fillRect(6, 9, 4, 3)
    })

    generate(TEXTURES.CIVILIAN, 10, 14, () => {
      graphics.fillStyle(0xf4c7a1).fillRect(3, 0, 5, 5)
      graphics.fillStyle(COLORS.CIVILIAN).fillRect(1, 5, 9, 7)
      graphics.fillStyle(0x254967).fillRect(1, 12, 3, 2).fillRect(7, 12, 3, 2)
    })

    generate(TEXTURES.COIN, 8, 8, () => {
      graphics.fillStyle(COLORS.COIN).fillCircle(4, 4, 4)
      graphics.fillStyle(0xfff0a4).fillRect(3, 1, 2, 6)
    })

    generate(TEXTURES.FENCE, 14, 28, () => {
      graphics.fillStyle(COLORS.FENCE).fillRect(1, 2, 3, 26).fillRect(10, 2, 3, 26)
      graphics.fillRect(0, 7, 14, 4).fillRect(0, 18, 14, 4)
      graphics.fillStyle(0xd09859).fillRect(2, 8, 10, 1).fillRect(2, 19, 10, 1)
    })

    generate(TEXTURES.SPIKE, 18, 9, () => {
      graphics.fillStyle(COLORS.SPIKE)
      graphics.fillTriangle(0, 9, 3, 1, 6, 9)
      graphics.fillTriangle(6, 9, 9, 0, 12, 9)
      graphics.fillTriangle(12, 9, 15, 2, 18, 9)
    })

    generate(TEXTURES.PIT, 32, 64, () => {
      graphics.fillStyle(COLORS.PIT).fillRect(0, 0, 32, 64)
      graphics.fillStyle(0x11191b).fillRect(2, 0, 3, 64).fillRect(25, 0, 4, 64)
      graphics.fillStyle(0x1f2a2c).fillRect(0, 0, 32, 3)
      graphics.fillStyle(0x0b1012).fillRect(10, 8, 3, 42).fillRect(18, 18, 2, 46)
    })

    generate(TEXTURES.CAR, 22, 12, () => {
      graphics.fillStyle(COLORS.CAR).fillRect(1, 5, 20, 6)
      graphics.fillStyle(0xf8a6b5).fillRect(6, 2, 9, 4)
      graphics.fillStyle(0x1c2428).fillRect(3, 9, 4, 3).fillRect(16, 9, 4, 3)
      graphics.fillStyle(0xffffff).fillRect(18, 6, 2, 2)
    })

    generate(TEXTURES.TRUCK, 25, 22, () => {
      graphics.fillStyle(COLORS.TRUCK).fillRect(1, 5, 16, 15)
      graphics.fillStyle(0xf9c46a).fillRect(17, 10, 7, 10)
      graphics.fillStyle(0x31424a).fillRect(18, 11, 4, 4)
      graphics.fillStyle(0x1c2428).fillRect(3, 19, 4, 3).fillRect(18, 19, 4, 3)
    })

    generate(TEXTURES.BUS, 35, 23, () => {
      graphics.fillStyle(COLORS.BUS).fillRect(1, 3, 33, 18)
      graphics.fillStyle(0x5b8791).fillRect(4, 6, 5, 5).fillRect(11, 6, 5, 5).fillRect(18, 6, 5, 5).fillRect(25, 6, 5, 5)
      graphics.fillStyle(0x1c2428).fillRect(5, 19, 5, 4).fillRect(25, 19, 5, 4)
      graphics.fillStyle(0xe97155).fillRect(1, 13, 2, 4)
    })

    generate(TEXTURES.AIRPLANE, 38, 16, () => {
      graphics.fillStyle(COLORS.AIRPLANE).fillRect(4, 6, 27, 5)
      graphics.fillRect(28, 4, 7, 9)
      graphics.fillTriangle(13, 6, 20, 0, 24, 6)
      graphics.fillTriangle(14, 11, 22, 16, 26, 11)
      graphics.fillStyle(0x47636e).fillRect(6, 7, 6, 2)
      graphics.fillStyle(0xff6d5f).fillRect(0, 6, 5, 5)
    })

    generate(TEXTURES.FLIGHT, 14, 14, () => {
      graphics.fillStyle(COLORS.FLIGHT).fillRect(4, 2, 6, 10)
      graphics.fillStyle(0xbfcbd0).fillRect(1, 4, 3, 6).fillRect(10, 4, 3, 6)
      graphics.fillStyle(0xffdd57).fillRect(5, 12, 2, 2).fillRect(8, 12, 2, 2)
    })

    generate(TEXTURES.GROUND, 32, 32, () => {
      graphics.fillStyle(COLORS.GROUND).fillRect(0, 0, 32, 32)
      graphics.fillStyle(COLORS.GROUND_EDGE).fillRect(0, 0, 32, 4)
      graphics.fillStyle(0x1c2923).fillRect(4, 12, 8, 3).fillRect(19, 23, 9, 3)
    })

    graphics.destroy()
  }
}
