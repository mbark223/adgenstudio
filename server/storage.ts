import type {
  Project,
  InsertProject,
  Asset,
  InsertAsset,
  Variation,
  InsertVariation,
  GenerationJob,
  InsertGenerationJob,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Assets
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  deleteAsset(id: string): Promise<boolean>;

  // Variations
  getVariations(projectId: string): Promise<Variation[]>;
  getVariation(id: string): Promise<Variation | undefined>;
  createVariation(variation: InsertVariation): Promise<Variation>;
  updateVariation(id: string, variation: Partial<InsertVariation>): Promise<Variation | undefined>;
  deleteVariation(id: string): Promise<boolean>;
  deleteVariationsByProject(projectId: string): Promise<boolean>;

  // Generation Jobs
  getJobs(projectId: string): Promise<GenerationJob[]>;
  getJob(id: string): Promise<GenerationJob | undefined>;
  createJob(job: InsertGenerationJob): Promise<GenerationJob>;
  updateJob(id: string, job: Partial<InsertGenerationJob>): Promise<GenerationJob | undefined>;
  deleteJob(id: string): Promise<boolean>;
  deleteJobsByProject(projectId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private assets: Map<string, Asset>;
  private variations: Map<string, Variation>;
  private jobs: Map<string, GenerationJob>;

  constructor() {
    this.projects = new Map();
    this.assets = new Map();
    this.variations = new Map();
    this.jobs = new Map();
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;

    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Assets
  async getAsset(id: string): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = randomUUID();
    const asset: Asset = { ...insertAsset, id };
    this.assets.set(id, asset);
    return asset;
  }

  async deleteAsset(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }

  // Variations
  async getVariations(projectId: string): Promise<Variation[]> {
    return Array.from(this.variations.values())
      .filter((v) => v.projectId === projectId)
      .sort((a, b) => a.variationIndex - b.variationIndex);
  }

  async getVariation(id: string): Promise<Variation | undefined> {
    return this.variations.get(id);
  }

  async createVariation(insertVariation: InsertVariation): Promise<Variation> {
    const id = randomUUID();
    const variation: Variation = {
      ...insertVariation,
      id,
      createdAt: new Date().toISOString(),
    };
    this.variations.set(id, variation);
    return variation;
  }

  async updateVariation(id: string, updates: Partial<InsertVariation>): Promise<Variation | undefined> {
    const existing = this.variations.get(id);
    if (!existing) return undefined;

    const updated: Variation = { ...existing, ...updates };
    this.variations.set(id, updated);
    return updated;
  }

  async deleteVariation(id: string): Promise<boolean> {
    return this.variations.delete(id);
  }

  async deleteVariationsByProject(projectId: string): Promise<boolean> {
    const toDelete = Array.from(this.variations.values())
      .filter((v) => v.projectId === projectId)
      .map((v) => v.id);
    toDelete.forEach((id) => this.variations.delete(id));
    return true;
  }

  // Generation Jobs
  async getJobs(projectId: string): Promise<GenerationJob[]> {
    return Array.from(this.jobs.values())
      .filter((j) => j.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getJob(id: string): Promise<GenerationJob | undefined> {
    return this.jobs.get(id);
  }

  async createJob(insertJob: InsertGenerationJob): Promise<GenerationJob> {
    const id = randomUUID();
    const job: GenerationJob = {
      ...insertJob,
      id,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: string, updates: Partial<InsertGenerationJob>): Promise<GenerationJob | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;

    const updated: GenerationJob = { ...existing, ...updates };
    this.jobs.set(id, updated);
    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async deleteJobsByProject(projectId: string): Promise<boolean> {
    const toDelete = Array.from(this.jobs.values())
      .filter((j) => j.projectId === projectId)
      .map((j) => j.id);
    toDelete.forEach((id) => this.jobs.delete(id));
    return true;
  }
}

export const storage = new MemStorage();
