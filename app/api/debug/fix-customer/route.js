import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

export async function POST(req) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "Debug endpoints only available in development" },
      { status: 403 }
    );
  }

  try {
    const supabase = createClient();
    
    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication error: " + (userError?.message || "Not logged in") },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Profile error: " + profileError.message },
        { status: 500 }
      );
    }

    // Current customer ID
    const currentCustomerId = profile.customer_id;
    
    // Try to find the correct customer ID
    try {
      // First check if the user has any customers in Stripe
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 5
      });
      
      if (!customers.data || customers.data.length === 0) {
        return NextResponse.json(
          { error: "No customers found for this email in Stripe" },
          { status: 404 }
        );
      }
      
      // Get the most recent customer
      const correctCustomerId = customers.data[0].id;
      
      // If it's already correct, no need to update
      if (currentCustomerId === correctCustomerId) {
        return NextResponse.json({
          message: "Customer ID is already correct",
          customer_id: currentCustomerId
        });
      }
      
      // Update the profile with the correct customer ID
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          customer_id: correctCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
        
      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update profile: " + updateError.message },
          { status: 500 }
        );
      }
      
      // Verify the customer is valid by trying to retrieve it
      try {
        await stripe.customers.retrieve(correctCustomerId);
      } catch (stripeError) {
        return NextResponse.json({
          error: "Customer ID updated but Stripe verification failed: " + stripeError.message,
          old_id: currentCustomerId,
          new_id: correctCustomerId
        }, { status: 500 });
      }
      
      return NextResponse.json({
        message: "Customer ID updated successfully",
        old_id: currentCustomerId,
        new_id: correctCustomerId
      });
    } catch (error) {
      console.error("Error fixing customer ID:", error);
      return NextResponse.json(
        { error: "Error fixing customer ID: " + error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
} 