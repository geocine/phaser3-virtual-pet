import Phaser from 'phaser';

export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;
export const TOOLBAR_TOP = 520;

export default {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#FFFFFF',
  scale: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};
