import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  console.log("Auth callback handling code exchange");
  
  try {
    if (code) {
      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Code exchange error:", error);
        // Still redirect to avoid being stuck
      } else {
        console.log("Session established successfully");
      }
    }
    
    // URL to redirect to after sign in process completes
    // Make sure the return-to parameter is prioritized if available
    const returnToPath = requestUrl.searchParams.get("return-to");
    const redirectTo = returnToPath || config.auth.callbackUrl;
    const redirectUrl = requestUrl.origin + redirectTo;
    
    console.log("Redirecting to:", redirectUrl);
    
    // Add a small delay to allow cookies to be set
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Auth callback error:", error);
    // Fallback redirect to dashboard
    return NextResponse.redirect(requestUrl.origin + "/dashboard");
  }
}
