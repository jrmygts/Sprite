import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from 'next/server';

// This is just for testing purposes, not for production
export async function GET(request) {
  // Security check - only works in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development mode' }, { status: 403 });
  }

  try {
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

    // Get auth session to get the user ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 });
    }

    const userId = session.user.id;

    // Sample prompts for test generations
    const prompts = [
      'A cute cartoon cat playing with a ball of yarn',
      'A futuristic robot with glowing eyes',
      'A magical forest with mystical creatures',
      'An astronaut floating in space with planets in background',
      'A pirate ship sailing through stormy waters',
      'A medieval castle on a hilltop at sunset',
      'A cyberpunk cityscape with neon lights',
      'A dragon perched on a mountain peak',
      'A superhero with a flowing cape',
      'A wizard casting a spell with magical effects'
    ];

    // Sample resolutions and styles
    const resolutions = ['512x512', '768x768', '1024x1024'];
    const stylePresets = ['pixel-art', 'flat-vector', 'ui-button', 'tileable-floor'];

    // Create placeholders for test data
    const testGenerations = [];

    // Generate test data
    for (let i = 0; i < prompts.length; i++) {
      // Generate random timestamps within the last 7 days
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 7));
      
      // Randomly select resolution and style
      const resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
      const stylePreset = stylePresets[Math.floor(Math.random() * stylePresets.length)];
      
      // Use placeholder images from placehold.co with different colors
      const color = Math.floor(Math.random() * 999999).toString(16).padStart(6, '0');
      const imageUrl = `https://placehold.co/${resolution}/${color}/FFFFFF`;
      
      testGenerations.push({
        user_id: userId,
        prompt: prompts[i],
        resolution: resolution,
        style_preset: stylePreset,
        image_url: imageUrl,
        status: 'completed',
        created_at: timestamp.toISOString()
      });
    }

    // Insert the test generations into the database
    const { data, error } = await supabase
      .from('generations')
      .insert(testGenerations)
      .select();

    if (error) {
      console.error('Error inserting test generations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Successfully inserted ${data.length} test generations`,
      data
    });
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 