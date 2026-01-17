import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import sharp from 'sharp';
import type { SafeZone } from '@shared/schema';
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

// Build prompt for Luma Reframe with safe zone guidance
function buildReframePrompt(safeZone?: SafeZone): string {
  if (!safeZone) {
    return 'Professional advertisement image. Preserve center content pixel-perfect. Extend background naturally to fill frame. Match exact lighting, colors, and style.';
  }

  const constraints = [];
  if (safeZone.top > 0) {
    constraints.push(`keep top ${safeZone.top}px area clear for platform UI elements`);
  }
  if (safeZone.bottom > 0) {
    constraints.push(`keep bottom ${safeZone.bottom}px area clear for platform UI elements`);
  }

  const safeZoneGuidance = constraints.length > 0
    ? ` IMPORTANT: ${constraints.join(', ')}.`
    : '';

  return `Professional advertisement image. Preserve center content exactly as-is with all text, graphics, and logos unchanged.${safeZoneGuidance} Extend background naturally to fill frame. Match exact lighting, colors, and atmospheric style.`;
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

      // Get max variation index for this project to assign unique indices to resized variations
      const { data: existingVariations, error: maxIndexError } = await supabase
        .from('variations')
        .select('variation_index')
        .eq('project_id', sourceJob.project_id)
        .order('variation_index', { ascending: false })
        .limit(1);

      if (maxIndexError) {
        console.error('Failed to get max variation index:', maxIndexError);
      }

      let nextVariationIndex = (existingVariations && existingVariations.length > 0)
        ? existingVariations[0].variation_index + 1
        : 0;

      console.log(`Next available variation_index: ${nextVariationIndex}`);

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
            // Large difference - use Luma Reframe for intelligent aspect ratio adaptation
            console.log('Large aspect ratio difference, using Luma Reframe...');

            const safeZone = size.safeZone || { top: 0, right: 0, bottom: 0, left: 0 };
            console.log(`Safe zones: top=${safeZone.top}px, right=${safeZone.right}px, bottom=${safeZone.bottom}px, left=${safeZone.left}px`);

            const reframePrompt = buildReframePrompt(size.safeZone);
            console.log('Luma Reframe input:', {
              image: sourceImageUrl,
              aspect_ratio: aspectRatio,
              prompt: reframePrompt,
              model: 'photon-flash-1'
            });

            // Call Luma Reframe
            try {
              const output = await replicate.run('luma/reframe-image', {
                input: {
                  image: sourceImageUrl,  // Use source URL directly
                  aspect_ratio: aspectRatio,
                  prompt: reframePrompt,
                  model: 'photon-flash-1',  // Faster variant
                }
              });

              console.log('Luma Reframe output type:', typeof output);
              console.log('Luma Reframe output:', JSON.stringify(output, null, 2));

              // Handle different output formats
              let generatedUrl: string;

              if (typeof output === 'string') {
                // Direct URL string
                generatedUrl = output;
              } else if (Array.isArray(output)) {
                // Array of URLs
                generatedUrl = output[0];
              } else if (output && typeof output === 'object') {
                // Prediction object with output property
                const outputObj = output as any;
                if (typeof outputObj.output === 'string') {
                  generatedUrl = outputObj.output;
                } else if (Array.isArray(outputObj.output)) {
                  generatedUrl = outputObj.output[0];
                } else if (outputObj.url) {
                  // Sometimes models return {url: "..."}
                  generatedUrl = outputObj.url;
                } else {
                  throw new Error(`Invalid Luma Reframe output structure: ${JSON.stringify(output)}`);
                }
              } else {
                throw new Error(`Invalid output from Luma Reframe: ${typeof output}`);
              }

              if (!generatedUrl || typeof generatedUrl !== 'string') {
                throw new Error(`Failed to extract URL from Luma Reframe output: ${generatedUrl}`);
              }

              console.log('Extracted URL:', generatedUrl);

              // Download Luma's reframed image
              const lumaResponse = await fetch(generatedUrl);
              if (!lumaResponse.ok) throw new Error('Failed to fetch Luma output');
              const lumaBuffer = Buffer.from(await lumaResponse.arrayBuffer());

              // Composite original disclaimer area on top to preserve legal text
              console.log('Compositing original disclaimer area...');

              // Calculate where disclaimer area should be in the new size
              // Assume disclaimer is bottom 15% of original image
              const disclaimerHeightPercent = 0.15;
              const originalDisclaimerHeight = Math.round(sourceHeight * disclaimerHeightPercent);

              // Extract disclaimer from original image
              const disclaimerBuffer = await sharp(sourceBuffer)
                .extract({
                  left: 0,
                  top: sourceHeight - originalDisclaimerHeight,
                  width: sourceWidth,
                  height: originalDisclaimerHeight
                })
                .resize(size.width, Math.round(size.height * disclaimerHeightPercent), {
                  fit: 'fill',
                  kernel: 'lanczos3'
                })
                .toBuffer();

              // Composite disclaimer onto Luma output at bottom
              const finalBuffer = await sharp(lumaBuffer)
                .composite([{
                  input: disclaimerBuffer,
                  top: size.height - Math.round(size.height * disclaimerHeightPercent),
                  left: 0
                }])
                .png()
                .toBuffer();

              // Upload final composited image
              const compositePath = `resized/${sourceJobId}-${size.width}x${size.height}-${Date.now()}.png`;
              const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(compositePath, finalBuffer, {
                  contentType: 'image/png',
                  upsert: true
                });

              if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

              const { data: { publicUrl: compositeUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(compositePath);

              finalUrl = compositeUrl;
              permanentUrl = finalUrl;
              console.log('Composited and uploaded to storage:', permanentUrl);
            } catch (reframeError: any) {
              console.error('Luma Reframe error:', reframeError);
              console.error('Luma error message:', reframeError?.message);
              console.error('Luma error details:', JSON.stringify(reframeError, null, 2));
              throw new Error(`Luma Reframe failed: ${reframeError.message || reframeError.toString()}`);
            }
          }

          // Assign unique variation index for this resized variation
          const thisVariationIndex = nextVariationIndex++;

          // Create job record
          const { data: newJob, error: insertError } = await supabase
            .from('generation_jobs')
            .insert({
              project_id: sourceJob.project_id,
              source_asset_id: sourceJob.source_asset_id,
              variation_index: thisVariationIndex,
              size_config: size,
              model_id: needsAIExtension ? 'luma-reframe' : 'smart-contain',
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
                  method: needsAIExtension ? 'luma-reframe-hybrid' : 'contain-only',
                  usedAI: needsAIExtension,
                  preservesEntireImage: true,
                  disclaimerPreserved: needsAIExtension, // Bottom 15% composited from original
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

          console.log(`Creating variation record for job ${newJob.id} with variation_index ${thisVariationIndex}...`);

          // Create variation record so it appears in main variations grid
          const { data: variationData, error: variationError } = await supabase
            .from('variations')
            .insert({
              project_id: sourceJob.project_id,
              job_id: newJob.id,
              source_asset_id: sourceJob.source_asset_id,
              variation_index: thisVariationIndex,
              size_config: size,
              model_id: needsAIExtension ? 'luma-reframe' : 'smart-contain',
              prompt: sourceJob.prompt,
              hypothesis: sourceJob.hypothesis,
              url: permanentUrl,
              thumbnail_url: permanentUrl,
              type: 'image',
              selected: false,
            })
            .select()
            .single();

          if (variationError) {
            console.error('Failed to create variation record:', variationError);
            console.error('Variation error details:', JSON.stringify(variationError, null, 2));
            // Continue - job creation succeeded, variation is secondary
          } else {
            console.log(`Variation created successfully: ${variationData?.id} with index ${thisVariationIndex}`);
          }

          return newJob;
        })
      );

      // Collect successful jobs
      const successfulJobs = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value);

      const failedCount = results.filter((r) => r.status === 'rejected').length;

      // Log any failures with detailed error info
      const failedResults = results
        .map((r, i) => ({ result: r, index: i }))
        .filter(({ result }) => result.status === 'rejected');

      failedResults.forEach(({ result, index }) => {
        console.error(`Failed to resize size ${index}:`, result.reason);
        console.error('Error message:', result.reason?.message || 'Unknown error');
        console.error('Error stack:', result.reason?.stack || 'No stack trace');
      });

      console.log(`Resize completed: ${successfulJobs.length} succeeded, ${failedCount} failed`);
      console.log('Created job IDs:', successfulJobs.map(j => j.id));
      console.log('Project ID:', sourceJob.project_id);

      // If all failed, return detailed error
      if (successfulJobs.length === 0 && failedCount > 0) {
        const firstError = failedResults[0]?.result.reason;
        console.error('All resizes failed. First error:', firstError);
        return res.status(500).json({
          error: 'All resize operations failed',
          details: firstError?.message || firstError?.toString() || 'Unknown error',
          failedCount
        });
      }

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
