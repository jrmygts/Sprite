/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import { createClient } from "@/libs/supabase/client";
import apiClient from "@/libs/api";
import { toast } from "react-hot-toast";

// A button to show user some account actions
//  1. Billing: open a Stripe Customer Portal to manage their billing (cancel subscription, update payment method, etc.).
//     You have to manually activate the Customer Portal in your Stripe Dashboard (https://dashboard.stripe.com/test/settings/billing/portal)
//     This is only available if the customer has a customerId (they made a purchase previously)
//  2. Logout: sign out and go back to homepage
// See more at https://shipfa.st/docs/components/buttonAccount
const ButtonAccount = () => {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleBilling = async () => {
    setIsLoading(true);
    toast.loading("Checking billing status...");

    try {
      // First, let's check if we have a valid profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("customer_id, subscription_status")
        .eq("id", user?.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw new Error("Could not fetch your profile. Please try again.");
      }

      console.log("Profile data:", {
        hasCustomerId: !!profile?.customer_id,
        customerId: profile?.customer_id,
        subscriptionStatus: profile?.subscription_status
      });

      // Attempt to create portal session
      try {
        const { url, error } = await apiClient.post("/stripe/create-portal", {
          returnUrl: window.location.href,
        });

        if (error) {
          console.error("Portal creation error:", error);
          throw new Error(error);
        }

        if (!url) {
          console.error("No portal URL received");
          throw new Error("Could not create billing portal");
        }

        toast.dismiss();
        toast.success("Redirecting to billing portal...");
        window.location.href = url;
      } catch (e) {
        console.error("Portal API error:", e);
        
        // If no billing account, redirect to pricing
        if (e?.message?.toLowerCase().includes('billing') || !profile?.customer_id) {
          toast.dismiss();
          toast.error("No billing account found. Redirecting to pricing...");
          setTimeout(() => {
            window.location.href = '/pricing';
          }, 1500);
          return;
        }
        
        throw e;
      }
    } catch (e) {
      console.error("Billing error:", e);
      toast.dismiss();
      toast.error(e.message || "Error accessing billing. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-50">
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button className="btn btn-circle btn-ghost btn-sm">
              {isLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </Popover.Button>
            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Popover.Panel className="absolute left-0 z-10 mt-3 w-screen max-w-[16rem] transform">
                <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-base-content ring-opacity-5 bg-base-100 p-1">
                  <div className="space-y-0.5 text-sm">
                    <button
                      className="flex items-center gap-2 hover:bg-base-300 duration-200 py-1.5 px-4 w-full rounded-lg font-medium disabled:opacity-50"
                      onClick={handleBilling}
                      disabled={isLoading}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.5 4A1.5 1.5 0 001 5.5V6h18v-.5A1.5 1.5 0 0017.5 4h-15zM19 8.5H1v6A1.5 1.5 0 002.5 16h15a1.5 1.5 0 001.5-1.5v-6zM3 13.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm4.75-.75a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {isLoading ? "Loading..." : "Billing"}
                    </button>
                    <button
                      className="flex items-center gap-2 hover:bg-base-300 duration-200 py-1.5 px-4 w-full rounded-lg font-medium"
                      onClick={handleSignOut}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
                          clipRule="evenodd"
                        />
                        <path
                          fillRule="evenodd"
                          d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    </div>
  );
};

export default ButtonAccount;
