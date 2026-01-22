import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getReplicate } from '../utils/replicate-client.js';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

interface VideoResizeRequest {
  sourceJobId: string;
  targetSizes: string[];
}

interface VideoSizePreset {
  platform: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
}

// Video size presets for social media platforms
function getVideoSizePresets(): VideoSizePreset[] {
  return [
    { platform: 'Instagram', name: 'Story/Reel', width: 1080, height: 1920, aspectRatio: '9:16' },
    { platform: 'Instagram', name: 'Feed Square', width: 1080, height: 1080, aspectRatio: '1:1' },
    { platform: 'Instagram', name: 'Feed Landscape', width: 1920, height: 1080, aspectRatio: '16:9' },
    { platform: 'TikTok', name: 'Vertical Video', width: 1080, height: 1920, aspectRatio: '9:16' },
    { platform: 'YouTube', name: 'Standard', width: 1920, height: 1080, aspectRatio: '16:9' },
    { platform: 'YouTube', name: 'Shorts', width: 1080, height: 1920, aspectRatio: '9:16' },
    { platform: 'Snapchat', name: 'Snap Ad', width: 1080, height: 1920, aspectRatio: '9:16' },
    { platform: 'Twitter', name: 'Standard', width: 1280, height: 720, aspectRatio: '16:9' },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sourceJobId, targetSizes } = req.body as VideoResizeRequest;

  // Validation
  if (!sourceJobId || !targetSizes || targetSizes.length === 0) {
    return res.status(400).json({ error: 'sourceJobId and targetSizes required' });
  }

  // Rate limiting
  const MAX_CONCURRENT_RESIZES = 5;
  if (targetSizes.length > MAX_CONCURRENT_RESIZES) {
    return res.status(400).json({
      error: `Maximum ${MAX_CONCURRENT_RESIZES} sizes per request`,
    });
  }

  const supabase = getSupabase();

  try {
    // 1. Fetch source video job
    const { data: sourceJob, error: fetchError } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', sourceJobId)
      .single();

    if (fetchError || !sourceJob) {
      console.error('Source video not found:', fetchError);
      return res.status(404).json({ error: 'Source video not found' });
    }

    if (sourceJob.status !== 'completed' || !sourceJob.video_url) {
      return res.status(400).json({ error: 'Source video not completed' });
    }

    // 2. Get target size presets
    const sizePresets = getVideoSizePresets();
    const targetSizeObjs = targetSizes
      .map(name => sizePresets.find(s => s.name === name))
      .filter((s): s is VideoSizePreset => s !== undefined);

    if (targetSizeObjs.length === 0) {
      return res.status(400).json({ error: 'No valid target sizes found' });
    }

    console.log(`Starting ${targetSizeObjs.length} video resize jobs for source ${sourceJobId}`);

    // 3. Process each resize in parallel
    const resizePromises = targetSizeObjs.map(async (targetSize) => {
      try {
        // Call Luma Reframe Video model on Replicate
        const replicate = getReplicate();

        console.log(`Creating resize job: ${targetSize.platform} ${targetSize.name} (${targetSize.aspectRatio})`);

        const prediction = await replicate.predictions.create({
          model: "luma/reframe-video",
          input: {
            video_url: sourceJob.video_url,
            aspect_ratio: targetSize.aspectRatio,
            prompt: sourceJob.prompt || 'Intelligently reframe video to new aspect ratio',
          },
        });

        console.log(`Replicate prediction created: ${prediction.id} for ${targetSize.name}`);

        // Create database job record
        const { data: newJob, error: jobError } = await supabase
          .from('video_jobs')
          .insert({
            job_id: prediction.id,
            first_frame_url: sourceJob.first_frame_url,
            last_frame_url: sourceJob.last_frame_url,
            prompt: sourceJob.prompt,
            duration: sourceJob.duration,
            aspect_ratio: targetSize.aspectRatio,
            status: 'processing',
            created_at: new Date().toISOString(),
            resized_from: sourceJobId,
            target_platform: targetSize.platform,
            target_size_name: targetSize.name,
            resize_method: 'ai_reframe',
          })
          .select()
          .single();

        if (jobError) {
          console.error('Database error creating job:', jobError);
          throw jobError;
        }

        console.log(`Database job created: ${newJob.id} for ${targetSize.name}`);

        return { success: true, job: newJob };

      } catch (error: any) {
        console.error(`Resize failed for ${targetSize.name}:`, error);
        return {
          success: false,
          error: error.message || error.toString(),
          size: targetSize.name
        };
      }
    });

    const results = await Promise.allSettled(resizePromises);

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<{ success: true; job: any }> =>
        r.status === 'fulfilled' && r.value.success
      )
      .map(r => r.value.job);

    const failed = results.filter(r =>
      r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    );

    console.log(`Resize jobs completed: ${succeeded.length} succeeded, ${failed.length} failed`);

    return res.status(202).json({
      message: 'Video resize jobs started',
      created: succeeded.length,
      failed: failed.length,
      jobs: succeeded,
    });

  } catch (error: any) {
    console.error('Video resize error:', error);
    return res.status(500).json({
      error: 'Video resize failed',
      details: error.message || error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
