import Phaser, { GameObjects } from 'phaser';

interface Stats {
  health?: number;
  fun?: number;
}

interface SpriteWithStats extends GameObjects.Sprite {
  customStats?: Stats;
}

export default class Demo extends Phaser.Scene {
  private stats: Stats;
  private decayRates: Stats;
  private pet: GameObjects.Sprite;
  private buttons: SpriteWithStats[];
  private uiBlocked: boolean;
  private healthText: GameObjects.Text;
  private funText: GameObjects.Text;
  private selectedItem: SpriteWithStats | null;

  constructor() {
    super('GameScene');
  }

  init() {
    this.stats = {
      health: 100,
      fun: 100
    };

    this.decayRates = {
      health: -5,
      fun: -2
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
    this.input.on(
      'drag',
      (
        _: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number
      ) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    );

    this.createUi();

    this.createHud();
    this.refreshHud();

    this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        this.updateStats(this.decayRates);
      }
    });
  }

  createUi() {
    const appleButton: SpriteWithStats = this.add
      .sprite(72, 570, 'apple')
      .setInteractive();
    appleButton.customStats = { health: 20, fun: 0 };
    appleButton.on('pointerdown', () => this.pickItem(appleButton));

    const candyButton: SpriteWithStats = this.add
      .sprite(144, 570, 'candy')
      .setInteractive();
    candyButton.customStats = { health: -10, fun: 10 };
    candyButton.on('pointerdown', () => this.pickItem(candyButton));

    const toyButton: SpriteWithStats = this.add
      .sprite(216, 570, 'toy')
      .setInteractive();
    toyButton.customStats = { health: 0, fun: 15 };
    toyButton.on('pointerdown', () => this.pickItem(toyButton));

    const rotateButton: SpriteWithStats = this.add
      .sprite(288, 570, 'rotate')
      .setInteractive();
    rotateButton.customStats = { fun: 20 };
    rotateButton.on('pointerdown', () => this.rotatePet(rotateButton));

    this.buttons = [appleButton, candyButton, toyButton, rotateButton];

    this.uiBlocked = false;

    this.uiReady();
  }

  createHud() {
    // health stat
    this.healthText = this.add.text(20, 20, 'Health: ', {
      font: '24px Arial',
      color: '#ffffff'
    });

    // fun stat
    this.funText = this.add.text(170, 20, 'Fun: ', {
      font: '24px Arial',
      color: '#ffffff'
    });
  }

  refreshHud() {
    this.healthText.setText('Health: ' + this.stats.health);
    this.funText.setText('Fun: ' + this.stats.fun);
  }

  updateStats(statDiff: Stats) {
    // manually update each stat
    // this.stats.health += statDiff.health;
    // this.stats.fun += statDiff.fun;

    // flag to see if it's game over
    let isGameOver = false;

    // more flexible
    for (const stat in statDiff) {
      if (statDiff.hasOwnProperty(stat)) {
        this.stats[stat as keyof Stats] =
          (this.stats[stat as keyof Stats] || 0) +
          (statDiff[stat as keyof Stats] || 0);

        // stats can't be less than zero
        if ((this.stats[stat as keyof Stats] || 0) < 0) {
          isGameOver = true;
          this.stats[stat as keyof Stats] = 0;
        }
      }
    }

    // refresh HUD
    this.refreshHud();

    // check to see if the game ended
    if (isGameOver) this.gameOver();
  }

  gameOver() {
    this.uiBlocked = true;
    this.pet.setFrame(4);

    this.time.addEvent({
      delay: 2000,
      repeat: 0,
      callback: () => {
        this.scene.start('HomeScene');
      }
    });

    console.log('game over');
  }

  rotatePet(rotate: SpriteWithStats) {
    // note this context here is for pointerdown
    if (this.uiBlocked) return;

    this.uiReady();

    this.uiBlocked = true;

    rotate.alpha = 0.5;

    this.tweens.add({
      targets: this.pet,
      duration: 600,
      angle: 360,
      pause: false,
      onComplete: () => {
        this.updateStats(rotate.customStats || {});

        this.uiReady();

        this.refreshHud();
      }
    });

    console.log(this.stats);
    console.log('we are rotating the pet');
  }

  pickItem = (item: SpriteWithStats) => {
    // note this context here is for pointerdown
    if (this.uiBlocked) return;

    this.uiReady();

    this.selectedItem = item;

    item.alpha = 0.5;

    console.log('we are picking an item', item.texture.key);
  };

  placeItem(pointer: Phaser.Input.Pointer, localX: number, localY: number) {
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
        const finishEating = () => {
          this.pet.setFrame(0);
          this.uiReady();
          this.refreshHud();
        };

        // clear UI
        this.updateStats(this.selectedItem?.customStats || {});

        this.pet.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'funnyfaces',
          finishEating
        );
        this.pet.play('funnyfaces');

        // Fallback if the animation didn't start (e.g., missing key)
        if (!this.pet.anims.isPlaying) {
          finishEating();
        }
      }
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
