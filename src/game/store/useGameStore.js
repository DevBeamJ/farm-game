// src/game/store/useGameStore.js
import { create } from 'zustand'
import { CROPS, GROWTH_SPEED } from '../config/crops'
import { STARTER_AREA, PLOTS, MAP_CENTER, ZOOM_MIN, ZOOM_MAX, ZOOM_DEFAULT } from '../config/world'

// Generate flat tile map: key = "x,z"
function buildArea(area, locked) {
  const tiles = {}
  for (let x = area.x; x < area.x + area.w; x++) {
    for (let z = area.z; z < area.z + area.h; z++) {
      tiles[`${x},${z}`] = {
        x, z, state: 'empty', cropType: null,
        growthTick: 0, stage: 0, watered: false,
        plotId: area.id, locked,
      }
    }
  }
  return tiles
}

function buildInitialTiles() {
  const tiles = buildArea(STARTER_AREA, false)
  PLOTS.forEach((p) => Object.assign(tiles, buildArea(p, true)))
  return tiles
}

export const useGameStore = create((set, get) => ({
  // ── World ──────────────────────────────────────────
  day: 1,
  tickCount: 0,          // raw frame-independent tick counter
  timeOfDay: 0,          // 0–1, drives lighting

  // ── Player ─────────────────────────────────────────
  player: {
    position: [MAP_CENTER, 0, MAP_CENTER], // world position
    coins: 50,
  },

  // ── Inventory ──────────────────────────────────────
  inventory: {
    carrot_seed: 5,
    potato_seed: 3,
    wheat_seed: 3,
    tomato_seed: 2,
    carrot: 0,
    potato: 0,
    wheat: 0,
    tomato: 0,
  },

  // ── Active Tool ─────────────────────────────────────
  activeTool: 'hoe',     // 'hoe' | 'seed' | 'wateringCan' | 'scythe'
  selectedSeed: 'carrot_seed',

  // ── Tile Map ────────────────────────────────────────
  tiles: buildInitialTiles(),

  // ── Selected tile (for UI highlight) ───────────────
  hoveredTile: null,     // "x,z" string or null
  zoom: ZOOM_DEFAULT,
  discovered: {},        // { carrot: { day: 3 }, ... } filled on first harvest

  // ══ Actions (Dev B read state, calls these) ════════

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedSeed: (seed) => set({ selectedSeed: seed }),
  setHoveredTile: (key) => set({ hoveredTile: key }),
  zoomBy: (factor) =>
    set((state) => ({
      zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.zoom * factor)),
    })),

  useTileAction: (x, z) => {
    const { activeTool, selectedSeed, tiles, inventory } = get()
    const key = `${x},${z}`
    const tile = tiles[key]

    if (!tile) return
    if (tile.locked) return

    set((state) => {
      const updatedTile = { ...tile }

      if (activeTool === 'hoe' && tile.state === 'empty') {
        updatedTile.state = 'tilled'
      } else if (activeTool === 'seed' && tile.state === 'tilled') {
        const seedKey = selectedSeed
        if ((inventory[seedKey] ?? 0) <= 0) return {}  // no seeds
        updatedTile.state = 'seeded'
        updatedTile.cropType = seedKey.replace('_seed', '')
        updatedTile.growthTick = 0
        return {
          tiles: { ...state.tiles, [key]: updatedTile },
          inventory: { ...state.inventory, [seedKey]: state.inventory[seedKey] - 1 },
        }
      } else if (activeTool === 'wateringCan' && (tile.state === 'seeded' || tile.state === 'growing')) {
        updatedTile.watered = true
      } else if (activeTool === 'scythe' && tile.state === 'harvestable') {
        const crop = tile.cropType
        updatedTile.state = 'empty'
        updatedTile.cropType = null
        updatedTile.growthTick = 0
        updatedTile.stage = 0
        updatedTile.watered = false
        return {
          tiles: { ...state.tiles, [key]: updatedTile },
          inventory: { ...state.inventory, [crop]: (state.inventory[crop] ?? 0) + 1 },
          discovered: state.discovered[crop]
            ? state.discovered
            : { ...state.discovered, [crop]: { day: state.day } },
        }
      }

      return { tiles: { ...state.tiles, [key]: updatedTile } }
    })
  },

  // Called by game loop each tick
  advanceTick: () => {
    set((state) => {
      const updatedTiles = { ...state.tiles }
      let newDay = state.day
      let newTick = state.tickCount + 1

      // Every 120 ticks = 1 in-game "hour"; 24 hours = new day
      const TICKS_PER_DAY = 2880
      const isNewDay = newTick % TICKS_PER_DAY === 0
      if (isNewDay) newDay += 1

      const timeOfDay = (newTick % TICKS_PER_DAY) / TICKS_PER_DAY

      for (const key in updatedTiles) {
        const tile = { ...updatedTiles[key] }
        const isGrowingCrop = tile.state === 'seeded' || tile.state === 'growing'
        if (!isGrowingCrop) continue

        // Crops dry out at the start of each day and must be re-watered
        if (isNewDay && tile.watered) {
          tile.watered = false
          updatedTiles[key] = tile
          continue
        }

        if (tile.watered) {
          const crop = CROPS[tile.cropType]
          tile.growthTick += GROWTH_SPEED
          if (tile.growthTick >= crop.growthTicks) {
            tile.state = 'harvestable'
            tile.stage = crop.stages - 1
          } else {
            tile.stage = Math.floor((tile.growthTick / crop.growthTicks) * (crop.stages - 1))
            tile.state = tile.stage >= 1 ? 'growing' : 'seeded'
          }
          updatedTiles[key] = tile
        }
      }

      return { tiles: updatedTiles, tickCount: newTick, day: newDay, timeOfDay }
    })
  },

  addCoins: (amount) =>
    set((state) => ({ player: { ...state.player, coins: state.player.coins + amount } })),

  movePlayer: (position) =>
    set((state) => ({ player: { ...state.player, position } })),
}))