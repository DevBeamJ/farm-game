// src/game/store/useGameStore.js
import { create } from 'zustand'

const GRID_SIZE = 10

// Generate flat tile map: key = "x,z"
const buildInitialTiles = () => {
  const tiles = {}
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let z = 0; z < GRID_SIZE; z++) {
      tiles[`${x},${z}`] = {
        x, z,
        state: 'empty',      // empty | tilled | seeded | growing | harvestable
        cropType: null,       // 'carrot' | 'potato' | 'wheat' | 'tomato'
        growthTick: 0,        // increments each game tick
        watered: false,
      }
    }
  }
  return tiles
}

export const useGameStore = create((set, get) => ({
  // ── World ──────────────────────────────────────────
  day: 1,
  tickCount: 0,          // raw frame-independent tick counter
  timeOfDay: 0,          // 0–1, drives lighting

  // ── Player ─────────────────────────────────────────
  player: {
    position: [5, 0, 5], // world position
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

  // ══ Actions (Dev B read state, calls these) ════════

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedSeed: (seed) => set({ selectedSeed: seed }),
  setHoveredTile: (key) => set({ hoveredTile: key }),

  useTileAction: (x, z) => {
    const { activeTool, selectedSeed, tiles, inventory } = get()
    const key = `${x},${z}`
    const tile = tiles[key]
    if (!tile) return

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
      } else if (activeTool === 'wateringCan' && tile.state === 'seeded' || tile.state === 'growing') {
        updatedTile.watered = true
      } else if (activeTool === 'scythe' && tile.state === 'harvestable') {
        const crop = tile.cropType
        updatedTile.state = 'empty'
        updatedTile.cropType = null
        updatedTile.growthTick = 0
        updatedTile.watered = false
        return {
          tiles: { ...state.tiles, [key]: updatedTile },
          inventory: { ...state.inventory, [crop]: (state.inventory[crop] ?? 0) + 1 },
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
      if (newTick % TICKS_PER_DAY === 0) newDay += 1

      const timeOfDay = (newTick % TICKS_PER_DAY) / TICKS_PER_DAY

      // Grow watered crops
      const GROWTH_THRESHOLDS = {
        carrot: 60, potato: 90, wheat: 45, tomato: 120,
      }

      for (const key in updatedTiles) {
        const tile = { ...updatedTiles[key] }
        if ((tile.state === 'seeded' || tile.state === 'growing') && tile.watered) {
          tile.growthTick += 1
          const threshold = GROWTH_THRESHOLDS[tile.cropType] ?? 60
          if (tile.growthTick >= threshold) {
            tile.state = 'harvestable'
          } else if (tile.growthTick > threshold / 2) {
            tile.state = 'growing'
          }
          tile.watered = false  // must re-water each day
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