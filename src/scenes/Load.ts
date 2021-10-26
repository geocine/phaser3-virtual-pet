import 'phaser';

export default class Demo extends Phaser.Scene {
  constructor() {
    super('LoadScene');
  }

  preload() {
    this.showProgress();

    this.load.image('backyard', 'assets/images/backyard.png');
    this.load.image('apple', 'assets/images/apple.png');
    this.load.image('candy', 'assets/images/candy.png');
    this.load.image('rotate', 'assets/images/rotate.png');
    this.load.image('toy', 'assets/images/rubber_duck.png');

    this.load.spritesheet('pet', 'assets/images/pet.png', {
      frameWidth: 97,
      frameHeight: 83,
      margin: 1,
      spacing: 1
    });
  }

  create() {
    this.anims.create({
      key: 'funnyfaces',
      frames: this.anims.generateFrameNames('pet', { frames: [1, 2, 3] }),
      yoyo: true,
      repeat: 0
    });

    this.scene.start('HomeScene');
  }

  showProgress() {
    this.add.sprite((this.sys.game.config.width as number) / 2, 250, 'logo');

    let bgBar = this.add.graphics();

    let barW = 150;
    let barH = 30;

    bgBar.setPosition(
      (this.sys.game.config.width as number) / 2 - barW / 2,
      (this.sys.game.config.height as number) / 2 - barH / 2
    );
    bgBar.fillStyle(0xf5f5f5, 1);
    bgBar.fillRect(0, 0, barW, barH);

    const progressBar = this.add.graphics();
    progressBar.setPosition(
      (this.sys.game.config.width as number) / 2 - barW / 2,
      (this.sys.game.config.height as number) / 2 - barH / 2
    );

    // listen to the "progress" event
    this.load.on('progress', (value: number) => {
      // clearing progress bar (so we can draw it again)
      progressBar.clear();

      // set style
      progressBar.fillStyle(0x9ad98d, 1);

      // draw rectangle
      progressBar.fillRect(0, 0, value * barW, barH);
    });
  }
}
