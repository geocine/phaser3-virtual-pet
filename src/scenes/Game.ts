// @ts-nocheck
import 'phaser';

export default class Demo extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    this.stats = {
      health: 100,
      fun: 100,
    };

    this.decayRates = {
      health: -5,
      fun: -2,
    };
  }

  create() {
    const bg = this.add.sprite(0, 0, 'backyard').setInteractive();
    bg.setOrigin(0, 0);
    bg.on('pointerdown', this.placeItem, this);
    this.pet = this.add.sprite(100, 200, 'pet').setInteractive();
    // this.pet.depth = 1;
    // make pet draggable
    this.input.setDraggable(this.pet);

    // follow pointer (mouse/finger) when dragging
    this.input.on('drag', (_, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.createUi();

    this.createHud();
    this.refreshHud();

    this.timedEventStats = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        this.updateStats(this.decayRates);
      },
    });
  }

  createUi() {
    const appleButton = this.add.sprite(72, 570, 'apple').setInteractive();
    appleButton.customStats = { health: 20, fun: 0 };
    appleButton.on('pointerdown', this.pickItem);

    const candyButton = this.add.sprite(144, 570, 'candy').setInteractive();
    candyButton.customStats = { health: -10, fun: 10 };
    candyButton.on('pointerdown', this.pickItem);

    const toyButton = this.add.sprite(216, 570, 'toy').setInteractive();
    toyButton.customStats = { health: 0, fun: 15 };
    toyButton.on('pointerdown', this.pickItem);

    const rotateButton = this.add.sprite(288, 570, 'rotate').setInteractive();
    rotateButton.customStats = { fun: 20 };
    rotateButton.on('pointerdown', this.rotatePet);

    this.buttons = [appleButton, candyButton, toyButton, rotateButton];

    this.uiBlocked = false;

    this.uiReady();
  }

  createHud() {
    // health stat
    this.healthText = this.add.text(20, 20, 'Health: ', {
      font: '24px Arial',
      fill: '#ffffff',
    });

    // fun stat
    this.funText = this.add.text(170, 20, 'Fun: ', {
      font: '24px Arial',
      fill: '#ffffff',
    });
  }

  refreshHud() {
    this.healthText.setText('Health: ' + this.stats.health);
    this.funText.setText('Fun: ' + this.stats.fun);
  }

  updateStats(statDiff) {
    // manually update each stat
    // this.stats.health += statDiff.health;
    // this.stats.fun += statDiff.fun;

    // flag to see if it's game over
    let isGameOver = false;

    // more flexible
    for (const stat in statDiff) {
      if (statDiff.hasOwnProperty(stat)) {
        this.stats[stat] += statDiff[stat];

        // stats can't be less than zero
        if (this.stats[stat] < 0) {
          isGameOver = true;
          this.stats[stat] = 0;
        }
      }
    }

    // refresh HUD
    this.refreshHud();

    // check to see if the game ended
    if (isGameOver) this.gameOver();
  }

  gameOver() {
    this.uiBloced = true;
    this.pet.setFrame(4);

    this.timedEventStats = this.time.addEvent({
      delay: 2000,
      repeat: 0,
      callback: () => {
        this.scene.start('HomeScene');
      },
    });

    console.log('game over');
  }

  rotatePet() {
    // note this context here is for pointerdown
    if (this.scene.uiBlocked) return;

    this.scene.uiReady();

    this.scene.uiBlocked = true;

    this.alpha = 0.5;

    this.scene.tweens.add({
      targets: this.scene.pet,
      duration: 600,
      angle: 360,
      pause: false,
      onComplete: () => {
        this.scene.updateStats(this.customStats);

        this.scene.uiReady();

        this.scene.refreshHud();
      },
    });

    console.log(this.scene.stats);
    console.log('we are rotating the pet');
  }

  pickItem() {
    // note this context here is for pointerdown
    if (this.scene.uiBlocked) return;

    this.scene.uiReady();

    this.scene.selectedItem = this;

    this.alpha = 0.5;

    console.log('we are picking an item', this.texture.key);
  }

  placeItem(pointer, localX, localY) {
    if (!this.selectedItem || this.uiBlocked) return;

    const placedItem = this.add.sprite(
      localX,
      localY,
      this.selectedItem.texture.key
    );

    this.uiBlocked = true;

    this.tweens.add({
      targets: this.pet,
      duration: 500,
      x: localX,
      y: localY,
      paused: false,
      onComplete: () => {
        placedItem.destroy();
        this.pet.play('funnyfaces');

        // clear UI
        this.updateStats(this.selectedItem.customStats);

        this.pet.on('animationcomplete', () => {
          this.pet.setFrame(0);
          this.uiReady();

          this.refreshHud();
        });
      },
    });
  }

  uiReady() {
    this.selectedItem = null;

    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].alpha = 1;
    }

    this.uiBlocked = false;
  }
}
