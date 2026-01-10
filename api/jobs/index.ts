import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const projectId = req.query.projectId as string;

      if (!projectId) {
        return res.status(200).json([]);
      }

      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const jobs = data?.map(j => ({
        id: j.id,
        projectId: j.project_id,
        sourceAssetId: j.source_asset_id,
        variationIndex: j.variation_index,
        sizeConfig: j.size_config,
        modelId: j.model_id,
        prompt: j.prompt,
        negativePrompt: j.negative_prompt,
        variationTypes: j.variation_types,
        status: j.status,
        progress: j.progress,
        result: j.result,
        error: j.error,
        createdAt: j.created_at,
        completedAt: j.completed_at,
      }));

      return res.status(200).json(jobs);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Jobs API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
