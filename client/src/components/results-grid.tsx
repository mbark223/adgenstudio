import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { VariationCard } from "./variation-card";
import { Download, Trash2, CheckSquare, Square, Grid3X3, List, Upload, Settings, Sparkles, ArrowRight, Trophy, Swords, Expand, X, Image, Film } from "lucide-react";
import type { Variation, SizeConfig, VariationStatus, GenerationJob } from "@shared/schema";

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
}: ResultsGridProps) {
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null);

  // Get completed jobs for display when variations aren't loaded
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.result?.url);

  const uniqueSizes = Array.from(
    new Map(
      variations.map((v) => [
        `${v.sizeConfig.width}x${v.sizeConfig.height}`,
        v.sizeConfig,
      ])
    ).values()
  );

  const filteredVariations = sizeFilter
    ? variations.filter(
        (v) => `${v.sizeConfig.width}x${v.sizeConfig.height}` === sizeFilter
      )
    : variations;

  const allSelected = filteredVariations.length > 0 &&
    filteredVariations.every((v) => selectedIds.has(v.id));

  // Show completed jobs grid if we have completed jobs but no variations yet
  if (variations.length === 0 && completedJobs.length > 0) {
    return (
      <div className="flex h-full">
        {/* Main Grid */}
        <div className="flex flex-1 flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Generated Results</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {completedJobs.length} complete
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {completedJobs.map((job) => (
                <div
                  key={job.id}
                  className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                    selectedJob?.id === job.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                >
                  <div className="aspect-square relative bg-muted">
                    <img
                      src={job.result?.thumbnailUrl || job.result?.url}
                      alt={`Variation ${job.variationIndex + 1}`}
                      className="h-full w-full object-cover"
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
              ))}
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
                  <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={selectedJob.result?.url}
                      alt={`Variation ${selectedJob.variationIndex + 1}`}
                      className="h-full w-full object-contain"
                    />
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
                      onClick={() => {
                        if (selectedJob.result?.url) {
                          window.open(selectedJob.result.url, '_blank');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Image
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
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
    <div className="flex h-full flex-col">
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
    </div>
  );
}
