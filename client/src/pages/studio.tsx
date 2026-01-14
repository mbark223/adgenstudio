import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadZone } from "@/components/upload-zone";
import { VariationConfig } from "@/components/variation-config";
import { SizeSelector } from "@/components/size-selector";
import { ModelSelector } from "@/components/model-selector";
import { GenerationQueue } from "@/components/generation-queue";
import { ResultsGrid } from "@/components/results-grid";
import { DetailPanel } from "@/components/detail-panel";
import { Lightbox } from "@/components/lightbox";
import { ExportModal } from "@/components/export-modal";
import { PromptPreviewModal } from "@/components/prompt-preview-modal";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { VideoCards } from "@/components/video-cards";
import { availableModels } from "@shared/schema";
import {
  Sparkles,
  Save,
  FolderOpen,
  Plus,
  Play,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Upload,
  Settings2,
  Layers,
  Cpu,
} from "lucide-react";
import type {
  Asset,
  Project,
  Variation,
  GenerationJob,
  SizeConfig,
  VariationTypeId,
  AIModelId,
  BrandProtectionId,
} from "@shared/schema";

export default function Studio() {
  const { toast } = useToast();

  // UI State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState(["upload", "variation", "sizes", "model"]);
  const [selectedVariationIds, setSelectedVariationIds] = useState<Set<string>>(new Set());
  const [viewingVariation, setViewingVariation] = useState<Variation | null>(null);
  const [lightboxVariation, setLightboxVariation] = useState<Variation | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  // Smart defaults for new users
  const defaultSizes: SizeConfig[] = [
    { name: 'Feed Square', width: 1080, height: 1080, placement: 'Feed', platform: 'meta' },
    { name: 'Story/Reel', width: 1080, height: 1920, placement: 'Stories/Reels', platform: 'meta' },
    { name: 'In-Feed Video', width: 1080, height: 1920, placement: 'For You Feed', platform: 'tiktok' },
  ];

  // Project State
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sourceAsset, setSourceAsset] = useState<Asset | null>(null);
  const [variationCount, setVariationCount] = useState(3);
  const [selectedVariationTypes, setSelectedVariationTypes] = useState<VariationTypeId[]>([
    "background-swap",
    "style-transfer",
  ]);
  const [selectedBrandProtections, setSelectedBrandProtections] = useState<BrandProtectionId[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<SizeConfig[]>(defaultSizes);
  const [selectedModelId, setSelectedModelId] = useState<AIModelId>("nanobanana");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  // Video Cards State (for intro/outro frames)
  const [introCard, setIntroCard] = useState<Asset | null>(null);
  const [outroCard, setOutroCard] = useState<Asset | null>(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);


  // Prompt Preview State
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [previewedVariations, setPreviewedVariations] = useState<{ prompt: string; hypothesis: string }[]>([]);
  const [regeneratingIndices, setRegeneratingIndices] = useState<number[]>([]);

  // Fetch variations
  const { data: variations = [], refetch: refetchVariations } = useQuery<Variation[]>({
    queryKey: ["/api/variations", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/variations?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch variations");
      return res.json();
    },
    enabled: !!projectId,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Fetch generation jobs
  const { data: jobs = [] } = useQuery<GenerationJob[]>({
    queryKey: ["/api/jobs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/jobs?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
    enabled: !!projectId,
  });

  // Fetch projects list
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      return response.json() as Promise<Asset>;
    },
    onSuccess: (asset) => {
      setSourceAsset(asset);
      toast({
        title: "Asset uploaded",
        description: `${asset.filename} has been uploaded successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file.",
        variant: "destructive",
      });
    },
  });

  // Preview prompts mutation - fetches Claude-enhanced prompts with hypotheses
  const previewPromptsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/preview-prompts", {
        prompt,
        sourceAssetId: sourceAsset?.id,
        variationTypes: selectedVariationTypes,
        brandProtections: selectedBrandProtections,
        variationCount,
      });
      return await response.json();
    },
    onSuccess: (data: { variations: { prompt: string; hypothesis: string }[] }) => {
      setPreviewedVariations(data.variations);
      setRegeneratingIndices([]);

      // Auto-generate if triggered from Generate button
      if (autoGenerateAfterPrompts.current) {
        autoGenerateAfterPrompts.current = false;
        generateMutation.mutate({ variations: data.variations });
      }
    },
    onError: () => {
      setRegeneratingIndices([]);
      toast({
        title: "Failed to generate prompts",
        description: "There was an error generating preview prompts. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate variations mutation
  const generateMutation = useMutation({
    mutationFn: async (params?: { variations?: { prompt: string; hypothesis: string }[] }) => {
      const response = await apiRequest("POST", "/api/generate", {
        projectId,
        sourceAssetId: sourceAsset?.id,
        variationCount,
        variationTypes: selectedVariationTypes,
        sizes: selectedSizes,
        modelId: selectedModelId,
        prompt,
        negativePrompt,
        variations: params?.variations,
      });
      return response.json();
    },
    onSuccess: (data: { projectId: string }) => {
      if (!projectId && data.projectId) {
        setProjectId(data.projectId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", data.projectId || projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/variations", data.projectId || projectId] });
      toast({
        title: "Generation started",
        description: `Generating ${variationCount * selectedSizes.length} variations...`,
      });
      // Start polling for job updates
      startJobPolling(data.projectId || projectId!);
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "There was an error starting the generation.",
        variant: "destructive",
      });
    },
  });

  // Polling for job updates
  const startJobPolling = useCallback((pid: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs?projectId=${pid}`);
        if (res.ok) {
          const jobsData: GenerationJob[] = await res.json();
          const allComplete = jobsData.every(
            (j) => j.status === "completed" || j.status === "failed"
          );

          // Force refetch to get latest data
          await queryClient.refetchQueries({ queryKey: ["/api/jobs", pid] });
          await queryClient.refetchQueries({ queryKey: ["/api/variations", pid] });

          if (allComplete) {
            clearInterval(pollInterval);
            const completed = jobsData.filter((j) => j.status === "completed").length;
            toast({
              title: "Generation complete",
              description: `${completed} variation${completed !== 1 ? "s" : ""} generated successfully.`,
            });
          }
        }
      } catch {
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds instead of 1

    // Clean up after 5 minutes max
    setTimeout(() => clearInterval(pollInterval), 300000);
  }, [toast]);

  // Update variation mutation (for feedback and status)
  const updateVariationMutation = useMutation({
    mutationFn: async ({ id, feedback, status }: { id: string; feedback?: string; status?: string }) => {
      const response = await apiRequest("PATCH", `/api/variations/${id}`, {
        feedback,
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variations", projectId] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating the variation.",
        variant: "destructive",
      });
    },
  });

  // Save project mutation
  const saveProjectMutation = useMutation({
    mutationFn: async () => {
      const method = projectId ? "PATCH" : "POST";
      const url = projectId ? `/api/projects/${projectId}` : "/api/projects";
      
      const response = await apiRequest(method, url, {
        name: projectName,
        sourceAsset,
        variationCount,
        selectedVariationTypes,
        selectedSizes,
        selectedModelId,
        prompt,
        negativePrompt,
      });
      return response.json();
    },
    onSuccess: (data: Project) => {
      if (!projectId && data.id) {
        setProjectId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSaveDialogOpen(false);
      toast({
        title: "Project saved",
        description: `"${projectName}" has been saved.`,
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "There was an error saving your project.",
        variant: "destructive",
      });
    },
  });

  // Load project
  const loadProject = useCallback((project: Project) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setSourceAsset(project.sourceAsset || null);
    setVariationCount(project.variationCount);
    setSelectedVariationTypes(project.selectedVariationTypes as VariationTypeId[]);
    setSelectedSizes(project.selectedSizes);
    setSelectedModelId(project.selectedModelId as AIModelId);
    setPrompt(project.prompt);
    setNegativePrompt(project.negativePrompt || "");
    setLoadDialogOpen(false);
    toast({
      title: "Project loaded",
      description: `"${project.name}" has been loaded.`,
    });
  }, [toast]);

  // New project
  const handleNewProject = useCallback(() => {
    setProjectId(null);
    setProjectName("Untitled Project");
    setSourceAsset(null);
    setVariationCount(3);
    setSelectedVariationTypes(["background-swap", "style-transfer"]);
    setSelectedSizes(defaultSizes);
    setSelectedModelId("nanobanana");
    setPrompt("");
    setNegativePrompt("");
    setIntroCard(null);
    setOutroCard(null);
    setSelectedVariationIds(new Set());
    setViewingVariation(null);
    toast({
      title: "New project",
      description: "Started a new project.",
    });
  }, [toast, defaultSizes]);

  // Handle file upload
  const handleUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      
      try {
        await uploadMutation.mutateAsync(file);
        setUploadProgress(100);
      } finally {
        clearInterval(progressInterval);
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [uploadMutation]
  );

  // Live prompt generation - regenerate prompts when config changes
  const isFirstRender = useRef(true);
  const autoGenerateAfterPrompts = useRef(false);
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only trigger if we have an asset and variation types selected
    if (!sourceAsset || selectedVariationTypes.length === 0) {
      return;
    }

    // Debounce the prompt generation
    const timer = setTimeout(() => {
      previewPromptsMutation.mutate();
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedVariationTypes, selectedBrandProtections, prompt, variationCount]);

  // Handle generation - generates directly without preview modal
  const handleGenerate = useCallback(() => {
    if (!sourceAsset) {
      toast({
        title: "No asset",
        description: "Please upload an asset first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSizes.length === 0) {
      toast({
        title: "No sizes selected",
        description: "Please select at least one output size.",
        variant: "destructive",
      });
      return;
    }

    // Generate directly - if we have variations, use them; otherwise fetch first
    if (previewedVariations.length > 0) {
      generateMutation.mutate({ variations: previewedVariations });
    } else {
      // Fetch variations first, then auto-generate on success
      autoGenerateAfterPrompts.current = true;
      previewPromptsMutation.mutate();
    }
  }, [sourceAsset, selectedSizes, previewPromptsMutation, previewedVariations, generateMutation, toast]);

  // Handle confirming generation after preview
  const handleConfirmGeneration = useCallback(() => {
    setPromptPreviewOpen(false);
    generateMutation.mutate({ variations: previewedVariations });
  }, [previewedVariations, generateMutation]);

  // Handle regenerating prompts
  const handleRegeneratePrompts = useCallback(() => {
    previewPromptsMutation.mutate();
  }, [previewPromptsMutation]);

  // Selection handlers
  const handleSelectVariation = useCallback((id: string, selected: boolean) => {
    setSelectedVariationIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedVariationIds(new Set(variations.map((v) => v.id)));
  }, [variations]);

  const handleDeselectAll = useCallback(() => {
    setSelectedVariationIds(new Set());
  }, []);

  // Variation update handlers
  const handleStatusChange = useCallback((variationId: string, status: string | undefined) => {
    updateVariationMutation.mutate({ id: variationId, status });
  }, [updateVariationMutation]);

  const handleFeedbackChange = useCallback((variationId: string, feedback: string) => {
    updateVariationMutation.mutate({ id: variationId, feedback });
  }, [updateVariationMutation]);

  // Job handlers
  const handleCancelJob = useCallback((jobId: string) => {
    // API call would go here
    toast({ title: "Job cancelled" });
  }, [toast]);

  const handleRetryJob = useCallback((jobId: string) => {
    // API call would go here
    toast({ title: "Retrying job..." });
  }, [toast]);

  const handleCancelAllJobs = useCallback(() => {
    // API call would go here
    toast({ title: "All jobs cancelled" });
  }, [toast]);

  // Calculate estimated cost
  const estimatedCost = useCallback(() => {
    const model = ["stability-sd3", "flux-pro", "replicate-wan", "kling", "luma-dream-machine", "runway-gen3", "veo-2"].find(
      (m) => m === selectedModelId
    );
    const costs: Record<string, number> = {
      "stability-sd3": 0.03,
      "flux-pro": 0.05,
      "replicate-wan": 0.10,
      "kling": 0.20,
      "luma-dream-machine": 0.15,
      "runway-gen3": 0.25,
      "veo-2": 0.50,
    };
    const costPerGen = costs[selectedModelId] || 0.05;
    return (variationCount * selectedSizes.length * costPerGen).toFixed(2);
  }, [selectedModelId, variationCount, selectedSizes.length]);

  const canGenerate = sourceAsset && selectedSizes.length > 0 && !generateMutation.isPending;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            data-testid="button-toggle-left-panel"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">AdGen Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-48 h-8 text-sm"
            data-testid="input-project-name"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewProject}
            data-testid="button-new-project"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New
          </Button>

          <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-open-project">
                <FolderOpen className="h-4 w-4 mr-1.5" />
                Open
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open Project</DialogTitle>
                <DialogDescription>
                  Select a project to continue working on.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[300px]">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No saved projects yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        className="w-full text-left rounded-lg border border-border p-3 hover-elevate"
                        onClick={() => loadProject(project)}
                        data-testid={`button-load-project-${project.id}`}
                      >
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => saveProjectMutation.mutate()}
            disabled={saveProjectMutation.isPending}
            data-testid="button-save-project"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            data-testid="button-toggle-right-panel"
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`shrink-0 border-r border-border bg-card transition-all ${
            leftPanelOpen ? "w-[360px]" : "w-0"
          }`}
        >
          {leftPanelOpen && (
            <div className="flex h-full flex-col">
              {/* Workflow Stepper */}
              <WorkflowStepper
                hasAsset={!!sourceAsset}
                hasSizes={selectedSizes.length > 0}
                isGenerating={generateMutation.isPending}
              />
              <ScrollArea className="flex-1">
                <Accordion
                  type="multiple"
                  value={openAccordions}
                  onValueChange={setOpenAccordions}
                  className="w-full"
                >
                  <AccordionItem value="upload" className="border-b border-border">
                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Source Asset
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <UploadZone
                        asset={sourceAsset}
                        onUpload={handleUpload}
                        onRemove={() => setSourceAsset(null)}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="variation" className="border-b border-border">
                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Variation Settings
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <VariationConfig
                        variationCount={variationCount}
                        onVariationCountChange={setVariationCount}
                        selectedTypes={selectedVariationTypes}
                        onTypesChange={setSelectedVariationTypes}
                        selectedProtections={selectedBrandProtections}
                        onProtectionsChange={setSelectedBrandProtections}
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        negativePrompt={negativePrompt}
                        onNegativePromptChange={setNegativePrompt}
                        assetType={sourceAsset?.type || null}
                        previewedPrompts={previewedVariations.map(v => v.prompt)}
                        isLoadingPrompts={previewPromptsMutation.isPending}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="sizes" className="border-b border-border">
                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Output Sizes
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <SizeSelector
                        selectedSizes={selectedSizes}
                        onSizesChange={setSelectedSizes}
                        maxSelections={6}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="model" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        Style
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-4">
                      <ModelSelector
                        selectedModelId={selectedModelId}
                        onModelChange={setSelectedModelId}
                        assetType={sourceAsset?.type || null}
                      />

                      {/* Show video cards for video/i2v models */}
                      {selectedModelId && availableModels.find(m => m.id === selectedModelId)?.type !== 'image' && (
                        <VideoCards
                          introCard={introCard}
                          outroCard={outroCard}
                          onIntroUpload={async (file) => {
                            const formData = new FormData();
                            formData.append("file", file);
                            const response = await fetch("/api/upload", { method: "POST", body: formData });
                            if (response.ok) {
                              const asset = await response.json();
                              setIntroCard(asset);
                            }
                          }}
                          onOutroUpload={async (file) => {
                            const formData = new FormData();
                            formData.append("file", file);
                            const response = await fetch("/api/upload", { method: "POST", body: formData });
                            if (response.ok) {
                              const asset = await response.json();
                              setOutroCard(asset);
                            }
                          }}
                          onRemoveIntro={() => setIntroCard(null)}
                          onRemoveOutro={() => setOutroCard(null)}
                        />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>

              {/* Generate Button */}
              <div className="border-t border-border p-4 space-y-3">
                <div className="text-center text-sm text-muted-foreground">
                  {variationCount} variations × {selectedSizes.length} sizes
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  data-testid="button-generate"
                >
                  <Play className="h-4 w-4" />
                  Generate {variationCount * selectedSizes.length} Variations
                </Button>
              </div>
            </div>
          )}
        </aside>

        {/* Center Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Generation Progress Bar */}
          {jobs.length > 0 && jobs.some(j => j.status === 'processing' || j.status === 'queued') && (
            <div className="border-b border-border bg-primary/5 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium">
                    Generating variations...
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {jobs.filter(j => j.status === 'completed').length} of {jobs.length} complete
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <ResultsGrid
              variations={variations}
              selectedIds={selectedVariationIds}
              onSelectVariation={handleSelectVariation}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onViewVariation={(v) => {
                setViewingVariation(v);
                setRightPanelOpen(true);
              }}
              onDownloadVariation={(v) => {
                setSelectedVariationIds(new Set([v.id]));
                setExportModalOpen(true);
              }}
              onDeleteVariation={(v) => {
                toast({ title: "Variation deleted" });
              }}
              onBulkDownload={() => setExportModalOpen(true)}
              onBulkDelete={() => {
                toast({ title: `${selectedVariationIds.size} variations deleted` });
                setSelectedVariationIds(new Set());
              }}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Generation Queue */}
          <GenerationQueue
            jobs={jobs}
            variations={variations}
            onCancelJob={handleCancelJob}
            onRetryJob={handleRetryJob}
            onCancelAll={handleCancelAllJobs}
            onStatusChange={handleStatusChange}
            onFeedbackChange={handleFeedbackChange}
          />
        </main>

        {/* Right Detail Panel */}
        <aside
          className={`shrink-0 border-l border-border bg-card transition-all ${
            rightPanelOpen ? "w-[360px]" : "w-0"
          }`}
        >
          {rightPanelOpen && (
            <DetailPanel
              variation={viewingVariation}
              onClose={() => {
                setViewingVariation(null);
                setRightPanelOpen(false);
              }}
              onDownload={(format) => {
                if (viewingVariation) {
                  setSelectedVariationIds(new Set([viewingVariation.id]));
                  setExportModalOpen(true);
                }
              }}
              onRefine={(prompt) => {
                toast({ title: "Generating refined version..." });
              }}
              onFeedbackChange={(feedback) => {
                if (viewingVariation) {
                  handleFeedbackChange(viewingVariation.id, feedback);
                }
              }}
              onStatusChange={(status) => {
                if (viewingVariation) {
                  handleStatusChange(viewingVariation.id, status);
                }
              }}
            />
          )}
        </aside>
      </div>

      {/* Lightbox */}
      <Lightbox
        variation={lightboxVariation}
        variations={variations}
        onClose={() => setLightboxVariation(null)}
        onNavigate={setLightboxVariation}
        onDownload={(v) => {
          setSelectedVariationIds(new Set([v.id]));
          setExportModalOpen(true);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        variations={
          selectedVariationIds.size > 0
            ? variations.filter((v) => selectedVariationIds.has(v.id))
            : variations
        }
        projectName={projectName}
      />

      {/* Prompt Preview Modal (kept for potential future use) */}
      <PromptPreviewModal
        open={promptPreviewOpen}
        onOpenChange={setPromptPreviewOpen}
        prompts={previewedVariations.map(v => v.prompt)}
        onPromptsChange={(prompts) => setPreviewedVariations(prompts.map((p, i) => ({
          prompt: p,
          hypothesis: previewedVariations[i]?.hypothesis || ''
        })))}
        onRegenerate={handleRegeneratePrompts}
        onConfirm={handleConfirmGeneration}
        isLoading={previewPromptsMutation.isPending}
        isGenerating={generateMutation.isPending}
        variationCount={variationCount}
        selectedSizesCount={selectedSizes.length}
        regeneratingIndices={regeneratingIndices}
      />
    </div>
  );
}
