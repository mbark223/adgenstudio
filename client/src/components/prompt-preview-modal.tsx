import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Play, Sparkles, Loader2, Lock } from "lucide-react";

interface PromptPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompts: string[];
  onPromptsChange: (prompts: string[]) => void;
  onRegenerate: (indicesToRegenerate?: number[]) => void;
  onConfirm: () => void;
  isLoading: boolean;
  isGenerating: boolean;
  variationCount: number;
  selectedSizesCount: number;
  regeneratingIndices?: number[];
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
  regeneratingIndices = [],
}: PromptPreviewModalProps) {
  // Track which prompts are "locked" (kept) during regeneration
  const [lockedPrompts, setLockedPrompts] = useState<Set<number>>(new Set());

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    onPromptsChange(newPrompts);
  };

  const toggleLock = (index: number) => {
    const newLocked = new Set(lockedPrompts);
    if (newLocked.has(index)) {
      newLocked.delete(index);
    } else {
      newLocked.add(index);
    }
    setLockedPrompts(newLocked);
  };

  const handleRegenerateUnlocked = () => {
    // Get indices that are NOT locked
    const indicesToRegenerate = prompts
      .map((_, index) => index)
      .filter((index) => !lockedPrompts.has(index));

    if (indicesToRegenerate.length === 0) {
      // All are locked, regenerate all anyway
      onRegenerate();
    } else {
      onRegenerate(indicesToRegenerate);
    }
  };

  const handleRegenerateSingle = (index: number) => {
    onRegenerate([index]);
  };

  const totalGenerations = variationCount * selectedSizesCount;
  const lockedCount = lockedPrompts.size;
  const unlockedCount = prompts.length - lockedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Review Your Variations
          </DialogTitle>
          <DialogDescription>
            Preview and edit the creative direction for each variation before generating.
            Lock the ones you want to keep, then click Regenerate to get new versions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {isLoading && prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Preparing your creative variations...
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {prompts.map((prompt, index) => {
                const isLocked = lockedPrompts.has(index);
                const isRegenerating = regeneratingIndices.includes(index);

                return (
                  <div
                    key={index}
                    className={`space-y-2 p-3 rounded-lg border transition-colors ${
                      isLocked
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`lock-${index}`}
                          checked={isLocked}
                          onCheckedChange={() => toggleLock(index)}
                          disabled={isLoading || isGenerating}
                        />
                        <Label
                          htmlFor={`lock-${index}`}
                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                        >
                          {isLocked && <Lock className="h-3 w-3 text-primary" />}
                          Variation {index + 1}
                          {selectedSizesCount > 1 && (
                            <span className="text-muted-foreground font-normal">
                              ({selectedSizesCount} sizes)
                            </span>
                          )}
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerateSingle(index)}
                        disabled={isLoading || isGenerating}
                        className="h-7 px-2 text-xs gap-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                      </Button>
                    </div>
                    <Textarea
                      value={prompt}
                      onChange={(e) => handlePromptChange(index, e.target.value)}
                      className={`min-h-[80px] resize-none font-mono text-sm ${
                        isRegenerating ? 'opacity-50' : ''
                      }`}
                      placeholder="Enter creative direction for this variation..."
                      disabled={isRegenerating}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleRegenerateUnlocked}
            disabled={isLoading || isGenerating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {lockedCount > 0
              ? `Regenerate ${unlockedCount} Unlocked`
              : 'Regenerate All'}
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
