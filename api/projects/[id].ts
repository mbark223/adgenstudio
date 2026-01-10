import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Project not found' });
        }
        throw error;
      }

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

      return res.status(200).json(project);
    }

    if (req.method === 'PATCH') {
      const body = req.body;
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.sourceAsset !== undefined) updates.source_asset = body.sourceAsset;
      if (body.variationCount !== undefined) updates.variation_count = body.variationCount;
      if (body.selectedVariationTypes !== undefined) updates.selected_variation_types = body.selectedVariationTypes;
      if (body.selectedSizes !== undefined) updates.selected_sizes = body.selectedSizes;
      if (body.selectedModelId !== undefined) updates.selected_model_id = body.selectedModelId;
      if (body.prompt !== undefined) updates.prompt = body.prompt;
      if (body.negativePrompt !== undefined) updates.negative_prompt = body.negativePrompt;
      if (body.namingConvention !== undefined) updates.naming_convention = body.namingConvention;

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Project not found' });
        }
        throw error;
      }

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

      return res.status(200).json(project);
    }

    if (req.method === 'DELETE') {
      // Delete related variations and jobs first
      await supabase.from('variations').delete().eq('project_id', id);
      await supabase.from('generation_jobs').delete().eq('project_id', id);

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Project API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
