import Phaser from 'phaser';
import config from './config';
import GameScene from './scenes/Game';
import HomeScene from './scenes/Home';
import LoadScene from './scenes/Load';
import BootScene from './scenes/Boot';

new Phaser.Game(
  Object.assign(config, {
    scene: [BootScene, LoadScene, HomeScene, GameScene]
  })
);
