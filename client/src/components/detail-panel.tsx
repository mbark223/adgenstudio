import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, Sparkles, X, Image, Film, Clock, Cpu } from "lucide-react";
import type { Variation } from "@shared/schema";

interface DetailPanelProps {
  variation: Variation | null;
  onClose: () => void;
  onDownload: (format: string) => void;
  onRefine: (prompt: string) => void;
}

export function DetailPanel({ variation, onClose, onDownload, onRefine }: DetailPanelProps) {
  if (!variation) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Image className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Select a variation to view details
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Variation Details</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          data-testid="button-close-detail"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
            <img
              src={variation.url}
              alt={`Variation ${variation.variationIndex + 1}`}
              className="h-full w-full object-contain"
            />
            {variation.type === 'video' && (
              <Badge className="absolute top-2 right-2 gap-1">
                <Film className="h-3 w-3" />
                Video
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-semibold">
              Variation {variation.variationIndex + 1}
            </h4>
            <p className="text-sm text-muted-foreground">
              {variation.sizeConfig.platform} • {variation.sizeConfig.name}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Metadata
            </Label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-mono">{variation.sizeConfig.width}x{variation.sizeConfig.height}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Platform</span>
                <span>{variation.sizeConfig.platform}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Placement</span>
                <span>{variation.sizeConfig.placement}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Model</span>
                <span>{variation.modelId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary" className="gap-1 text-xs">
                  {variation.type === 'image' ? (
                    <Image className="h-3 w-3" />
                  ) : (
                    <Film className="h-3 w-3" />
                  )}
                  {variation.type}
                </Badge>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs">
                  {new Date(variation.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {variation.prompt && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prompt Used
                </Label>
                <p className="text-sm font-mono bg-muted rounded-md p-3">
                  {variation.prompt}
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Download
            </Label>
            <div className="flex gap-2">
              <Select defaultValue="original">
                <SelectTrigger className="flex-1" data-testid="select-download-format">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG (High Quality)</SelectItem>
                  <SelectItem value="webp">WebP (Optimized)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => onDownload('original')} data-testid="button-download-detail">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Refine This Variation
            </Label>
            <Textarea
              placeholder="Enter additional direction to refine this variation..."
              className="min-h-[80px] resize-none font-mono text-sm"
              data-testid="textarea-refine-prompt"
            />
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => onRefine('')}
              data-testid="button-refine"
            >
              <Sparkles className="h-4 w-4" />
              Generate Refined Version
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
