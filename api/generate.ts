import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

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

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Use Claude to craft multiple unique prompts for image generation variations
async function enhancePromptsWithClaude(
  userPrompt: string,
  sourceImageUrl: string | null,
  variationTypes: string[],
  variationCount: number
): Promise<string[]> {
  try {
    const anthropic = getAnthropic();

    const systemPrompt = `You are a prompt generation machine. Your ONLY job is to output numbered image generation prompts.

CRITICAL RULES:
- Output ONLY numbered prompts (1. prompt here, 2. prompt here, etc.)
- NO conversation, NO questions, NO explanations
- NO "I'd be happy to help" or similar phrases
- Each prompt should be 1-2 sentences describing an image to generate
- Make each prompt distinctly different (vary lighting, mood, colors, style, background)
- Start your response IMMEDIATELY with "1." followed by the first prompt`;

    const variationTypesText = variationTypes.length > 0
      ? `Variation styles to incorporate: ${variationTypes.join(', ')}.`
      : '';

    const userDirection = userPrompt || 'professional advertisement with creative variations';

    const userMessage = `Generate exactly ${variationCount} different image prompts for: "${userDirection}"

${variationTypesText}

Requirements:
- Each prompt describes a complete image that an AI can generate
- Prompts should vary in: lighting, color palette, mood, background, or artistic style
- Keep the core subject consistent across all prompts

Output ${variationCount} numbered prompts now:`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '1.' }  // Prefill to force prompt format
      ],
      system: systemPrompt,
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      // Prepend "1." since we used it as a prefill
      const fullResponse = '1.' + textContent.text;
      console.log('Claude enhanced prompts:', fullResponse);

      // Parse numbered prompts from response
      const lines = fullResponse.split('\n').filter(line => line.trim());
      const prompts: string[] = [];

      for (const line of lines) {
        // Match lines starting with numbers like "1." or "1)" or just numbered
        const match = line.match(/^\d+[\.\)]\s*(.+)/);
        if (match) {
          prompts.push(match[1].trim());
        }
      }

      // If we got the right number of prompts, return them
      if (prompts.length >= variationCount) {
        return prompts.slice(0, variationCount);
      }

      // Fallback: if parsing failed, use the whole response for first variation
      // and add modifiers for others
      const basePrompt = prompts[0] || fullResponse.split('\n')[0] || userDirection;
      return generateFallbackVariations(basePrompt, variationCount);
    }

    return generateFallbackVariations(userDirection, variationCount);
  } catch (error) {
    console.error('Claude prompt enhancement failed:', error);
    return generateFallbackVariations(userPrompt || 'A professional advertisement variation', variationCount);
  }
}

// Generate fallback variations with style modifiers when Claude fails
function generateFallbackVariations(basePrompt: string, count: number): string[] {
  const modifiers = [
    'with warm golden hour lighting',
    'with cool blue tones and modern aesthetic',
    'with vibrant saturated colors',
    'with soft natural lighting',
    'with dramatic contrast and shadows',
    'with minimalist clean composition',
    'with energetic dynamic feel',
    'with calm serene atmosphere',
    'with bold contemporary style',
    'with classic timeless look',
  ];

  const prompts: string[] = [];
  for (let i = 0; i < count; i++) {
    const modifier = modifiers[i % modifiers.length];
    prompts.push(`${basePrompt}, ${modifier}`);
  }
  return prompts;
}

