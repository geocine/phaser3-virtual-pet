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
  private maxStats: Stats;
  private pet: GameObjects.Sprite;
  private buttons: SpriteWithStats[];
  private uiBlocked: boolean;
  private healthText: GameObjects.Text;
  private funText: GameObjects.Text;
  private hintText: GameObjects.Text;
  private healthHudWidth: number;
  private selectedItem: SpriteWithStats | null;
  private decayTimer?: Phaser.Time.TimerEvent;
  private pausedByBlur: boolean;

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

    this.maxStats = {
      health: 100,
      fun: 100
    };

    this.pausedByBlur = false;
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

    this.bindKeyboardShortcuts();

    this.decayTimer = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        this.updateStats(this.decayRates);
      }
    });

    // Pause stat decay when the tab/app loses focus.
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.FOCUS, this.onFocus, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
      this.game.events.off(Phaser.Core.Events.FOCUS, this.onFocus, this);
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

  private bindKeyboardShortcuts() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (this.uiBlocked) return;

      switch (event.code) {
        case 'Digit1':
          this.pickItem(this.buttons[0]);
          break;
        case 'Digit2':
          this.pickItem(this.buttons[1]);
          break;
        case 'Digit3':
          this.pickItem(this.buttons[2]);
          break;
        case 'Digit4':
          this.rotatePet(this.buttons[3]);
          break;
        case 'Escape':
          this.uiReady();
          break;
        default:
          break;
      }
    };

    keyboard.on('keydown', onKeyDown);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard.off('keydown', onKeyDown);
    });
  }

  private onBlur() {
    // Avoid re-pausing if we already paused due to blur.
    if (this.pausedByBlur) return;

    if (this.decayTimer) {
      this.decayTimer.paused = true;
    }

    this.pausedByBlur = true;
    this.hintText?.setText('Paused (app inactive).');
    this.hintText?.setAlpha(1);
  }

  private onFocus() {
    if (!this.pausedByBlur) return;

    if (this.decayTimer) {
      this.decayTimer.paused = false;
    }

    this.pausedByBlur = false;

    // Restore the default hint unless the user has an item selected.
    if (this.selectedItem) {
      this.hintText?.setText('Tap on the yard to place it.');
    } else {
      this.hintText?.setText('Tap an item (or press 1-4) to select it.');
    }
    this.hintText?.setAlpha(1);
  }

  createHud() {
    // health stat
    this.healthText = this.add.text(20, 20, 'Health: ', {
      font: '24px Arial',
      color: '#ffffff'
    });

    // Reserve space for "Health: 000/000" so the Fun label doesn't shift as values change.
    const healthTemplate = 'Health: 000/000';
    this.healthText.setText(healthTemplate);
    this.healthHudWidth = this.healthText.width;
    this.healthText.setFixedSize(this.healthHudWidth, this.healthText.height);

    // fun stat (positioned using the reserved health width)
    this.funText = this.add.text(
      this.healthText.x + this.healthHudWidth + 8,
      20,
      'Fun: ',
      {
        font: '24px Arial',
        color: '#ffffff'
      }
    );

    this.hintText = this.add.text(20, 52, 'Tap an item (or press 1-4) to select it.', {
      font: '16px Arial',
      color: '#ffffff'
    });
    this.hintText.setAlpha(1);
  }

  refreshHud() {
    this.healthText.setText(
      'Health: ' + this.stats.health + '/' + this.maxStats.health
    );

    // Keep Fun anchored relative to a reserved width (prevents shifting as Health changes).
    this.funText.setX(this.healthText.x + this.healthHudWidth + 8);

    this.funText.setText('Fun: ' + this.stats.fun + '/' + this.maxStats.fun);
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

        // clamp stats so "good" actions don't inflate forever
        const max = this.maxStats[stat as keyof Stats];
        if (
          typeof max === 'number' &&
          (this.stats[stat as keyof Stats] || 0) > max
        ) {
          this.stats[stat as keyof Stats] = max;
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
      // Use a relative angle so repeat presses always animate.
      angle: '+=360',
      pause: false,
      onComplete: () => {
        // Keep the angle from growing without bound.
        this.pet.angle = ((this.pet.angle % 360) + 360) % 360;

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

    // Toggle off if tapping the already-selected item.
    if (this.selectedItem === item) {
      this.uiReady();
      return;
    }

    this.uiReady();

    this.selectedItem = item;

    item.alpha = 0.5;
    this.hintText?.setText('Tap on the yard to place it.');
    this.hintText?.setAlpha(1);

    console.log('we are picking an item', item.texture.key);
  };

  placeItem(pointer: Phaser.Input.Pointer, localX: number, localY: number) {
    if (!this.selectedItem || this.uiBlocked) return;

    // Prevent placing items over the bottom UI bar.
    if (localY > 520) return;

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
    this.hintText?.setText('Tap an item (or press 1-4) to select it.');
    this.hintText?.setAlpha(1);

    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].alpha = 1;
    }

    this.uiBlocked = false;
  }
}
