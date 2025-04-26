'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import MotionSelector from './MotionSelector';

const styles = {
  'octopath-traveler': 'HD-2D Octopath-Traveler style, 32-color pixel-art, warm directional lighting, soft depth-of-field glow, subtle rim-light',
  'nes': 'retro 8-bit NES palette, 3 colors + alpha, checkerboard dithering',
  'snes': '1994 SNES JRPG look, 16 colors per tile, pastel shading',
  'pico': 'fantasy console lo-fi, fixed 16-color PICO-8 palette, 128×128'
};

export default function SpriteGenerator() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    prompt: '',
    style: 'octopath-traveler',
    motions: ['idle', 'walk'],
    seed: Math.floor(Math.random() * 1000000)
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/sprites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const { atlasUrl, metaUrl } = await response.json();
      toast.success('Sprite generated successfully!');
      router.push(`/sprites/${atlasUrl.split('/').pop()}`);
    } catch (error) {
      toast.error(error.message || 'Failed to generate sprite');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
          Character Description
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="prompt"
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g. fox-spirit ninja with blue kimono"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="style" className="block text-sm font-medium text-gray-700">
          Style
        </label>
        <select
          id="style"
          value={formData.style}
          onChange={(e) => setFormData({ ...formData, style: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {Object.entries(styles).map(([key, description]) => (
            <option key={key} value={key}>
              {key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </option>
          ))}
        </select>
      </div>

      <MotionSelector
        initialMotions={formData.motions}
        onChange={(motions) => setFormData({ ...formData, motions })}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Generate Sprite'}
        </button>
      </div>
    </form>
  );
} 