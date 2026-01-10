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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const supabase = getSupabase();
      const { projectId, sourceAssetId, variationCount, variationTypes, sizes, modelId, prompt, negativePrompt } = req.body;

      let actualProjectId = projectId;

      // Get the source asset URL if provided
      let sourceAssetUrl = null;
      if (sourceAssetId) {
        const { data: assetData } = await supabase
          .from('assets')
          .select('url')
          .eq('id', sourceAssetId)
          .single();

        if (assetData) {
          sourceAssetUrl = assetData.url;
        }
      }

      // Create project if not provided
      if (!actualProjectId) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: 'Untitled Project',
            variation_count: variationCount,
            selected_variation_types: variationTypes,
            selected_sizes: sizes,
            selected_model_id: modelId,
            prompt: prompt || '',
            negative_prompt: negativePrompt,
          })
          .select()
          .single();

        if (projectError) throw projectError;
        actualProjectId = projectData.id;
      }

      // Create generation jobs
      const jobsToInsert = [];
      for (let v = 0; v < variationCount; v++) {
        for (const size of sizes) {
          jobsToInsert.push({
            project_id: actualProjectId,
            source_asset_id: sourceAssetId || '',
            variation_index: v,
            size_config: size,
            model_id: modelId,
            prompt: prompt || '',
            negative_prompt: negativePrompt,
            variation_types: variationTypes,
            status: 'queued',
            progress: 0,
          });
        }
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from('generation_jobs')
        .insert(jobsToInsert)
        .select();

      if (jobsError) throw jobsError;

      // Use the source asset URL for variations (since we don't have real AI generation yet)
      // In production, this would call an actual AI image generation API
      const variationUrl = sourceAssetUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop';

      // Complete jobs with the source asset as the "generated" variation
      for (const job of jobsData) {
        await supabase
          .from('generation_jobs')
          .update({
            status: 'completed',
            progress: 100,
            result: {
              url: variationUrl,
              thumbnailUrl: variationUrl,
              metadata: { generatedAt: new Date().toISOString() }
            },
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        await supabase.from('variations').insert({
          project_id: actualProjectId,
          job_id: job.id,
          source_asset_id: job.source_asset_id,
          variation_index: job.variation_index,
          size_config: job.size_config,
          model_id: job.model_id,
          prompt: job.prompt,
          url: variationUrl,
          thumbnail_url: variationUrl,
          type: 'image',
          selected: false,
        });
      }

      const jobs = jobsData.map(j => ({
        id: j.id,
        projectId: j.project_id,
        status: 'completed',
        progress: 100,
      }));

      return res.status(201).json({ projectId: actualProjectId, jobs });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Generate API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
