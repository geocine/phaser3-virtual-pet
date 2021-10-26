// @ts-nocheck
import Phaser from 'phaser';

export default class Demo extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    const bg = this.add.sprite(0, 0, 'backyard').setInteractive();
    bg.setOrigin(0, 0);
    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;
    const text = this.add.text(gameWidth / 2, gameHeight / 2, 'Virtual Pet', {
      font: '40px Arial',
      fill: '#ffffff'
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(1);

    const textBg = this.add.graphics();
    textBg.fillStyle(0x000000, 0.7);
    textBg.fillRect(
      gameWidth / 2 - text.width / 2 - 10,
      gameHeight / 2 - text.height / 2 - 10,
      text.width + 20,
      text.height + 20
    );

    bg.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
