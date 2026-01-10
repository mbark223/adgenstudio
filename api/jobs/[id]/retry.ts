import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const sampleImages = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800&h=800&fit=crop",
];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID required' });
  }

  try {
    if (req.method === 'POST') {
      const supabase = getSupabase();

      // Get job details
      const { data: job, error: fetchError } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Complete with result
      const imageIndex = Math.floor(Math.random() * sampleImages.length);
      const url = sampleImages[imageIndex];

      await supabase
        .from('generation_jobs')
        .update({
          status: 'completed',
          progress: 100,
          error: null,
          result: { url, thumbnailUrl: url, metadata: { generatedAt: new Date().toISOString() } },
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Create variation
      await supabase.from('variations').insert({
        project_id: job.project_id,
        job_id: id,
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

      return res.status(200).json({ id, status: 'completed', progress: 100 });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Retry job API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
