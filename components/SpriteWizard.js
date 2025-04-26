"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SpriteWizard() {
  const [prompt, setPrompt] = useState("");
  const [conceptUrl, setConceptUrl] = useState(null);
  const [sheetUrl, setSheetUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const generateConcept = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sprite/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate concept");
      }

      setConceptUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSheet = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sprite/generate-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seed: conceptUrl.split("-")[1] }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate sheet");
      }

      setSheetUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sprite Generator</h1>
      
      <form onSubmit={generateConcept} className="mb-6">
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            Describe your sprite
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="A cute pixel art cat with a bow tie..."
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !prompt}
          className="btn btn-primary w-full"
        >
          {loading ? "Generating..." : "Generate Concept"}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {conceptUrl && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Concept Preview</h2>
          <img
            src={conceptUrl}
            alt="Concept preview"
            className="w-full rounded shadow-lg"
          />
          <button
            onClick={generateSheet}
            disabled={loading}
            className="btn btn-primary mt-4 w-full"
          >
            {loading ? "Generating Sheet..." : "Generate Full Sheet"}
          </button>
        </div>
      )}

      {sheetUrl && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Sprite Sheet</h2>
          <img
            src={sheetUrl}
            alt="Sprite sheet"
            className="w-full rounded shadow-lg"
          />
          <a
            href={sheetUrl}
            download="sprite-sheet.png"
            className="btn btn-outline mt-4 w-full"
          >
            Download Sheet
          </a>
        </div>
      )}
    </div>
  );
} 