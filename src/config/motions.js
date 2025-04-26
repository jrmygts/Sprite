/**
 * Motion configuration for sprite generation
 * Shared between frontend and backend
 */

export const motions = {
  idle: {
    frames: 1,
    fps: 4,
    prompt: "single idle pose",
    directions: 1
  },
  walk: {
    frames: 4,
    fps: 8,
    prompt: "4-frame walk cycle",
    directions: 4,
    directionPrompts: {
      south: "4-frame south-walk cycle (down, down-left, down-right, down)",
      north: "4-frame north-walk cycle",
      west: "4-frame west-walk cycle",
      east: "4-frame east-walk cycle"
    }
  },
  run: {
    frames: 6,
    fps: 12,
    prompt: "6-frame side-run cycle facing right",
    directions: 1
  },
  attack: {
    frames: 6,
    fps: 10,
    prompt: "6-frame sword-slash combo facing forward",
    directions: 1
  },
  jump: {
    frames: 4,
    fps: 8,
    prompt: "4-frame jump arc",
    directions: 1
  },
  hurt: {
    frames: 3,
    fps: 6,
    prompt: "3-frame recoil / hurt animation",
    directions: 1
  }
};

export const defaultMotions = ["idle", "walk"];

export const getMotionConfig = (motion) => motions[motion] || null;

export const getMotionPrompt = (motion, direction = null) => {
  const config = getMotionConfig(motion);
  if (!config) return null;
  
  if (direction && config.directionPrompts) {
    return config.directionPrompts[direction];
  }
  
  return config.prompt;
}; 