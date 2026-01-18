import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getReplicate } from '../utils/replicate-client.js';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

interface GenerateRequest {
  firstFrameUrl: string;
  lastFrameUrl: string;
  prompt?: string;
  duration?: number; // 4, 6, or 8 seconds (default 6)
  aspectRatio?: '16:9' | '9:16';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    firstFrameUrl,
    lastFrameUrl,
    prompt,
    duration = 6,
    aspectRatio = '16:9'
  } = req.body as GenerateRequest;

  if (!firstFrameUrl || !lastFrameUrl) {
    return res.status(400).json({
      error: 'First and last frame URLs are required'
    });
  }

  const supabase = getSupabase();

  try {
    const replicate = getReplicate();
    const generationPrompt = prompt || 'Generate a smooth video transition between the provided keyframes';

    console.log('Starting video generation with Veo 3.1 via Replicate...');

    // Start video generation with Replicate's Veo 3.1 model
    // Using predictions.create() for async execution with polling
    const prediction = await replicate.predictions.create({
      model: "google/veo-3.1",
      input: {
        image: firstFrameUrl,           // First frame (Replicate calls this "image")
        last_frame: lastFrameUrl,       // Last frame for interpolation
        prompt: generationPrompt,       // Video description
        duration: duration,             // 4, 6, or 8 seconds
        aspect_ratio: aspectRatio,      // "16:9" or "9:16"
        resolution: "1080p",            // High quality output
        generate_audio: true,           // Generate synchronized audio
      },
    });

    console.log('Replicate prediction created:', prediction.id);

    // Store job in database with Replicate prediction ID
    const { data: job, error: dbError } = await supabase
      .from('video_jobs')
      .insert({
        job_id: prediction.id,
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        prompt: generationPrompt,
        duration: duration,
        aspect_ratio: aspectRatio,
        status: 'processing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Video generation job created:', job.id);

    return res.status(202).json({
      jobId: job.id,
      status: 'processing',
      message: 'Video generation started. Poll /api/video/[id]/status for updates.',
    });

  } catch (error: any) {
    console.error('Video generation error:', error);

    // Log detailed error for debugging
    if (error.response) {
      console.error('API Response error:', {
        status: error.response.status,
        data: error.response.data,
      });
    }

    return res.status(500).json({
      error: 'Video generation failed',
      details: error.message || error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
