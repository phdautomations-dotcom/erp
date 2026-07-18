export interface CropPixels { x: number; y: number; width: number; height: number; }

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

// Crops an image to the given pixel area and returns a square JPEG blob,
// downscaled to `outputSize` so uploaded avatars stay small.
export const getCroppedImageBlob = async (
  imageSrc: string,
  crop: CropPixels,
  outputSize = 512,
): Promise<Blob> => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Crop failed")), "image/jpeg", 0.92);
  });
};
