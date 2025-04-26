"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from '@/libs/supabase/client';
import { useRouter } from 'next/navigation';

const resolutions = [
  { value: "256", label: "256 × 256" },
  { value: "512", label: "512 × 512" },
];

const generationModes = [
  { value: "character", label: "Single Character" },
  { value: "sprite-sheet", label: "Sprite Sheet (4×4 Grid)" },
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("256");
  const [mode, setMode] = useState("character");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generationsLeft, setGenerationsLeft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  // Check subscription status on component mount
  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("Error getting user:", error);
          setError("Session error: " + error.message);
          return;
        }

        if (!data.user) {
          console.log("No user found, redirecting to signin");
          router.push('/signin?returnTo=/generate');
          return;
        }

        console.log("User authenticated:", data.user.id);
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('has_access, subscription_status')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error("Error getting profile:", profileError);
          setError("Error checking subscription status. Please try again.");
          return;
        }

        const hasSubscription = profile?.has_access === true;
        
        // Count generations
        const { count, error: countError } = await supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.user.id);
          
        if (countError) {
          console.error("Error counting generations:", countError);
          setError("Error checking generation count. Please try again.");
          return;
        }
        
        // Free tier allows 10 generations
        const freeGenerationsLeft = 10 - (count || 0);
        
        setGenerationsLeft(hasSubscription ? "Unlimited" : Math.max(0, freeGenerationsLeft));
        
        if (!hasSubscription && freeGenerationsLeft <= 0) {
          console.log("No generations left, redirecting to pricing");
          router.push('/pricing?from=generate');
          return;
        }
      } catch (error) {
        console.error("Error checking access:", error);
        setError("Error: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [router, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log("Generating sprite with:", { prompt, resolution, mode });
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          resolution,
          mode,
          stylePreset: "pixel-art", // Always use pixel art style
        }),
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing response:", e);
        console.log("Raw response:", responseText);
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      console.log("Generation successful:", data);
      setGeneratedImage(data);
      
      // Update generations left count
      if (generationsLeft !== "Unlimited") {
        setGenerationsLeft(prev => typeof prev === 'number' ? Math.max(0, prev - 1) : prev);
        if (generationsLeft <= 1) {
          setError("This was your last free generation. Please subscribe for unlimited access.");
        }
      }
    } catch (error) {
      console.error("Error generating sprite:", error);
      setError(error.message || "An unknown error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const validateTableExists = async () => {
    try {
      setIsLoading(true);
      
      // Check if the generations table exists by trying to get a count
      const { count, error: genError } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      if (genError) {
        console.error("Generations table error:", genError);
        setError(`Database error: ${genError.message}`);
        return false;
      }
      
      // Display debug info
      setDebugInfo(prev => ({
        ...prev,
        tablesVerified: true,
        generationsTableExists: true,
        generationsCount: count || 0
      }));
      
      return true;
    } catch (error) {
      console.error("Database validation error:", error);
      setError("Could not verify database tables: " + error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Generate Sprite</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            Describe your sprite
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="A cute pixel art cat with orange fur and green eyes..."
            maxLength={200}
            required
          />
          <div className="text-xs text-gray-500 mt-1">
            {prompt.length}/200 characters
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Resolution
          </label>
          <div className="grid grid-cols-2 gap-4">
            {resolutions.map((res) => (
              <button
                key={res.value}
                type="button"
                onClick={() => setResolution(res.value)}
                className={`p-3 border rounded-lg text-center ${
                  resolution === res.value
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Generation Mode
          </label>
          <div className="grid grid-cols-2 gap-4">
            {generationModes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`p-3 border rounded-lg text-center ${
                  mode === m.value
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isGenerating || !prompt}
          className="btn btn-primary w-full"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating...
            </div>
          ) : (
            `Generate Sprite ${generationsLeft ? `(${generationsLeft} left)` : ""}`
          )}
        </button>
      </form>

      {generatedImage && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Generated Sprite</h2>
          <div className="relative aspect-square w-full border rounded-lg overflow-hidden">
            <Image
              src={generatedImage.imageUrl}
              alt="Generated sprite"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <a
            href={generatedImage.imageUrl}
            download="sprite.png"
            className="btn btn-outline w-full mt-4"
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
} 