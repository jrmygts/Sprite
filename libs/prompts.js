// Style presets from .cursorrules
const stylePresets = {
  'octopath-traveler': {
    name: 'Octopath Traveler',
    snippet: 'HD-2D Octopath-Traveler style, 32-color pixel-art, warm directional lighting, soft depth-of-field glow, subtle rim-light',
    isDefault: true
  },
  'nes': {
    name: 'NES',
    snippet: 'retro 8-bit NES palette: 3 colors + alpha, checkerboard dithering',
    isDefault: false
  },
  'snes': {
    name: 'SNES',
    snippet: '1994 SNES JRPG look: 16 colors per tile, pastel shading',
    isDefault: false
  },
  'pico': {
    name: 'PICO-8',
    snippet: 'fantasy console lo-fi: fixed 16-colour PICO-8 palette, 128×128',
    isDefault: false
  }
};

/**
 * Builds an enhanced prompt for GPT Image 1 generation
 * @param {string} basePrompt - User's original prompt
 * @param {string} mode - 'character' or 'sprite-sheet'
 * @param {string} styleKey - Key from stylePresets (defaults to 'octopath-traveler')
 * @returns {string} Enhanced prompt for GPT Image 1
 */
export function buildPrompt(basePrompt, mode, styleKey = 'octopath-traveler') {
  const style = stylePresets[styleKey] || stylePresets['octopath-traveler'];
  const isSheet = mode === 'sprite-sheet';

  // Build prompt following the template from .cursorrules
  const enhancedPrompt = [
    basePrompt,
    style.snippet,
    'centered character',
    'transparent PNG',
    'pixel-art',
    isSheet ? '4×4 grid if sprite sheet' : ''
  ].filter(Boolean).join(', ');

  // Add mode-specific instructions
  if (isSheet) {
    return `${enhancedPrompt}. Include walking, idle, and action poses arranged in a 4×4 grid. Each pose should be distinct and well-defined with consistent character size across all frames.`;
  }

  return `${enhancedPrompt}. Make it game-ready with clear pixel definition and proper sprite centering.`;
}

// TODO: Future enhancement - Add quality tier mapping based on user subscription
// export function getQualityTier(userTier) {
//   return {
//     free: 'low',
//     pro: 'medium',
//     enterprise: 'high'
//   }[userTier] || 'medium';
// } 