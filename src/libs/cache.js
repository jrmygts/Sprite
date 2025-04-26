import { createClient } from "@/libs/supabase/server";

const BUCKET_NAME = "sprite-generations";

export const getCached = async (hash) => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .download(`${hash}.png`);

    if (error) {
      if (error.message === "Object not found") {
        return null;
      }
      throw error;
    }

    return URL.createObjectURL(data);
  } catch (error) {
    console.error("Cache retrieval error:", error);
    return null;
  }
};

export const putCached = async (hash, buffer) => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(`${hash}.png`, buffer, {
        contentType: "image/png",
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(`${hash}.png`);

    return publicUrl;
  } catch (error) {
    console.error("Cache storage error:", error);
    throw new Error("Failed to cache image");
  }
}; 