// @ts-nocheck
import 'phaser';

export default class Demo extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('logo', 'assets/images/rubber_duck.png');
  }

  create() {
    this.scene.start('LoadScene');
  }
}
