import type { VercelRequest, VercelResponse } from '@vercel/node';
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

  try {
    if (req.method === 'GET') {
      const projectId = req.query.projectId as string;
      if (!projectId) return res.status(200).json([]);

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('variations')
        .select('*')
        .eq('project_id', projectId)
        .order('variation_index', { ascending: true });

      if (error) throw error;

      const variations = data?.map(v => ({
        id: v.id,
        projectId: v.project_id,
        jobId: v.job_id,
        sourceAssetId: v.source_asset_id,
        variationIndex: v.variation_index,
        sizeConfig: v.size_config,
        modelId: v.model_id,
        prompt: v.prompt,
        url: v.url,
        thumbnailUrl: v.thumbnail_url,
        type: v.type,
        selected: v.selected,
        createdAt: v.created_at,
      }));

      return res.status(200).json(variations);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Variations API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
