export const LINE_STICKER_MAX_WIDTH = 370;
export const LINE_STICKER_MAX_HEIGHT = 320;
export const MAIN_IMAGE_SIZE = { width: 240, height: 240 };
export const TAB_IMAGE_SIZE = { width: 96, height: 74 };

export interface ProcessedImage {
    id: string;
    original: string; // Base64 or URL
    processed: string; // Base64 PNG
    width: number;
    height: number;
    fileName?: string; // e.g., "main.png", "01.png"
}

/**
 * Resizes an image to fit max dimensions while maintaining aspect ratio.
 */
export async function resizeImage(
    fileOrUrl: File | string,
    maxWidth: number,
    maxHeight: number
): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;

            // Calculate new dimensions (Fit within box)
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            // For Main/Tab images, usually they should be EXACTLY the size or fit within?
            // LINE specs say "W240 x H240". If it's not square, we fit it inside?
            // Usually best to fit inside and preserve aspect ratio. 
            // If the target is strictly fixed size (like filled background), we might need to pad.
            // But for stickers, transparency is key. Let's just fit inside for now.

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            resolve({
                id: Math.random().toString(36).substring(7),
                original: img.src,
                processed: canvas.toDataURL("image/png"),
                width,
                height
            });
        };
        img.onerror = reject;

        if (typeof fileOrUrl === 'string') {
            img.src = fileOrUrl;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target?.result as string; };
            reader.readAsDataURL(fileOrUrl);
        }
    });
}

/**
 * Helper to convert File to Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Slices a large image into a grid of smaller images.
 * @param imageSource The large image file or base64 string
 * @param cols Number of columns (default 4)
 * @param rows Number of rows (default 10)
 */
export async function sliceAndProcessStickerSheet(
    imageSource: File | string,
    cols: number = 4,
    rows: number = 10
): Promise<ProcessedImage[]> {
    return new Promise((resolve, reject) => {
        const processImage = (src: string) => {
            const img = new Image();
            img.onload = async () => {
                const results: ProcessedImage[] = [];
                const sliceWidth = img.width / cols;
                const sliceHeight = img.height / rows;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        // Extract slice
                        const sliceCanvas = document.createElement("canvas");
                        sliceCanvas.width = sliceWidth;
                        sliceCanvas.height = sliceHeight;
                        const ctx = sliceCanvas.getContext("2d");

                        if (!ctx) continue;

                        ctx.drawImage(
                            img,
                            c * sliceWidth, r * sliceHeight, sliceWidth, sliceHeight, // Source
                            0, 0, sliceWidth, sliceHeight // Dest
                        );

                        const sliceBase64 = sliceCanvas.toDataURL("image/png");

                        // Resize this slice to Sticker Specs (370x320)
                        const processed = await resizeImage(
                            sliceBase64,
                            LINE_STICKER_MAX_WIDTH,
                            LINE_STICKER_MAX_HEIGHT
                        );

                        results.push(processed);
                    }
                }
                resolve(results);
            };
            img.onerror = reject;
            img.src = src;
        };

        if (typeof imageSource === 'string') {
            processImage(imageSource);
        } else {
            fileToBase64(imageSource).then(processImage).catch(reject);
        }
    });
}

/**
 * Removes a specific color from an image (chroma key) with advanced edge processing.
 * @param base64 The source image base64 data.
 * @param targetColor The RGB color to remove {r, g, b}.
 * @param tolerance value between 0 and 100.
 * @param feather Smoothness of edges (0-20).
 * @param despill Whether to remove color cast from edges.
 */
export async function removeColorFromImage(
    base64: string,
    targetColor: { r: number; g: number; b: number },
    tolerance: number,
    feather: number = 0,
    despill: boolean = false
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Could not get canvas context"));

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const width = canvas.width;
            const height = canvas.height;

            // Tolerance logic
            const maxDist = 442; // Sqrt(255^2 * 3)
            const threshold = (tolerance / 100) * maxDist;

            // Temporary alpha buffer for feathering
            const alphaBuffer = new Float32Array(width * height);

            // 1. Generate Mask
            for (let i = 0; i < width * height; i++) {
                const r = data[i * 4];
                const g = data[i * 4 + 1];
                const b = data[i * 4 + 2];

                // Euclidean distance
                const dist = Math.sqrt(
                    Math.pow(r - targetColor.r, 2) +
                    Math.pow(g - targetColor.g, 2) +
                    Math.pow(b - targetColor.b, 2)
                );

                // Soft threshold if feathering is needed, otherwise hard cut
                if (dist <= threshold) {
                    alphaBuffer[i] = 0; // Transparent
                } else {
                    // If feathering is 0, just solid opaque. 
                    // If feathering > 0, we might want a small ramp, but simple blur later handles it better.
                    alphaBuffer[i] = 255;
                }
            }

            // 2. Feathering (Box Blur on Alpha Channel)
            if (feather > 0) {
                const radius = Math.floor(feather);
                if (radius > 0) {
                    const blurredAlpha = new Float32Array(width * height);
                    // Simple Horizontal Blur
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            let sum = 0;
                            let count = 0;
                            for (let k = -radius; k <= radius; k++) {
                                const px = Math.min(width - 1, Math.max(0, x + k));
                                sum += alphaBuffer[y * width + px];
                                count++;
                            }
                            blurredAlpha[y * width + x] = sum / count;
                        }
                    }

                    // Simple Vertical Blur (using the horizontally blurred result)
                    // We can reuse alphaBuffer to store final result
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            let sum = 0;
                            let count = 0;
                            for (let k = -radius; k <= radius; k++) {
                                const py = Math.min(height - 1, Math.max(0, y + k));
                                sum += blurredAlpha[py * width + x];
                                count++;
                            }
                            alphaBuffer[y * width + x] = sum / count;
                        }
                    }
                }
            }

            // 3. Apply Alpha & Despill
            for (let i = 0; i < width * height; i++) {
                const idx = i * 4;

                // Apply calculated alpha
                // But respect original image alpha if it was already transparent? 
                // For now, assume input image is fully opaque or we overwrite.
                // Better: multiply new alpha with old alpha?
                // Let's just set it based on mask for the chroma key effect.
                const newAlpha = alphaBuffer[i];

                // Despill: Detect if pixel is semi-transparent or near edge and has color cast
                if (despill && newAlpha > 0 && newAlpha < 255) {
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];

                    // Simple green screen despill example: if Green is dominant, clamp it.
                    // We need to know WHICH channel is the key. 
                    // Heuristic: If targetColor is mostly Green, clamp Green.

                    let colorToRemove = 'g';
                    if (targetColor.r > targetColor.g && targetColor.r > targetColor.b) colorToRemove = 'r';
                    if (targetColor.b > targetColor.g && targetColor.b > targetColor.r) colorToRemove = 'b';

                    if (colorToRemove === 'g') {
                        // Classic green despill: G <= (R+B)/2
                        const limit = (r + b) / 2;
                        if (g > limit) data[idx + 1] = limit;
                    } else if (colorToRemove === 'b') {
                        const limit = (r + g) / 2;
                        if (b > limit) data[idx + 2] = limit;
                    } else if (colorToRemove === 'r') {
                        const limit = (g + b) / 2;
                        if (r > limit) data[idx] = limit;
                    }
                }

                // Only modify alpha if we are making it MORE transparent than it was.
                // But usually we just want to apply the key.
                data[idx + 3] = Math.min(data[idx + 3], newAlpha);
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = base64;
    });
}
