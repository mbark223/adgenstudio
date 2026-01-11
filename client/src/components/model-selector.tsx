import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { availableModels, type AIModelId, type AIModelType } from "@shared/schema";
import { Clock, Info, Sparkles, Zap, Video, Image } from "lucide-react";

interface ModelSelectorProps {
  selectedModelId: AIModelId | null;
  onModelChange: (modelId: AIModelId) => void;
  assetType: 'image' | 'video' | null;
}

const modelTypeIcons: Record<AIModelType, React.ReactNode> = {
  image: <Image className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
  'image-to-video': <Zap className="h-3.5 w-3.5" />,
};

const modelTypeLabels: Record<AIModelType, string> = {
  image: 'Image',
  video: 'Video',
  'image-to-video': 'Image to Video',
};

export function ModelSelector({ selectedModelId, onModelChange, assetType }: ModelSelectorProps) {
  const groupedModels = {
    image: availableModels.filter((m) => m.type === 'image'),
    video: availableModels.filter((m) => m.type === 'video'),
    'image-to-video': availableModels.filter((m) => m.type === 'image-to-video'),
  };

  const recommendedType: AIModelType | null = assetType === 'image'
    ? 'image'
    : assetType === 'video'
    ? 'video'
    : null;

  return (
    <div className="space-y-3">
      <RadioGroup value={selectedModelId || ''} onValueChange={(v) => onModelChange(v as AIModelId)}>
        {(['image', 'video', 'image-to-video'] as AIModelType[]).map((type) => (
          <div key={type} className="space-y-1.5">
            <div className="flex items-center gap-1.5 py-1">
              {modelTypeIcons[type]}
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {modelTypeLabels[type]}
              </span>
              {recommendedType === type && (
                <Sparkles className="h-3 w-3 text-primary" />
              )}
            </div>

            <div className="grid gap-1">
              {groupedModels[type].map((model) => {
                const isSelected = selectedModelId === model.id;

                return (
                  <label
                    key={model.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem
                      value={model.id}
                      className="h-3.5 w-3.5"
                      data-testid={`radio-model-${model.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{model.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">~{model.avgGenerationTime}s</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[200px]">
                              <p className="text-xs font-medium mb-1">{model.provider}</p>
                              <div className="flex flex-wrap gap-1">
                                {model.capabilities.map((cap) => (
                                  <Badge key={cap} variant="secondary" className="text-[10px]">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
