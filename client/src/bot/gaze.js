import { clamp, easings } from './math.js';

/**
 * Maximum head yaw and pitch angles (degrees) when tracking the cursor.
 * Generous range so the 3D spherical capsule eyes clearly follow the cursor
 * across the entire viewport while staying inside the limb of the sphere.
 */
export const YAW_MAX = 38;
export const PITCH_MAX = 30;
export const PITCH_BASE = 8;
export const SPIN = 360;
export const TURN_TIME = 0.9;

export const HUMEURS = [
  'surpris',
  'heureux',
  'hilare',
  'excite',
  'fier',
  'blase'
];

export const TOUR_TIME = 1.4;

export const tourLook = (t) => ({
  yaw: 0,
  pitch: 0,
  mix: 0,
  spin: SPIN * (1 - easings.easeInOutCubic(clamp(t / TOUR_TIME))),
  wander: 1
});

/**
 * Computes the absolute `Look` target from normalized pointer coordinates (-1..1).
 * `nx`: horizontal offset from bot center (-1 left, +1 right)
 * `ny`: vertical offset from bot center (-1 top, +1 bottom)
 */
export function lookTarget({ nx, ny, tour = 1, pointer = true }) {
  return {
    yaw: nx * YAW_MAX,
    // Positive pitch looks up, whereas screen Y grows downward
    pitch: PITCH_BASE - ny * PITCH_MAX,
    mix: tour,
    spin: SPIN * (1 - tour),
    wander: pointer ? 0.12 : 1
  };
}
