"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function DebugPage() {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/user-info?debug=reset_subscription");
      const data = await response.json();
      
      if (data.debug === "Subscription reset requested") {
        setStatus('Subscription reset successful! You should now have access.');
      } else {
        setStatus('Failed to reset subscription. ' + JSON.stringify(data));
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sprite Debug Tools</h1>
      
      <div className="bg-base-200 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>
        <button
          onClick={resetSubscription}
          className="btn btn-warning mb-4"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : "Reset Subscription Status"}
        </button>
        
        {status && (
          <div className="alert mt-4">
            <p>{status}</p>
          </div>
        )}
        
        <div className="mt-6 space-y-2">
          <Link href="/generate" className="btn btn-primary btn-block">
            Go to Generate Page
          </Link>
          <Link href="/" className="btn btn-outline btn-block">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 