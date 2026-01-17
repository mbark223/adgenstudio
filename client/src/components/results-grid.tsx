import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VariationCard } from "./variation-card";
import { Download, Trash2, CheckSquare, Square, Grid3X3, List, Upload, Settings, Sparkles, ArrowRight, Trophy, Swords, Expand, X, Image, Film, Layers, Search, ArrowLeftRight } from "lucide-react";
import type { Variation, SizeConfig, VariationStatus, GenerationJob } from "@shared/schema";
import { platformPresets } from "@shared/schema";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Download a single file
async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error(`Failed to download ${filename}:`, error);
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

interface ResultsGridProps {
  variations: Variation[];
  jobs?: GenerationJob[];
  selectedIds: Set<string>;
  onSelectVariation: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onViewVariation: (variation: Variation) => void;
  onDownloadVariation: (variation: Variation) => void;
  onDeleteVariation: (variation: Variation) => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onStatusChange?: (variationId: string, status: VariationStatus | undefined) => void;
  onViewJob?: (job: GenerationJob) => void;
  onDownloadJob?: (job: GenerationJob) => void;
  onJobStatusChange?: (jobId: string, testStatus: string | undefined) => void;
  onResizeJob?: (sourceJobId: string, targetSizes: SizeConfig[]) => void;
}

