// Centralize Body Dodge timing, speed, size, and lane settings

export const GAME_DURATION = 60_000;
export const COUNTDOWN_DURATION = 3_000;
export const OBSTACLE_SPAWN_INTERVAL = 1_750;
export const OBSTACLE_FALL_SPEED = 115;
export const MAX_ACTIVE_OBSTACLES = 2;
export const PLAYER_SIZE = 76;
export const OBSTACLE_SIZE = 58;
export const PLAYER_BOTTOM_OFFSET = 22;
export const LANE_COUNT = 3;

// random icons
export const OBSTACLE_EMOJIS = [
  "\u{1F6A7}",
  "\u{1FAA8}",
  "\u{1F9F1}",
  "\u26BD\uFE0F",
] as const;
