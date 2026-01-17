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
            // Large difference - use AI to extend background
            console.log('Large aspect ratio difference, using AI background extension...');

            // Step 1: Contain the image (preserves all content)
            const containedBuffer = await image
              .resize(size.width, size.height, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 1 },
                kernel: 'lanczos3'
              })
              .png()
              .toBuffer();

            // Step 2: Upload contained version as temp input for AI
            const tempPath = `temp/contained-${sourceJobId}-${Date.now()}.png`;
            const { error: tempUploadError } = await supabase.storage
              .from('assets')
              .upload(tempPath, containedBuffer, {
                contentType: 'image/png',
                upsert: true,
              });

            if (tempUploadError) throw new Error(`Temp upload failed: ${tempUploadError.message}`);

            const { data: { publicUrl: containedUrl } } = supabase.storage
              .from('assets')
              .getPublicUrl(tempPath);

            // Step 3: Use AI to extend the background into black areas
            console.log('Using AI to extend background naturally...');
            const output = await replicate.run('stability-ai/stable-diffusion-3', {
              input: {
                prompt: 'seamlessly extend and continue the existing background scene, naturally expand the environment, match the exact colors lighting and style, fill empty black areas with natural background extension, maintain the exact same atmosphere and mood',
                image: containedUrl,
                prompt_strength: 0.15, // Very low - just extend background, don't change content
                negative_prompt: 'new objects, altered content, changed composition, different colors, modified lighting, added elements, black bars, solid black areas, empty space, padding',
                aspect_ratio: aspectRatio,
                output_format: 'png',
              }
            });

            const generatedUrl = Array.isArray(output) ? output[0] as string : output as string;
            finalUrl = generatedUrl;
            permanentUrl = await uploadToStorage(finalUrl, sourceJobId, size);

            // Cleanup temp file
            await supabase.storage.from('assets').remove([tempPath]);
          }

          // Create job record
          const { data: newJob, error: insertError } = await supabase
            .from('generation_jobs')
            .insert({
              project_id: sourceJob.project_id,
              source_asset_id: sourceJob.source_asset_id,
              variation_index: sourceJob.variation_index,
              size_config: size,
              model_id: needsAIExtension ? 'stability-sd3-extension' : 'smart-contain',
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
                  method: needsAIExtension ? 'contain-then-ai-extend' : 'contain-only',
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
