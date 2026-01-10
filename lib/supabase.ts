import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for database tables
export interface Project {
  id: string;
  name: string;
  description?: string;
  source_asset?: string;
  variation_count: number;
  selected_variation_types: string[];
  selected_sizes: any[];
  selected_model_id?: string;
  prompt?: string;
  negative_prompt?: string;
  naming_convention?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  filename: string;
  type: string;
  mime_type?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  url?: string;
  thumbnail_url?: string;
}

export interface Variation {
  id: string;
  project_id: string;
  job_id?: string;
  source_asset_id?: string;
  variation_index: number;
  size_config?: any;
  model_id?: string;
  prompt?: string;
  url?: string;
  thumbnail_url?: string;
  type?: string;
  selected: boolean;
  created_at: string;
}

export interface GenerationJob {
  id: string;
  project_id: string;
  source_asset_id?: string;
  variation_index: number;
  size_config?: any;
  model_id?: string;
  prompt?: string;
  negative_prompt?: string;
  variation_types?: string[];
  status: string;
  progress: number;
  result?: any;
  error?: string;
  created_at: string;
  completed_at?: string;
}
