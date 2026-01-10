import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VariationCard } from "./variation-card";
import { Download, Trash2, CheckSquare, Square, Grid3X3, List, ImageOff } from "lucide-react";
import type { Variation, SizeConfig } from "@shared/schema";

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
        <div className="rounded-full bg-muted p-4 mb-4">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No variations yet</h3>
        <p className="text-sm text-muted-foreground max-w-[300px]">
          Upload an asset and configure your settings to generate creative variations.
        </p>
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
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
