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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projects = data?.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sourceAsset: p.source_asset,
        variationCount: p.variation_count,
        selectedVariationTypes: p.selected_variation_types,
        selectedSizes: p.selected_sizes,
        selectedModelId: p.selected_model_id,
        prompt: p.prompt,
        negativePrompt: p.negative_prompt,
        namingConvention: p.naming_convention,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      return res.status(200).json(projects);
    }

    if (req.method === 'POST') {
      const body = req.body;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: body.name || 'Untitled Project',
          description: body.description,
          source_asset: body.sourceAsset,
          variation_count: body.variationCount || 5,
          selected_variation_types: body.selectedVariationTypes || [],
          selected_sizes: body.selectedSizes || [],
          selected_model_id: body.selectedModelId || 'stability-sd3',
          prompt: body.prompt || '',
          negative_prompt: body.negativePrompt,
          naming_convention: body.namingConvention,
        })
        .select()
        .single();

      if (error) throw error;

      const project = {
        id: data.id,
        name: data.name,
        description: data.description,
        sourceAsset: data.source_asset,
        variationCount: data.variation_count,
        selectedVariationTypes: data.selected_variation_types,
        selectedSizes: data.selected_sizes,
        selectedModelId: data.selected_model_id,
        prompt: data.prompt,
        negativePrompt: data.negative_prompt,
        namingConvention: data.naming_convention,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return res.status(201).json(project);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Projects API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
