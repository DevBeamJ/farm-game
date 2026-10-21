// src/game/components/Player.jsx
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'

const SPEED = 4
const keys = {}

export function Player() {
  const meshRef = useRef()
  const movePlayer = useGameStore((s) => s.movePlayer)
  const initialPos = useGameStore((s) => s.player.position)
  const pos = useRef([...initialPos])

  useEffect(() => {
    const down = (e) => { keys[e.code] = true }
    const up = (e) => { keys[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useFrame((_, delta) => {
    let [x, y, z] = pos.current
    if (keys['KeyW'] || keys['ArrowUp'])    z -= SPEED * delta
    if (keys['KeyS'] || keys['ArrowDown'])  z += SPEED * delta
    if (keys['KeyA'] || keys['ArrowLeft'])  x -= SPEED * delta
    if (keys['KeyD'] || keys['ArrowRight']) x += SPEED * delta

    // Clamp to grid
    x = Math.max(0, Math.min(9, x))
    z = Math.max(0, Math.min(9, z))

    pos.current = [x, y, z]
    if (meshRef.current) meshRef.current.position.set(x, 0.3, z)
    movePlayer([x, y, z])
  })

  return (
    <mesh ref={meshRef} position={initialPos} castShadow>
      <capsuleGeometry args={[0.2, 0.3, 4, 8]} />
      <meshStandardMaterial color="#4A90D9" />
    </mesh>
  )
}