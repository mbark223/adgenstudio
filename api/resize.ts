import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Vercel function config - extend timeout for batch resizing
export const config = {
  maxDuration: 60,
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
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

      // Fetch the source image
      const imageResponse = await fetch(sourceJob.result.url);
      if (!imageResponse.ok) {
        return res.status(500).json({ error: 'Failed to fetch source image' });
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Process each target size in parallel
      const results = await Promise.allSettled(
        targetSizes.map(async (size) => {
          // Resize with sharp - use contain to preserve entire image with padding
          const resizedBuffer = await sharp(imageBuffer)
            .resize(size.width, size.height, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .png()
            .toBuffer();

          // Upload to Supabase storage
          const filePath = `generated/resize-${sourceJobId}-${size.width}x${size.height}-${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, resizedBuffer, {
              contentType: 'image/png',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('assets')
            .getPublicUrl(filePath);

          // Create new job record as already completed
          const { data: newJob, error: insertError } = await supabase
            .from('generation_jobs')
            .insert({
              project_id: sourceJob.project_id,
              source_asset_id: sourceJob.source_asset_id,
              variation_index: sourceJob.variation_index,
              size_config: size,
              model_id: sourceJob.model_id,
              prompt: sourceJob.prompt,
              hypothesis: sourceJob.hypothesis,
              negative_prompt: sourceJob.negative_prompt,
              variation_types: ['aspect-adapt'],
              status: 'completed',
              progress: 100,
              result: {
                url: publicUrl,
                thumbnailUrl: publicUrl,
                metadata: {
                  resizedFrom: sourceJobId,
                  generatedAt: new Date().toISOString(),
                },
              },
              completed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Job insert failed: ${insertError.message}`);
          }

          return newJob;
        })
      );

      // Collect successful jobs
      const successfulJobs = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value);

      const failedCount = results.filter((r) => r.status === 'rejected').length;

      return res.status(201).json({
        jobs: successfulJobs,
        created: successfulJobs.length,
        failed: failedCount,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Resize API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
