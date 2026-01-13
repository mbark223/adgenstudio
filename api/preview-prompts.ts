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

// Map brand protection IDs to descriptive instructions
function getBrandProtectionInstructions(protections: string[]): string {
  if (!protections || protections.length === 0) return '';

  const protectionDescriptions: Record<string, string> = {
    'logo-placement': 'logo position, size, and visibility',
    'brand-colors': 'brand color palette and color scheme',
    'ad-elements': 'key visual elements and product placement',
    'ad-text': 'text content, copy, and typography',
  };

  const descriptions = protections
    .map(p => protectionDescriptions[p])
    .filter(Boolean);

  if (descriptions.length === 0) return '';

  return `\nCRITICAL BRAND PROTECTION - You MUST keep these elements unchanged across all variations: ${descriptions.join(', ')}. These are non-negotiable brand guidelines.`;
}

// Process variable tokens in the prompt
function processVariableTokens(prompt: string): string {
  // Convert {{variable}} to [VARIABLE] for better AI understanding
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, varName) => `[${varName.toUpperCase()}]`);
}

// Type for variation with prompt and hypothesis
interface VariationPrompt {
  prompt: string;
  hypothesis: string;
}

// Use Claude to craft multiple unique prompts with hypotheses for image generation variations
async function enhancePromptsWithClaude(
  userPrompt: string,
  sourceImageUrl: string | null,
  variationTypes: string[],
  brandProtections: string[],
  variationCount: number
): Promise<VariationPrompt[]> {
  try {
    const anthropic = getAnthropic();

    // Process any variable tokens in the user's prompt
    const processedPrompt = processVariableTokens(userPrompt);

    // Build brand protection instructions for user message
    const brandInstructions = getBrandProtectionInstructions(brandProtections);

    const systemPrompt = `You are a prompt variation generator for ad testing. Your job is to create variations of the user's creative direction.

CRITICAL RULES:
- The user's BASE DIRECTION is sacred - every prompt MUST include it word-for-word or very close to it
- You ADD variation elements (lighting, mood, atmosphere) TO their direction - DO NOT replace it
- DO NOT ignore or significantly change the user's creative direction
- Output format (no other text):
  1. PROMPT: [base direction + your lighting/mood variation]
     HYPOTHESIS: [why this variation might perform better]
- Start immediately with "1. PROMPT:"
- NO conversation, NO questions, NO explanations`;

    const variationTypesText = variationTypes.length > 0
      ? `Variation styles requested: ${variationTypes.join(', ')}.`
      : '';

    const userDirection = processedPrompt || 'professional advertisement';

    // Build brand protection section for user message
    const brandSection = brandProtections.length > 0
      ? `\nBRAND PROTECTION (MUST be mentioned in prompts):
${brandInstructions.replace('CRITICAL BRAND PROTECTION - You MUST keep these elements unchanged across all variations:', 'Preserve these elements:')}
`
      : '';

    const userMessage = `BASE CREATIVE DIRECTION (MUST appear in every prompt):
"${userDirection}"
${brandSection}
${variationTypesText}

Create exactly ${variationCount} variations. Each prompt MUST:
1. START with or CONTAIN the base creative direction above
2. ADD one of these atmosphere variations: warm golden lighting, cool blue tones, vibrant saturated colors, soft natural light, dramatic contrast, minimalist composition, energetic dynamic feel, calm serene atmosphere
3. Include a hypothesis for A/B testing

Example format if base direction was "red sports car on highway":
1. PROMPT: Red sports car on highway with warm golden sunset lighting
   HYPOTHESIS: Warm tones may increase emotional connection

Output ${variationCount} variations now:`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '1. PROMPT:' }  // Prefill to force format
      ],
      system: systemPrompt,
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      // Prepend "1. PROMPT:" since we used it as a prefill
      const fullResponse = '1. PROMPT:' + textContent.text;
      console.log('Claude enhanced prompts with hypotheses:', fullResponse);

      // Parse variations with prompts and hypotheses
      const variations: VariationPrompt[] = [];

      // Split by numbered entries (1., 2., 3., etc.)
      const entries = fullResponse.split(/(?=\d+\.\s*PROMPT:)/i).filter(e => e.trim());

      for (const entry of entries) {
        const promptMatch = entry.match(/PROMPT:\s*(.+?)(?=\s*HYPOTHESIS:|$)/is);
        const hypothesisMatch = entry.match(/HYPOTHESIS:\s*(.+?)(?=\s*\d+\.\s*PROMPT:|$)/is);

        if (promptMatch) {
          variations.push({
            prompt: promptMatch[1].trim(),
            hypothesis: hypothesisMatch ? hypothesisMatch[1].trim() : generateFallbackHypothesis(promptMatch[1].trim()),
          });
        }
      }

      // If we got the right number of variations, return them
      if (variations.length >= variationCount) {
        return variations.slice(0, variationCount);
      }

      // Fallback: if parsing failed, use fallback generation
      const basePrompt = variations[0]?.prompt || userDirection;
      return generateFallbackVariations(basePrompt, variationCount);
    }

    return generateFallbackVariations(userDirection, variationCount);
  } catch (error) {
    console.error('Claude prompt enhancement failed:', error);
    return generateFallbackVariations(userPrompt || 'A professional advertisement variation', variationCount);
  }
}