export function ResultsGrid({
  variations,
  jobs = [],
  selectedIds,
  onSelectVariation,
  onSelectAll,
  onDeselectAll,
  onViewVariation,
  onDownloadVariation,
  onDeleteVariation,
  onBulkDownload,
  onBulkDelete,
  onStatusChange,
  onViewJob,
  onDownloadJob,
  onJobStatusChange,
  onResizeJob,
}: ResultsGridProps) {
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null);
  const [resizeModalOpen, setResizeModalOpen] = useState(false);
  const [selectedSizesForResize, setSelectedSizesForResize] = useState<SizeConfig[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compareVariations, setCompareVariations] = useState<Variation[]>([]);

  // Get completed jobs for display when variations aren't loaded
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.result?.url);

  const allJobsSelected = completedJobs.length > 0 && completedJobs.every((j) => selectedJobIds.has(j.id));

  const handleJobSelect = (jobId: string, selected: boolean) => {
    const newSelectedIds = new Set(selectedJobIds);
    if (selected) {
      newSelectedIds.add(jobId);
    } else {
      newSelectedIds.delete(jobId);
    }
    setSelectedJobIds(newSelectedIds);
  };

  const handleSelectAllJobs = () => {
    if (allJobsSelected) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(completedJobs.map(j => j.id)));
    }
  };

  const handleBulkDownloadJobs = async () => {
    const jobsToDownload = completedJobs.filter(j => selectedJobIds.has(j.id));
    for (const job of jobsToDownload) {
      if (job.result?.url) {
        const filename = `${job.sizeConfig.platform}_${job.sizeConfig.width}x${job.sizeConfig.height}_v${job.variationIndex + 1}.${job.result.url.split('.').pop() || 'png'}`;
        await downloadFile(job.result.url, filename);
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const uniqueSizes = Array.from(
    new Map(
      variations.map((v) => [
        `${v.sizeConfig.width}x${v.sizeConfig.height}`,
        v.sizeConfig,
      ])
    ).values()
  );

  // Get unique models
  const uniqueModels = Array.from(new Set(variations.map(v => v.modelId)));

  // Apply all filters
  const filteredVariations = variations.filter(v => {
    // Search by prompt content
    if (searchQuery && !v.prompt.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by size
    if (sizeFilter && `${v.sizeConfig.width}x${v.sizeConfig.height}` !== sizeFilter) {
      return false;
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && v.status) return false;
      if (statusFilter !== 'pending' && v.status !== statusFilter) return false;
    }

    // Filter by model
    if (modelFilter !== 'all' && v.modelId !== modelFilter) {
      return false;
    }

    return true;
  });

  const allSelected = filteredVariations.length > 0 &&
    filteredVariations.every((v) => selectedIds.has(v.id));

  // Show completed jobs grid if we have completed jobs but no variations yet
  if (variations.length === 0 && completedJobs.length > 0) {
    return (
      <div className="flex h-full" data-results-grid>
        {/* Main Grid */}
        <div className="flex flex-1 flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allJobsSelected}
                onCheckedChange={handleSelectAllJobs}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Generated Results</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {completedJobs.length} complete
              </Badge>
              {selectedJobIds.size > 0 && (
                <Badge variant="default" className="font-mono text-xs">
                  {selectedJobIds.size} selected
                </Badge>
              )}
            </div>

            {selectedJobIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkDownloadJobs}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download {selectedJobIds.size} {selectedJobIds.size === 1 ? 'File' : 'Files'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedJobIds(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {completedJobs.map((job) => {
                const isJobSelected = selectedJobIds.has(job.id);
                return (
                <div
                  key={job.id}
                  className={`group relative rounded-lg border overflow-hidden transition-all ${
                    isJobSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : selectedJob?.id === job.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  {/* Checkbox overlay */}
                  <div className="absolute top-2 left-2 z-20">
                    <div className="rounded bg-background/80 backdrop-blur-sm p-1 shadow-sm">
                      <Checkbox
                        checked={isJobSelected}
                        onCheckedChange={(checked) => handleJobSelect(job.id, checked as boolean)}
                        className="h-4 w-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div
                    className="relative bg-muted w-full cursor-pointer"
                    style={{
                      aspectRatio: `${job.sizeConfig.width} / ${job.sizeConfig.height}`
                    }}
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  >
                    <img
                      src={job.result?.thumbnailUrl || job.result?.url}
                      alt={`Variation ${job.variationIndex + 1}`}
                      className="h-full w-full object-contain"
                    />
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-end justify-between">
                        <div className="text-white">
                          <p className="text-sm font-medium">Variation {job.variationIndex + 1}</p>
                          <p className="text-xs opacity-80 font-mono">{job.sizeConfig.width}x{job.sizeConfig.height}</p>
                        </div>
                        <div className="flex gap-1">
                          {onDownloadJob && (
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownloadJob(job);
                              }}
                            >
                              <Download className="h-4 w-4 text-white" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">V{job.variationIndex + 1}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {job.sizeConfig.platform || 'Generated'} • {job.sizeConfig.placement || job.sizeConfig.name}
                    </p>
                  </div>
                </div>
              );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        {selectedJob && (
          <div className="w-[360px] shrink-0 border-l border-border bg-card">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-medium">Variation Details</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedJob(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-6 p-4">
                  {/* Image Preview */}
                  <div
                    className="relative rounded-lg overflow-hidden bg-muted w-full cursor-pointer group"
                    style={{
                      aspectRatio: `${selectedJob.sizeConfig.width} / ${selectedJob.sizeConfig.height}`
                    }}
                    onClick={() => onViewJob?.(selectedJob)}
                  >
                    <img
                      src={selectedJob.result?.url}
                      alt={`Variation ${selectedJob.variationIndex + 1}`}
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                    {/* Enlarge hint overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                        <Expand className="h-4 w-4" />
                        <span className="text-sm font-medium">Click to enlarge</span>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">
                      Variation {selectedJob.variationIndex + 1}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedJob.sizeConfig.platform} • {selectedJob.sizeConfig.name}
                    </p>
                  </div>

                  <Separator />

                  {/* Metadata */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Metadata
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Dimensions</span>
                        <span className="font-mono">{selectedJob.sizeConfig.width}x{selectedJob.sizeConfig.height}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Platform</span>
                        <span>{selectedJob.sizeConfig.platform}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Placement</span>
                        <span>{selectedJob.sizeConfig.placement}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Image className="h-3 w-3" />
                          image
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Hypothesis */}
                  {selectedJob.hypothesis && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Hypothesis
                        </p>
                        <p className="text-sm bg-primary/5 border border-primary/20 rounded-md p-3 italic">
                          {selectedJob.hypothesis}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Use this hypothesis to measure performance in your A/B tests
                        </p>
                      </div>
                    </>
                  )}

                  {/* A/B Test Status */}
                  {onJobStatusChange && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          A/B Test Status
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={selectedJob.testStatus === 'winner' ? "default" : "outline"}
                            className={`flex-1 ${selectedJob.testStatus === 'winner' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                            onClick={() => {
                              onJobStatusChange(selectedJob.id, selectedJob.testStatus === 'winner' ? undefined : 'winner');
                              setSelectedJob({ ...selectedJob, testStatus: selectedJob.testStatus === 'winner' ? undefined : 'winner' });
                            }}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            Winner
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedJob.testStatus === 'challenger' ? "secondary" : "outline"}
                            className="flex-1"
                            onClick={() => {
                              onJobStatusChange(selectedJob.id, selectedJob.testStatus === 'challenger' ? undefined : 'challenger');
                              setSelectedJob({ ...selectedJob, testStatus: selectedJob.testStatus === 'challenger' ? undefined : 'challenger' });
                            }}
                          >
                            <Swords className="h-4 w-4 mr-2" />
                            Challenger
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Prompt */}
                  {selectedJob.prompt && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Creative Direction Used
                        </p>
                        <p className="text-sm font-mono bg-muted rounded-md p-3">
                          {selectedJob.prompt}
                        </p>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Download */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Download
                    </p>
                    <Button
                      className="w-full"
                      onClick={async () => {
                        if (selectedJob.result?.url) {
                          const metadata = selectedJob.result.metadata;
                          const filename = `adgen_${metadata?.width}x${metadata?.height}_${Date.now()}.${selectedJob.result.url.split('.').pop() || 'png'}`;
                          await downloadFile(selectedJob.result.url, filename);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Image
                    </Button>
                  </div>

                  {/* Create Other Sizes */}
                  {onResizeJob && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Create Other Sizes
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setSelectedSizesForResize([]);
                            setResizeModalOpen(true);
                          }}
                        >
                          <Layers className="h-4 w-4 mr-2" />
                          Create Other Sizes
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Resize this image for other platforms without regenerating
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Resize Modal */}
        <Dialog open={resizeModalOpen} onOpenChange={setResizeModalOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Other Sizes</DialogTitle>
              <DialogDescription>
                Select platform sizes to create resized versions of this image.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {Object.entries(platformPresets).map(([platformKey, platform]) => {
                  const currentSize = selectedJob?.sizeConfig;
                  const availableSizes = platform.sizes.filter(
                    (s) => !(s.width === currentSize?.width && s.height === currentSize?.height)
                  );

                  if (availableSizes.length === 0) return null;

                  return (
                    <div key={platformKey} className="space-y-2">
                      <p className="text-sm font-medium">{platform.displayName}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {availableSizes.map((size) => {
                          const sizeConfig: SizeConfig = {
                            ...size,
                            platform: platformKey,
                          };
                          const isSelected = selectedSizesForResize.some(
                            (s) => s.width === size.width && s.height === size.height && s.platform === platformKey
                          );
                          return (
                            <button
                              key={`${platformKey}-${size.name}`}
                              className={`text-left p-2 rounded-md border text-sm transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-muted-foreground/50"
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedSizesForResize((prev) =>
                                    prev.filter(
                                      (s) => !(s.width === size.width && s.height === size.height && s.platform === platformKey)
                                    )
                                  );
                                } else {
                                  setSelectedSizesForResize((prev) => [...prev, sizeConfig]);
                                }
                              }}
                            >
                              <p className="font-medium">{size.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {size.width}x{size.height}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResizeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={selectedSizesForResize.length === 0}
                onClick={() => {
                  if (selectedJob && onResizeJob) {
                    onResizeJob(selectedJob.id, selectedSizesForResize);
                    setResizeModalOpen(false);
                  }
                }}
              >
                Create {selectedSizesForResize.length} Size{selectedSizesForResize.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (variations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Create Ad Variations</h2>
            <p className="text-sm text-muted-foreground">
              Generate multiple creative variations of your ad in seconds
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="font-medium">Upload your asset</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Drop an image or video in the sidebar to get started
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                2
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Configure settings</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose platforms, sizes, and style
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                3
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Generate variations</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click generate and watch your ad variations come to life
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
            <span>Start by uploading an asset in the left sidebar</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-results-grid>
      {/* Search and Filters Bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by prompt content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="winner">Winners</SelectItem>
              <SelectItem value="challenger">Challengers</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {uniqueModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== 'all' || modelFilter !== 'all' || sizeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setModelFilter('all');
                setSizeFilter(null);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results count */}
        {filteredVariations.length !== variations.length && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredVariations.length} of {variations.length} variations
          </p>
        )}
      </div>

      {/* Size Filters and Actions Bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={sizeFilter === null ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSizeFilter(null)}
            data-testid="button-filter-all"
          >
            All ({variations.length})
          </Button>
          {uniqueSizes.map((size) => {
            const key = `${size.width}x${size.height}`;
            const count = variations.filter(
              (v) => `${v.sizeConfig.width}x${v.sizeConfig.height}` === key
            ).length;
            return (
              <Button
                key={key}
                variant={sizeFilter === key ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs font-mono"
                onClick={() => setSizeFilter(key)}
                data-testid={`button-filter-${key}`}
              >
                {key} ({count})
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border">
            <Button
              variant={viewMode === 'grid' ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-l-none"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            data-testid="button-select-all"
          >
            {allSelected ? (
              <>
                <CheckSquare className="h-3.5 w-3.5" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="h-3.5 w-3.5" />
                Select All
              </>
            )}
          </Button>

          {selectedIds.size > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {selectedIds.size} selected
              </Badge>
              {selectedIds.size >= 2 && selectedIds.size <= 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    const selected = filteredVariations.filter(v => selectedIds.has(v.id));
                    setCompareVariations(selected);
                    setComparisonMode(true);
                  }}
                  data-testid="button-compare"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Compare ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={onBulkDownload}
                data-testid="button-bulk-download"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
                onClick={onBulkDelete}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div
          className={`p-4 ${
            viewMode === 'grid'
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              : "space-y-3"
          }`}
        >
          {filteredVariations.map((variation) => (
            <VariationCard
              key={variation.id}
              variation={variation}
              isSelected={selectedIds.has(variation.id)}
              onSelect={(selected) => onSelectVariation(variation.id, selected)}
              onView={() => onViewVariation(variation)}
              onDownload={() => onDownloadVariation(variation)}
              onDelete={() => onDeleteVariation(variation)}
              onStatusChange={onStatusChange ? (status) => onStatusChange(variation.id, status) : undefined}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Comparison Dialog */}
      <Dialog open={comparisonMode} onOpenChange={setComparisonMode}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Variations</DialogTitle>
            <DialogDescription>
              Side-by-side comparison of {compareVariations.length} selected variations
            </DialogDescription>
          </DialogHeader>

          <div className={`grid gap-4 ${compareVariations.length === 2 ? 'grid-cols-2' : compareVariations.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
            {compareVariations.map(v => (
              <div key={v.id} className="space-y-3 border rounded-lg p-3">
                <img
                  src={v.url}
                  alt={`V${v.variationIndex + 1}`}
                  className="w-full rounded-lg border"
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Variation {v.variationIndex + 1}</p>
                    {v.status && (
                      <Badge variant={v.status === 'winner' ? 'default' : 'secondary'} className="text-xs">
                        {v.status === 'winner' && <Trophy className="h-3 w-3 mr-1" />}
                        {v.status === 'challenger' && <Swords className="h-3 w-3 mr-1" />}
                        {v.status}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-mono">{v.sizeConfig.width}x{v.sizeConfig.height}</p>
                    <p>{v.sizeConfig.platform} • {v.sizeConfig.placement}</p>
                    <p>Model: {v.modelId}</p>
                    <p className="font-mono text-[10px]">{v.sizeConfig.name}</p>
                  </div>

                  {v.hypothesis && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium mb-1">Hypothesis</p>
                      <p className="text-xs text-muted-foreground italic">{v.hypothesis}</p>
                    </div>
                  )}

                  {v.feedback && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium mb-1">Feedback</p>
                      <p className="text-xs text-muted-foreground">{v.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
