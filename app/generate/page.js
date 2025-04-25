"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from '@/libs/supabase/client';
import { useRouter } from 'next/navigation';

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
          // Redirect to signin with returnTo parameter
          router.push('/signin?returnTo=/generate');
          return;
        }

        console.log("User authenticated:", data.user.id);
        
        // Get user profile - handle case where profile might not exist
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('has_access, subscription_status')
          .eq('id', data.user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
        
        if (profileError) {
          console.error("Error getting profile:", profileError);
          setError("Error checking subscription status. Please try again.");
          return;
        }

        // If no profile exists, treat as free tier
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
        
        console.log("User has generated:", count, "sprites");
        console.log("Profile status:", profile?.subscription_status);
        console.log("Has access:", profile?.has_access);
        
        // Free tier allows 10 generations
        const freeGenerationsLeft = 10 - (count || 0);
        
        setGenerationsLeft(hasSubscription ? "Unlimited" : Math.max(0, freeGenerationsLeft));
        
        // Redirect if no subscription and used all free generations
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
      console.log("Generating sprite with:", { prompt, resolution, stylePreset });
      
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
      
      // Update generations left count after successful generation
      if (generationsLeft !== "Unlimited") {
        setGenerationsLeft(prev => typeof prev === 'number' ? Math.max(0, prev - 1) : prev);
        if (generationsLeft <= 1) {
          // Last generation, show a message
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
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-base-100 shadow-xl rounded-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-extrabold text-base-content">
              Generate Sprite
            </h1>
            {generationsLeft !== "Unlimited" && (
              <div className="badge badge-primary">
                {generationsLeft} generations left
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

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

            {/* Generated Image Display */}
            {generatedImage && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Generated Sprite</h2>
                <div className="relative aspect-square w-full max-w-sm mx-auto border-2 border-base-300 rounded-lg overflow-hidden">
                  <Image
                    src={generatedImage.imageUrl}
                    alt={generatedImage.prompt || "Generated sprite"}
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
              disabled={isGenerating || !prompt.trim() || generationsLeft === 0}
            >
              {isGenerating ? "Generating..." : "Generate Sprite"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 