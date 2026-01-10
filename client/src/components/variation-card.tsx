import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Expand, Trash2, Play, Image, Film } from "lucide-react";
import type { Variation } from "@shared/schema";

interface VariationCardProps {
  variation: Variation;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function VariationCard({
  variation,
  isSelected,
  onSelect,
  onView,
  onDownload,
  onDelete,
}: VariationCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className={`group relative rounded-lg border overflow-hidden transition-all ${
        isSelected 
          ? "border-primary ring-2 ring-primary/20" 
          : "border-border hover:border-muted-foreground/50"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`variation-card-${variation.id}`}
    >
      <div className="absolute left-3 top-3 z-10">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-background/80 backdrop-blur-sm">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="h-4 w-4"
            data-testid={`checkbox-select-${variation.id}`}
          />
        </div>
      </div>

      <div className="aspect-square relative bg-muted">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
        <img
          src={variation.thumbnailUrl || variation.url}
          alt={`Variation ${variation.variationIndex + 1}`}
          className={`h-full w-full object-cover transition-opacity ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {variation.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="h-5 w-5 text-white" fill="white" />
            </div>
          </div>
        )}

        <div
          className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 transition-opacity ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex justify-end">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur-sm">
              {variation.type === 'image' ? (
                <Image className="h-3 w-3 mr-1" />
              ) : (
                <Film className="h-3 w-3 mr-1" />
              )}
              {variation.sizeConfig.width}x{variation.sizeConfig.height}
            </Badge>
          </div>
          
          <div className="flex items-end justify-between">
            <div className="text-white">
              <p className="text-sm font-medium">Variation {variation.variationIndex + 1}</p>
              <p className="text-xs opacity-80">{variation.sizeConfig.name}</p>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                data-testid={`button-download-${variation.id}`}
              >
                <Download className="h-4 w-4 text-white" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                data-testid={`button-expand-${variation.id}`}
              >
                <Expand className="h-4 w-4 text-white" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                data-testid={`button-delete-${variation.id}`}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">V{variation.variationIndex + 1}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {variation.sizeConfig.platform} • {variation.sizeConfig.placement}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
