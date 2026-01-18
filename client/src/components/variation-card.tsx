import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Expand, Trash2, Image, Trophy, Swords, Loader2 } from "lucide-react";
import type { Variation, VariationStatus } from "@shared/schema";

interface VariationCardProps {
  variation: Variation;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onStatusChange?: (status: VariationStatus | undefined) => void;
}

export function VariationCard({
  variation,
  isSelected,
  onSelect,
  onView,
  onDownload,
  onDelete,
  onStatusChange,
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

      <div
        className="relative bg-muted w-full cursor-pointer group"
        style={{
          aspectRatio: `${variation.sizeConfig.width} / ${variation.sizeConfig.height}`
        }}
        onClick={onView}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse">
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <img
          src={variation.thumbnailUrl || variation.url}
          alt={`Variation ${variation.variationIndex + 1}`}
          className={`h-full w-full object-contain transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } group-hover:scale-105`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />

        {/* Enlarge hint overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <Expand className="h-4 w-4" />
            <span className="text-sm font-medium">Click to enlarge</span>
          </div>
        </div>
        
        <div
          className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 transition-opacity z-10 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur-sm">
              <Image className="h-3 w-3 mr-1" />
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

      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">V{variation.variationIndex + 1}</p>
              {variation.status === 'winner' && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0">
                  <Trophy className="h-3 w-3 mr-0.5" />
                  Winner
                </Badge>
              )}
              {variation.status === 'challenger' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <Swords className="h-3 w-3 mr-0.5" />
                  Challenger
                </Badge>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {variation.sizeConfig.platform} • {variation.sizeConfig.placement}
            </p>
          </div>
        </div>

        {/* Hypothesis */}
        {variation.hypothesis && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic border-l-2 border-primary/30 pl-2">
            {variation.hypothesis}
          </p>
        )}

        {/* Status Actions */}
        {onStatusChange && (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={variation.status === 'winner' ? "default" : "outline"}
              className={`h-7 text-xs flex-1 ${variation.status === 'winner' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(variation.status === 'winner' ? undefined : 'winner');
              }}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Winner
            </Button>
            <Button
              size="sm"
              variant={variation.status === 'challenger' ? "secondary" : "outline"}
              className="h-7 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(variation.status === 'challenger' ? undefined : 'challenger');
              }}
            >
              <Swords className="h-3 w-3 mr-1" />
              Challenger
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
