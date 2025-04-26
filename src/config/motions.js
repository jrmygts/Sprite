/**
 * Motion configuration for sprite generation
 * Shared between frontend and backend
 */

export const motions = {
  idle: {
    frames: 1,
    fps: 4,
    prompt: "single idle pose, character faces camera, centered character",
    directions: 1,
    row: 0
  },
  walk: {
    frames: 4,
    fps: 8,
    directions: 4,
    row: 1,
    directionPrompts: {
      south: "4-frame south-walk cycle, frame order: (1) left foot forward, (2) contact idle, (3) right foot forward, (4) contact idle; character always faces camera; feet stay on same Y-axis; no other poses",
      north: "4-frame north-walk cycle, frame order: (1) left foot back, (2) contact idle, (3) right foot back, (4) contact idle; back faces camera; no turning",
      east: "4-frame east-walk cycle, character faces right; same frame order; no idle or sit frames",
      west: "4-frame west-walk cycle, character faces left; same frame order; no idle or sit frames"
    },
    // West will be mirrored from east
    mirrorDirections: {
      west: 'east'
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
    // Check if this direction should be mirrored
    const mirrorFrom = config.mirrorDirections?.[direction];
    if (mirrorFrom) {
      return config.directionPrompts[mirrorFrom];
    }
    return config.directionPrompts[direction];
  }
  
  return config.prompt;
};

export const getMotionRow = (motion) => {
  const config = getMotionConfig(motion);
  return config?.row ?? 0;
};

export const getMotionFrames = (motion) => {
  const config = getMotionConfig(motion);
  return config?.frames ?? 1;
};

export const getMotionFPS = (motion) => {
  const config = getMotionConfig(motion);
  return config?.fps ?? 4;
};

export const shouldMirrorDirection = (motion, direction) => {
  const config = getMotionConfig(motion);
  return config?.mirrorDirections?.[direction] != null;
}; 