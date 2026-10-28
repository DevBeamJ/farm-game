export const GRID_SIZE = 20
export const TILE_SPACING = 1.05

export const STARTER_AREA = { id: 'starter', x: 5, z: 5, w: 10, h: 10 }

export const PLOTS = [
  { id: 'west-1', x: 0,  z: 5,  w: 4, h: 4 },
  { id: 'west-2', x: 0,  z: 11, w: 4, h: 4 },
  { id: 'east-1', x: 16, z: 5,  w: 4, h: 4 },
  { id: 'east-2', x: 16, z: 11, w: 4, h: 4 },
  { id: 'north',  x: 6,  z: 0,  w: 8, h: 4 },
  { id: 'south',  x: 6,  z: 16, w: 8, h: 4 },
]

export const MAP_CENTER = GRID_SIZE / 2
export const PLAYER_MAX = GRID_SIZE - 0.55
export const GROUND_SIZE = GRID_SIZE + 6
export const GROUND_CENTER = (GRID_SIZE - 0.6) / 2

export const ZOOM_MIN = 30
export const ZOOM_MAX = 140
export const ZOOM_DEFAULT = 60