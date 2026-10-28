# FarmSim

A small isometric 3D farming game built with **React Three Fiber**. Explore the
farm, till soil, plant and water crops, then harvest them. The 20×20 map has a
10×10 starter area; the surrounding plots are currently locked.

## Tech Stack

| Layer     | Choice                                   |
| --------- | ---------------------------------------- |
| Framework | React 19 + Vite                          |
| 3D        | `three`, `@react-three/fiber`, `@react-three/drei` |
| State     | `zustand`                                |
| Lint      | `oxlint`                                 |

`@supabase/supabase-js` and `use-sound` are installed but not wired up yet
(reserved for cloud saves and audio).

## Getting Started

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # production build -> dist/
npm run preview   # serve the production build
npm run lint      # oxlint
```

## Controls

| Input                        | Action                                  |
| ---------------------------- | --------------------------------------- |
| `W` `A` `S` `D` / Arrow keys | Move (camera-relative — `W` is "up screen") |
| Click a tile                 | Apply the currently selected tool       |
| Bottom toolbar               | Switch tool                             |
| Mouse wheel / zoom buttons   | Zoom the camera                         |
| Almanac button               | View discovered crops and their trivia  |

## Gameplay Loop

```
Hoe  ->  Seed  ->  Water  ->  (grows)  ->  Harvest
```

1. **Hoe** an `empty` tile to make it `tilled`.
2. **Seed** a `tilled` tile to plant the selected seed (`seeded`).
3. **Water** a `seeded` / `growing` tile. Watered crops grow each game tick.
   They dry out at the start of each in-game day and need to be watered again.
4. **Harvest** a `harvestable` tile to clear it and add the crop to your inventory.
   The first harvest of each crop records it in the Almanac.

Tile lifecycle: `empty → tilled → seeded → growing → harvestable → empty`.

### Crops and time

The game loop advances once every 0.5 seconds. Crop growth thresholds are in
growth points; `GROWTH_SPEED` in `src/game/config/crops.js` controls how many
points a watered crop gains per game tick. It is currently set to `10` for
testing, so the approximate watered growth time is:

| Crop   | Seed key       | Growth threshold | Approx. time |
| ------ | -------------- | ---------------- | ------------ |
| Carrot | `carrot_seed`  | 60 points        | 3 seconds    |
| Potato | `potato_seed`  | 90 points        | 4.5 seconds  |
| Wheat  | `wheat_seed`   | 45 points        | 2.5 seconds  |
| Tomato | `tomato_seed`  | 120 points       | 6 seconds    |

An in-game day is `2880` game ticks (24 minutes). Changing `GROWTH_SPEED` changes
crop growth time without changing the length of a day.

## Project Structure

```
src/
  App.jsx                    # Active scene, FBX player, controls, HUD and game loop
  main.jsx                   # React entry point
  game/
    config/
      crops.js               # Crop definitions and growth speed
      world.js               # Grid, starter area, plots and camera bounds
    store/
      useGameStore.js        # Game state and actions
    components/              # Earlier standalone Farm and Player components
    systems/                 # Earlier standalone game-loop component
public/
  models/                    # Player FBX, texture and animation files
  icons.svg
  favicon.svg
```

The active app currently renders the farm, player and game loop from `App.jsx`;
the standalone components under `src/game/components/` and `src/game/systems/`
are not mounted by the current entry point.

The player loads these files from `/public/models`:

```
models/
  Barbarian.fbx
  barbarian_texture.png
  animations/
    Rig_Medium_MovementBasic.fbx
    Idle.fbx
```
