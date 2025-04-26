import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sharp from "sharp";
import openai from "@/libs/openai";
import { buildPrompt } from "@/libs/prompts";

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
    const { prompt, resolution, mode } = await request.json();

    // Validate inputs
    if (!prompt || !resolution || !mode) {
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

    // Always generate at 1024x1024 for best quality
    const imageSize = "1024x1024";

    // Build enhanced prompt using the prompt helper
    const enhancedPrompt = buildPrompt(prompt, mode);
    console.log('Generating image with prompt:', enhancedPrompt);

    // Generate image using GPT Image 1
    // TODO: Future enhancement - Add quality tier based on user subscription
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      n: 1,
      size: imageSize,
      quality: "medium", // Balance between quality and cost ($0.042 per 1024x1024)
      background: "transparent", // Enable transparency for sprites
      output_format: "png", // Required for transparency
      moderation: "auto" // Standard content filtering
    });

    if (!response?.data?.[0]?.b64_json) {
      console.error('Full OpenAI response:', JSON.stringify(response, null, 2));
      throw new Error('No image data in OpenAI response');
    }

    // Convert base64 to buffer
    const imageBase64 = response.data[0].b64_json;
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Process the image based on mode
    let processedBuffer;
    if (mode === "character") {
      // For single character, just resize
      processedBuffer = await sharp(imageBuffer)
        .resize(parseInt(resolution), parseInt(resolution), {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
    } else {
      // For sprite sheet, maintain 4x4 grid proportions
      processedBuffer = await sharp(imageBuffer)
        .resize(parseInt(resolution) * 4, parseInt(resolution) * 4, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
    }
    
    const imageBlob = new Blob([processedBuffer], { type: 'image/png' });
    const fileName = `${session.user.id}/${Date.now()}-${resolution}-${mode}.png`;
    
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

    // Get the public URL
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
          style_preset: "owlboy-gba", // Default style from .cursorrules
          mode,
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
      mode,
    });
  } catch (error) {
    console.error("Error generating sprite:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate sprite" },
      { status: 500 }
    );
  }
} 