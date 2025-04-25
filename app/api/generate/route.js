import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import openai from "@/libs/openai";

export async function POST(request) {
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
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get request body
    const { prompt, resolution, stylePreset } = await request.json();

    // Validate inputs
    if (!prompt || !resolution || !stylePreset) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Map the requested resolution to supported sizes for GPT Image 1
    const supportedSizes = {
      "512": "1024x1024",   // Map smaller sizes to square format
      "1024": "1024x1024",  // Square format (fastest)
      "1536": "1536x1024"   // Landscape format
    };

    // Default to square format for best performance
    const imageSize = supportedSizes[resolution] || "1024x1024";

    if (prompt.length > 200) {
      return NextResponse.json(
        { error: "Prompt too long" },
        { status: 400 }
      );
    }

    // Enhance the prompt based on style preset
    const stylePrompts = {
      "pixel-art": "Create a pixel art style sprite with clear pixels and limited color palette.",
      "flat-vector": "Create a flat vector style sprite with clean lines and solid colors.",
      "ui-button": "Create a modern UI button design with clear edges and good contrast.",
      "tileable-floor": "Create a seamless tileable floor texture that can repeat perfectly.",
    };

    const enhancedPrompt = `${stylePrompts[stylePreset]} ${prompt}. Make it game-ready, with a transparent background, and ensure it's a single cohesive sprite suitable for a video game.`;

    console.log('Generating image with prompt:', enhancedPrompt);

    // Generate image using GPT Image 1
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      n: 1,
      size: imageSize,
      quality: "medium",  // Options: low, medium, high, auto (default)
      background: "transparent",  // Enable transparency for sprites
      output_format: "png",  // Required for transparency
      moderation: "auto"  // Standard content filtering
    });

    console.log('OpenAI response:', JSON.stringify(response, null, 2));

    // For GPT Image 1, we get base64 data
    if (!response?.data?.[0]?.b64_json) {
      console.error('Full OpenAI response:', JSON.stringify(response, null, 2));
      throw new Error('No image data in OpenAI response');
    }

    // Convert base64 to blob
    const imageBase64 = response.data[0].b64_json;
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    
    const fileName = `${session.user.id}/${Date.now()}-${resolution}.png`;
    
    console.log('Uploading to Supabase:', fileName);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("sprites")
      .upload(fileName, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw uploadError;
    }

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase
      .storage
      .from("sprites")
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    // Store generation in database
    const { data, error } = await supabase
      .from("generations")
      .insert([
        {
          user_id: session.user.id,
          prompt,
          resolution,
          style_preset: stylePreset,
          image_url: publicUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      prompt,
      resolution,
      stylePreset,
    });
  } catch (error) {
    console.error("Error generating sprite:", error);
    // Return more specific error message
    return NextResponse.json(
      { error: error.message || "Failed to generate sprite" },
      { status: 500 }
    );
  }
} 