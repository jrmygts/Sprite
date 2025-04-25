import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const debug = url.searchParams.get('debug');
    const resetSub = debug === 'reset_subscription';
    
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      );
    }
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false, message: "No active session" },
        { status: 200 }
      );
    }

    // If debug reset is requested, update the user's subscription status (only in development)
    if (resetSub && process.env.NODE_ENV === 'development' && session) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          has_access: true,
          subscription_status: 'complete'
        })
        .eq('id', session.user.id);
      
      if (updateError) {
        console.error("Error updating subscription:", updateError);
      } else {
        console.log("Reset subscription status for testing");
      }
    }

    // Get user profile if authenticated
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    // Count generations
    const { count, error: countError } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);
    
    return NextResponse.json({
      authenticated: true,
      userId: session.user.id,
      email: session.user.email,
      profile: profile || null,
      profileError: profileError?.message,
      generationCount: count || 0,
      countError: countError?.message,
      env: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        openaiKey: !!process.env.OPENAI_API_KEY,
      },
      debug: resetSub ? "Subscription reset requested" : undefined
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
} 