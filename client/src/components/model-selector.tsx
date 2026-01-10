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
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  'image-to-video': <Zap className="h-4 w-4" />,
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
    <div className="space-y-4">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        AI Model
      </Label>

      <RadioGroup value={selectedModelId || ''} onValueChange={(v) => onModelChange(v as AIModelId)}>
        {(['image', 'video', 'image-to-video'] as AIModelType[]).map((type) => (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              {modelTypeIcons[type]}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {modelTypeLabels[type]} Models
              </span>
              {recommendedType === type && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  Recommended
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              {groupedModels[type].map((model) => {
                const isSelected = selectedModelId === model.id;
                
                return (
                  <label
                    key={model.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover-elevate ${
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem 
                      value={model.id} 
                      className="mt-0.5"
                      data-testid={`radio-model-${model.id}`}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium leading-none">{model.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{model.provider}</p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[200px]">
                            <p className="text-xs font-medium mb-1">Capabilities:</p>
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
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>~{model.avgGenerationTime}s</span>
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
