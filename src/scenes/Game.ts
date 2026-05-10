import Phaser, { GameObjects } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TOOLBAR_TOP } from '../config';

const PET_DRAG_THRESHOLD = 8;
const PET_KEYBOARD_SPEED = 220;
const PET_IDLE_RESUME_DELAY = 450;
const ITEM_PLACEMENT_PET_BUFFER = 48;

interface Stats {
  health?: number;
  fun?: number;
}

interface SpriteWithStats extends GameObjects.Sprite {
  customStats?: Stats;
}

export default class Demo extends Phaser.Scene {
  private stats!: Stats;
  private decayRates!: Stats;
  private maxStats!: Stats;
  private pet!: GameObjects.Sprite;
  private buttons!: SpriteWithStats[];
  private uiBlocked!: boolean;
  private healthText!: GameObjects.Text;
  private funText!: GameObjects.Text;
  private hintText!: GameObjects.Text;
  private healthHudWidth!: number;
  private selectedItem!: SpriteWithStats | null;
  private placementPreview!: GameObjects.Sprite | null;
  private decayTimer?: Phaser.Time.TimerEvent;
  private idleTimer?: Phaser.Time.TimerEvent;
  private idleTween?: Phaser.Tweens.Tween;
  private pausedByBlur!: boolean;
  private isPetDragging!: boolean;
  private isPetKeyboardMoving!: boolean;
  private petDragConsumed!: boolean;
  private nextPetAt!: number;
  private petMoveKeys?:
    | (Phaser.Types.Input.Keyboard.CursorKeys & {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
      })
    | undefined;

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
    this.isPetDragging = false;
    this.isPetKeyboardMoving = false;
    this.placementPreview = null;
    this.petDragConsumed = false;
    this.nextPetAt = 0;
  }

  create() {
    const bg = this.add.sprite(0, 0, 'backyard').setInteractive();
    bg.setOrigin(0, 0);
    bg.on('pointerdown', this.placeItem, this);

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (!this.selectedItem || this.uiBlocked || !this.placementPreview) return;

      const { x, y, isValid } = this.getPlacementTarget(
        pointer.worldX,
        pointer.worldY
      );
      this.placementPreview.setPosition(x, y);

      if (isValid) {
        this.placementPreview.clearTint();
        this.placementPreview.setAlpha(0.6);
      } else {
        this.placementPreview.setTint(0xff4444);
        this.placementPreview.setAlpha(0.35);
      }
    };

    this.input.on('pointermove', onPointerMove);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointermove', onPointerMove);
    });

    this.pet = this.add.sprite(100, 200, 'pet').setInteractive({
      useHandCursor: true
    });
    this.input.dragDistanceThreshold = PET_DRAG_THRESHOLD;
    this.input.setDraggable(this.pet);

    this.pet.on('pointerdown', () => {
      if (this.uiBlocked) return;

      this.petDragConsumed = false;
    });

    this.pet.on('pointerup', () => {
      if (this.petDragConsumed) return;

      this.petPet();
    });

    // follow pointer (mouse/finger) when dragging
    const onPetDrag = (
      _: Phaser.Input.Pointer,
      gameObject: Phaser.GameObjects.Sprite,
      dragX: number,
      dragY: number
    ) => {
      if (gameObject !== this.pet || this.uiBlocked) return;

      const { x, y } = this.getClampedPetPosition(dragX, dragY);
      gameObject.setPosition(x, y);
    };

    const onPetDragStart = (
      _: Phaser.Input.Pointer,
      gameObject: Phaser.GameObjects.Sprite
    ) => {
      if (gameObject !== this.pet) return;
      if (this.uiBlocked) {
        this.isPetDragging = false;
        this.petDragConsumed = false;
        return;
      }

      this.stopIdleMotion();
      this.isPetDragging = true;
      this.petDragConsumed = true;
    };

    const onPetDragEnd = (
      _: Phaser.Input.Pointer,
      gameObject: Phaser.GameObjects.Sprite
    ) => {
      if (gameObject !== this.pet) return;

      this.isPetDragging = false;
      this.scheduleIdleMotion();
    };

    this.input.on('drag', onPetDrag);
    this.input.on('dragstart', onPetDragStart);
    this.input.on('dragend', onPetDragEnd);

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

    this.scheduleIdleMotion();

    // Pause stat decay when the tab/app loses focus.
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.FOCUS, this.onFocus, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
      this.game.events.off(Phaser.Core.Events.FOCUS, this.onFocus, this);
      this.input.off('drag', onPetDrag);
      this.input.off('dragstart', onPetDragStart);
      this.input.off('dragend', onPetDragEnd);
      this.stopIdleMotion();
    });
  }

  private canPetIdle() {
    return (
      !this.uiBlocked &&
      !this.selectedItem &&
      !this.pausedByBlur &&
      !this.isPetDragging
    );
  }

  private stopIdleMotion() {
    this.idleTimer?.remove(false);
    this.idleTimer = undefined;

    this.idleTween?.stop();
    this.idleTween = undefined;
  }

  private scheduleIdleMotion() {
    this.scheduleIdleMotionAfter();
  }

  private scheduleIdleMotionAfter(delay = Phaser.Math.Between(1400, 2600)) {
    this.stopIdleMotion();

    if (!this.canPetIdle()) return;

    this.idleTimer = this.time.delayedCall(
      delay,
      () => {
        this.idleTimer = undefined;
        this.startIdleMotion();
      }
    );
  }

  private startIdleMotion() {
    if (!this.canPetIdle()) return;

    const distance = Phaser.Math.Between(18, 42);
    const target = this.getClampedPetPosition(
      this.pet.x + Phaser.Math.Between(-distance, distance),
      this.pet.y + Phaser.Math.Between(-18, 18)
    );

    if (target.x === this.pet.x && target.y === this.pet.y) {
      this.scheduleIdleMotion();
      return;
    }

    this.idleTween = this.tweens.add({
      targets: this.pet,
      x: target.x,
      y: target.y,
      duration: Phaser.Math.Between(900, 1400),
      ease: 'Sine.InOut',
      onComplete: () => {
        this.idleTween = undefined;
        this.scheduleIdleMotion();
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

    this.uiReady();
  }

  private setUiBlocked(blocked: boolean) {
    this.uiBlocked = blocked;
    this.syncPetDragState();

    if (blocked) {
      this.isPetDragging = false;
      this.petDragConsumed = false;
    }
  }

  private syncPetDragState() {
    const canDragPet = !this.uiBlocked && !this.selectedItem;

    this.input.setDraggable(this.pet, canDragPet);

    if (!canDragPet) {
      this.isPetDragging = false;
      this.petDragConsumed = false;
    }
  }

  private getClampedPetPosition(x: number, y: number) {
    const halfWidth = this.pet.displayWidth / 2;
    const halfHeight = this.pet.displayHeight / 2;

    return {
      x: Phaser.Math.Clamp(x, halfWidth, GAME_WIDTH - halfWidth),
      y: Phaser.Math.Clamp(y, halfHeight, Math.min(TOOLBAR_TOP, GAME_HEIGHT) - halfHeight)
    };
  }

  private getPlacementTarget(x: number, y: number) {
    const clampedPosition = this.getClampedPetPosition(x, y);
    const isInsideYard = clampedPosition.x === x && clampedPosition.y === y;
    const minDistanceFromPet =
      this.pet.displayWidth * 0.35 + ITEM_PLACEMENT_PET_BUFFER;
    const isTooCloseToPet =
      Phaser.Math.Distance.Between(
        clampedPosition.x,
        clampedPosition.y,
        this.pet.x,
        this.pet.y
      ) < minDistanceFromPet;

    return {
      ...clampedPosition,
      isValid: isInsideYard && !isTooCloseToPet,
      isTooCloseToPet
    };
  }

  private showInvalidPlacementHint(isTooCloseToPet = false) {
    this.hintText?.setText(
      isTooCloseToPet ? 'Give your pet a little space.' : 'Place it inside the yard.'
    );
    this.hintText?.setAlpha(1);
    this.time.delayedCall(1000, () => {
      if (this.selectedItem) {
        this.hintText?.setText('Tap on the yard to place it.');
      } else {
        this.hintText?.setText('Tap an item (or press 1-4) to select it.');
      }
      this.hintText?.setAlpha(1);
    });
  }

  private getPlacedItemMoveConfig(targetX: number, targetY: number) {
    const dx = targetX - this.pet.x;
    const dy = targetY - this.pet.y;
    const distance = Phaser.Math.Distance.Between(
      this.pet.x,
      this.pet.y,
      targetX,
      targetY
    );
    const directionX = distance > 0 ? dx / distance : 0;
    const directionY = distance > 0 ? dy / distance : 0;
    const anticipationDistance = Phaser.Math.Clamp(distance * 0.12, 0, 12);

    return {
      anticipationDistance,
      anticipationDuration: Phaser.Math.Clamp(40 + distance * 0.08, 40, 85),
      anticipationX: this.pet.x - directionX * anticipationDistance,
      anticipationY: this.pet.y - directionY * anticipationDistance + 4,
      hopHeight: Phaser.Math.Clamp(distance * 0.08, 6, 20),
      travelDuration: Phaser.Math.Clamp(140 + distance * 1.2, 160, 520)
    };
  }

  private movePetToPlacedItem(
    targetX: number,
    targetY: number,
    onComplete: () => void
  ) {
    const moveConfig = this.getPlacedItemMoveConfig(targetX, targetY);
    const startTravel = () => {
      const startX = this.pet.x;
      const startY = this.pet.y;

      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: moveConfig.travelDuration,
        ease: 'Cubic.Out',
        onUpdate: (tween) => {
          const progress = tween.getValue();
          const baseX = Phaser.Math.Linear(startX, targetX, progress);
          const baseY = Phaser.Math.Linear(startY, targetY, progress);
          const hop =
            Math.sin(progress * Math.PI) * moveConfig.hopHeight;
          const stretch = moveConfig.hopHeight > 0
            ? hop / moveConfig.hopHeight
            : 0;

          this.pet.setPosition(baseX, baseY - hop);
          this.pet.setScale(1 + stretch * 0.05, 1 - stretch * 0.05);
        },
        onComplete: () => {
          this.pet.setPosition(targetX, targetY);
          this.pet.setScale(1);
          onComplete();
        }
      });
    };

    this.tweens.killTweensOf(this.pet);

    if (moveConfig.anticipationDistance < 1) {
      startTravel();
      return;
    }

    this.tweens.add({
      targets: this.pet,
      duration: moveConfig.anticipationDuration,
      x: moveConfig.anticipationX,
      y: moveConfig.anticipationY,
      scaleX: 0.95,
      scaleY: 1.05,
      ease: 'Quad.Out',
      onComplete: startTravel
    });
  }

  private bindKeyboardShortcuts() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.petMoveKeys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    }) as Phaser.Types.Input.Keyboard.CursorKeys & {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

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

  update(_: number, delta: number) {
    this.updatePetKeyboardMovement(delta);
  }

  private updatePetKeyboardMovement(delta: number) {
    if (!this.petMoveKeys) return;

    const horizontal =
      Number(this.petMoveKeys.right.isDown || this.petMoveKeys.D.isDown) -
      Number(this.petMoveKeys.left.isDown || this.petMoveKeys.A.isDown);
    const vertical =
      Number(this.petMoveKeys.down.isDown || this.petMoveKeys.S.isDown) -
      Number(this.petMoveKeys.up.isDown || this.petMoveKeys.W.isDown);
    const isTryingToMove = horizontal !== 0 || vertical !== 0;
    const canMove = this.canPetIdle();

    if (!canMove || !isTryingToMove) {
      if (!this.isPetKeyboardMoving) return;

      this.isPetKeyboardMoving = false;
      this.scheduleIdleMotionAfter(PET_IDLE_RESUME_DELAY);
      return;
    }

    if (!this.isPetKeyboardMoving) {
      this.stopIdleMotion();
      this.isPetKeyboardMoving = true;
    }

    const movement = new Phaser.Math.Vector2(horizontal, vertical)
      .normalize()
      .scale((PET_KEYBOARD_SPEED * delta) / 1000);
    const { x, y } = this.getClampedPetPosition(
      this.pet.x + movement.x,
      this.pet.y + movement.y
    );

    this.pet.setPosition(x, y);
  }

  private onBlur() {
    // Avoid re-pausing if we already paused due to blur.
    if (this.pausedByBlur) return;

    this.stopIdleMotion();

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
    this.scheduleIdleMotion();
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
    this.setUiBlocked(true);
    this.stopIdleMotion();
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

  private petPet() {
    if (this.uiBlocked || this.selectedItem || this.pausedByBlur) return;
    if (this.time.now < this.nextPetAt) return;

    this.nextPetAt = this.time.now + 600;
    this.updateStats({ fun: 4 });

    this.stopIdleMotion();
    this.pet.setScale(1);

    this.tweens.add({
      targets: this.pet,
      duration: 110,
      scaleX: 1.08,
      scaleY: 0.92,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => {
        this.pet.setScale(1);
        this.scheduleIdleMotion();
      }
    });
  }

  rotatePet(rotate: SpriteWithStats) {
    // note this context here is for pointerdown
    if (this.uiBlocked) return;

    this.uiReady();
    this.stopIdleMotion();

    this.setUiBlocked(true);

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
    this.stopIdleMotion();

    this.selectedItem = item;
    this.syncPetDragState();

    if (this.placementPreview) {
      this.placementPreview.destroy();
      this.placementPreview = null;
    }

    // Create a small placement preview that follows the pointer.
    this.placementPreview = this.add
      .sprite(this.pet.x, this.pet.y, item.texture.key)
      .setAlpha(0.6);

    item.alpha = 0.5;
    this.hintText?.setText('Tap on the yard to place it.');
    this.hintText?.setAlpha(1);

    console.log('we are picking an item', item.texture.key);
  };

  placeItem(pointer: Phaser.Input.Pointer) {
    if (!this.selectedItem || this.uiBlocked) return;

    const { x, y, isValid, isTooCloseToPet } = this.getPlacementTarget(
      pointer.worldX,
      pointer.worldY
    );

    if (!isValid) {
      this.showInvalidPlacementHint(isTooCloseToPet);
      return;
    }

    // Clear the preview once the item is successfully placed.
    if (this.placementPreview) {
      this.placementPreview.destroy();
      this.placementPreview = null;
    }

    const placedItem = this.add.sprite(
      x,
      y,
      this.selectedItem.texture.key
    );

    this.stopIdleMotion();
    this.setUiBlocked(true);

    this.movePetToPlacedItem(x, y, () => {
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
    });
  }

  uiReady() {
    this.selectedItem = null;

    if (this.placementPreview) {
      this.placementPreview.destroy();
      this.placementPreview = null;
    }

    this.hintText?.setText('Tap an item (or press 1-4) to select it.');
    this.hintText?.setAlpha(1);

    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].alpha = 1;
    }

    this.setUiBlocked(false);
    this.scheduleIdleMotion();
  }
}
