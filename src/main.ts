import Phaser from 'phaser'
import './style.css'
import { GAME_HEIGHT, GAME_WIDTH } from './config/GameConfig'
import { BootScene } from './scenes/BootScene'
import { GameOverScene } from './scenes/GameOverScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { saveManager } from './systems/SaveManager'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10191d',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      customUpdate: true,
    },
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
}

const game = new Phaser.Game(config)
if (import.meta.env.DEV) Object.assign(window, { __GAME__: game, __SAVE__: saveManager })