// Generate image using the appropriate AI service
async function generateImage(
  modelId: string,
  prompt: string,
  sourceImageUrl?: string,
  negativePrompt?: string
): Promise<string> {

  switch (modelId) {
    case 'nanobanana': {
      // Google Nano Banana - image generation and editing from Google
      const replicate = getReplicate();
      const input: Record<string, any> = {
        prompt: prompt,
        aspect_ratio: '1:1',
        output_format: 'png',
      };
      // Use image_input array if source image provided
      if (sourceImageUrl) {
        input.image_input = [sourceImageUrl];
        input.aspect_ratio = 'match_input_image';
      }
      const output = await replicate.run('google/nano-banana', { input });
      if (Array.isArray(output)) return output[0] as string;
      if (typeof output === 'object' && output !== null && 'output' in output) {
        return (output as any).output as string;
      }
      return output as string;
    }

    case 'prunaai': {
      // Prunaai - ultra-fast image generation via Replicate
      const replicate = getReplicate();

      // Use image editing if source image provided
      if (sourceImageUrl) {
        const output = await replicate.run(
          'prunaai/p-image-edit' as `${string}/${string}`,
          {
            input: {
              prompt: prompt,
              images: [sourceImageUrl],
              aspect_ratio: 'match_input_image',
              turbo: true,
            }
          }
        );
        if (Array.isArray(output)) return output[0] as string;
        return output as string;
      }

      // Text-to-image generation
      const output = await replicate.run(
        'prunaai/p-image' as `${string}/${string}`,
        {
          input: {
            prompt: prompt,
            aspect_ratio: '1:1',
          }
        }
      );
      if (Array.isArray(output)) return output[0] as string;
      return output as string;
    }

    case 'veo-3': {
      // Google Veo 3 - video generation (placeholder - requires Google Cloud Vertex AI)
      console.log('Veo 3 video generation requested');
      // For now, return source image/placeholder
      // Real Veo 3 integration requires Google Cloud Vertex AI Video API
      return sourceImageUrl || 'https://placehold.co/1280x720/mp4?text=Veo+3+Video';
    }

    case 'sora': {
      // OpenAI Sora - video generation
      const openai = getOpenAI();

      try {
        // Create video generation job
        const videoResponse = await (openai as any).videos.create({
          model: 'sora-2',
          prompt: prompt,
          duration: 8,
          resolution: '1280x720',
        });

        const videoId = videoResponse.id;

        // Poll for completion (max 10 minutes)
        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals

          const status = await (openai as any).videos.retrieve(videoId);

          if (status.status === 'completed') {
            return status.video_url;
          } else if (status.status === 'failed') {
            throw new Error(status.error || 'Sora video generation failed');
          }

          attempts++;
        }

        throw new Error('Sora video generation timed out');
      } catch (error: any) {
        console.error('Sora generation error:', error);
        // Fallback - return placeholder
        return 'https://placehold.co/1280x720/mp4?text=Sora+Video+Generation+Failed';
      }
    }

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
      // Use img2img if source image provided
      if (sourceImageUrl) {
        const output = await replicate.run(
          'stability-ai/stable-diffusion-3',
          {
            input: {
              prompt: prompt,
              image: sourceImageUrl,
              prompt_strength: 0.3, // Lower = stays closer to source image
              negative_prompt: negativePrompt || '',
              output_format: 'png',
            }
          }
        );
        if (Array.isArray(output)) return output[0] as string;
        return output as string;
      }
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
      if (Array.isArray(output)) return output[0] as string;
      return output as string;
    }

    case 'flux-pro': {
      const replicate = getReplicate();
      // Flux 1.1 Pro supports image prompts for img2img style
      if (sourceImageUrl) {
        const output = await replicate.run(
          'black-forest-labs/flux-1.1-pro',
          {
            input: {
              prompt: prompt,
              image_prompt: sourceImageUrl,
              aspect_ratio: '1:1',
              output_format: 'png',
              safety_tolerance: 2,
            }
          }
        );
        if (Array.isArray(output)) return output[0] as string;
        return output as string;
      }
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
      // Use flux-dev for img2img which supports image input
      if (sourceImageUrl) {
        const output = await replicate.run(
          'black-forest-labs/flux-dev',
          {
            input: {
              prompt: prompt,
              image: sourceImageUrl,
              prompt_strength: 0.35, // Lower = stays closer to source image
              go_fast: true,
              num_outputs: 1,
              aspect_ratio: '1:1',
              output_format: 'png',
            }
          }
        );
        if (Array.isArray(output)) return output[0] as string;
        return output as string;
      }
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
      const { projectId, sourceAssetId, variationCount, variationTypes, sizes, modelId, prompt, negativePrompt, enhancedPrompts: providedPrompts } = req.body;

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

      // Use provided prompts if available, otherwise generate with Claude
      let enhancedPrompts: string[] = [];
      if (providedPrompts && Array.isArray(providedPrompts) && providedPrompts.length > 0) {
        // Use pre-approved prompts from preview
        enhancedPrompts = providedPrompts;
        console.log(`Using ${enhancedPrompts.length} pre-approved prompts from preview`);
      } else {
        // Generate prompts with Claude
        try {
          enhancedPrompts = await enhancePromptsWithClaude(
            prompt || '',
            sourceAssetUrl,
            variationTypes || [],
            variationCount
          );
          console.log(`Generated ${enhancedPrompts.length} unique prompts for ${variationCount} variations`);
        } catch (e) {
          console.log('Skipping Claude enhancement, using fallback variations');
          enhancedPrompts = generateFallbackVariations(prompt || 'A creative advertisement variation', variationCount);
        }
      }

      // Process each job with AI generation
      for (const job of jobsData) {
        try {
          // Update status to processing
          await supabase
            .from('generation_jobs')
            .update({ status: 'processing', progress: 50 })
            .eq('id', job.id);

          // Get the unique prompt for this variation index
          const variationPrompt = enhancedPrompts[job.variation_index] || enhancedPrompts[0] || prompt;
          console.log(`Job ${job.id} (variation ${job.variation_index}): ${variationPrompt.substring(0, 100)}...`);

          // Generate the image/video using AI with variation-specific prompt
          const tempUrl = await generateImage(
            modelId,
            variationPrompt,
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
