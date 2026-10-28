// src/App.jsx
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrthographicCamera, Text, Billboard, useFBX, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useMemo, useState, Suspense } from 'react'
import * as THREE from 'three'
//import { create } from 'zustand'
import { useGameStore } from './game/store/useGameStore'
import { CROPS } from './game/config/crops'
import { TILE_SPACING, MAP_CENTER, PLAYER_MAX, GROUND_SIZE, GROUND_CENTER } from './game/config/world'

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
const TILE_COLORS = { 
  empty: '#8B7355', 
  tilled: '#5C4033', 
  seeded: '#5C4033', 
  growing: '#4A7C3F', 
  harvestable: '#F5C518', 
  locked: '#4B4B45' 
}

function Tile({ tileData }) {
  const useTileAction = useGameStore((s) => s.useTileAction)
  const setHoveredTile = useGameStore((s) => s.setHoveredTile)
  const hoveredTile = useGameStore((s) => s.hoveredTile)
  const { x, z, state, cropType, stage, locked } = tileData
  const key = `${x},${z}`
  const isHovered = hoveredTile === key

  return (
    <mesh
      position={[x*TILE_SPACING, 0, z*TILE_SPACING]}
      receiveShadow
      onClick={() => useTileAction(x, z)}
      onPointerEnter={() => setHoveredTile(key)}
      onPointerLeave={() => setHoveredTile(null)}
    >
      <boxGeometry args={[1, 0.15, 1]} />
      <meshStandardMaterial color={locked ? TILE_COLORS.locked : TILE_COLORS[state]} emissive={isHovered ? '#fff' : '#000'} emissiveIntensity={isHovered ? 0.1 : 0} />

      {/* Crop visuals */}
      {state === 'growing' && (
        <mesh position={[0, 0.2, 0]} scale={[1, 0.6 + stage * 0.4, 1]}>
          <cylinderGeometry args={[0.05, 0.1, 0.25, 6]} />
          <meshStandardMaterial color="#2D5A1B" />
        </mesh>
      )}
      {state === 'harvestable' && (
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color={CROPS[cropType]?.color ?? '#88CC44'} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GROUND_CENTER, -0.08, GROUND_CENTER]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#6B8E4E" />
      </mesh>
      {Object.values(tiles).map((tile) => (
        <Tile key={`${tile.x},${tile.z}`} tileData={tile} />
      ))}
    </group>
  )
}

// ── Player (FBX character) ──
// Drop these files into /public/models (Vite serves /public at the site root):
//   public/models/Barbarian.fbx
//   public/models/barbarian_texture.png
//   public/models/animations/Rig_Medium_MovementBasic.fbx
//   public/models/animations/Idle.fbx
const MODEL_URL     = '/models/Barbarian.fbx'
const TEXTURE_URL   = '/models/barbarian_texture.png'
const WALK_ANIM_URL = '/models/animations/Rig_Medium_MovementBasic.fbx'
const IDLE_ANIM_URL = '/models/animations/Idle.fbx'

const WALK_SPEED   = 4      // top movement speed (units/sec)
const TURN_SPEED   = 10     // how fast the character rotates to face its heading
const ACCELERATION = 10     // how fast it reaches top speed (lerp factor)
const PLAYER_HEIGHT = 0.9   // model is auto-scaled to this height (tiles are 1 unit)
const GROUND_Y = 0.08       // stand just on top of the tile surface

const UP = new THREE.Vector3(0, 1, 0)
const keys = {}

function Player() {
  const groupRef = useRef()
  const movePlayer = useGameStore((s) => s.movePlayer)
  const camera = useThree((s) => s.camera)

  // Model + external animation clips + texture load in parallel (suspends)
  const [barbarian, walkFbx, idleFbx] = useFBX([MODEL_URL, WALK_ANIM_URL, IDLE_ANIM_URL])
  const texture = useLoader(THREE.TextureLoader, TEXTURE_URL)

  const clips = useMemo(
    () => [...walkFbx.animations, ...idleFbx.animations],
    [walkFbx, idleFbx],
  )
  // useAnimations runs the mixer for us each frame
  const { actions } = useAnimations(clips, barbarian)

  const walkAction = useRef(null)
  const idleAction = useRef(null)
  const velocity = useRef(new THREE.Vector3())
  const targetVelocity = useRef(new THREE.Vector3())
  const isWalking = useRef(false)

  // Apply texture, cast shadows, auto-scale to fit the tiles and rest feet on the ground
  useEffect(() => {
    if (!barbarian) return
    texture.colorSpace = THREE.SRGBColorSpace
    barbarian.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.material.map = texture
        child.material.needsUpdate = true
      }
    })
    // Measure at scale 1 so re-runs (e.g. StrictMode) don't compound the scale
    barbarian.scale.setScalar(1)
    barbarian.position.y = 0
    const size = new THREE.Box3().setFromObject(barbarian).getSize(new THREE.Vector3())
    barbarian.scale.setScalar(PLAYER_HEIGHT / (size.y || 1))
    const box = new THREE.Box3().setFromObject(barbarian)
    barbarian.position.y = -box.min.y
  }, [barbarian, texture])

  // Bind the walk / idle clips
  useEffect(() => {
    const walkClip = THREE.AnimationClip.findByName(clips, 'Walking_A')
    // Mixamo often names the idle clip internally as 'mixamo.com'
    const idleClip =
      THREE.AnimationClip.findByName(clips, 'mixamo.com') ||
      clips.find((c) => c.name.toLowerCase().includes('idle'))
    if (!walkClip || !idleClip) {
      console.warn('Walk/Idle clips not found in FBX animations:', clips.map((c) => c.name))
      return
    }
    walkAction.current = actions[walkClip.name]
    idleAction.current = actions[idleClip.name]
    idleAction.current?.play()
  }, [actions, clips])

  useEffect(() => {
    const down = (e) => { keys[e.code] = true }
    const up = (e) => { keys[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const moving =
      keys['KeyW'] || keys['ArrowUp'] || keys['KeyS'] || keys['ArrowDown'] ||
      keys['KeyA'] || keys['ArrowLeft'] || keys['KeyD'] || keys['ArrowRight']

    // A. Crossfade between walk and idle
    if (walkAction.current && idleAction.current) {
      if (moving && !isWalking.current) {
        walkAction.current.reset().play()
        idleAction.current.crossFadeTo(walkAction.current, 0.2, true)
        isWalking.current = true
      } else if (!moving && isWalking.current) {
        idleAction.current.reset().play()
        walkAction.current.crossFadeTo(idleAction.current, 0.2, true)
        isWalking.current = false
      }
    }

    // B. Camera-relative movement so W always moves "up" the screen
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize()

    const moveDir = new THREE.Vector3()
    if (keys['KeyW'] || keys['ArrowUp'])    moveDir.add(forward)
    if (keys['KeyS'] || keys['ArrowDown'])  moveDir.sub(forward)
    if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right)
    if (keys['KeyA'] || keys['ArrowLeft'])  moveDir.sub(right)

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize()
      targetVelocity.current.copy(moveDir).multiplyScalar(WALK_SPEED)
      // Smoothly rotate to face the movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z)
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(UP, targetAngle)
      group.quaternion.slerp(targetQuat, Math.min(1, TURN_SPEED * delta))
    } else {
      targetVelocity.current.set(0, 0, 0)
    }

    // C. Momentum + final position (clamped to the farm grid)
    velocity.current.lerp(targetVelocity.current, Math.min(1, ACCELERATION * delta))
    group.position.addScaledVector(velocity.current, delta)
    group.position.x = THREE.MathUtils.clamp(group.position.x, 0, PLAYER_MAX)
    group.position.z = THREE.MathUtils.clamp(group.position.z, 0, PLAYER_MAX)
    group.position.y = GROUND_Y

    movePlayer([group.position.x, group.position.y, group.position.z])
  })

  return (
    <group ref={groupRef} position={[MAP_CENTER, GROUND_Y, MAP_CENTER]}>
      <primitive object={barbarian} />
    </group>
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

// ── Seed picker ──
const SEEDS = [
  { key: 'carrot_seed', label: '🥕 Carrot' },
  { key: 'potato_seed', label: '🥔 Potato' },
  { key: 'wheat_seed',  label: '🌾 Wheat' },
  { key: 'tomato_seed', label: '🍅 Tomato' },
]

function SeedPicker() {
  const inventory = useGameStore((s) => s.inventory)
  const selectedSeed = useGameStore((s) => s.selectedSeed)
  const setSelectedSeed = useGameStore((s) => s.setSelectedSeed)
  const activeTool = useGameStore((s) => s.activeTool)

  if (activeTool !== 'seed') return null

  return (
    <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, pointerEvents: 'all' }}>
      {SEEDS.map(({ key, label }) => {
        const count = inventory[key] ?? 0
        const selected = selectedSeed === key
        return (
          <button key={key} onClick={() => setSelectedSeed(key)} style={{
            padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: selected ? '#F5C518' : 'rgba(0,0,0,0.6)',
            color: selected ? '#000' : '#fff',
            opacity: count > 0 ? 1 : 0.4,
            fontFamily: 'monospace', fontWeight: 'bold',
          }}>
            {label} ×{count}
          </button>
        )
      })}
    </div>
  )
}

