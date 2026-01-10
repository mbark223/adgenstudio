import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../lib/supabase';

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
      const { data, error } = await supabase
        .from('generation_jobs')
        .update({ status: 'failed', error: 'Cancelled by user' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Job not found' });
        }
        throw error;
      }

      const job = {
        id: data.id,
        projectId: data.project_id,
        status: data.status,
        error: data.error,
      };

      return res.status(200).json(job);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Cancel job API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
