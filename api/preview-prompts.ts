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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { prompt, sourceAssetId, variationTypes, variationCount, existingPrompts, indicesToRegenerate } = req.body;

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

      // If regenerating specific indices, only generate those
      if (existingPrompts && indicesToRegenerate && indicesToRegenerate.length > 0) {
        const countToGenerate = indicesToRegenerate.length;
        const newPrompts = await enhancePromptsWithClaude(
          prompt || '',
          sourceAssetUrl,
          variationTypes || [],
          countToGenerate
        );

        // Merge new prompts into existing ones at the specified indices
        const mergedPrompts = [...existingPrompts];
        indicesToRegenerate.forEach((index: number, i: number) => {
          if (index < mergedPrompts.length && i < newPrompts.length) {
            mergedPrompts[index] = newPrompts[i];
          }
        });

        return res.status(200).json({ prompts: mergedPrompts });
      }

      // Generate all prompts using Claude
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
