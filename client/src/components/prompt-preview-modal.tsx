import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Play, Sparkles, Loader2 } from "lucide-react";

interface PromptPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompts: string[];
  onPromptsChange: (prompts: string[]) => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  isGenerating: boolean;
  variationCount: number;
  selectedSizesCount: number;
}

export function PromptPreviewModal({
  open,
  onOpenChange,
  prompts,
  onPromptsChange,
  onRegenerate,
  onConfirm,
  isLoading,
  isGenerating,
  variationCount,
  selectedSizesCount,
}: PromptPreviewModalProps) {
  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    onPromptsChange(newPrompts);
  };

  const totalGenerations = variationCount * selectedSizesCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Preview Generated Prompts
          </DialogTitle>
          <DialogDescription>
            Review and edit the AI-generated prompts before creating your variations.
            Each prompt will be used to generate a unique variation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Claude is crafting unique prompts for your variations...
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {prompts.map((prompt, index) => (
                <div key={index} className="space-y-2">
                  <Label className="text-sm font-medium">
                    Variation {index + 1}
                    {selectedSizesCount > 1 && (
                      <span className="text-muted-foreground font-normal ml-2">
                        ({selectedSizesCount} sizes)
                      </span>
                    )}
                  </Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => handlePromptChange(index, e.target.value)}
                    className="min-h-[80px] resize-none font-mono text-sm"
                    placeholder="Enter prompt for this variation..."
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isLoading || isGenerating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || isGenerating || prompts.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate {totalGenerations} Variation{totalGenerations !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
