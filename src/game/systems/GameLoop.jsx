// src/game/systems/GameLoop.jsx
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'
import { useRef } from 'react'

const TICK_INTERVAL = 0.5  // seconds per game tick (tune this for feel)

export function GameLoop() {
  const elapsed = useRef(0)
  const advanceTick = useGameStore((s) => s.advanceTick)

  useFrame((_, delta) => {
    elapsed.current += delta
    if (elapsed.current >= TICK_INTERVAL) {
      elapsed.current = 0
      advanceTick()
    }
  })

  return null  // no visual output, just drives the loop
}