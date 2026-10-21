// src/App.jsx
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera, Text, Billboard } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import { create } from 'zustand'


// ── Inline store (move to store/useGameStore.js later) ──
const GRID_SIZE = 10
const buildInitialTiles = () => {
  const tiles = {}
  for (let x = 0; x < GRID_SIZE; x++)
    for (let z = 0; z < GRID_SIZE; z++)
      tiles[`${x},${z}`] = { x, z, state: 'empty', cropType: null, growthTick: 0, watered: false }
  return tiles
}

const useGameStore = create((set, get) => ({
  tiles: buildInitialTiles(),
  activeTool: 'hoe',
  hoveredTile: null,
  day: 1,
  tickCount: 0,
  player: { position: [5, 0, 5], coins: 50 },
  inventory: { carrot_seed: 5, carrot: 0 },
  selectedSeed: 'carrot_seed',

  setHoveredTile: (key) => set({ hoveredTile: key }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  useTileAction: (x, z) => {
    const { activeTool, tiles, inventory, selectedSeed } = get()
    const key = `${x},${z}`
    const tile = tiles[key]
    if (!tile) return
    const updated = { ...tile }

    if (activeTool === 'hoe' && tile.state === 'empty') {
      updated.state = 'tilled'
    } else if (activeTool === 'seed' && tile.state === 'tilled') {
      if ((inventory[selectedSeed] ?? 0) <= 0) return
      updated.state = 'seeded'
      updated.cropType = 'carrot'
      set((s) => ({ tiles: { ...s.tiles, [key]: updated }, inventory: { ...s.inventory, [selectedSeed]: s.inventory[selectedSeed] - 1 } }))
      return
    } else if (activeTool === 'wateringCan' && (tile.state === 'seeded' || tile.state === 'growing')) {
      updated.watered = true
    } else if (activeTool === 'scythe' && tile.state === 'harvestable') {
      updated.state = 'empty'; updated.cropType = null; updated.growthTick = 0; updated.watered = false
      set((s) => ({ tiles: { ...s.tiles, [key]: updated }, inventory: { ...s.inventory, carrot: (s.inventory.carrot ?? 0) + 1 } }))
      return
    }
    set((s) => ({ tiles: { ...s.tiles, [key]: updated } }))
  },

  advanceTick: () => set((state) => {
    const updatedTiles = { ...state.tiles }
    for (const key in updatedTiles) {
      const tile = { ...updatedTiles[key] }
      if ((tile.state === 'seeded' || tile.state === 'growing') && tile.watered) {
        tile.growthTick += 1
        if (tile.growthTick >= 10) tile.state = 'harvestable'
        else if (tile.growthTick >= 5) tile.state = 'growing'
        tile.watered = false
        updatedTiles[key] = tile
      }
    }
    return { tiles: updatedTiles, tickCount: state.tickCount + 1 }
  }),

  movePlayer: (position) => set((s) => ({ player: { ...s.player, position } })),
}))

function CropTooltip({ state, cropType }) {
  const labels = {
    tilled:      'Tilled',
    seeded:      'Seeded',
    growing:     'Growing...',
    harvestable: 'Ready! (Harvest)',
  }
  const label = labels[state]
  if (!label) return null

  return (
    <Billboard
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
      position={[0, 1.0, 0]}
    >
      {/* Yellow border */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[1.5, 0.42]} />
        <meshBasicMaterial color="#F5C518" depthTest={false} />
      </mesh>
      {/* Dark background */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[1.44, 0.36]} />
        <meshBasicMaterial color="#1a1a2e" depthTest={false} />
      </mesh>
      {/* Text */}
      <Text
        fontSize={0.18}
        color="white"
        anchorX="center"
        anchorY="middle"
        depthOffset={-1}
      >
        {label}{cropType ? ` · ${cropType}` : ''}
      </Text>
    </Billboard>
  )
}

// ── Tile ──
const TILE_COLORS = { empty: '#8B7355', tilled: '#5C4033', seeded: '#5C4033', growing: '#4A7C3F', harvestable: '#F5C518' }

function Tile({ tileData }) {
  const useTileAction = useGameStore((s) => s.useTileAction)
  const setHoveredTile = useGameStore((s) => s.setHoveredTile)
  const hoveredTile = useGameStore((s) => s.hoveredTile)
  const { x, z, state, cropType } = tileData
  const key = `${x},${z}`
  const isHovered = hoveredTile === key

  return (
    <mesh
      position={[x * 1.05, 0, z * 1.05]}
      receiveShadow
      onClick={() => useTileAction(x, z)}
      onPointerEnter={() => setHoveredTile(key)}
      onPointerLeave={() => setHoveredTile(null)}
    >
      <boxGeometry args={[1, 0.15, 1]} />
      <meshStandardMaterial color={TILE_COLORS[state]} emissive={isHovered ? '#fff' : '#000'} emissiveIntensity={isHovered ? 0.1 : 0} />

      {/* Crop visuals */}
      {state === 'growing' && (
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.1, 0.25, 6]} />
          <meshStandardMaterial color="#2D5A1B" />
        </mesh>
      )}
      {state === 'harvestable' && (
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color={cropType === 'carrot' ? '#FF6B1A' : '#88CC44'} />
        </mesh>
      )}

      {/* Tooltip — only show when hovered and tile has content */}
      {isHovered && state !== 'empty' && (
        <CropTooltip state={state} cropType={cropType} />
      )}
    </mesh>
  )
}

