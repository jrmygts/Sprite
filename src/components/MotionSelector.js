'use client';

import { useState } from 'react';
import { motions, defaultMotions } from '@/config/motions';

export default function MotionSelector({ onChange, initialMotions = defaultMotions }) {
  const [selectedMotions, setSelectedMotions] = useState(initialMotions);

  const handleMotionChange = (motion) => {
    const newMotions = selectedMotions.includes(motion)
      ? selectedMotions.filter(m => m !== motion)
      : [...selectedMotions, motion];

    setSelectedMotions(newMotions);
    onChange(newMotions);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select Motions</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Object.entries(motions).map(([key, config]) => (
          <label
            key={key}
            className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedMotions.includes(key)}
              onChange={() => handleMotionChange(key)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <span className="block font-medium capitalize">{key}</span>
              <span className="block text-sm text-gray-500">
                {config.frames} frames @ {config.fps}fps
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
} 