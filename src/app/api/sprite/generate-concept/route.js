import { genImage } from "@/libs/openai";
import { getCached, putCached } from "@/libs/cache";
import { createClient } from "@/libs/supabase/server";
import { resize } from "@/libs/sharp";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check daily quota
    const { data: quota } = await supabase
      .from("v_user_daily_credits")
      .select("used")
      .eq("user_id", user.id)
      .single();

    if ((quota?.used || 0) >= 20) {
      return Response.json({ error: "Daily free quota exceeded" }, { status: 402 });
    }

    const seed = Math.floor(Math.random() * 1e9);
    const hash = crypto
      .createHash("sha1")
      .update(`${prompt}|${seed}`)
      .digest("hex");

    // Check cache first
    let url = await getCached(hash);
    
    if (!url) {
      const { data } = await genImage({ prompt, seed });
      const buffer1024 = Buffer.from(data[0].b64_json, "base64");
      const bufferThumb = await resize(buffer1024, 512);
      url = await putCached(hash, bufferThumb);
    }

    // Log generation
    await supabase.from("generations").insert({
      user_id: user.id,
      hash,
      kind: "concept",
      url
    });

    return Response.json({ url, seed });
  } catch (error) {
    console.error("Concept generation error:", error);
    return Response.json(
      { error: "Failed to generate concept" },
      { status: 500 }
    );
  }
} 