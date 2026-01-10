import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Sample placeholder images for demo
const sampleImages = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800&h=800&fit=crop",
];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(`Missing env vars: SUPABASE_URL=${!!url}, SUPABASE_SERVICE_KEY=${!!key}`);
  }
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('assets')
        .insert({
          filename: 'uploaded_asset.png',
          type: 'image',
          mime_type: 'image/png',
          size: 1024 * 500,
          width: 1920,
          height: 1080,
          url: sampleImages[0],
          thumbnail_url: sampleImages[0],
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const asset = {
        id: data.id,
        filename: data.filename,
        type: data.type,
        mimeType: data.mime_type,
        size: data.size,
        width: data.width,
        height: data.height,
        duration: data.duration,
        url: data.url,
        thumbnailUrl: data.thumbnail_url,
      };

      return res.status(201).json(asset);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Upload API error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.toString()
    });
  }
}
