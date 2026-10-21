# FarmSim

A small isometric 3D farming game built with **React Three Fiber**. Walk around a
10×10 grid, till soil, plant seeds, water them, and harvest the crops before the
day rolls over.

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

## Gameplay Loop

```
Hoe  ->  Seed  ->  Water  ->  (grows)  ->  Harvest
```

1. **Hoe** an `empty` tile to make it `tilled`.
2. **Seed** a `tilled` tile to plant the selected seed (`seeded`).
3. **Water** a `seeded` / `growing` tile. A watered crop advances one growth
   tick per game tick; the water is consumed once per in-game day.
4. **Harvest** a `harvestable` tile to clear it and add the crop to your inventory.

Tile lifecycle: `empty → tilled → seeded → growing → harvestable → empty`.

### Crops

Growth is measured in game ticks (1 tick = 0.5s in the current loop).

| Crop   | Seed key       | Growth (ticks) |
| ------ | -------------- | -------------- |
| Carrot | `carrot_seed`  | 60             |
| Potato | `potato_seed`  | 90             |
| Wheat  | `wheat_seed`   | 45             |
| Tomato | `tomato_seed`  | 120            |

An in-game day is `2880` ticks (~24 min at 0.5s/tick). Crops dry out at the
start of a new day and must be re-watered; watered crops otherwise keep growing
until they are ready.

> The table above reflects `src/game/store/useGameStore.js`. The inline store in
> `src/App.jsx` currently ships a single carrot crop that matures in **10 ticks**
> (~5s).

## Project Structure

```
src/
  App.jsx                     # Canvas, scene, HUD, game loop (currently drives the app)
  main.jsx                    # React entry point
  game/
    store/useGameStore.js     # Modular zustand store (being migrated to)
    components/
      Farm.jsx                # Tile grid + crop visuals
      Player.jsx              # Capsule player (placeholder)
    systems/
      GameLoop.jsx            # Tick driver (useFrame)
  assets/                     # Static images
public/                       # Static files served at "/"
```
