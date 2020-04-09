import 'phaser';

export default {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#FFFFFF',
  pixelArt: false,
  scale: {
    width: 360,
    height: 640,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
