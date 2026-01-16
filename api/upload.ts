import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

// Simple multipart form data parser
async function parseMultipartForm(req: VercelRequest): Promise<{ file: Buffer; filename: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      const boundary = contentType.split('boundary=')[1];

      if (!boundary) {
        reject(new Error('No boundary found in content-type'));
        return;
      }

      const parts = buffer.toString('binary').split(`--${boundary}`);

      for (const part of parts) {
        if (part.includes('filename=')) {
          // Extract filename
          const filenameMatch = part.match(/filename="([^"]+)"/);
          const filename = filenameMatch ? filenameMatch[1] : 'upload';

          // Extract content type
          const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
          const mimeType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

          // Extract file content (after double CRLF)
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            let fileContent = part.slice(headerEnd + 4);
            // Remove trailing boundary markers
            if (fileContent.endsWith('\r\n')) {
              fileContent = fileContent.slice(0, -2);
            }

            resolve({
              file: Buffer.from(fileContent, 'binary'),
              filename,
              mimeType,
            });
            return;
          }
        }
      }

      reject(new Error('No file found in form data'));
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const supabase = getSupabase();

      // Parse multipart form data
      const { file, filename, mimeType } = await parseMultipartForm(req);

      // Validate MIME type
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
      const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: `Only JPG, PNG, WebP images and MP4, MOV, WebM videos are allowed. Received: ${mimeType}`
        });
      }

      // Validate file size
      const isVideo = mimeType.startsWith('video/');
      const maxSize = isVideo ? 500 * 1024 * 1024 : 20 * 1024 * 1024; // 500MB for videos, 20MB for images

      if (file.length > maxSize) {
        const maxSizeMB = isVideo ? 500 : 20;
        const actualSizeMB = (file.length / (1024 * 1024)).toFixed(2);
        return res.status(400).json({
          error: 'File too large',
          message: `${isVideo ? 'Videos' : 'Images'} must be under ${maxSizeMB}MB. Your file is ${actualSizeMB}MB`
        });
      }

      // Generate unique filename
      const ext = filename.split('.').pop() || 'png';
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `uploads/${uniqueFilename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Determine asset type
      const isVideo = mimeType.startsWith('video/');
      const assetType = isVideo ? 'video' : 'image';

      // Save asset record to database
      // Note: width/height are placeholder values. For accurate video metadata,
      // would need to use ffprobe or similar tool to extract actual dimensions and duration
      const { data, error } = await supabase
        .from('assets')
        .insert({
          filename: filename,
          type: assetType,
          mime_type: mimeType,
          size: file.length,
          width: isVideo ? null : 1920,  // Videos need metadata extraction
          height: isVideo ? null : 1080,  // Videos need metadata extraction
          url: publicUrl,
          thumbnail_url: publicUrl,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
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
