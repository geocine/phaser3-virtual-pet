# Phaser 3 Virtual Pet

Take care of a virtual pet by feeding it, playing with it, and keeping its stats above zero.

## Gameplay

- Click an item button (apple, candy, toy) at the bottom to select it.
- Click anywhere on the yard to place the item.
- The pet walks over and eats/plays, updating Health or Fun.
- Use the rotate button for a quick fun boost.
- Health and fun decay over time; if any reaches zero the game returns to the home screen.

## Available Commands

| Command | Description |
|---------|-------------|
| `yarn install` | Install project dependencies |
| `yarn dev` | Start the dev server with hot reload |
| `yarn build` | Build the production bundle |
| `yarn serve` | Preview the production build |

## Development

After cloning the repo, run `yarn install` and then `yarn dev`. The game will be available at http://localhost:5173.

## Production

Run `yarn build` to create the `dist` folder. Use `yarn serve` to preview it at http://localhost:4173.
