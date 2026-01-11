import { z } from "zod";

// Platform presets for ad sizes
export const platformPresets = {
  meta: {
    displayName: 'Meta (Facebook/Instagram)',
    sizes: [
      { name: 'Feed Square', width: 1080, height: 1080, placement: 'Feed' },
      { name: 'Feed Portrait', width: 1080, height: 1350, placement: 'Feed' },
      { name: 'Story/Reel', width: 1080, height: 1920, placement: 'Stories/Reels' },
      { name: 'Feed Landscape', width: 1200, height: 628, placement: 'Feed' },
      { name: 'Carousel', width: 1080, height: 1080, placement: 'Feed' },
    ],
  },
  tiktok: {
    displayName: 'TikTok',
    sizes: [
      { name: 'In-Feed Video', width: 1080, height: 1920, placement: 'For You Feed' },
      { name: 'TopView', width: 1080, height: 1920, placement: 'TopView' },
      { name: 'Spark Ad', width: 1080, height: 1920, placement: 'Organic Style' },
      { name: 'Square Option', width: 1080, height: 1080, placement: 'Feed' },
    ],
  },
  snapchat: {
    displayName: 'Snapchat',
    sizes: [
      { name: 'Snap Ad', width: 1080, height: 1920, placement: 'Between Stories' },
      { name: 'Story Ad', width: 1080, height: 1920, placement: 'Discover' },
      { name: 'Collection Ad Tile', width: 360, height: 600, placement: 'Collection' },
      { name: 'Collection Ad Hero', width: 1080, height: 1920, placement: 'Collection' },
      { name: 'Commercial', width: 1080, height: 1920, placement: 'Shows' },
    ],
  },
  moloco: {
    displayName: 'Moloco',
    sizes: [
      { name: 'Interstitial Portrait', width: 1080, height: 1920, placement: 'Interstitial' },
      { name: 'Interstitial Landscape', width: 1920, height: 1080, placement: 'Interstitial' },
      { name: 'Banner Large', width: 320, height: 480, placement: 'Banner' },
      { name: 'Banner Medium', width: 300, height: 250, placement: 'MREC' },
      { name: 'Banner Small', width: 320, height: 50, placement: 'Banner' },
      { name: 'Native Square', width: 1200, height: 1200, placement: 'Native' },
      { name: 'Native Landscape', width: 1200, height: 628, placement: 'Native' },
    ],
  },
  googleUAC: {
    displayName: 'Google UAC (App Campaigns)',
    sizes: [
      { name: 'Landscape Video', width: 1920, height: 1080, placement: 'YouTube/Display' },
      { name: 'Portrait Video', width: 1080, height: 1920, placement: 'YouTube Shorts/Display' },
      { name: 'Square Video', width: 1080, height: 1080, placement: 'Display/Discovery' },
      { name: 'Landscape Image', width: 1200, height: 628, placement: 'Display' },
      { name: 'Square Image', width: 1200, height: 1200, placement: 'Display' },
      { name: 'Portrait Image', width: 1080, height: 1920, placement: 'Display' },
    ],
  },
} as const;

export type PlatformKey = keyof typeof platformPresets;

// Available AI models
export const availableModels = [
  // Image Models
  {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    provider: 'Replicate',
    type: 'image' as const,
    capabilities: ['text-to-image', 'fast-generation'],
    avgGenerationTime: 5,
  },
  {
    id: 'flux-pro',
    name: 'Flux Pro',
    provider: 'Replicate',
    type: 'image' as const,
    capabilities: ['text-to-image', 'image-to-image', 'high-fidelity'],
    avgGenerationTime: 20,
  },
  {
    id: 'stability-sd3',
    name: 'Stable Diffusion 3',
    provider: 'Replicate',
    type: 'image' as const,
    capabilities: ['text-to-image', 'image-to-image', 'inpainting'],
    avgGenerationTime: 15,
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    type: 'image' as const,
    capabilities: ['text-to-image', 'high-fidelity', 'prompt-following'],
    avgGenerationTime: 15,
  },
  {
    id: 'gemini-imagen',
    name: 'Imagen 3',
    provider: 'Google AI',
    type: 'image' as const,
    capabilities: ['text-to-image', 'image-editing', 'high-fidelity'],
    avgGenerationTime: 10,
  },
  // Video Models
  {
    id: 'minimax-video',
    name: 'Minimax Video',
    provider: 'Minimax',
    type: 'video' as const,
    capabilities: ['text-to-video', 'high-quality', 'long-form'],
    avgGenerationTime: 120,
  },
  {
    id: 'veo-3',
    name: 'Google Veo 3',
    provider: 'Google AI',
    type: 'video' as const,
    capabilities: ['text-to-video', 'image-to-video', '4k-output'],
    avgGenerationTime: 90,
  },
  {
    id: 'kling',
    name: 'Kling AI',
    provider: 'Kuaishou',
    type: 'video' as const,
    capabilities: ['text-to-video', 'image-to-video', 'motion-brush'],
    avgGenerationTime: 90,
  },
  // Image to Video Models
  {
    id: 'minimax-i2v',
    name: 'Minimax I2V',
    provider: 'Minimax',
    type: 'image-to-video' as const,
    capabilities: ['image-to-video', 'smooth-motion', 'high-quality'],
    avgGenerationTime: 60,
  },
  {
    id: 'replicate-wan',
    name: 'Wan 2.1',
    provider: 'Replicate',
    type: 'image-to-video' as const,
    capabilities: ['image-to-video', 'text-to-video'],
    avgGenerationTime: 60,
  },
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3 Alpha',
    provider: 'Runway',
    type: 'image-to-video' as const,
    capabilities: ['image-to-video', 'motion-brush', 'camera-control'],
    avgGenerationTime: 90,
  },
  {
    id: 'luma-dream-machine',
    name: 'Luma Dream Machine',
    provider: 'Luma AI',
    type: 'image-to-video' as const,
    capabilities: ['image-to-video', 'camera-motion'],
    avgGenerationTime: 60,
  },
  {
    id: 'hailuo-i2v',
    name: 'Hailuo AI',
    provider: 'Minimax',
    type: 'image-to-video' as const,
    capabilities: ['image-to-video', 'cinematic', 'smooth-motion'],
    avgGenerationTime: 45,
  },
] as const;