// ── Almanac ──
function Almanac({ onClose }) {
  const discovered = useGameStore((s) => s.discovered)

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 420, maxHeight: '70vh', overflowY: 'auto', pointerEvents: 'all',
        background: 'rgba(26,26,46,0.95)', border: '2px solid #F5C518',
        borderRadius: 12, padding: 16, color: 'white',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: 18 }}>📖 Plant Almanac</strong>
        <button onClick={onClose} style={{
          border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
          background: '#F5C518', color: '#000', fontFamily: 'monospace', fontWeight: 'bold',
        }}>✕</button>
      </div>
      {Object.entries(CROPS).map(([id, c]) => {
        const found = discovered[id]
        return (
          <div key={id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.15)', opacity: found ? 1 : 0.5 }}>
            <div style={{ fontSize: 32 }}>{found ? c.emoji : '❓'}</div>
            <div>
              <div style={{ fontWeight: 'bold' }}>
                {found ? c.label : '???'}
                {found && <span style={{ fontWeight: 'normal', opacity: 0.7 }}> · discovered Day {found.day}</span>}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {found ? c.trivia : 'Harvest this crop to discover it.'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Placeholder HUD (Dev B) ──
function PlaceholderHUD() {
  const day = useGameStore((s) => s.day)
  const coins = useGameStore((s) => s.player.coins)
  const inventory = useGameStore((s) => s.inventory)
  const discovered = useGameStore((s) => s.discovered)
  const activeTool = useGameStore((s) => s.activeTool)
  const setActiveTool = useGameStore((s) => s.setActiveTool)
  const [almanacOpen, setAlmanacOpen] = useState(false)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: 'monospace' }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 16, left: 16, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: 8 }}>
           📅 Day {day} &nbsp;|&nbsp; 🟡 {coins} &nbsp;|&nbsp; 🧺 Harvested:{' '}
          {Object.entries(CROPS).map(([id, c]) => `${c.emoji} ${inventory[id] ?? 0}`).join('  ')}
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
      <SeedPicker />

            {/* Almanac button */}
      <button onClick={() => setAlmanacOpen((o) => !o)} style={{
        position: 'absolute', bottom: 24, left: 16, pointerEvents: 'all',
        padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: 'rgba(0,0,0,0.6)', color: '#fff', fontFamily: 'monospace', fontWeight: 'bold',
      }}>
        📖 Almanac {Object.keys(discovered).length}/{Object.keys(CROPS).length}
      </button>
      {almanacOpen && <Almanac onClose={() => setAlmanacOpen(false)} />}
    </div>
  )
}

// ── App ──
export default function App() {
  const zoom = useGameStore((s) => s.zoom)
  const zoomBy = useGameStore((s) => s.zoomBy)

  return (
    <div
      onWheel={(e) => zoomBy(e.deltaY > 0 ? 0.9 : 1.1)}
      style={{ width: '100vw', height: '100vh', position: 'relative', background: '#1a1a2e' }}
    >
      <Canvas
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
      >
        <OrthographicCamera
          makeDefault
          position={[MAP_CENTER + 5, 5, MAP_CENTER + 5]}
          zoom={zoom}
          near={-100}
          far={500}
          onUpdate={(cam) => {
            cam.lookAt(MAP_CENTER, 0, MAP_CENTER)
            cam.updateProjectionMatrix()
          }}
        />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <Farm />
        <Suspense fallback={null}>
          <Player />
        </Suspense>
        <GameLoop />
      </Canvas>
      <PlaceholderHUD />
      {/* Zoom buttons */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        {[['−', 0.85], ['+', 1.15]].map(([label, factor]) => (
          <button key={label} onClick={() => zoomBy(factor)} style={{
            width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontFamily: 'monospace', fontWeight: 'bold', fontSize: 20,
          }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}