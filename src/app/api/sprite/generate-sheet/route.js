import { genImage } from "@/libs/openai";
import { getCached, putCached } from "@/libs/cache";
import { createClient } from "@/libs/supabase/server";
import { sliceSheet, resize } from "@/libs/sharp";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { prompt, seed } = await req.json();
    
    if (!prompt || !seed) {
      return Response.json(
        { error: "Prompt and seed are required" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const hash = crypto
      .createHash("sha1")
      .update(`${prompt}|${seed}`)
      .digest("hex");

    // Check cache first
    let url = await getCached(hash);
    
    if (!url) {
      const { data } = await genImage({ prompt, seed });
      const buffer1024 = Buffer.from(data[0].b64_json, "base64");
      
      // Generate both full sheet and sliced versions
      const bufferSliced = await sliceSheet(buffer1024);
      const bufferThumb = await resize(buffer1024, 512);
      
      // Store both versions
      const [sheetUrl, thumbUrl] = await Promise.all([
        putCached(`${hash}-sheet`, bufferSliced),
        putCached(`${hash}-thumb`, bufferThumb)
      ]);

      url = sheetUrl;
    }

    // Log generation
    await supabase.from("generations").insert({
      user_id: user.id,
      hash,
      kind: "sheet",
      url
    });

    return Response.json({ url });
  } catch (error) {
    console.error("Sheet generation error:", error);
    return Response.json(
      { error: "Failed to generate sprite sheet" },
      { status: 500 }
    );
  }
} 