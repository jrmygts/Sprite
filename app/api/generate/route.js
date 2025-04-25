import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import openai from "@/libs/openai";

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
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

    // Generate image using GPT Image 1
    const response = await openai.images.generate({
      model: "gpt-4-vision-preview",  // GPT Image 1 model
      prompt: enhancedPrompt,
      n: 1,
      size: `${resolution}x${resolution}`,
      quality: "hd",
      response_format: "url",
    });

    const imageUrl = response.data[0].url;

    // Upload the image to Supabase Storage
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    const fileName = `${session.user.id}/${Date.now()}-${resolution}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("sprites")
      .upload(fileName, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase
      .storage
      .from("sprites")
      .getPublicUrl(fileName);

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

    if (error) throw error;

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      prompt,
      resolution,
      stylePreset,
    });
  } catch (error) {
    console.error("Error generating sprite:", error);
    return NextResponse.json(
      { error: "Failed to generate sprite" },
      { status: 500 }
    );
  }
} 