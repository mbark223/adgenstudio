import { z } from "zod";

// Safe zone definition (margins in pixels where important content should be placed)
export interface SafeZone {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Platform presets for ad sizes
export const platformPresets = {
  meta: {
    displayName: 'Meta (Facebook/Instagram)',
    sizes: [
      {
        name: 'Feed Square',
        width: 1080,
        height: 1080,
        placement: 'Feed',
        safeZone: { top: 54, right: 54, bottom: 54, left: 54 } // 5% margins
      },
      {
        name: 'Feed Portrait',
        width: 1080,
        height: 1350,
        placement: 'Feed',
        safeZone: { top: 68, right: 54, bottom: 68, left: 54 } // 5% margins
      },
      {
        name: 'Story/Reel',
        width: 1080,
        height: 1920,
        placement: 'Stories/Reels',
        safeZone: { top: 250, right: 54, bottom: 300, left: 54 } // Instagram UI elements
      },
      {
        name: 'Feed Landscape',
        width: 1200,
        height: 628,
        placement: 'Feed',
        safeZone: { top: 31, right: 60, bottom: 31, left: 60 } // 5% margins
      },
      {
        name: 'Carousel',
        width: 1080,
        height: 1080,
        placement: 'Feed',
        safeZone: { top: 54, right: 54, bottom: 54, left: 54 } // 5% margins
      },
    ],
  },
  tiktok: {
    displayName: 'TikTok',
    sizes: [
      {
        name: 'In-Feed Video',
        width: 1080,
        height: 1920,
        placement: 'For You Feed',
        safeZone: { top: 100, right: 54, bottom: 400, left: 54 } // TikTok UI (profile, description, buttons)
      },
      {
        name: 'TopView',
        width: 1080,
        height: 1920,
        placement: 'TopView',
        safeZone: { top: 150, right: 54, bottom: 350, left: 54 } // TopView UI elements
      },
      {
        name: 'Spark Ad',
        width: 1080,
        height: 1920,
        placement: 'Organic Style',
        safeZone: { top: 100, right: 54, bottom: 400, left: 54 } // Similar to In-Feed
      },
      {
        name: 'Square Option',
        width: 1080,
        height: 1080,
        placement: 'Feed',
        safeZone: { top: 54, right: 54, bottom: 54, left: 54 } // 5% margins
      },
    ],
  },
  snapchat: {
    displayName: 'Snapchat',
    sizes: [
      {
        name: 'Snap Ad',
        width: 1080,
        height: 1920,
        placement: 'Between Stories',
        safeZone: { top: 192, right: 54, bottom: 288, left: 54 } // Snapchat UI (10-15% top/bottom)
      },
      {
        name: 'Story Ad',
        width: 1080,
        height: 1920,
        placement: 'Discover',
        safeZone: { top: 192, right: 54, bottom: 288, left: 54 } // Similar to Snap Ad
      },
      {
        name: 'Collection Ad Tile',
        width: 360,
        height: 600,
        placement: 'Collection',
        safeZone: { top: 30, right: 18, bottom: 30, left: 18 } // 5% margins
      },
      {
        name: 'Collection Ad Hero',
        width: 1080,
        height: 1920,
        placement: 'Collection',
        safeZone: { top: 192, right: 54, bottom: 288, left: 54 } // Story-style safe zones
      },
      {
        name: 'Commercial',
        width: 1080,
        height: 1920,
        placement: 'Shows',
        safeZone: { top: 150, right: 54, bottom: 200, left: 54 } // Commercial format
      },
    ],
  },
  moloco: {
    displayName: 'Moloco',
    sizes: [
      {
        name: 'Interstitial Portrait',
        width: 1080,
        height: 1920,
        placement: 'Interstitial',
        safeZone: { top: 108, right: 54, bottom: 192, left: 54 } // Close button, CTA area
      },
      {
        name: 'Interstitial Landscape',
        width: 1920,
        height: 1080,
        placement: 'Interstitial',
        safeZone: { top: 108, right: 96, bottom: 108, left: 96 } // Close button area
      },
      {
        name: 'Banner Large',
        width: 320,
        height: 480,
        placement: 'Banner',
        safeZone: { top: 16, right: 16, bottom: 24, left: 16 } // Small ad unit
      },
      {
        name: 'Banner Medium',
        width: 300,
        height: 250,
        placement: 'MREC',
        safeZone: { top: 15, right: 15, bottom: 15, left: 15 } // 5% margins
      },
      {
        name: 'Banner Small',
        width: 320,
        height: 50,
        placement: 'Banner',
        safeZone: { top: 3, right: 16, bottom: 3, left: 16 } // Minimal vertical space
      },
      {
        name: 'Native Square',
        width: 1200,
        height: 1200,
        placement: 'Native',
        safeZone: { top: 60, right: 60, bottom: 60, left: 60 } // 5% margins
      },
      {
        name: 'Native Landscape',
        width: 1200,
        height: 628,
        placement: 'Native',
        safeZone: { top: 31, right: 60, bottom: 31, left: 60 } // 5% margins
      },
    ],
  },
  googleUAC: {
    displayName: 'Google UAC (App Campaigns)',
    sizes: [
      {
        name: 'Landscape Video',
        width: 1920,
        height: 1080,
        placement: 'YouTube/Display',
        safeZone: { top: 108, right: 192, bottom: 108, left: 192 } // YouTube player controls
      },
      {
        name: 'Portrait Video',
        width: 1080,
        height: 1920,
        placement: 'YouTube Shorts/Display',
        safeZone: { top: 192, right: 54, bottom: 300, left: 54 } // Shorts UI
      },
      {
        name: 'Square Video',
        width: 1080,
        height: 1080,
        placement: 'Display/Discovery',
        safeZone: { top: 108, right: 108, bottom: 108, left: 108 } // 10% margins
      },
      {
        name: 'Landscape Image',
        width: 1200,
        height: 628,
        placement: 'Display',
        safeZone: { top: 63, right: 120, bottom: 63, left: 120 } // 10% margins
      },
      {
        name: 'Square Image',
        width: 1200,
        height: 1200,
        placement: 'Display',
        safeZone: { top: 120, right: 120, bottom: 120, left: 120 } // 10% margins
      },
      {
        name: 'Portrait Image',
        width: 1080,
        height: 1920,
        placement: 'Display',
        safeZone: { top: 192, right: 108, bottom: 192, left: 108 } // 10% margins
      },
    ],
  },
} as const;

export type PlatformKey = keyof typeof platformPresets;

// Available creative styles
export const availableModels = [
  // Image Styles
  {
    id: 'nanobanana',
    name: 'Quick Create',
    provider: 'Google AI',
    type: 'image' as const,
    capabilities: ['text-to-image', 'image-to-image'],
    avgGenerationTime: 15,
  },
  {
    id: 'prunaai',
    name: 'Pro Create',
    provider: 'Replicate',
    type: 'image' as const,
    capabilities: ['text-to-image', 'image-to-image'],
    avgGenerationTime: 3,
  },
  // Video Styles
  {
    id: 'veo-3',
    name: 'Quick Video',
    provider: 'Google AI',
    type: 'video' as const,
    capabilities: ['text-to-video', 'image-to-video'],
    avgGenerationTime: 90,
  },
  {
    id: 'sora',
    name: 'Pro Video',
    provider: 'OpenAI',
    type: 'video' as const,
    capabilities: ['text-to-video'],
    avgGenerationTime: 180,
  },
] as const;

export type AIModel = typeof availableModels[number];
export type AIModelId = AIModel['id'];
export type AIModelType = 'image' | 'video';

// Variation types
export const variationTypes = [
  { id: 'background-swap', name: 'Background Swap', description: 'Replace or modify the background', applicableTo: ['image', 'video'] },
  { id: 'style-transfer', name: 'Style Transfer', description: 'Apply artistic visual styles', applicableTo: ['image', 'video'] },
  { id: 'color-grading', name: 'Color Grading', description: 'Automatic color adjustments', applicableTo: ['image', 'video'] },
  { id: 'element-animation', name: 'Element Animation', description: 'Animate static elements', applicableTo: ['image'] },
  { id: 'text-overlay', name: 'Text Overlay Variations', description: 'Generate text placement options', applicableTo: ['image', 'video'] },
  { id: 'aspect-adapt', name: 'Aspect Ratio Adapt', description: 'Smart cropping and extension', applicableTo: ['image', 'video'] },
  { id: 'scene-extension', name: 'Scene Extension', description: 'Extend beyond image edges', applicableTo: ['image', 'video'] },
] as const;

export type VariationType = typeof variationTypes[number];
export type VariationTypeId = VariationType['id'];

// Brand protection options
export const brandProtectionOptions = [
  { id: 'logo-placement', name: 'Logo Placement', description: 'Keep logo in same position' },
  { id: 'brand-colors', name: 'Brand Colors', description: 'Maintain brand color palette' },
  { id: 'ad-elements', name: 'Ad Elements', description: 'Preserve key visual elements' },
  { id: 'ad-text', name: 'Ad Text', description: 'Keep text content unchanged' },
] as const;

export type BrandProtection = typeof brandProtectionOptions[number];
export type BrandProtectionId = BrandProtection['id'];

// Safe zone schema
export const safeZoneSchema = z.object({
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

// Size configuration
export const sizeConfigSchema = z.object({
  name: z.string(),
  width: z.number(),
  height: z.number(),
  placement: z.string(),
  platform: z.string(),
  safeZone: safeZoneSchema.optional(),
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
  hypothesis: z.string().optional(),
  negativePrompt: z.string().optional(),
  variationTypes: z.array(z.string()),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  testStatus: z.enum(['pending', 'winner', 'challenger', 'rejected']).optional(),
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

// Variation status for A/B testing
export const variationStatusOptions = ['pending', 'winner', 'challenger', 'rejected'] as const;
export type VariationStatus = typeof variationStatusOptions[number];

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
  hypothesis: z.string().optional(),
  feedback: z.string().optional(),
  status: z.enum(variationStatusOptions).optional(),
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

// Video job schema (for Veo 3.1 video generation)
export const videoJobSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  firstFrameUrl: z.string(),
  lastFrameUrl: z.string(),
  prompt: z.string().optional(),
  duration: z.number().default(6),
  aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
  status: z.enum(['processing', 'completed', 'failed']),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  errorMessage: z.string().optional(),
  progress: z.number().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export type VideoJob = z.infer<typeof videoJobSchema>;

export const insertVideoJobSchema = videoJobSchema.omit({ id: true, createdAt: true });
export type InsertVideoJob = z.infer<typeof insertVideoJobSchema>;

// User schema (kept for compatibility)
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
});

export type User = z.infer<typeof userSchema>;
export const insertUserSchema = userSchema.omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
