"use client";

import { useState } from "react";
import Image from "next/image";

const resolutions = [
  { value: "256", label: "256 × 256" },
  { value: "512", label: "512 × 512" },
  { value: "1024", label: "1024 × 1024" },
];

const stylePresets = [
  { value: "pixel-art", label: "Pixel Art" },
  { value: "flat-vector", label: "Flat Vector" },
  { value: "ui-button", label: "UI Button" },
  { value: "tileable-floor", label: "Tileable Floor" },
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("512");
  const [stylePreset, setStylePreset] = useState("pixel-art");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          resolution,
          stylePreset,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate sprite");
      }

      setGeneratedImage(data);
    } catch (error) {
      console.error("Error generating sprite:", error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-base-100 shadow-xl rounded-2xl p-8">
          <h1 className="text-4xl font-extrabold text-base-content mb-8">
            Generate Sprite
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prompt Input */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                Describe your sprite
              </label>
              <textarea
                id="prompt"
                name="prompt"
                rows={3}
                maxLength={200}
                className="textarea textarea-bordered w-full"
                placeholder="A cute pixel art cat with orange fur and green eyes..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
              <p className="text-xs text-base-content/60 mt-1">
                {prompt.length}/200 characters
              </p>
            </div>

            {/* Resolution Selection */}
            <div>
              <label htmlFor="resolution" className="block text-sm font-medium mb-2">
                Resolution
              </label>
              <select
                id="resolution"
                name="resolution"
                className="select select-bordered w-full"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                {resolutions.map((res) => (
                  <option key={res.value} value={res.value}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Style Preset Selection */}
            <div>
              <label htmlFor="stylePreset" className="block text-sm font-medium mb-2">
                Style
              </label>
              <div className="grid grid-cols-2 gap-4">
                {stylePresets.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    className={`btn btn-outline ${
                      stylePreset === style.value ? "btn-primary" : ""
                    }`}
                    onClick={() => setStylePreset(style.value)}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Generated Image Display */}
            {generatedImage && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Generated Sprite</h2>
                <div className="relative aspect-square w-full max-w-sm mx-auto border-2 border-base-300 rounded-lg overflow-hidden">
                  <Image
                    src={generatedImage.imageUrl}
                    alt={generatedImage.prompt}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex justify-center mt-4">
                  <a
                    href={generatedImage.imageUrl}
                    download
                    className="btn btn-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download PNG
                  </a>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              type="submit"
              className={`btn btn-primary w-full ${
                isGenerating ? "loading" : ""
              }`}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? "Generating..." : "Generate Sprite"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 