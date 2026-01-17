import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import sharp from 'sharp';
// Temporarily disabled: letterboxing detection causes serverless issues
// import { detectLetterboxing, cropLetterboxing } from './utils/detectLetterboxing';

// Vercel function config - extended timeout for AI background extension
export const config = {
  maxDuration: 300, // 5 minutes for AI extension when needed
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN');
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
}

// Convert width/height to aspect ratio string
function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  // Map to common aspect ratios
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.01) return '9:16';
  if (Math.abs(ratio - 4/3) < 0.01) return '4:3';
  if (Math.abs(ratio - 3/4) < 0.01) return '3:4';
  if (Math.abs(ratio - 4/5) < 0.01) return '4:5';
  if (Math.abs(ratio - 5/4) < 0.01) return '5:4';

  // For non-standard ratios, return closest common ratio
  if (ratio > 1.5) return '16:9';
  if (ratio > 1.2) return '4:3';
  if (ratio > 0.9) return '1:1';
  if (ratio > 0.7) return '4:5';
  return '9:16';
}

// Download image from URL and upload to Supabase Storage
async function uploadToStorage(imageUrl: string, jobId: string, size: { width: number; height: number }): Promise<string> {
  const supabase = getSupabase();

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return imageUrl;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = response.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';

    const filePath = `generated/resize-${jobId}-${size.width}x${size.height}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return imageUrl;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('Error uploading to storage:', err);
    return imageUrl;
  }
}

interface SizeConfig {
  name: string;
  width: number;
  height: number;
  placement: string;
  platform: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const supabase = getSupabase();
      const replicate = getReplicate();
      const { sourceJobId, targetSizes } = req.body as {
        sourceJobId: string;
        targetSizes: SizeConfig[];
      };

      console.log('=== Resize Request ===');
      console.log('Source Job ID:', sourceJobId);
      console.log('Target Sizes:', targetSizes.map(s => `${s.width}x${s.height} (${s.platform}/${s.name})`));

      if (!sourceJobId || !targetSizes || targetSizes.length === 0) {
        return res.status(400).json({ error: 'sourceJobId and targetSizes required' });
      }

      // Fetch source job
      const { data: sourceJob, error: jobError } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('id', sourceJobId)
        .single();

      if (jobError || !sourceJob) {
        return res.status(404).json({ error: 'Source job not found' });
      }

      if (!sourceJob.result?.url) {
        return res.status(400).json({ error: 'Source job has no result image' });
      }

      const sourceImageUrl = sourceJob.result.url;

      // Process each target size using Flux Dev with fallback
      const results = await Promise.allSettled(
        targetSizes.map(async (size) => {
          const aspectRatio = getAspectRatio(size.width, size.height);
          console.log(`Adapting to ${size.width}x${size.height} (${aspectRatio})`);

          // Hybrid approach: Contain first (preserve all content), then AI extend background
          console.log('Using contain + AI background extension...');

          // Fetch source image
          const response = await fetch(sourceImageUrl);
          if (!response.ok) throw new Error(`Failed to fetch source image: ${response.status}`);
          const sourceBuffer = Buffer.from(await response.arrayBuffer());

          // Get source dimensions
          const image = sharp(sourceBuffer);
          const metadata = await image.metadata();
          const sourceWidth = metadata.width;
          const sourceHeight = metadata.height;

          if (!sourceWidth || !sourceHeight) {
            throw new Error('Invalid source image: unable to extract dimensions');
          }

          const sourceRatio = sourceWidth / sourceHeight;
          const targetRatio = size.width / size.height;

          console.log(`Resizing ${sourceWidth}x${sourceHeight} to ${size.width}x${size.height}`);

          // Check if significant padding will be added
          const ratioDifference = Math.abs(sourceRatio - targetRatio);
          const needsAIExtension = ratioDifference > 0.1; // More than 10% difference

          let finalUrl: string;
          let permanentUrl: string;
          const attemptCount = 1;

          if (!needsAIExtension) {
            // Small difference - just contain with solid background
            console.log('Small aspect ratio difference, using simple contain...');
            const resizedBuffer = await image
              .resize(size.width, size.height, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 1 },
                kernel: 'lanczos3'
              })
              .png()
              .toBuffer();

            const filePath = `generated/resize-${sourceJobId}-${size.width}x${size.height}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
              .from('assets')
              .upload(filePath, resizedBuffer, {
                contentType: 'image/png',
                upsert: true,
              });

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            const { data: { publicUrl } } = supabase.storage
              .from('assets')
              .getPublicUrl(filePath);

            finalUrl = publicUrl;
            permanentUrl = finalUrl;
          } else {
            // Large difference - use FLUX Fill Pro for proper outpainting
            console.log('Large aspect ratio difference, using FLUX Fill Pro outpainting...');

            // Step 1: Create canvas with image centered (with black bars)
            const containedBuffer = await image
              .resize(size.width, size.height, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 1 },
                kernel: 'lanczos3'
              })
              .png()
              .toBuffer();

            // Step 2: Create mask - white where we need to fill (black bars), black where to preserve (center content + safe zones)
            // Calculate the preserved area dimensions
            const scaleFactorWidth = size.width / sourceWidth;
            const scaleFactorHeight = size.height / sourceHeight;
            const scaleFactor = Math.min(scaleFactorWidth, scaleFactorHeight);
            const scaledWidth = Math.round(sourceWidth * scaleFactor);
            const scaledHeight = Math.round(sourceHeight * scaleFactor);
            const offsetX = Math.round((size.width - scaledWidth) / 2);
            const offsetY = Math.round((size.height - scaledHeight) / 2);

            // Add safety margin - expand the black area to prevent AI from touching content edges
            const marginPixels = 20; // 20px safety margin
            const maskOffsetX = Math.max(0, offsetX - marginPixels);
            const maskOffsetY = Math.max(0, offsetY - marginPixels);
            const maskWidth = Math.min(size.width - maskOffsetX, scaledWidth + (marginPixels * 2));
            const maskHeight = Math.min(size.height - maskOffsetY, scaledHeight + (marginPixels * 2));

            // Get platform safe zones (areas where UI elements appear - must be preserved)
            const safeZone = size.safeZone || { top: 0, right: 0, bottom: 0, left: 0 };

            // Create mask: start with white (255 = fill all), then draw black rectangles for preserved areas
            const svgRects = [
              // Center content area (with safety margin)
              `<rect x="${maskOffsetX}" y="${maskOffsetY}" width="${maskWidth}" height="${maskHeight}" fill="black"/>`,
            ];

            // Add safe zone rectangles (platform UI areas that must remain clear)
            if (safeZone.top > 0) {
              svgRects.push(`<rect x="0" y="0" width="${size.width}" height="${safeZone.top}" fill="black"/>`);
            }
            if (safeZone.bottom > 0) {
              svgRects.push(`<rect x="0" y="${size.height - safeZone.bottom}" width="${size.width}" height="${safeZone.bottom}" fill="black"/>`);
            }
            if (safeZone.left > 0) {
              svgRects.push(`<rect x="0" y="0" width="${safeZone.left}" height="${size.height}" fill="black"/>`);
            }
            if (safeZone.right > 0) {
              svgRects.push(`<rect x="${size.width - safeZone.right}" y="0" width="${safeZone.right}" height="${size.height}" fill="black"/>`);
            }

            const maskBuffer = await sharp({
              create: {
                width: size.width,
                height: size.height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 } // White = areas to inpaint
              }
            })
            .composite([{
              input: Buffer.from(
                `<svg width="${size.width}" height="${size.height}">
                  ${svgRects.join('\n')}
                </svg>`
              ),
              top: 0,
              left: 0
            }])
            .png()
            .toBuffer();

            // Step 3: Upload both image and mask
            const tempImagePath = `temp/outpaint-img-${sourceJobId}-${Date.now()}.png`;
            const tempMaskPath = `temp/outpaint-mask-${sourceJobId}-${Date.now()}.png`;

            const [imgUpload, maskUpload] = await Promise.all([
              supabase.storage.from('assets').upload(tempImagePath, containedBuffer, {
                contentType: 'image/png',
                upsert: true,
              }),
              supabase.storage.from('assets').upload(tempMaskPath, maskBuffer, {
                contentType: 'image/png',
                upsert: true,
              })
            ]);

            if (imgUpload.error) throw new Error(`Image upload failed: ${imgUpload.error.message}`);
            if (maskUpload.error) throw new Error(`Mask upload failed: ${maskUpload.error.message}`);

            const { data: { publicUrl: imageUrl } } = supabase.storage.from('assets').getPublicUrl(tempImagePath);
            const { data: { publicUrl: maskUrl } } = supabase.storage.from('assets').getPublicUrl(tempMaskPath);

            // Step 4: Use FLUX Fill Pro for intelligent outpainting
            console.log('Using FLUX Fill Pro to extend background naturally...');
            console.log(`Safe zones applied: top=${safeZone.top}px, right=${safeZone.right}px, bottom=${safeZone.bottom}px, left=${safeZone.left}px`);
            const output = await replicate.run('black-forest-labs/flux-fill-pro', {
              input: {
                prompt: 'CRITICAL: Only modify the white masked areas - DO NOT change any content in the black masked area. The black mask includes both the center content AND platform safe zones (where UI elements like profile pictures, buttons, captions will appear). The center content MUST remain 100% pixel-perfect identical to the original. Safe zones MUST remain completely clear and unobstructed for platform UI overlays. Only extend and expand the background scene into the white masked empty space. Continue the existing background environment naturally (blurred tropical scenery, palm trees, sunset/beach atmosphere). Match the exact same lighting, colors, blur level, and atmospheric style. Fill only the allowed empty areas with natural background continuation. Preserve all text, graphics, logos, and central content exactly as-is without any modifications whatsoever.',
                image: imageUrl,
                mask: maskUrl,
                steps: 25,
                guidance: 20, // Lower guidance for less creativity
                output_format: 'png',
                safety_tolerance: 6
              }
            });

            const generatedUrl = Array.isArray(output) ? output[0] : output;
            if (typeof generatedUrl !== 'string') throw new Error('Invalid output from FLUX Fill Pro');

            finalUrl = generatedUrl;
            permanentUrl = await uploadToStorage(finalUrl, sourceJobId, size);

            // Cleanup temp files
            await supabase.storage.from('assets').remove([tempImagePath, tempMaskPath]);
          }

          // Create job record
          const { data: newJob, error: insertError } = await supabase
            .from('generation_jobs')
            .insert({
              project_id: sourceJob.project_id,
              source_asset_id: sourceJob.source_asset_id,
              variation_index: sourceJob.variation_index,
              size_config: size,
              model_id: needsAIExtension ? 'flux-fill-pro' : 'smart-contain',
              prompt: sourceJob.prompt,
              hypothesis: sourceJob.hypothesis,
              negative_prompt: sourceJob.negative_prompt,
              variation_types: ['aspect-adapt'],
              status: 'completed',
              progress: 100,
              result: {
                url: permanentUrl,
                thumbnailUrl: permanentUrl,
                metadata: {
                  resizedFrom: sourceJobId,
                  method: needsAIExtension ? 'flux-fill-pro-outpaint' : 'contain-only',
                  usedAI: needsAIExtension,
                  preservesEntireImage: true,
                  safeZonesApplied: needsAIExtension && size.safeZone ? size.safeZone : undefined,
                  generatedAt: new Date().toISOString(),
                  attemptsRequired: attemptCount,
                },
              },
              completed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) throw new Error(`Job insert failed: ${insertError.message}`);
          return newJob;
        })
      );

      // Collect successful jobs
      const successfulJobs = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value);

      const failedCount = results.filter((r) => r.status === 'rejected').length;

      // Log any failures
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Failed to outpaint size ${i}:`, r.reason);
        }
      });

      console.log(`Resize completed: ${successfulJobs.length} succeeded, ${failedCount} failed`);
      console.log('Created job IDs:', successfulJobs.map(j => j.id));
      console.log('Project ID:', sourceJob.project_id);

      // Convert snake_case to camelCase for frontend compatibility
      const formattedJobs = successfulJobs.map(j => ({
        id: j.id,
        projectId: j.project_id,
        sourceAssetId: j.source_asset_id,
        variationIndex: j.variation_index,
        sizeConfig: j.size_config,
        modelId: j.model_id,
        prompt: j.prompt,
        hypothesis: j.hypothesis,
        negativePrompt: j.negative_prompt,
        variationTypes: j.variation_types,
        status: j.status,
        testStatus: j.test_status,
        progress: j.progress,
        result: j.result,
        error: j.error,
        createdAt: j.created_at,
        completedAt: j.completed_at,
      }));

      return res.status(201).json({
        jobs: formattedJobs,
        created: successfulJobs.length,
        failed: failedCount,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Resize API error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.toString(),
    });
  }
}
