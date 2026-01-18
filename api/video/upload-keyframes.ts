import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import multiparty from 'multiparty';
import { promises as fs } from 'fs';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

// Disable body parsing to handle multipart form data manually
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  const form = new multiparty.Form();

  try {
    // Parse multipart form data
    const { files } = await new Promise<{ files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ files });
      });
    });

    const firstFrameFile = files.firstFrame?.[0];
    const lastFrameFile = files.lastFrame?.[0];

    // Validate both files are present
    if (!firstFrameFile || !lastFrameFile) {
      return res.status(400).json({
        error: 'Both firstFrame and lastFrame images are required'
      });
    }

    // Validate MIME types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(firstFrameFile.headers['content-type']) ||
        !allowedTypes.includes(lastFrameFile.headers['content-type'])) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only JPG, PNG, and WebP images are allowed'
      });
    }

    // Validate file sizes (20MB max)
    const maxSize = 20 * 1024 * 1024;
    if (firstFrameFile.size > maxSize || lastFrameFile.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        message: 'Images must be under 20MB'
      });
    }

    // Upload first frame
    const firstFrameBuffer = await fs.readFile(firstFrameFile.path);
    const firstFrameExt = firstFrameFile.originalFilename.split('.').pop() || 'png';
    const firstFramePath = `video-keyframes/${Date.now()}-first-${Math.random().toString(36).substring(7)}.${firstFrameExt}`;

    const { error: firstError } = await supabase.storage
      .from('assets')
      .upload(firstFramePath, firstFrameBuffer, {
        contentType: firstFrameFile.headers['content-type'],
        upsert: false,
      });

    if (firstError) {
      console.error('First frame upload error:', firstError);
      throw firstError;
    }

    // Upload last frame
    const lastFrameBuffer = await fs.readFile(lastFrameFile.path);
    const lastFrameExt = lastFrameFile.originalFilename.split('.').pop() || 'png';
    const lastFramePath = `video-keyframes/${Date.now()}-last-${Math.random().toString(36).substring(7)}.${lastFrameExt}`;

    const { error: lastError } = await supabase.storage
      .from('assets')
      .upload(lastFramePath, lastFrameBuffer, {
        contentType: lastFrameFile.headers['content-type'],
        upsert: false,
      });

    if (lastError) {
      console.error('Last frame upload error:', lastError);
      throw lastError;
    }

    // Get public URLs
    const { data: firstUrl } = supabase.storage
      .from('assets')
      .getPublicUrl(firstFramePath);

    const { data: lastUrl } = supabase.storage
      .from('assets')
      .getPublicUrl(lastFramePath);

    // Clean up temp files
    try {
      await fs.unlink(firstFrameFile.path);
      await fs.unlink(lastFrameFile.path);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError);
    }

    return res.status(200).json({
      firstFrameUrl: firstUrl.publicUrl,
      lastFrameUrl: lastUrl.publicUrl,
    });

  } catch (error: any) {
    console.error('Upload keyframes error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message || error.toString()
    });
  }
}
