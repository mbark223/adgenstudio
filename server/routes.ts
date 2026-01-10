import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, sizeConfigSchema } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";

// Configure multer for memory storage (we won't save files for demo)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Sample variation images (we'll use placeholder URLs for demo)
const sampleImages = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=800&fit=crop",
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = {
        name: req.body.name || "Untitled Project",
        description: req.body.description,
        sourceAsset: req.body.sourceAsset,
        variationCount: req.body.variationCount || 5,
        selectedVariationTypes: req.body.selectedVariationTypes || [],
        selectedSizes: req.body.selectedSizes || [],
        selectedModelId: req.body.selectedModelId || "stability-sd3",
        prompt: req.body.prompt || "",
        negativePrompt: req.body.negativePrompt,
        namingConvention: req.body.namingConvention,
      };
      
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteVariationsByProject(req.params.id);
      await storage.deleteJobsByProject(req.params.id);
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Asset upload
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      
      // Determine asset type from mimetype
      const isVideo = file?.mimetype?.startsWith("video/");
      const assetType = isVideo ? "video" : "image";
      
      // For demo purposes, create a mock asset with uploaded file info
      const mockAsset = await storage.createAsset({
        filename: file?.originalname || "uploaded_asset.png",
        type: assetType,
        mimeType: file?.mimetype || "image/png",
        size: file?.size || 1024 * 500,
        width: 1920,
        height: 1080,
        duration: isVideo ? 30 : undefined,
        url: sampleImages[0],
        thumbnailUrl: sampleImages[0],
      });
      res.status(201).json(mockAsset);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload asset" });
    }
  });

  // Variations
  app.get("/api/variations", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) {
        return res.json([]);
      }
      const variations = await storage.getVariations(projectId);
      res.json(variations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch variations" });
    }
  });

  app.delete("/api/variations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteVariation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Variation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete variation" });
    }
  });

  // Generation Jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) {
        return res.json([]);
      }
      const jobs = await storage.getJobs(projectId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Generate variations (simulated)
  app.post("/api/generate", async (req, res) => {
    try {
      const {
        projectId,
        sourceAssetId,
        variationCount,
        variationTypes,
        sizes,
        modelId,
        prompt,
        negativePrompt,
      } = req.body;

      // Create or get project
      let actualProjectId = projectId;
      if (!actualProjectId) {
        const project = await storage.createProject({
          name: "Untitled Project",
          variationCount,
          selectedVariationTypes: variationTypes,
          selectedSizes: sizes,
          selectedModelId: modelId,
          prompt: prompt || "",
          negativePrompt,
        });
        actualProjectId = project.id;
      }

      // Create generation jobs
      const jobs = [];
      for (let v = 0; v < variationCount; v++) {
        for (const size of sizes) {
          const job = await storage.createJob({
            projectId: actualProjectId,
            sourceAssetId: sourceAssetId || "",
            variationIndex: v,
            sizeConfig: size,
            modelId,
            prompt: prompt || "",
            negativePrompt,
            variationTypes,
            status: "queued",
            progress: 0,
          });
          jobs.push(job);
        }
      }

      // Simulate generation in background
      simulateGeneration(actualProjectId, jobs);

      res.status(201).json({ projectId: actualProjectId, jobs });
    } catch (error) {
      console.error("Error generating:", error);
      res.status(400).json({ error: "Failed to start generation" });
    }
  });

  // Cancel job
  app.post("/api/jobs/:id/cancel", async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, { status: "failed", error: "Cancelled by user" });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel job" });
    }
  });

  // Retry job
  app.post("/api/jobs/:id/retry", async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, { status: "queued", progress: 0, error: undefined });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      // Restart simulation for this job
      simulateSingleJob(job);
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to retry job" });
    }
  });

  return httpServer;
}

// Simulate generation process
async function simulateGeneration(projectId: string, jobs: any[]) {
  for (const job of jobs) {
    await simulateSingleJob(job);
  }
}

async function simulateSingleJob(job: any) {
  // Update to processing
  await storage.updateJob(job.id, { status: "processing", progress: 0 });

  // Simulate progress
  for (let progress = 0; progress <= 100; progress += 20) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await storage.updateJob(job.id, { progress });
  }

  // Complete with result
  const imageIndex = Math.floor(Math.random() * sampleImages.length);
  const url = sampleImages[imageIndex];

  await storage.updateJob(job.id, {
    status: "completed",
    progress: 100,
    result: {
      url,
      thumbnailUrl: url,
      metadata: { generatedAt: new Date().toISOString() },
    },
    completedAt: new Date().toISOString(),
  });

  // Create variation from completed job
  const updatedJob = await storage.getJob(job.id);
  if (updatedJob?.result) {
    await storage.createVariation({
      projectId: updatedJob.projectId,
      jobId: updatedJob.id,
      sourceAssetId: updatedJob.sourceAssetId,
      variationIndex: updatedJob.variationIndex,
      sizeConfig: updatedJob.sizeConfig,
      modelId: updatedJob.modelId,
      prompt: updatedJob.prompt,
      url: updatedJob.result.url,
      thumbnailUrl: updatedJob.result.thumbnailUrl,
      type: "image",
      selected: false,
    });
  }
}
