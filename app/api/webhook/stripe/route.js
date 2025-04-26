import configFile from "@/config";
import { findCheckoutSession } from "@/libs/stripe";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Create a private supabase client using the secret service_role API key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to safely update profile
async function updateProfile(data, matchField, matchValue) {
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert(data)
      .eq(matchField, matchValue);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error updating profile:", error.message);
    throw error;
  }
}

// This is where we receive Stripe webhook events
// It used to update the user data, send emails, etc...
// By default, it'll store the user in the database
// See more: https://shipfa.st/docs/features/payments
export async function POST(req) {
  try {
    const body = await req.text();
    const signature = headers().get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing stripe-signature or webhook secret" },
        { status: 400 }
      );
    }

    // Verify Stripe event
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const eventType = event.type;
    const stripeObject = event.data.object;

    switch (eventType) {
      case "checkout.session.completed": {
        try {
          const session = await findCheckoutSession(stripeObject.id);
          if (!session) {
            throw new Error("Session not found");
          }

          const customerId = session.customer;
          const priceId = session?.line_items?.data[0]?.price?.id;
          let userId = stripeObject.client_reference_id;

          if (!customerId || !priceId) {
            throw new Error("Missing required session data");
          }

          const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);
          if (!plan) {
            throw new Error("Invalid price ID");
          }

          const customer = await stripe.customers.retrieve(customerId);
          if (!customer || customer.deleted) {
            throw new Error("Invalid customer");
          }

          // Handle user creation/lookup
          if (!userId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", customer.email)
              .single();

            if (profile) {
              userId = profile.id;
            } else {
              const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email: customer.email,
                email_confirm: true,
              });

              if (authError) throw authError;
              userId = newUser?.user?.id;

              if (userId) {
                await updateProfile({
                  id: userId,
                  email: customer.email,
                  created_at: new Date().toISOString(),
                }, "id", userId);
              }
            }
          }

          if (!userId) {
            throw new Error("Failed to obtain valid userId");
          }

          // Update subscription info
          await updateProfile({
            id: userId,
            customer_id: customerId,
            price_id: priceId,
            has_access: true,
            subscription_status: "active",
            subscription_id: stripeObject.subscription,
            email: customer.email,
            updated_at: new Date().toISOString(),
          }, "id", userId);

          break;
        } catch (error) {
          console.error("Error processing checkout completion:", error);
          throw error;
        }
      }

      case "checkout.session.expired": {
        // User didn't complete the transaction
        // You don't need to do anything here, by you can send an email to the user to remind him to complete the transaction, for instance
        break;
      }

      case "customer.subscription.updated": {
        try {
          const subscription = event.data.object;
          await updateProfile({
            subscription_status: subscription.status,
            updated_at: new Date().toISOString(),
          }, "customer_id", subscription.customer);
          break;
        } catch (error) {
          console.error("Error processing subscription update:", error);
          throw error;
        }
      }

      case "customer.subscription.deleted": {
        try {
          const subscription = event.data.object;
          await updateProfile({
            has_access: false,
            subscription_status: "canceled",
            updated_at: new Date().toISOString(),
          }, "customer_id", subscription.customer);
          break;
        } catch (error) {
          console.error("Error processing subscription deletion:", error);
          throw error;
        }
      }

      case "invoice.paid": {
        try {
          const invoice = event.data.object;
          const priceId = invoice.lines.data[0]?.price?.id;
          const customerId = invoice.customer;

          if (!priceId || !customerId) {
            throw new Error("Missing invoice data");
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("price_id")
            .eq("customer_id", customerId)
            .single();

          if (profile?.price_id === priceId) {
            await updateProfile({
              has_access: true,
              subscription_status: "active",
              updated_at: new Date().toISOString(),
            }, "customer_id", customerId);
          }
          break;
        } catch (error) {
          console.error("Error processing invoice payment:", error);
          throw error;
        }
      }

      case "invoice.payment_failed": {
        try {
          const invoice = event.data.object;
          await updateProfile({
            subscription_status: "past_due",
            has_access: false,
            updated_at: new Date().toISOString(),
          }, "customer_id", invoice.customer);
          break;
        } catch (error) {
          console.error("Error processing payment failure:", error);
          throw error;
        }
      }

      default:
      // Unhandled event type
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
