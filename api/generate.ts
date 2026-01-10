import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

// Sample variation images
const sampleImages = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=800&fit=crop",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const {
        projectId,
        sourceAssetId,
        variationCount,
        variationTypes,
        sizes,
        modelId,
        prompt,
        negativePrompt,
      } = req.body;

      let actualProjectId = projectId;

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

      // Simulate generation immediately (simplified for serverless)
      // In production, you'd use a background job queue
      for (const job of jobsData) {
        await simulateJob(job.id, actualProjectId);
      }

      const jobs = jobsData.map(j => ({
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
        createdAt: j.created_at,
      }));

      return res.status(201).json({ projectId: actualProjectId, jobs });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Generate API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function simulateJob(jobId: string, projectId: string) {
  try {
    // Update to processing
    await supabase
      .from('generation_jobs')
      .update({ status: 'processing', progress: 50 })
      .eq('id', jobId);

    // Get job details
    const { data: job } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) return;

    // Complete with result
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

    // Create variation from completed job
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
      .update({ status: 'failed', error: 'Simulation failed' })
      .eq('id', jobId);
  }
}
