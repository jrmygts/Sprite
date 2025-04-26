import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Direct Supabase client with service role key for admin actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

export async function GET(req) {
  // Only allow in development mode for security
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Get the customer ID from query params or use a specific one to fix
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || '543d5c6b-3048-4bf5-890d-fc7ec74bda58';
    const customerEmail = url.searchParams.get('email') || 'thejeremygates@gmail.com';
    
    console.log("Fixing customer ID for user:", userId);
    
    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (profileError) {
      console.error("Profile error:", profileError);
      return NextResponse.json(
        { error: "Could not find profile: " + profileError.message },
        { status: 404 }
      );
    }
    
    const currentCustomerId = profile.customer_id;
    console.log("Current customer_id:", currentCustomerId);
    
    // Check if it contains a newline
    const hasNewline = currentCustomerId && currentCustomerId.includes('\n');
    const sanitizedId = currentCustomerId ? currentCustomerId.trim() : null;
    
    // Find the correct customer in Stripe
    let correctCustomerId;
    try {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 5,
      });
      
      if (!customers.data || customers.data.length === 0) {
        return NextResponse.json(
          { error: "No customers found for email: " + customerEmail },
          { status: 404 }
        );
      }
      
      // Use the most recent customer
      correctCustomerId = customers.data[0].id;
      console.log("Found correct customer ID:", correctCustomerId);
      
    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      return NextResponse.json(
        { error: "Stripe error: " + stripeError.message },
        { status: 500 }
      );
    }
    
    // Update the profile with the corrected customer ID
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        customer_id: correctCustomerId
      })
      .eq("id", userId);
      
    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile: " + updateError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Customer ID fixed successfully",
      before: {
        customer_id: currentCustomerId,
        had_newline: hasNewline,
        sanitized: sanitizedId
      },
      after: {
        customer_id: correctCustomerId
      }
    });
    
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
} 