// ── Farm ──
function Farm() {
  const tiles = useGameStore((s) => s.tiles)
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.7, -0.08, 4.7]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#6B8E4E" />
      </mesh>
      {Object.values(tiles).map((tile) => (
        <Tile key={`${tile.x},${tile.z}`} tileData={tile} />
      ))}
    </group>
  )
}

// ── Player ──
const keys = {}
function Player() {
  const meshRef = useRef()
  const movePlayer = useGameStore((s) => s.movePlayer)
  const pos = useRef([5, 0, 5])

  useEffect(() => {
    const down = (e) => { keys[e.code] = true }
    const up = (e) => { keys[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useFrame((_, delta) => {
    let [x, y, z] = pos.current
    if (keys['KeyW'] || keys['ArrowUp'])    z -= 4 * delta
    if (keys['KeyS'] || keys['ArrowDown'])  z += 4 * delta
    if (keys['KeyA'] || keys['ArrowLeft'])  x -= 4 * delta
    if (keys['KeyD'] || keys['ArrowRight']) x += 4 * delta
    x = Math.max(0, Math.min(9.45, x))
    z = Math.max(0, Math.min(9.45, z))
    pos.current = [x, y, z]
    if (meshRef.current) meshRef.current.position.set(x, 0.3, z)
    movePlayer([x, y, z])
  })

  return (
    <mesh ref={meshRef} position={[5, 0.3, 5]} castShadow>
      <capsuleGeometry args={[0.2, 0.3, 4, 8]} />
      <meshStandardMaterial color="#4A90D9" />
    </mesh>
  )
}

// ── Game Loop ──
function GameLoop() {
  const elapsed = useRef(0)
  const advanceTick = useGameStore((s) => s.advanceTick)
  useFrame((_, delta) => {
    elapsed.current += delta
    if (elapsed.current >= 0.5) { elapsed.current = 0; advanceTick() }
  })
  return null
}

// ── Placeholder HUD (Dev B) ──
function PlaceholderHUD() {
  const day = useGameStore((s) => s.day)
  const coins = useGameStore((s) => s.player.coins)
  const inventory = useGameStore((s) => s.inventory)
  const activeTool = useGameStore((s) => s.activeTool)
  const setActiveTool = useGameStore((s) => s.setActiveTool)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: 'monospace' }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 16, left: 16, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: 8 }}>
        📅 Day {day} &nbsp;|&nbsp; 🟡 {coins} &nbsp;|&nbsp; 🌱 Seeds: {inventory['carrot_seed'] ?? 0} &nbsp;|&nbsp; 🥕 Harvested: {inventory['carrot'] ?? 0}
      </div>
      {/* Tool switcher */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, pointerEvents: 'all' }}>
        {['hoe', 'seed', 'wateringCan', 'scythe'].map((tool) => (
          <button key={tool} onClick={() => setActiveTool(tool)} style={{
            padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTool === tool ? '#F5C518' : 'rgba(0,0,0,0.6)',
            color: activeTool === tool ? '#000' : '#fff', fontFamily: 'monospace', fontWeight: 'bold'
          }}>
            {{ hoe: '⛏ Hoe', seed: '🌱 Seed', wateringCan: '💧 Water', scythe: '🌾 Harvest' }[tool]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── App ──
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#1a1a2e' }}>
      // Replace your Canvas block with this
      <Canvas
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
      >
        <OrthographicCamera
          makeDefault
          position={[10, 5, 10]}
          zoom={70}
          near={-100}
          far={500}
          onUpdate={(cam) => cam.lookAt(5, 0, 5)}
        />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <Farm />
        <Player />
        <GameLoop />
      </Canvas>
      <PlaceholderHUD />
    </div>
  )
}