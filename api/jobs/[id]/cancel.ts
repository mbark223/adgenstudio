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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID required' });
  }

  try {
    if (req.method === 'POST') {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('generation_jobs')
        .update({ status: 'failed', error: 'Cancelled by user' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Job not found' });
        throw error;
      }

      return res.status(200).json({ id: data.id, status: data.status });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Cancel job API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
