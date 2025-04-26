import sharp from "sharp";

export const sliceSheet = async (buffer) => {
  try {
    return await sharp(buffer)
      .tile({
        size: 256, // 4×4 grid
        layout: "grid",
      })
      .toBuffer("png");
  } catch (error) {
    console.error("Sharp processing error:", error);
    throw new Error("Failed to process image");
  }
};

export const resize = async (buffer, size) => {
  try {
    return await sharp(buffer)
      .resize(size, size)
      .toBuffer();
  } catch (error) {
    console.error("Sharp resize error:", error);
    throw new Error("Failed to resize image");
  }
}; 