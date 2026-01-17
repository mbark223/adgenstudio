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

            // Step 2: Create mask - white where we need to fill (black bars), black where to preserve (center content)
            // Calculate the preserved area dimensions
            const scaleFactorWidth = size.width / sourceWidth;
            const scaleFactorHeight = size.height / sourceHeight;
            const scaleFactor = Math.min(scaleFactorWidth, scaleFactorHeight);
            const scaledWidth = Math.round(sourceWidth * scaleFactor);
            const scaledHeight = Math.round(sourceHeight * scaleFactor);
            const offsetX = Math.round((size.width - scaledWidth) / 2);
            const offsetY = Math.round((size.height - scaledHeight) / 2);

            // Create mask: start with white (255 = fill all), then draw black rectangle where content is (0 = preserve)
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
                  <rect x="${offsetX}" y="${offsetY}" width="${scaledWidth}" height="${scaledHeight}" fill="black"/>
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
            const output = await replicate.run('black-forest-labs/flux-fill-pro', {
              input: {
                prompt: 'Seamlessly extend and expand the existing background scene. Continue the environment naturally to fill the empty space. Match the exact lighting, colors, style, and atmosphere. Maintain perfect continuity with the original scene.',
                image: imageUrl,
                mask: maskUrl,
                steps: 30,
                guidance: 30,
                output_format: 'png',
                safety_tolerance: 5
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

      return res.status(201).json({
        jobs: successfulJobs,
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
