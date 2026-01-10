import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../lib/supabase';

// Sample variation images
const sampleImages = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?w=800&h=800&fit=crop",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID required' });
  }

  try {
    if (req.method === 'POST') {
      // Reset job to queued
      const { data: job, error: fetchError } = await supabase
        .from('generation_jobs')
        .update({ status: 'queued', progress: 0, error: null })
        .eq('id', id)
        .select()
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Job not found' });
        }
        throw fetchError;
      }

      // Simulate the job again
      await simulateJob(id, job.project_id);

      // Fetch updated job
      const { data: updatedJob } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('id', id)
        .single();

      const result = {
        id: updatedJob.id,
        projectId: updatedJob.project_id,
        status: updatedJob.status,
        progress: updatedJob.progress,
        result: updatedJob.result,
      };

      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Retry job API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function simulateJob(jobId: string, projectId: string) {
  try {
    await supabase
      .from('generation_jobs')
      .update({ status: 'processing', progress: 50 })
      .eq('id', jobId);

    const { data: job } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) return;

    const imageIndex = Math.floor(Math.random() * sampleImages.length);
    const url = sampleImages[imageIndex];

    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result: {
          url,
          thumbnailUrl: url,
          metadata: { generatedAt: new Date().toISOString() },
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Create variation
    await supabase
      .from('variations')
      .insert({
        project_id: projectId,
        job_id: jobId,
        source_asset_id: job.source_asset_id,
        variation_index: job.variation_index,
        size_config: job.size_config,
        model_id: job.model_id,
        prompt: job.prompt,
        url: url,
        thumbnail_url: url,
        type: 'image',
        selected: false,
      });
  } catch (error) {
    console.error('Job simulation error:', error);
    await supabase
      .from('generation_jobs')
      .update({ status: 'failed', error: 'Retry simulation failed' })
      .eq('id', jobId);
  }
}
