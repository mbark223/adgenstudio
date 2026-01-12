import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
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

    const systemPrompt = `You are a creative director for advertising. Your job is to write precise, detailed prompts for AI image generation that will create ad variations.

Guidelines:
- Keep the core subject, product, and branding elements from the original
- Each variation should be DISTINCTLY DIFFERENT from the others
- Focus on different aspects: lighting changes, color grading, background variations, mood shifts, time of day, weather, seasonal themes
- Be specific about visual details: colors, composition, style
- Keep each prompt concise but descriptive (2-3 sentences max)
- Do NOT change the main subject or product
- Output ONLY the prompts, one per line, numbered 1. 2. 3. etc.`;

    const userMessage = sourceImageUrl
      ? `The user uploaded an advertisement image. They want ${variationCount} UNIQUE variations with these types: ${variationTypes.join(', ')}.

Their additional direction: "${userPrompt || 'Create subtle creative variations of this ad'}"

Write ${variationCount} DIFFERENT prompts for an AI image model. Each prompt should create a distinctly different variation while keeping the main subject and branding intact. Make each one unique - vary the lighting, mood, colors, background elements, or style between them.

Output exactly ${variationCount} prompts, numbered 1. through ${variationCount}.`
      : `Write ${variationCount} DIFFERENT prompts for an AI image model based on this direction: "${userPrompt}"

Each prompt should be distinctly different - vary the style, mood, lighting, or approach.

Output exactly ${variationCount} prompts, numbered 1. through ${variationCount}.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: userMessage }
      ],
      system: systemPrompt,
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      console.log('Claude enhanced prompts:', textContent.text);

      // Parse numbered prompts from response
      const lines = textContent.text.split('\n').filter(line => line.trim());
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
      const basePrompt = prompts[0] || textContent.text.split('\n')[0] || userPrompt;
      return generateFallbackVariations(basePrompt, variationCount);
    }

    return generateFallbackVariations(userPrompt || 'A professional advertisement', variationCount);
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { prompt, sourceAssetId, variationTypes, variationCount } = req.body;

      // Get the source asset URL if provided
      let sourceAssetUrl: string | null = null;
      if (sourceAssetId) {
        const supabase = getSupabase();
        const { data: assetData } = await supabase
          .from('assets')
          .select('url')
          .eq('id', sourceAssetId)
          .single();

        if (assetData) {
          sourceAssetUrl = assetData.url;
        }
      }

      // Generate prompts using Claude
      const prompts = await enhancePromptsWithClaude(
        prompt || '',
        sourceAssetUrl,
        variationTypes || [],
        variationCount || 3
      );

      return res.status(200).json({ prompts });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Preview prompts API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