// Generate a fallback hypothesis based on the prompt style
function generateFallbackHypothesis(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('warm') || lowerPrompt.includes('golden')) {
    return 'Warm tones may evoke positive emotions and increase engagement';
  } else if (lowerPrompt.includes('cool') || lowerPrompt.includes('blue')) {
    return 'Cool tones may convey professionalism and build trust';
  } else if (lowerPrompt.includes('vibrant') || lowerPrompt.includes('saturated')) {
    return 'Vibrant colors may capture attention and increase click-through rates';
  } else if (lowerPrompt.includes('minimalist') || lowerPrompt.includes('clean')) {
    return 'Clean design may reduce cognitive load and improve message clarity';
  } else if (lowerPrompt.includes('dramatic') || lowerPrompt.includes('contrast')) {
    return 'High contrast may create visual impact and improve ad recall';
  } else if (lowerPrompt.includes('calm') || lowerPrompt.includes('serene')) {
    return 'Calm atmosphere may appeal to audiences seeking relaxation or wellness';
  } else if (lowerPrompt.includes('energetic') || lowerPrompt.includes('dynamic')) {
    return 'Dynamic visuals may resonate with younger, action-oriented audiences';
  } else {
    return 'This creative direction may differentiate from competitor ads and capture attention';
  }
}

// Generate fallback variations with style modifiers when Claude fails
function generateFallbackVariations(basePrompt: string, count: number): VariationPrompt[] {
  const modifiers = [
    { style: 'with warm golden hour lighting', hypothesis: 'Warm tones may evoke positive emotions and increase engagement' },
    { style: 'with cool blue tones and modern aesthetic', hypothesis: 'Cool tones may convey professionalism and build trust' },
    { style: 'with vibrant saturated colors', hypothesis: 'Vibrant colors may capture attention and increase click-through rates' },
    { style: 'with soft natural lighting', hypothesis: 'Natural lighting may feel authentic and relatable to viewers' },
    { style: 'with dramatic contrast and shadows', hypothesis: 'High contrast may create visual impact and improve ad recall' },
    { style: 'with minimalist clean composition', hypothesis: 'Clean design may reduce cognitive load and improve message clarity' },
    { style: 'with energetic dynamic feel', hypothesis: 'Dynamic visuals may resonate with younger, action-oriented audiences' },
    { style: 'with calm serene atmosphere', hypothesis: 'Calm atmosphere may appeal to audiences seeking relaxation or wellness' },
    { style: 'with bold contemporary style', hypothesis: 'Bold styling may stand out in crowded social feeds' },
    { style: 'with classic timeless look', hypothesis: 'Classic aesthetics may convey quality and reliability' },
  ];

  const variations: VariationPrompt[] = [];
  for (let i = 0; i < count; i++) {
    const modifier = modifiers[i % modifiers.length];
    variations.push({
      prompt: `${basePrompt}, ${modifier.style}`,
      hypothesis: modifier.hypothesis,
    });
  }
  return variations;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { prompt, sourceAssetId, variationTypes, brandProtections, variationCount } = req.body;

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

      // Generate all variations with prompts and hypotheses using Claude
      const variations = await enhancePromptsWithClaude(
        prompt || '',
        sourceAssetUrl,
        variationTypes || [],
        brandProtections || [],
        variationCount || 3
      );

      return res.status(200).json({ variations });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Preview prompts API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
