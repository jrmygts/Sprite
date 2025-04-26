import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createCustomerPortal } from "@/libs/stripe";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

export async function POST(req) {
  try {
    const supabase = createClient();

    const body = await req.json();

    // Log request to debug
    console.log("Create portal request:", { returnUrl: body.returnUrl });

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Auth user error:", userError);
      return NextResponse.json(
        { error: "Authentication error. Please try logging in again." },
        { status: 401 }
      );
    }

    // Log user data for debugging
    console.log("User authenticated:", { id: user?.id });

    // User who are not logged in can't make a purchase
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to view billing information." },
        { status: 401 }
      );
    } else if (!body.returnUrl) {
      return NextResponse.json(
        { error: "Return URL is required" },
        { status: 400 }
      );
    }

    try {
      console.log("Fetching profile for user:", user.id);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("customer_id, subscription_status, has_access")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return NextResponse.json(
          { error: "Error fetching your profile. Please try again." },
          { status: 500 }
        );
      }

      console.log("Profile found:", { 
        hasCustomerId: !!profile?.customer_id,
        subscriptionStatus: profile?.subscription_status,
        hasAccess: profile?.has_access
      });

      if (!profile?.customer_id) {
        return NextResponse.json(
          {
            error: "You don't have a billing account yet. Please make a purchase first.",
          },
          { status: 400 }
        );
      }

      // Validate customer_id format before attempting to use it
      const customerId = profile.customer_id;
      
      // Check if it's a valid Stripe customer ID format
      if (typeof customerId !== 'string' || !customerId.match(/^cus_[a-zA-Z0-9]+$/)) {
        console.error("Invalid customer ID format in profile:", customerId);
        
        // Attempt to fix database records by retrieving customer by email
        try {
          if (user.email) {
            const customers = await stripe.customers.list({
              email: user.email,
              limit: 1
            });
            
            if (customers && customers.data && customers.data.length > 0) {
              const correctCustomerId = customers.data[0].id;
              console.log(`Found correct customer ID ${correctCustomerId} for email ${user.email}`);
              
              // Update the profile with the correct customer ID
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ customer_id: correctCustomerId })
                .eq("id", user.id);
                
              if (updateError) {
                console.error("Failed to update profile with correct customer ID:", updateError);
              } else {
                console.log("Updated profile with correct customer ID");
                
                // Now use the correct customer ID for the portal
                const stripePortalUrl = await createCustomerPortal({
                  customerId: correctCustomerId,
                  returnUrl: body.returnUrl,
                });
                
                return NextResponse.json({
                  url: stripePortalUrl,
                });
              }
            } else {
              console.error("No customers found for email:", user.email);
            }
          }
        } catch (lookupError) {
          console.error("Error looking up customer by email:", lookupError);
        }
        
        return NextResponse.json(
          { error: "Your customer ID is invalid. Please contact support." },
          { status: 400 }
        );
      }

      // Validate customer exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) {
          console.error("Invalid Stripe customer:", customerId);
          return NextResponse.json(
            { error: "Invalid billing account. Please contact support." },
            { status: 400 }
          );
        }
      } catch (stripeError) {
        console.error("Stripe customer validation error:", stripeError);
        
        // If path traversal error, tell the user to contact support
        if (stripeError.code === 'wsp_400_blocked_path_traversal_request') {
          return NextResponse.json(
            { error: "There was a security issue with your billing account. Please contact support." },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: "Could not verify billing account. Please contact support." },
          { status: 400 }
        );
      }

      console.log("Creating Stripe portal for customer:", customerId);
      const stripePortalUrl = await createCustomerPortal({
        customerId,
        returnUrl: body.returnUrl,
      });

      if (!stripePortalUrl) {
        console.error("No portal URL returned from Stripe");
        return NextResponse.json(
          { error: "Could not create billing portal. Please try again." },
          { status: 500 }
        );
      }

      console.log("Portal URL created successfully");
      return NextResponse.json({
        url: stripePortalUrl,
      });
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json(
        { error: "Database error. Please try again later." },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("Error creating portal session:", e);
    return NextResponse.json({ 
      error: e?.message || "An error occurred while creating the billing portal." 
    }, { status: 500 });
  }
}