export type AIModel = typeof availableModels[number];
export type AIModelId = AIModel['id'];
export type AIModelType = 'image' | 'video' | 'image-to-video';

// Variation types
export const variationTypes = [
  { id: 'background-swap', name: 'Background Swap', description: 'AI replaces/modifies background', applicableTo: ['image', 'video'] },
  { id: 'style-transfer', name: 'Style Transfer', description: 'Apply artistic styles', applicableTo: ['image', 'video'] },
  { id: 'color-grading', name: 'Color Grading', description: 'AI-powered color adjustments', applicableTo: ['image', 'video'] },
  { id: 'element-animation', name: 'Element Animation', description: 'Animate static elements', applicableTo: ['image'] },
  { id: 'text-overlay', name: 'Text Overlay Variations', description: 'Generate text placement/style variations', applicableTo: ['image', 'video'] },
  { id: 'aspect-adapt', name: 'Aspect Ratio Adapt', description: 'Intelligent cropping/extension', applicableTo: ['image', 'video'] },
  { id: 'scene-extension', name: 'Scene Extension', description: 'Outpaint/extend scene', applicableTo: ['image', 'video'] },
] as const;

export type VariationType = typeof variationTypes[number];
export type VariationTypeId = VariationType['id'];

// Size configuration
export const sizeConfigSchema = z.object({
  name: z.string(),
  width: z.number(),
  height: z.number(),
  placement: z.string(),
  platform: z.string(),
});

export type SizeConfig = z.infer<typeof sizeConfigSchema>;

// Asset schema
export const assetSchema = z.object({
  id: z.string(),
  filename: z.string(),
  type: z.enum(['image', 'video']),
  mimeType: z.string(),
  size: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
});

export type Asset = z.infer<typeof assetSchema>;

// Generation job schema
export const generationJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sourceAssetId: z.string(),
  variationIndex: z.number(),
  sizeConfig: sizeConfigSchema,
  modelId: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  variationTypes: z.array(z.string()),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  progress: z.number(),
  result: z.object({
    url: z.string(),
    thumbnailUrl: z.string(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export type GenerationJob = z.infer<typeof generationJobSchema>;

// Variation result schema
export const variationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  jobId: z.string(),
  sourceAssetId: z.string(),
  variationIndex: z.number(),
  sizeConfig: sizeConfigSchema,
  modelId: z.string(),
  prompt: z.string(),
  url: z.string(),
  thumbnailUrl: z.string(),
  type: z.enum(['image', 'video']),
  selected: z.boolean(),
  createdAt: z.string(),
});

export type Variation = z.infer<typeof variationSchema>;

// Project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  sourceAsset: assetSchema.optional(),
  variationCount: z.number().min(1).max(10),
  selectedVariationTypes: z.array(z.string()),
  selectedSizes: z.array(sizeConfigSchema),
  selectedModelId: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  namingConvention: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

// Insert schemas
export const insertProjectSchema = projectSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const insertAssetSchema = assetSchema.omit({ id: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export const insertGenerationJobSchema = generationJobSchema.omit({ id: true, createdAt: true });
export type InsertGenerationJob = z.infer<typeof insertGenerationJobSchema>;

export const insertVariationSchema = variationSchema.omit({ id: true, createdAt: true });
export type InsertVariation = z.infer<typeof insertVariationSchema>;

// User schema (kept for compatibility)
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
});

export type User = z.infer<typeof userSchema>;
export const insertUserSchema = userSchema.omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
