import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronLeft, ChevronRight, Download, Image, Film, Sparkles, MessageSquare } from "lucide-react";
import type { Variation } from "@shared/schema";

interface LightboxProps {
  variation: Variation | null;
  variations: Variation[];
  onClose: () => void;
  onNavigate: (variation: Variation) => void;
  onDownload: (variation: Variation) => void;
  onRefine?: (variation: Variation, refinementPrompt: string) => void;
}

export function Lightbox({ variation, variations, onClose, onNavigate, onDownload, onRefine }: LightboxProps) {
  const [showRefinement, setShowRefinement] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState("");

  const currentIndex = variation
    ? variations.findIndex((v) => v.id === variation.id)
    : -1;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < variations.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(variations[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, variations, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(variations[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, variations, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    if (variation) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [variation, handlePrev, handleNext, onClose]);

  if (!variation) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 h-10 w-10 text-white hover:bg-white/10"
        onClick={onClose}
        data-testid="button-close-lightbox"
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="absolute top-4 left-4 flex items-center gap-3">
        <Badge variant="secondary" className="text-sm">
          {currentIndex + 1} / {variations.length}
        </Badge>
        <div className="text-white text-sm">
          <span className="font-medium">Variation {variation.variationIndex + 1}</span>
          <span className="text-white/60 mx-2">•</span>
          <span className="font-mono text-white/80">
            {variation.sizeConfig.width}x{variation.sizeConfig.height}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/10 disabled:opacity-30"
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        disabled={!hasPrev}
        data-testid="button-lightbox-prev"
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/10 disabled:opacity-30"
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        disabled={!hasNext}
        data-testid="button-lightbox-next"
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      <div
        className="max-h-[90vh] max-w-[85vw] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={variation.url}
          alt={`Variation ${variation.variationIndex + 1}`}
          className="max-h-[90vh] max-w-[85vw] object-contain rounded-lg"
        />
        
        {variation.type === 'video' && (
          <Badge className="absolute top-3 right-3 gap-1">
            <Film className="h-3 w-3" />
            Video
          </Badge>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        {/* Refinement Panel */}
        {showRefinement && onRefine && (
          <div
            className="bg-background/95 backdrop-blur-sm rounded-lg border border-border p-4 shadow-lg w-[500px] mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create Refined Variation
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowRefinement(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Textarea
                placeholder="Describe changes you want (e.g., 'make the background brighter', 'add more contrast', 'change to warmer tones')..."
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    if (refinementPrompt.trim() && variation) {
                      onRefine(variation, refinementPrompt);
                      setRefinementPrompt("");
                      setShowRefinement(false);
                      onClose();
                    }
                  }}
                  disabled={!refinementPrompt.trim()}
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Refined Version
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRefinementPrompt("");
                    setShowRefinement(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2">
            <Badge variant="secondary" className="gap-1">
              {variation.type === 'image' ? (
                <Image className="h-3 w-3" />
              ) : (
                <Film className="h-3 w-3" />
              )}
              {variation.type}
            </Badge>
            <span className="text-sm text-white">
              {variation.sizeConfig.platform} • {variation.sizeConfig.name}
            </span>
          </div>

          {onRefine && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                setShowRefinement(!showRefinement);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Refine
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => onDownload(variation)}
            data-testid="button-lightbox-download"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
