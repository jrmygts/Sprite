// Style presets from .cursorrules
const stylePresets = {
  'owlboy-gba': {
    name: 'Owlboy GBA',
    snippet: 'in owlboy-gba style: 240×160 base canvas (GBA), ≤32 colors per sheet, soft internal AA, rim-light on silhouettes, rich SNES-style hue-shift shadows',
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
 * @param {string} styleKey - Key from stylePresets (defaults to 'owlboy-gba')
 * @returns {string} Enhanced prompt for GPT Image 1
 */
export function buildPrompt(basePrompt, mode, styleKey = 'owlboy-gba') {
  const style = stylePresets[styleKey] || stylePresets['owlboy-gba'];
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