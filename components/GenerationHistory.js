"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/libs/supabase/client";
import Image from "next/image";

export default function GenerationHistory() {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [user, setUser] = useState(null);
  
  // Initialize Supabase client using the standard client utility
  const supabase = createClient();

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth error:", error);
          setError("Authentication error: " + error.message);
          return;
        }
        
        if (data?.session?.user) {
          setUser(data.session.user);
          console.log("Logged in as:", data.session.user.email);
        } else {
          console.warn("No authenticated user found");
          setError("Please log in to view your generations");
        }
      } catch (err) {
        console.error("Failed to check auth:", err);
        setError("Failed to verify authentication");
      }
    }
    
    checkAuth();
  }, [supabase]);

  const fetchGenerations = useCallback(async (retryCount = 0) => {
    if (!user) {
      console.log("Skipping fetch - no authenticated user");
      setLoading(false);
      return;
    }
    
    try {
      console.log("Fetching generations for user:", user.id);
      setError(null);
      
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Database query error:", error);
        throw error;
      }
      
      console.log("Fetched generations:", data?.length || 0);
      setGenerations(data || []);
    } catch (error) {
      console.error("Error fetching generations:", error);
      setError("Failed to load generations: " + error.message);
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        console.log(`Retrying in ${Math.pow(2, retryCount)} seconds...`);
        setTimeout(() => {
          fetchGenerations(retryCount + 1);
        }, Math.pow(2, retryCount) * 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [fetchGenerations, user]);

  const handleDownload = async (generation) => {
    try {
      setDownloadingId(generation.id);
      const response = await fetch(generation.image_url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Include more metadata in filename
      const timestamp = new Date(generation.created_at).toISOString().split('T')[0];
      const sanitizedPrompt = generation.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-');
      a.download = `sprite-${timestamp}-${sanitizedPrompt}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading image:", error);
      alert("Failed to download image. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error mb-4">{error}</p>
        <button 
          onClick={() => user && fetchGenerations()} 
          className="btn btn-primary btn-sm"
          disabled={!user}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No generations yet. Start creating some sprites!</p>
        <div className="mt-4">
          <a href="/api/test-generations" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            Generate Test Data
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {generations.map((generation) => (
        <div
          key={generation.id}
          className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
        >
          <figure className="relative aspect-square">
            <Image
              src={generation.image_url}
              alt={generation.prompt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </figure>
          <div className="card-body">
            <h3 className="card-title text-sm line-clamp-2">{generation.prompt}</h3>
            <div className="flex flex-wrap gap-2 my-2">
              <span className="badge badge-outline">{generation.resolution}</span>
              <span className="badge badge-outline">{generation.style_preset}</span>
            </div>
            <p className="text-xs text-gray-500">
              {formatDate(generation.created_at)}
            </p>
            <div className="card-actions justify-end mt-2">
              <button
                onClick={() => handleDownload(generation)}
                className="btn btn-primary btn-sm"
                disabled={downloadingId === generation.id}
              >
                {downloadingId === generation.id ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  'Download'
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 