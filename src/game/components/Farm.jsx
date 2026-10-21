// src/game/components/Farm.jsx
import { useGameStore } from '../store/useGameStore'

const TILE_SIZE = 1
const TILE_GAP = 0.05

const TILE_COLORS = {
  empty:       '#8B7355',
  tilled:      '#5C4033',
  seeded:      '#5C4033',
  growing:     '#4A7C3F',
  harvestable: '#F5C518',
}

function Tile({ tileData }) {
  const useTileAction = useGameStore((s) => s.useTileAction)
  const setHoveredTile = useGameStore((s) => s.setHoveredTile)
  const hoveredTile = useGameStore((s) => s.hoveredTile)

  const { x, z, state } = tileData
  const key = `${x},${z}`
  const isHovered = hoveredTile === key
  const color = TILE_COLORS[state] ?? '#8B7355'

  return (
    <mesh
      position={[x * (TILE_SIZE + TILE_GAP), 0, z * (TILE_SIZE + TILE_GAP)]}
      receiveShadow
      onClick={() => useTileAction(x, z)}
      onPointerEnter={() => setHoveredTile(key)}
      onPointerLeave={() => setHoveredTile(null)}
    >
      <boxGeometry args={[TILE_SIZE, 0.15, TILE_SIZE]} />
      <meshStandardMaterial
        color={color}
        emissive={isHovered ? '#ffffff' : '#000000'}
        emissiveIntensity={isHovered ? 0.08 : 0}
      />
      {/* Crop indicator placeholder — swap for GLTF in Week 3 */}
      {state === 'growing' && <GrowingCrop />}
      {state === 'harvestable' && <HarvestableCrop cropType={tileData.cropType} />}
    </mesh>
  )
}

function GrowingCrop() {
  return (
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.05, 0.1, 0.25, 6]} />
      <meshStandardMaterial color="#2D5A1B" />
    </mesh>
  )
}

function HarvestableCrop({ cropType }) {
  const colors = { carrot: '#FF6B1A', potato: '#C4A35A', wheat: '#DAA520', tomato: '#CC2936' }
  return (
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.18, 8, 8]} />
      <meshStandardMaterial color={colors[cropType] ?? '#88CC44'} />
    </mesh>
  )
}

export function Farm() {
  const tiles = useGameStore((s) => s.tiles)

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.5, -0.08, 4.5]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#6B8E4E" />
      </mesh>

      {/* Tiles */}
      {Object.values(tiles).map((tile) => (
        <Tile key={`${tile.x},${tile.z}`} tileData={tile} />
      ))}
    </group>
  )
}