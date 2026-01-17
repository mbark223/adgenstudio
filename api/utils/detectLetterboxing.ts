import sharp from 'sharp';

interface PaddingDetection {
  hasPadding: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
  confidence: number;
}

export async function detectLetterboxing(imageUrl: string): Promise<PaddingDetection> {
  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to fetch image for letterboxing detection:', response.status);
      return { hasPadding: false, top: 0, bottom: 0, left: 0, right: 0, confidence: 0 };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Analyze with sharp
    const image = sharp(buffer);
    const { width, height, channels } = await image.metadata();
    if (!width || !height || !channels) {
      console.error('Unable to extract image metadata');
      return { hasPadding: false, top: 0, bottom: 0, left: 0, right: 0, confidence: 0 };
    }

    // Extract raw pixel data
    const rawPixels = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = rawPixels.data;
    const stride = width * channels;

    // Check if row is uniform black/white
    const isUniformRow = (rowIndex: number, threshold = 10): boolean => {
      const rowStart = rowIndex * stride;
      let sumR = 0, sumG = 0, sumB = 0;

      for (let x = 0; x < width; x++) {
        const idx = rowStart + x * channels;
        sumR += pixels[idx];
        sumG += pixels[idx + 1];
        sumB += pixels[idx + 2];
      }

      const avgR = sumR / width;
      const avgG = sumG / width;
      const avgB = sumB / width;

      // Check if very dark (black) or very light (white)
      return (avgR < threshold && avgG < threshold && avgB < threshold) ||
             (avgR > (255 - threshold) && avgG > (255 - threshold) && avgB > (255 - threshold));
    };

    // Scan from top
    let topPadding = 0;
    for (let y = 0; y < height * 0.3; y++) {
      if (isUniformRow(y)) topPadding++;
      else break;
    }

    // Scan from bottom
    let bottomPadding = 0;
    for (let y = height - 1; y > height * 0.7; y--) {
      if (isUniformRow(y)) bottomPadding++;
      else break;
    }

    // Check if significant padding exists
    const totalPadding = topPadding + bottomPadding;
    const paddingPercentage = totalPadding / height;
    const hasPadding = paddingPercentage > 0.15; // More than 15% is padding
    const confidence = Math.min(1, paddingPercentage * 3);

    console.log(`Letterboxing detection: ${topPadding}px top, ${bottomPadding}px bottom (${(paddingPercentage * 100).toFixed(1)}% of image)`);

    return {
      hasPadding,
      top: topPadding,
      bottom: bottomPadding,
      left: 0,
      right: 0,
      confidence,
    };
  } catch (error) {
    console.error('Error detecting letterboxing:', error);
    return { hasPadding: false, top: 0, bottom: 0, left: 0, right: 0, confidence: 0 };
  }
}

export async function cropLetterboxing(
  imageUrl: string,
  padding: PaddingDetection
): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const image = sharp(buffer);
    const { width, height } = await image.metadata();
    if (!width || !height) {
      console.error('Unable to extract image dimensions for cropping');
      return buffer;
    }

    // Crop out the padding
    const cropTop = padding.top;
    const cropHeight = height - padding.top - padding.bottom;

    if (cropHeight <= 0 || cropHeight > height) {
      console.error('Invalid crop dimensions, returning original buffer');
      return buffer;
    }

    console.log(`Cropping letterboxing: removing ${padding.top}px from top, ${padding.bottom}px from bottom`);

    return await image
      .extract({
        left: 0,
        top: cropTop,
        width: width,
        height: cropHeight,
      })
      .toBuffer();
  } catch (error) {
    console.error('Error cropping letterboxing:', error);
    // Return original buffer as fallback
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
