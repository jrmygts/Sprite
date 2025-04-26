import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export const genImage = async ({ prompt, seed }) => {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      n: 1,
      seed,
      response_format: "b64_json",
    });

    return response;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate image");
  }
}; 