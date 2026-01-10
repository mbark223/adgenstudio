import { useState, useCallback } from "react";
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
import { ExportModal, type ExportOptions } from "@/components/export-modal";
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

  // Project State
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sourceAsset, setSourceAsset] = useState<Asset | null>(null);
  const [variationCount, setVariationCount] = useState(5);
  const [selectedVariationTypes, setSelectedVariationTypes] = useState<VariationTypeId[]>([
    "background-swap",
    "style-transfer",
  ]);
  const [selectedSizes, setSelectedSizes] = useState<SizeConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<AIModelId>("stability-sd3");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Fetch variations
  const { data: variations = [] } = useQuery<Variation[]>({
    queryKey: ["/api/variations", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/variations?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch variations");
      return res.json();
    },
    enabled: !!projectId,
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

  // Generate variations mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate", {
        projectId,
        sourceAssetId: sourceAsset?.id,
        variationCount,
        variationTypes: selectedVariationTypes,
        sizes: selectedSizes,
        modelId: selectedModelId,
        prompt,
        negativePrompt,
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
          
          queryClient.invalidateQueries({ queryKey: ["/api/jobs", pid] });
          queryClient.invalidateQueries({ queryKey: ["/api/variations", pid] });
          
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
    }, 1000);

    // Clean up after 5 minutes max
    setTimeout(() => clearInterval(pollInterval), 300000);
  }, [toast]);

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
    setVariationCount(5);
    setSelectedVariationTypes(["background-swap", "style-transfer"]);
    setSelectedSizes([]);
    setSelectedModelId("stability-sd3");
    setPrompt("");
    setNegativePrompt("");
    setSelectedVariationIds(new Set());
    setViewingVariation(null);
    toast({
      title: "New project",
      description: "Started a new project.",
    });
  }, [toast]);

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

  // Handle generation
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
    
    generateMutation.mutate();
  }, [sourceAsset, selectedSizes, generateMutation, toast]);

  // Handle export
  const handleExport = useCallback((options: ExportOptions) => {
    setIsExporting(true);
    setExportProgress(0);
    
    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setExportModalOpen(false);
          toast({
            title: "Export complete",
            description: `${selectedVariationIds.size || variations.length} files have been exported.`,
          });
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  }, [selectedVariationIds.size, variations.length, toast]);

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
            leftPanelOpen ? "w-80" : "w-0"
          }`}
        >
          {leftPanelOpen && (
            <div className="flex h-full flex-col">
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
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        negativePrompt={negativePrompt}
                        onNegativePromptChange={setNegativePrompt}
                        assetType={sourceAsset?.type || null}
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
                        AI Model
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <ModelSelector
                        selectedModelId={selectedModelId}
                        onModelChange={setSelectedModelId}
                        assetType={sourceAsset?.type || null}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>

              {/* Generate Button */}
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {variationCount} variations × {selectedSizes.length} sizes
                  </span>
                  <span className="font-mono">
                    ~${estimatedCost()}
                  </span>
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
            />
          </div>

          {/* Generation Queue */}
          <GenerationQueue
            jobs={jobs}
            onCancelJob={handleCancelJob}
            onRetryJob={handleRetryJob}
            onCancelAll={handleCancelAllJobs}
          />
        </main>

        {/* Right Detail Panel */}
        <aside
          className={`shrink-0 border-l border-border bg-card transition-all ${
            rightPanelOpen ? "w-80" : "w-0"
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
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />
    </div>
  );
}
