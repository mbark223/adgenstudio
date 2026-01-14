import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VariationCard } from "./variation-card";
import { Download, Trash2, CheckSquare, Square, Grid3X3, List, Upload, Settings, Sparkles, ArrowRight } from "lucide-react";
import type { Variation, SizeConfig, VariationStatus } from "@shared/schema";

interface ResultsGridProps {
  variations: Variation[];
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
}

export function ResultsGrid({
  variations,
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
}: ResultsGridProps) {
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
