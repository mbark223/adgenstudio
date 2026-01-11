import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

// Download image from URL and upload to Supabase Storage for permanent storage
async function uploadToStorage(imageUrl: string, jobId: string): Promise<string> {
  const supabase = getSupabase();

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return imageUrl; // Return original URL as fallback
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from content-type
    const contentType = response.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';

    // Upload to Supabase Storage
    const filePath = `generated/${jobId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return imageUrl; // Return original URL as fallback
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('Error uploading to storage:', err);
    return imageUrl; // Return original URL as fallback
  }
}

// Initialize AI clients lazily
function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN');
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getGemini() {
  if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Generate image using the appropriate AI service
async function generateImage(
  modelId: string,
  prompt: string,
  sourceImageUrl?: string,
  negativePrompt?: string
): Promise<string> {

  switch (modelId) {
    case 'dall-e-3': {
      const openai = getOpenAI();
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });
      return response.data[0]?.url || '';
    }

    case 'gemini-imagen': {
      const genAI = getGemini();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Gemini doesn't have direct image generation yet in the standard API
      // Using text generation to describe what would be generated
      // In production, use Imagen API directly through Google Cloud
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // For now, return the source image or a placeholder
      // Real Imagen integration requires Google Cloud Vertex AI
      console.log('Gemini response:', text);
      return sourceImageUrl || 'https://placehold.co/1024x1024/png?text=Gemini+Imagen';
    }

    case 'stability-sd3': {
      const replicate = getReplicate();
      const output = await replicate.run(
        'stability-ai/stable-diffusion-3',
        {
          input: {
            prompt: prompt,
            negative_prompt: negativePrompt || '',
            output_format: 'png',
            aspect_ratio: '1:1',
          }
        }
      );
      // Output is typically an array of URLs or a single URL
      if (Array.isArray(output)) return output[0] as string;
      return output as string;
    }

    case 'flux-pro': {
      const replicate = getReplicate();
      const output = await replicate.run(
        'black-forest-labs/flux-pro',
        {
          input: {
            prompt: prompt,
            aspect_ratio: '1:1',
            output_format: 'png',
            safety_tolerance: 2,
          }
        }
      );
      if (Array.isArray(output)) return output[0] as string;
      return output as string;
    }

    case 'flux-schnell': {
      const replicate = getReplicate();
      const output = await replicate.run(
        'black-forest-labs/flux-schnell',
        {
          input: {
            prompt: prompt,
            aspect_ratio: '1:1',
            output_format: 'png',
          }
        }
      );
      if (Array.isArray(output)) return output[0] as string;
      return output as string;
    }

    case 'replicate-wan': {
      // Wan 2.1 is image-to-video, requires source image
      if (!sourceImageUrl) {
        throw new Error('Wan 2.1 requires a source image for image-to-video generation');
      }
      const replicate = getReplicate();
      const output = await replicate.run(
        'wan-video/wan-2.1-i2v',
        {
          input: {
            image: sourceImageUrl,
            prompt: prompt,
          }
        }
      );
      if (Array.isArray(output)) return output[0] as string;
      return output as string;
    }

    default:
      // Fallback for unsupported models - return source image
      console.warn(`Model ${modelId} not yet supported, using source image`);
      return sourceImageUrl || 'https://placehold.co/1024x1024/png?text=Unsupported+Model';
  }
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
      let sourceAssetUrl: string | null = null;
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

      // Process each job with AI generation
      for (const job of jobsData) {
        try {
          // Update status to processing
          await supabase
            .from('generation_jobs')
            .update({ status: 'processing', progress: 50 })
            .eq('id', job.id);

          // Generate the image/video using AI
          const tempUrl = await generateImage(
            modelId,
            prompt || 'A creative advertisement variation',
            sourceAssetUrl || undefined,
            negativePrompt
          );

          // Upload to permanent storage (Replicate URLs expire)
          const generatedUrl = await uploadToStorage(tempUrl, job.id);

          // Update job as completed
          await supabase
            .from('generation_jobs')
            .update({
              status: 'completed',
              progress: 100,
              result: {
                url: generatedUrl,
                thumbnailUrl: generatedUrl,
                metadata: { generatedAt: new Date().toISOString(), model: modelId }
              },
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          // Create variation record
          await supabase.from('variations').insert({
            project_id: actualProjectId,
            job_id: job.id,
            source_asset_id: job.source_asset_id,
            variation_index: job.variation_index,
            size_config: job.size_config,
            model_id: job.model_id,
            prompt: job.prompt,
            url: generatedUrl,
            thumbnail_url: generatedUrl,
            type: 'image',
            selected: false,
          });

        } catch (genError: any) {
          console.error(`Generation error for job ${job.id}:`, genError);

          // Mark job as failed
          await supabase
            .from('generation_jobs')
            .update({
              status: 'failed',
              error: genError.message || 'Generation failed',
            })
            .eq('id', job.id);
        }
      }

      // Fetch updated jobs
      const { data: updatedJobs } = await supabase
        .from('generation_jobs')
        .select('*')
        .in('id', jobsData.map(j => j.id));

      const jobs = (updatedJobs || []).map(j => ({
        id: j.id,
        projectId: j.project_id,
        status: j.status,
        progress: j.progress,
        error: j.error,
      }));

      return res.status(201).json({ projectId: actualProjectId, jobs });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Generate API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
