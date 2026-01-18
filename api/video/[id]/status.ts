import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getReplicate } from '../../utils/replicate-client.js';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  const supabase = getSupabase();

  try {
    // Get job from database
    const { data: job, error: dbError } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (dbError || !job) {
      console.error('Database error or job not found:', dbError);
      return res.status(404).json({
        error: 'Job not found',
        details: dbError?.message
      });
    }

    // If already completed or failed, return cached result
    if (job.status === 'completed') {
      return res.status(200).json({
        status: 'completed',
        videoUrl: job.video_url,
        thumbnailUrl: job.thumbnail_url,
        progress: 100,
      });
    }

    if (job.status === 'failed') {
      return res.status(200).json({
        status: 'failed',
        error: job.error_message || 'Video generation failed',
        progress: 0,
      });
    }

    // For processing jobs, poll Replicate for status
    try {
      const replicate = getReplicate();
      const prediction = await replicate.predictions.get(job.job_id);

      console.log('Replicate prediction status:', prediction.status);

      if (prediction.status === 'succeeded') {
        // Video generation completed
        const videoUrl = prediction.output;

        // Update database
        await supabase
          .from('video_jobs')
          .update({
            status: 'completed',
            video_url: videoUrl,
            progress: 100,
            completed_at: new Date().toISOString(),
          })
          .eq('id', id);

        return res.status(200).json({
          status: 'completed',
          videoUrl: videoUrl,
          progress: 100,
        });
      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        // Generation failed or was canceled
        const errorMessage = prediction.error || 'Video generation failed';

        await supabase
          .from('video_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', id);

        return res.status(200).json({
          status: 'failed',
          error: errorMessage,
          progress: 0,
        });
      } else {
        // Still processing (starting, processing, or queued)
        // Calculate rough progress based on elapsed time
        const elapsed = Date.now() - new Date(job.created_at).getTime();
        const estimatedTotalTime = (job.duration || 5) * 30000; // ~30 seconds per video second
        const estimatedProgress = Math.min(95, Math.round((elapsed / estimatedTotalTime) * 100));

        // Update progress in database
        await supabase
          .from('video_jobs')
          .update({ progress: estimatedProgress })
          .eq('id', id);

        return res.status(200).json({
          status: 'processing',
          progress: estimatedProgress,
          message: 'Video generation in progress',
        });
      }

    } catch (replicateError: any) {
      console.error('Replicate polling error:', replicateError);

      // If polling fails, still return processing status
      // rather than failing the whole request
      return res.status(200).json({
        status: 'processing',
        progress: job.progress || 0,
        message: 'Checking generation status...',
      });
    }

  } catch (error: any) {
    console.error('Status check error:', error);
    return res.status(500).json({
      error: 'Failed to check status',
      details: error.message || error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
